---
title: RAG 效果不好和Prompt有直接关系
description: 同样的检索结果，换一个 Prompt，回答质量天差地别。
pubDate: 2026-07-03
category: 踩坑日志
---


# RAG 效果不好？Prompt 的影响可能更大

做 RAG 的时候有个很自然的思路：效果不好 → 肯定是检索没召回好东西 → 加 Rerank、Multi-Query、HyDE、改 Chunk 策略……

我一开始也是这么想的。但测了几轮之后发现一个反直觉的事情：

**同样的检索结果，换一个 Prompt，回答质量天差地别。**

## 实验

用同一个 query（"Verification 和 Validation 的区别"），检索结果完全相同（Top-5 chunks），换了三种 Prompt：

### Prompt A（最简版）

```
根据参考资料回答用户问题。

参考资料：
{context}

用户问题：
{query}
```

LLM 输出：一段正确但很干瘪的回答，没有引用来源，混入了一些自己的知识。

### Prompt B（加了来源约束）

```
根据参考资料回答。必须标注来源。如果资料没有相关信息，告知用户。

参考资料：
{context}

用户问题：
{query}
```

LLM 输出：引用了来源，但来源标注是瞎编的——它把内容对应到了不存在的章节标题上。

### Prompt C（最终版，加了格式约束 + 反幻觉指令）

```
你是一个知识库问答助手，回答基于提供的参考资料。

## 规则
1. 优先使用参考资料中的内容回答
2. 如果资料中包含答案，直接引用并标注来源
3. 如果资料不包含答案，明确告知用户"知识库中暂无相关信息"
4. 不要编造参考资料中没有的信息

## 输出格式
{
  "query": "用户的问题",
  "answer": "回答",
  "sources": [{"title": "来源笔记标题", "excerpt": "相关片段"}],
  "confidence": 0.9
}

请严格输出 JSON 格式。

## 参考资料
{context}

## 用户问题
{query}
```

LLM 输出：准确引用、标注了真实来源、不编造内容、输出合法 JSON。

三版 Prompt，同一批检索结果，答案质量从"勉强能用"到"可以作为产品功能"。

## 为什么 Prompt 这么关键

RAG 的核心矛盾不是"搜不到"，而是 **LLM 天然倾向于相信自己的训练数据，而不是你给它的上下文**。

这不是推理能力的问题——哪怕是 GPT-4.1，如果你不在 Prompt 里明确约束它，它照样会在参考资料不够的时候"帮你补充"，然后用训练数据里的知识填上去。

所以 Prompt 在 RAG 里有三个关键作用，检索替代不了：

1. **约束信息来源** — 明确告诉 LLM "只能用参考资料，没有就说没有"。不做这个约束，LLM 会混合使用训练数据和你给的 context，引用标注就形同虚设。
2. **控制输出格式** — 要求 JSON 输出 + `sources` 字段，这样前端才能解析和展示引用。没有这个约束，LLM 会在 Markdown 里随意穿插引用，格式五花八门。
3. **设定可信度预期** — `confidence` 字段让 LLM 自己对回答质量做评估。这是一个很便宜但很有用的信号。

## 那检索不重要吗？

当然重要。检索决定了"上限"，Prompt 决定了"实际能达到上限的多少"。

如果把 RAG 效果量化为 100 分：
- 检索质量决定了你的上限是 80 分还是 95 分
- Prompt 质量决定了你实际能拿到 60 分还是 90 分

一个差的 Prompt 可以让完美的检索结果产出垃圾回答。而一个好的 Prompt，即使检索结果一般（只要别太离谱），也能让 LLM 诚实地说"参考资料不够"而不是编造。

## 实际的 prompt 调优流程

我现在做 RAG 功能时，开发顺序是这样的：

1. **先跑通检索** — 确保能从 VectorDB 搜到东西
2. **写一个详细的 Prompt** — 包含信息来源约束、输出格式、边界处理
3. **用同一批检索结果反复调 Prompt** — 改约束措辞、调格式、加边界 case
4. **回来检查检索** — 如果 Prompt 已经很好但答案还是不准，这时候再优化检索

大部分教程的顺序是 1 → 4 → 2，但实际干活 2 和 3 的投入产出比更高。

## 另外

LLM 的 JSON 输出也不总是可靠的。这个项目中 RetrievalAgent 的代码里有这段：

```python
try:
    data = json.loads(response.content)
except json.JSONDecodeError:
    content = response.content
    if "```json" in content:
        json_str = content.split("```json")[1].split("```")[0].strip()
        data = json.loads(json_str)
    else:
        data = {"query": query, "answer": response.content, "sources": [], "confidence": 0.5}
```