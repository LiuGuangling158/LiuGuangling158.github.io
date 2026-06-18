---
title: LangChain 学习记录（Day 5）：Retriever + 相似度检索 + Rerank 的实际效果
description: 继续完善本地知识库系统，学习 Retriever 工作机制、Top-K 检索、相似度计算与初步 Rerank 思路
pubDate: 2026-06-18
category: AI技术
---

# LangChain 学习记录（Day 5）

## 今天的目标

昨天已经把最基础的 RAG 跑通了：

```text
文档 → Loader → Split → Embedding → FAISS → LLM

今天目标很明确：

把“能用”变成“稍微好用一点”
看看 Retriever 到底在中间干了什么
解决一个实际问题：检索结果不稳定
先说一个现象

昨天的 Demo 有个很明显的问题：

同一个问题：

用户：张三毕业后去了哪里？

有时候能找到正确 chunk，有时候直接跑偏。

一开始以为是模型问题，后来打印了一下中间结果才发现：

问题不在 LLM
问题在“检索阶段”
Retriever 到底在干什么

之前理解 RAG 是：

向量库 = 搜索引擎

今天看 Retriever 才发现，这一层其实是在做“控制检索行为”。

简单理解：

用户问题
↓
Retriever（控制策略）
↓
向量数据库（FAISS）
↓
返回 Top-K chunks

Retriever 做的事情主要是：

选 K（返回几个结果）
选策略（相似度 / MMR）
控制过滤逻辑
Top-K 检索

最基础的就是：

Top 3 / Top 5

例如：

retriever = vectorstore.as_retriever(
    search_kwargs={"k": 3}
)

意思就是：

只返回最像的 3 段文本
一个很现实的问题

k 不是越大越好。

我一开始直接设：

k = 10

结果：

噪音变多
正确答案被淹没
LLM开始“猜”

后来改成：

k = 3

反而更稳定。

相似度检索的直觉

今天重新理解了一下 embedding + similarity。

可以用一句很粗糙的话总结：

谁更像这个问题，就排前面

例如问题：

后端开发技术

可能检索到：

Spring Boot（高）
MySQL（中）
动漫推荐（低）
MMR（第一次接触）

除了普通相似度，还有一个东西：

MMR（Max Marginal Relevance）

刚看到的时候是懵的。

后来查了一下，简单理解是：

既要相关
也要不重复

比如 Top-K 可能返回：

chunk1：Java基础
chunk2：Java语法
chunk3：Java语法（重复）

MMR 会尽量避免这种重复。

实际体感

我试了一下：

普通检索：内容很像，但重复
MMR：内容分散，但信息更全

更适合问“综合问题”。

Retriever vs Vector DB（容易混）

今天踩的一个坑是：

一开始以为：

Retriever = 向量数据库

后来才发现：

Retriever = 使用向量数据库的策略层

关系更像：

Vector DB：存数据
Retriever：决定怎么查
一个真实问题：为什么会检索错？

今天重点排查了“检索错”的情况。

发现主要有三个原因：

1. Chunk 本身不合理

比如：

一个概念被切断

导致语义不完整。

2. embedding 表达不准

尤其是中文：

技术栈 ≠ 技术体系 ≠ 后端开发

语义会偏。

3. k 设置不合理

太小：

可能直接漏掉正确答案

太大：

噪音太多
今天一个比较重要的感觉

以前以为：

RAG = 技术拼装

今天更像是：

RAG = 检索质量工程

因为真正影响结果的不是模型，而是：

切分方式
embedding质量
检索策略
top-k设计

LLM反而只是“最后一步”。

一个小优化尝试

今天做了一个简单优化：

问题 → embedding → 检索 → rerank（简单排序）

虽然没有用复杂 rerank 模型，只是：

按 score 再排序一次

但效果确实稳定了一点。

今天踩的坑总结
坑1：只调 LLM，不调检索

一开始疯狂换模型：

GPT
DeepSeek
Claude

结果发现：

👉 没用

问题在 retrieval。

坑2：以为 FAISS 就是全部

FAISS 只是存储结构，不负责“理解”。

坑3：忽略 chunk overlap

后来加了 overlap：

chunk overlap = 200

效果明显好了一点。

今天的整体理解变化

从：

我只是在做一个问答机器人

变成：

我在做一个信息检索系统 + LLM生成

LLM只是最后一步。

明天计划

准备继续往下走：

Rerank（更正式的版本）
QA Chain结构
Multi-query retrieval
初步优化 RAG pipeline