---
title: ContextBuilder 与链式调用容错设计——上游挂了，下游怎么办
pubDate: 2026-07-16
category: AI技术
---

# ContextBuilder 与链式调用容错设计——上游挂了，下游怎么办？

> **系列**：云平台智能客服系统技术深度解析
> **关键词**：ContextBuilder、链式调用、容错、中间进度、SSE 推送


---

## 一、ContextBuilder：被低估的关键组件

FinOpsAgent 需要的不仅是账单数据，还有"基于数据做什么"的任务指引。ContextBuilder 就是做这件事的：

```python
class ContextBuilder:
    @staticmethod
    def billing_to_finops(billing_output: dict, user_query: str) -> str:
        billing_data = billing_output.get("data", {})

        context = f"""## 用户原始问题
{user_query}

## BillingAgent 查询结果

### 费用总览
- 查询周期：{billing_data.get('period')}
- 总费用：¥{billing_data.get('total_cost'):,.2f}
- 环比变化：{billing_data.get('mom_change_percent'):+.1f}%

### 费用明细（按产品）
| 产品 | 费用 | 占比 | 环比变化 |
|------|------|------|----------|
"""
        for item in billing_data.get("details", []):
            context += f"| {item['product']} | ¥{item['cost']:,.2f} | {item['ratio']:.1f}% | {item['mom_change']:+.1f}% |\n"

        context += """
## 你的任务
基于以上账单数据：
1. 识别费用增长的主要驱动因素
2. 检查是否存在闲置资源或过度配置
3. 给出量化的优化建议（预计节省金额）
4. 按优先级排序
"""
        return context
```

**为什么这个组件至关重要？**

- **精确数据 + 模糊任务 = LLM 自由发挥 → 不可控**
- **精确数据 + 精确任务 = LLM 照章办事 → 可控且高质量**

ContextBuilder 把原始的 `agent_outputs` 转化为 LLM 最擅长处理的"结构化上下文 + 明确任务指令"。

---

## 二、上游失败时的容错策略

链式调用中 BillingAgent 可能失败——数据库超时、返回空结果、权限不足……FinOpsAgent 怎么应对？

```python
def orchestrator_node(state: FinOpsChainState) -> FinOpsChainState:
    chain = state.get("chain", [])
    chain_index = state.get("chain_index", 0)

    if chain and chain_index > 0:
        last_agent = chain[chain_index - 1]
        last_output = state["agent_outputs"].get(last_agent)

        if last_output is None or last_output.get("status") == "error":
            # 策略：终止链路，立即给出部分结果
            logger.warning(f"Chain interrupted: {last_agent} failed")
            state["route_decision"] = {
                "requires_chain": False,
                "chain": [],
                "intent": "fallback",
                "reasoning": f"前置 Agent [{last_agent}] 执行失败，终止链式调用"
            }
            return state

    # ... 正常路由 ...
```

**三种可选策略**：
1. **跳过失败节点继续** → 适用场景：下游可以独立工作（本项目未采用）；
2. **终止链路给部分结果** → 适用场景：下游强依赖上游数据（✅ 本项目采用）；
3. **重试失败节点** → 适用场景：网络抖动等瞬时故障。

FinOpsAgent 强依赖账单数据，上游失败意味着没有分析基础——终止并告知用户是最诚实的做法。

---

## 三、中间进度推送：别让用户干等

链式调用可能耗时 10-30 秒。通过 SSE 推送中间进度，用户看到的是"正在努力"而非"卡死了"：

```python
async def stream_chain_progress(state, event_emitter):
    chain = state.get("chain", [])
    chain_index = state.get("chain_index", 0)

    if chain:
        progress = {
            "type": "chain_progress",
            "current_step": chain_index + 1,
            "total_steps": len(chain),
            "completed": chain[:chain_index],
            "current": chain[chain_index],
            "message": f"正在为您分析...（第{chain_index + 1}/{len(chain)}步）"
        }
        await event_emitter.emit(progress)
```

用户体验：
```
🔄 正在为您分析...（第 1/2 步：billing）
✅ 已完成账单查询（共 8 条费用明细）
🔄 正在为您分析...（第 2/2 步：finops）
✅ 已完成成本分析
📊 最终结论：...
```

---

## 四、跨 Agent 状态交接的四项原则

| 原则 | 说明 | 反例 |
|------|------|------|
| **显式优于隐式** | State 字段传递，不靠 LLM 猜 | 让 Agent B 从自然语言中"找出"账单金额 |
| **精确优于模糊** | 数值用类型字段，不通过文本 | "费用大概 12000 多" |
| **可追溯** | 保留每个 Agent 原始输出 | Agent 输出被覆盖或丢弃 |
| **可降级** | 链路中断时给部分结果 | 全部失败，无任何输出 |

---

## 本期核心要点

1. **ContextBuilder 是状态交接的质量保证**——把原始数据 + 任务指令打包成 LLM 最优消费格式；
2. **容错设计提前做**——上游 Agent 失败是常态，下游必须知道怎么处理；
3. **中间进度决定用户体验**——不要让用户在 Agent 接力时看白屏。

---

