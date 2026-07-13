---
title: ReAct 循环的内部机制——为什么 Tool 执行后必须回到 Agent？
description: 'ReAct（Reasoning + Acting）将两者融合**——让 LLM 在推理和行动的交替循环中，自主找到解决问题的最优路径。'
pubDate: 2026-07-13
category: AI技术
---

# ReAct 循环的内部机制——为什么 Tool 执行后必须回到 Agent？

> **系列**：云平台智能客服系统技术深度解析
> **关键词**：ReAct、Reasoning、Acting、Tool Calling、create_react_agent、思考链


---

## LLM Agent 的"灵魂"

传统 LLM 应用有两种极端：**纯推理**（让 LLM 基于训练数据直接回答，容易幻觉）和**纯行动**（写死工具调用流程，无法根据中间结果调整策略）。

**ReAct（Reasoning + Acting）将两者融合**——让 LLM 在推理和行动的交替循环中，自主找到解决问题的最优路径。

---

## ReAct 循环的四个阶段

```
┌──────────────────────────────────────────────────────┐
│                  ReAct Agent 生命周期                  │
│                                                      │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐      │
│  │  THINK   │────▶│   ACT    │────▶│ OBSERVE  │      │
│  │ 分析现状  │     │ 执行工具  │     │ 解读结果  │      │
│  │ 制定策略  │     │          │     │          │      │
│  └──────────┘     └──────────┘     └────┬─────┘      │
│       ▲                                 │             │
│       │         需要更多信息？            │             │
│       └─────────────────────────────────┘             │
│                        │                              │
│                        ▼ (信息充足)                    │
│                 ┌──────────┐                          │
│                 │  ANSWER  │                          │
│                 │ 生成回答  │                          │
│                 └──────────┘                          │
└──────────────────────────────────────────────────────┘
```

用一个具体例子走一遍流程：

```
用户：C7.4xlarge 和 C7.8xlarge 的网络带宽有什么区别？

THINK（迭代1）：这两款的带宽信息都不在我当前知识中，需要查询。
ACT（迭代1）：调用 query_product_spec("C7.4xlarge", ["network_bandwidth"])
OBSERVE（迭代1）：{network_bandwidth: "25 Gbps"}

THINK（迭代2）：已获C7.4xlarge带宽=25Gbps，还需要C7.8xlarge的数据。
ACT（迭代2）：调用 query_product_spec("C7.8xlarge", ["network_bandwidth"])
OBSERVE（迭代2）：{network_bandwidth: "50 Gbps"}

THINK（迭代3）：两条数据都已获取，信息充足，可以回答。
ANSWER：C7.4xlarge网络带宽为25Gbps，C7.8xlarge为50Gbps，后者带宽翻倍...
```

---

## LangGraph 的 create_react_agent 内部构造

很多开发者把 `create_react_agent` 当黑盒使用。理解其内部构造对调优至关重要。以下是简化等价实现：

```python
from langgraph.graph import StateGraph, MessagesState, END
from langgraph.prebuilt.tool_node import ToolNode


def build_react_agent_internals(model, tools):
    """create_react_agent 的内部等价实现"""

    tool_node = ToolNode(tools)  # 负责执行工具调用

    def call_model(state: MessagesState):
        """Agent 节点：绑定工具并调用 LLM"""
        model_with_tools = model.bind_tools(tools)
        response = model_with_tools.invoke(state["messages"])
        return {"messages": [response]}

    def should_continue(state: MessagesState) -> str:
        """路由决策：检查 LLM 是否要调用工具"""
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"  # → 去执行工具
        return END          # → 对话结束

    workflow = StateGraph(MessagesState)
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", tool_node)
    workflow.set_entry_point("agent")

    workflow.add_conditional_edges("agent", should_continue, {
        "tools": "tools",
        END: END
    })
    workflow.add_edge("tools", "agent")  # ← 关键：工具执行后回到 agent

    return workflow.compile()
```

---

## 关键洞察：为什么 Tool 之后必须回到 Agent？

```
agent ──(有 tool_calls)──▶ tools ──(执行完成)──▶ agent
  ▲                                                 │
  └─────────────────────────────────────────────────┘
                (无 tool_calls → END)
```

ToolNode 执行工具后，**绝不能直接生成回答**，原因是：

**1. 工具结果需要被"理解"**

工具返回的是结构化数据：
```json
{"network_bandwidth": "25 Gbps", "pps": "400万"}
```

这不等于用户友好回答。LLM 需要将其转化为：
> "C7.4xlarge 的网络带宽为 25 Gbps，包转发率达到 400 万 PPS……"

**2. 可能需要更多工具**

第一次查询的结果可能引出第二次查询的需求——这正是 ReAct 循环的威力。如果 Tool 执行后直接输出，循环就被打断了。

**3. 防止幻觉**

让 LLM 基于观察结果（Observation）而非训练记忆来生成回答，是 ReAct 的核心价值。"先查再说"永远比"先说再找依据"更可靠。

---

## ReAct 循环的终止条件

循环不是无限的。三种情况会触发终止：

```python
class ReActController:
    def __init__(self, max_steps: int = 12, max_timeout: float = 45.0):
        self.max_steps = max_steps
        self.max_timeout = max_timeout
        self.step_count = 0

    def should_continue(self, state: MessagesState) -> str:
        self.step_count += 1

        # 条件1：LLM 不再调用工具（自然终止）
        last_message = state["messages"][-1]
        if not (hasattr(last_message, "tool_calls") and last_message.tool_calls):
            return END

        # 条件2：达到最大步数（强制终止）
        if self.step_count >= self.max_steps:
            return END

        return "tools"
```

**设置原则**：
- 简单查询：3-5 次工具调用足够；
- 复杂分析：可能需要 8-12 次；
- 超过 12 次说明 prompt 或工具设计有问题——可能是陷入循环调用同一工具。

---

## 核心要点

1. **ReAct = 思考 + 行动 + 观察 → 再思考**，LLM 在循环中自主决策；
2. **Tool 执行后必须回到 Agent**——因为结果需要 LLM 解读、可能需要更多工具、防止幻觉；
3. **循环必须有上限**——max_steps 防止无限循环，合理值为 8-15。

---