---
title: Orchestrator 路由与领域 Agent 设计——从意图识别到链式调用
pubDate: 2026-07-12
category: AI技术
---

# Orchestrator 路由与领域 Agent 设计——从意图识别到链式调用

> **系列**：云平台智能客服系统技术深度解析


---

## Orchestrator 的核心任务

在本项目的架构中，Orchestrator 是整个系统的"大脑"。它承担三个关键职责：

1. **意图识别**：用户到底想问什么？
2. **路由分发**：哪个 Agent 最适合回答？
3. **链式编排**：是否需要多个 Agent 接力？

---

## 一、意图识别 Prompt 的设计哲学

这不是简单的关键词匹配——"我的 ECS 太贵了"既涉及产品（ECS），又涉及成本（太贵）。Prompt 需要引导 LLM 进行深层语义理解：

```python
ORCHESTRATOR_SYSTEM_PROMPT = """你是一个云平台智能客服的调度中心。

## 路由规则
- product：产品规格咨询、功能对比、实例选型、地域可用性
- billing：账单查询、费用明细、订单状态、消费趋势
- promotion：优惠活动、折扣政策、代金券规则
- recommendation：基于场景推荐产品组合或升级方案
- finops：成本分析、资源优化、闲置资源识别、降配建议

## 特殊场景
- "我的 X 太贵了" → 先 billing(查费用) → finops(做优化)
- "帮我看促销里的产品" → 先 promotion(查活动) → product(介绍产品)

## 输出格式 JSON
{
    "intent": "product|billing|promotion|recommendation|finops|fallback",
    "confidence": 0.0-1.0,
    "reasoning": "简要说明路由理由",
    "requires_chain": false,
    "chain": []
}
"""
```

**设计要点**：
- 每个路由目标附带**场景说明**，帮助 LLM 理解边界；
- 给出**特殊场景处理指南**，避免二义性情况下的错误路由；
- 要求输出 **confidence 分数**，低于 0.6 的路由进入 fallback。

---

## 二、路由函数的"安全带"

LLM 的输出不可完全信任。路由函数是整个系统的"安全带"——验证、过滤、兜底：

```python
def route_to_agent(state: AgentState) -> str:
    """条件路由——决定下一个执行节点"""
    decision = state.get("route_decision", {})
    intent = decision.get("intent", "fallback")
    confidence = decision.get("confidence", 0.0)

    # 低置信度 → 兜底处理
    if confidence < 0.6:
        return "fallback"

    # 白名单验证
    VALID_INTENTS = {"product", "billing", "promotion",
                     "recommendation", "finops", "fallback"}
    return intent if intent in VALID_INTENTS else "fallback"
```

**三层防护**：
1. `confidence < 0.6` → 即使 LLM 给出了路由结果，置信度不够也不采用；
2. 白名单验证 → LLM 可能"创造性"地返回一个不存在的 Agent 名称；
3. fallback Agent → 永远存在的兜底节点，确保图不会卡住。

---

## 三、链式调用的编排逻辑

最经典的跨 Agent 场景——成本优化：

> 用户：*"帮我看看上个月的云费用，有没有可以省钱的地方。"*

```
Orchestrator
   │  识别：billing → finops 链式调用
   │
   ▼
BillingAgent  ──→  查询账单明细，产出结构化费用数据
   │
   ▼
Orchestrator  ──→  检查链：[billing, finops] → 还有 finops 待执行
   │
   ▼
FinOpsAgent   ──→  基于账单数据，分析可优化资源
   │
   ▼
Orchestrator  ──→  链为空 → END
```

```python
def orchestrator_node(state: AgentState) -> AgentState:
    # ... LLM 意图识别 ...
    decision = parse_llm_response(response)

    if decision.get("requires_chain"):
        chain = decision.get("chain", [])
        # 第一个 Agent 将成为本次路由的目标
        decision["chain"] = chain
        decision["chain_index"] = 0

    state["route_decision"] = decision
    return state


def should_continue(state: AgentState) -> str:
    decision = state.get("route_decision", {})
    chain = decision.get("chain", [])

    if chain and len(chain) > 1:
        # 移除已执行的 Agent，继续下一个
        decision["chain"] = chain[1:]
        return "continue"
    return "end"
```

---

## 四、领域 Agent 的差异化配置

不是所有 Agent 都需要相同的参数。Billing 需要零温度以确保金额精确，Recommendation 需要适度创造性：

```python
AGENT_CONFIGS = {
    "billing": {
        "temperature": 0.0,      # 金额不能有偏差
        "max_tool_calls": 3,
        "system_prompt_extra": "账单数据必须精确，不得估算。"
    },
    "recommendation": {
        "temperature": 0.4,      # 推荐需要一定创造性
        "max_tool_calls": 6,     # 推荐场景需要更多探索
        "system_prompt_extra": "给出2-3个备选方案并说明优劣。"
    },
    "finops": {
        "temperature": 0.2,
        "max_tool_calls": 8,     # 成本分析需要多次数据查询
        "system_prompt_extra": "每条建议必须量化为预计节省金额。"
    },
    "product": {
        "temperature": 0.1,      # 产品信息需要精确
        "max_tool_calls": 5,
        "system_prompt_extra": "优先使用工具查询，不得依赖训练数据。"
    },
}
```

**设计逻辑**：
- 确定性场景（Billing、Product）→ 低 temperature，事实不容幻觉；
- 创造性场景（Recommendation）→ 适度提高 temperature，增加多样性；
- 复杂分析（FinOps）→ 放宽工具调用上限，允许深度探索。

---

## 核心要点

1. **Orchestrator 的 Prompt 是系统的大脑**——投入时间打磨路由规则和特殊场景处理，ROI 远超调优单个 Agent；
2. **路由函数是"安全带"**——永远不要完全信任 LLM 的输出，confidence 阈值 + 白名单 + fallback 三重防护；
3. **链式调用通过 Orchestrator 中转**——Agent 之间不直接跳转，每次 Orchestrator 回归都是一次状态检查点。

---