---
title: LangChain 学习记录（Day 5）：Retriever + 相似度检索 + Rerank 的实际效果
description: 继续完善本地知识库系统，学习 Retriever 工作机制、Top-K 检索、相似度计算与初步 Rerank 思路
pubDate: 2026-06-18
category: AI技术
---


LangChain 学习记录（Day 5）
今天目标

昨天已经把最基础的 RAG 跑通：

文档 → Loader → Split → Embedding → FAISS → LLM

今天主要做三件事：

把 RAG 从“能跑”提升到“相对稳定可用”
理清 Retriever 在整个流程中的作用
解决一个实际问题：检索结果不稳定
一个真实问题

昨天的 Demo 出现了一个很明显的现象：

同一个问题多次提问结果不一致：

用户：张三毕业后去了哪里？

有时候能找到正确内容，有时候直接跑偏。

最初以为是 LLM 不稳定，但打印中间结果后发现：

 问题不在 LLM，而在 Retriever

Retriever 到底在做什么

之前理解 RAG：

向量库 = 搜索引擎

今天更准确的理解是：

Retriever = 检索策略控制层
Vector DB = 存储层

完整流程：

用户问题
   ↓
Retriever（策略层）
   ↓
Vector DB（FAISS）
   ↓
Top-K chunks
   ↓
LLM 生成答案

Retriever 主要负责：

返回几个结果（k）
用什么策略检索（similarity / MMR）
是否做过滤或重排
Top-K 检索的影响

最基础配置：

retriever = vectorstore.as_retriever(
    search_kwargs={"k": 3}
)

含义：

只返回最相关的 3 段文本

一个关键发现

k 并不是越大越好：

k = 10
噪音增加
正确答案被稀释
LLM 开始“猜”
k = 3
信息更集中
输出更稳定
相似度检索的直觉

一句话理解 embedding：

谁更像问题，谁排前面

例子：

问题：后端开发技术

可能结果：

Spring Boot（高相关）
MySQL（中相关）
动漫推荐（低相关）
MMR（Max Marginal Relevance）

第一次接触 MMR 时比较抽象，但核心可以简化为：

既要相关，也要不重复

对比效果

普通检索：

Java基础
Java语法
Java语法（重复）

MMR：

Java基础
JVM
Spring Boot

 信息更分散，但覆盖面更好

Retriever vs Vector DB（容易混淆）

之前的误区：

Retriever = 向量数据库

更准确是：

组件	作用
Vector DB	存数据
Retriever	决定怎么查
为什么会检索错误

排查后主要有三个原因：

1. Chunk 切分不合理
概念被切断
上下文不完整
2. Embedding 表达偏差

尤其中文场景：

技术栈 ≠ 技术体系 ≠ 后端开发

语义会漂移

3. k 设置不合理
k 太小 → 可能漏答案
k 太大 → 噪音过多
一个关键认知变化

以前理解：

RAG = 技术拼装

现在理解：

RAG = 检索质量工程

真正影响效果的不是 LLM，而是：

chunk 切分方式
embedding 质量
检索策略
top-k 设计

LLM 只是最后一步生成器

一个简单优化尝试

今天做了一个轻量优化：

问题 → embedding → 检索 → rerank（简单排序）

没有上复杂模型，只是：

按 score 再排序

但效果确实更稳定了一点

今天踩的坑
坑 1：只调 LLM，不调检索

换了多个模型：

GPT
DeepSeek
Claude

但效果没变

 根因不在模型

坑 2：以为 FAISS 是“理解系统”

实际上：

FAISS 只是存储 + 相似度计算

不负责语义理解

坑 3：忽略 chunk overlap

后来加：

chunk overlap = 200

检索质量明显提升

今天的整体理解升级

从：

我在做一个问答机器人

变成：

我在做一个信息检索系统 + LLM 生成器

其中：

检索决定上限
LLM 只是最后一步表达
明天计划
Rerank（正式版本）
QA Chain 结构
Multi-query retrieval
RAG pipeline 进一步优化