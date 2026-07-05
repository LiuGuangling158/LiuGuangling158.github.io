---
title: 用 LLM 做 Reranker，省了一个模型
description: RAG 的标准做法是两阶段检索：Bi-Encoder 粗排（向量搜索）→ Cross-Encoder 精排（重排序）Reranker 的本质是什么？给定一个 query + 一堆 chunk，判断哪个 chunk 跟 query 最相关。
pubDate: 2026-07-05
category: 踩坑日志
---

# 用 LLM 做 Reranker，省了一个模型

RAG 的标准做法是两阶段检索：Bi-Encoder 粗排（向量搜索）→ Cross-Encoder 精排（重排序）。大部分教程都会推荐用 `bge-reranker-large` 之类的专用模型做第二步。

我也打算这么搞。然后看了一眼模型大小：1.3GB。

项目已经挂了一个本地 Embedding 模型（`all-MiniLM-L6-v2`，~80MB），再来一个 1.3G 的 Reranker……不是跑不动，是觉得不值得。这是个人项目，API 调 DeepSeek 一次也就几分钱，下一个 1.3G 的模型放在那用不了几次，纯属浪费磁盘。

## 换个思路

Reranker 的本质是什么？给定一个 query + 一堆 chunk，判断哪个 chunk 跟 query 最相关。

这恰好是 LLM 擅长的事情。

所以直接写了个 Prompt：

```
Rate the relevance of each document chunk to the user query on a scale of 0-10.

## User Query
{query}

## Document Chunks
[ID: chunk_001]
chunk 1 的内容前 500 字符...

[ID: chunk_002]
chunk 2 的内容前 500 字符...

## Rules
- 10 = perfectly answers the query
- 5 = somewhat related
- 0 = completely unrelated

## Output format
Return a JSON array: [{"id": "chunk_id", "score": N}, ...]
Order by score descending.
```

然后把检索到的前 15 个 chunk（每个截断到 500 字符）扔给 DeepSeek，让它打分排序，取 Top-5。

## 效果

实测了几轮，说实话比我想的好。

用向量检索原始排序，Top-5 里通常有 1-2 个不相关的 chunk（向量距离近但语义不对路）。LLM 重排后基本能把那 1-2 个刷下去，把更相关的提上来。

当然也有翻车的时候。比如 15 个 chunk 都不太相关，LLM 也只能硬着头皮打分，最高分可能才 3 分——但这种情况下，不管用不用 Reranker，RAG 效果都不会好。

## 成本和性能

一次 Rerank 调用的 token 消耗：

- 15 个 chunk × 500 字符 ≈ 7500 字符输入 ≈ ~2000 tokens
- 输出 JSON array ≈ ~200 tokens
- DeepSeek 的价格：约 0.001 元/次

基本可以忽略。

延迟方面，多一次 LLM 调用大概增加 1-2 秒。因为 Rerank 和后续的生成是串行的，用户感知的延迟确实增加了一点。但如果 Rerank 能排掉不相关的 chunk，后续生成的答案质量提升是实打实的。

## 跟正经 Reranker 模型的差距

不吹不黑，LLM 做 Reranker 跟专用模型肯定有差距：

- **一致性**：同样的 query + chunks，LLM 两次打分可能略有不同（非确定性），专用模型每次结果一致。
- **吞吐量**：LLM 一次只能评 15 个 chunk 左右（受 context 长度和输出 token 限制），专用模型可以批量评上百个。
- **延迟稳定性**：API 调用的延迟抖动比本地模型大。

但对于个人项目、MVP、或者检索规模不大的场景，LLM Reranker 完全够用。而且最大的优势是——**不用下载任何东西，不用部署任何新服务**。

## 什么时候还是该上专用模型

- chunk 数量很大（几百上千级别），需要批量重排
- 对延迟要求很高（本地模型比 API 调用快且稳定）
- 对一致性要求很高（需要可复现的结果）
- 已经在这个方向投入了足够多的工程资源

对我现在这个项目来说，以上都不成立。15 个 chunk、个人使用、API 延迟可以接受——LLM 重排是最经济的选择。

## 另外

代码里给 Rerank 加了 fallback：

```python
if settings.rerank_enabled and len(chunks) > top_k and self.llm:
    try:
        chunks = await rerank_chunks(self.llm, query, chunks, top_n=top_k)
    except Exception as e:
        print(f"[WARN] Rerank 失败: {e}，保持原始检索顺序")
        chunks = chunks[:top_k]
else:
    chunks = chunks[:top_k]
```

Rerank 失败了就退回到原始顺序，不会让检索流程中断。这也是从项目早期踩坑中学到的习惯——每多加一层处理，就多加一层 try/except。不是不信任代码，是不信任 LLM API 的稳定性。

## 总结

**选技术方案的时候，先问自己"真的需要那个重型方案吗"。很多时候，一个 Prompt + 几十行代码就能解决的问题，不值得引入一个新模型。**
