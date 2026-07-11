---
title: 多智能体是必然选择的原因——从单 Agent 到 LangGraph StateGraph
pubDate: 2026-07-11
category: AI技术
---

# 多智能体是必然选择的原因——从单 Agent 到 LangGraph StateGraph

> **系列**：云平台智能客服系统技术深度解析

---

## 从一个真实场景说起

设想在开发一个云平台智能客服。用户问的第一个问题是：

> "C7.4xlarge 多少钱一小时？"

这是一个产品规格查询。你给 Agent 配了向量数据库检索工具，效果不错。

然后用户接着问：

> "我上个月的费用涨了 30%，帮我看看为什么。"

这里涉及账单查询、费用对比、异常检测——完全是另一套数据源和业务逻辑。

你不得不把所有工具都塞进一个 Agent：产品检索、账单查询、促销活动、成本分析……很快工具列表膨胀到 20+ 个。

**问题开始浮现**：

1. **Prompt 臃肿**：20+ 个工具定义挤在 system prompt 里，LLM 的注意力被稀释，推理质量断崖式下降；
2. **职责混乱**：当用户说"我的 ECS 太贵了"，Agent 需要同时理解产品（ECS）、账单（费用）、优化（降本）三个维度的逻辑；
3. **幻觉风险**：一个 Agent 掌握了太多种类的数据，LLM 可能会错误地将产品规格和账单金额混在一起回答；
4. **无法维护**：新增一个"工单系统"功能，需要修改核心 Agent 的 prompt 和工具集，牵一发而动全身。

**这是单 Agent 架构的天然天花板。**

---

## Multi-Agent：用"分治"解决"混乱"

多智能体架构的核心思想朴素而强大——**把一个大问题拆成 N 个小问题，每个 Agent 只专注一个领域**。

```
                    ┌──────────────────┐
                    │   Orchestrator   │  ← "调度中心"
                    │   意图识别+路由   │
                    └────────┬─────────┘
                             │
        ┌────────┬───────────┼───────────┬──────────┐
        ▼        ▼           ▼           ▼          ▼
   ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
   │Product ││Billing ││Promotio││Recomme││FinOps  │
   │ Agent  ││ Agent  ││n Agent ││nd Agent││ Agent  │
   │ 产品   ││ 账单   ││ 促销   ││ 推荐   ││ 成本   │
   └────────┘└────────┘└────────┘└────────┘└────────┘
        │        │          │          │         │
        ▼        ▼          ▼          ▼         ▼
   ┌─────────────────────────────────────────────────┐
   │              MCP 工具层（MySQL/Milvus/Neo4j）     │
   └─────────────────────────────────────────────────┘
```

每个 Agent 有自己的工具集和 system prompt，像一个专业团队：
- **ProductAgent**：只懂产品，挂载向量检索和图谱查询；
- **BillingAgent**：只查账单，挂载 MySQL 订单查询；
- **FinOpsAgent**：只做成本分析，基于账单数据给出优化建议。

---

## 为什么选择 LangGraph？

市面上有多种 Multi-Agent 框架：AutoGen、CrewAI、MetaGPT……但它们更偏重"对话式协作"，Agent 之间通过聊天来协商。对于云平台客服这种**确定性路由场景**，我们需要的是一个**可控的状态机**。

LangGraph 的 `StateGraph` 恰好提供了这种能力。

### StateGraph vs MessageGraph

| 特性 | MessageGraph | StateGraph |
|------|-------------|------------|
| 状态结构 | 仅消息列表 | 任意 TypedDict |
| 条件路由 | 不支持 | 原生支持 |
| 状态持久化 | 有限 | Checkpointer 机制 |
| 跨节点数据传递 | 依赖消息 | 结构化字段 |

`StateGraph` 允许你定义**任意形状的状态对象**——这对多 Agent 系统至关重要。Agent 之间不仅传递消息，还要传递结构化决策、中间结果、用户上下文。

```python
from typing import TypedDict, List, Optional, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    """多智能体系统的全局状态——单一真相来源"""
    messages: Annotated[List[BaseMessage], add_messages]
    current_agent: str                      # 当前活跃 Agent
    route_decision: Optional[str]            # Orchestrator 路由决策
    agent_outputs: dict                      # 各 Agent 的结构化产出
    user_context: Optional[dict]             # 长期记忆注入的用户画像
    session_id: str
    user_id: str
    turn_count: int
```

**关键设计**：`messages` 使用 `add_messages` reducer 自动追加而非覆盖——这是 LangGraph 的消息管理机制，确保对话历史始终完整。

---

## 构建编排图的五个步骤

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver


def build_orchestrator_graph():
    workflow = StateGraph(AgentState)

    # Step 1: 注册节点——每个 Agent 是图中的一个节点
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("product_agent", product_agent_node)
    workflow.add_node("billing_agent", billing_agent_node)
    workflow.add_node("promotion_agent", promotion_agent_node)
    workflow.add_node("recommendation_agent", recommendation_agent_node)
    workflow.add_node("finops_agent", finops_agent_node)

    # Step 2: 设置入口
    workflow.set_entry_point("orchestrator")

    # Step 3: 条件路由——Orchestrator 决定下一个节点
    workflow.add_conditional_edges(
        "orchestrator",
        route_to_agent,  # 路由函数
        {
            "product": "product_agent",
            "billing": "billing_agent",
            "promotion": "promotion_agent",
            "recommendation": "recommendation_agent",
            "finops": "finops_agent",
        }
    )

    # Step 4: 星型拓扑——所有 Agent 执行完后回到 Orchestrator
    for agent in ["product_agent", "billing_agent", "promotion_agent",
                  "recommendation_agent", "finops_agent"]:
        workflow.add_edge(agent, "orchestrator")

    # Step 5: 终止条件
    workflow.add_conditional_edges(
        "orchestrator",
        should_continue,
        {"continue": "orchestrator", "end": END}
    )

    # 编译——MemorySaver 提供状态持久化
    return workflow.compile(checkpointer=MemorySaver())
```

**为什么是星型拓扑？**

所有 Agent 都回到 Orchestrator，而非 Agent 之间直接跳转。这保证了：
- 路由逻辑**集中可控**，不会出现 Agent A 擅自调用 Agent B 的情况；
- 每一次 Orchestrator 回归都是一次"状态检查点"，可以评估是否需要继续、是否需要切换策略；
- 链式调用（如 Billing → FinOps）通过 Orchestrator 编排，而非 Agent 间的隐式依赖。

---

## 核心要点

1. **单 Agent 的天花板是工具集膨胀和职责混乱**——当系统需要对接 5+ 个业务领域时，Multi-Agent 不是可选项而是必需品；
2. **LangGraph StateGraph 胜在可控性**——它不是让 Agent "自由对话"，而是通过有向图精确定义执行流程；
3. **星型拓扑 + 统一状态**——所有 Agent 共享一个 State 对象，通过 Orchestrator 集中调度，是生产级 Multi-Agent 系统的成熟模式。

---