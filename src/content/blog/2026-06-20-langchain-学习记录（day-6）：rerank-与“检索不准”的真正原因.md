---
title: LangChain 学习记录（Day 6）：Rerank 与“检索不准”的真正原因
description: 在基础 RAG 之后，开始解决实际问题：为什么检索到了但回答不对，以及 Rerank 在系统中的作用
pubDate: 2026-06-20
---

# LangChain 学习记录（Day 6）

## 今天的状态

昨天已经把基础 RAG 跑通了：

```text id="r8v2qf"
文档 → Loader → Split → Embedding → FAISS → Retriever → LLM
````

能用是能用，但今天开始明显感觉一个问题：

> “能检索到内容 ≠ 能回答正确”

---

## 一个很典型的问题

我用同一段文档测试：

```text id="k2v9ma"
张三毕业于北京大学，毕业后进入腾讯工作。
```

问题：

```text id="p1n8qd"
张三毕业后去了哪里？
```

结果有时候会出现：

* 找不到这段
* 或者找到但返回其他 chunk
* 或者 LLM 乱补答案

---

## 一开始的误判

最开始我以为是：

* embedding模型不行
* FAISS效果不好
* LLM太弱

但实际排查后发现：

```text id="c7m3bx"
问题不在模型
问题在“排序”
```

---

# Rerank 是干什么的

之前的流程是：

```text id="v9k2sp"
query → embedding → topK → LLM
```

但这个 topK 有个问题：

> 相似 ≠ 最相关

---

## 举个真实例子

Top 5 检索结果可能是：

```text id="m4q7ld"
1. Java基础语法
2. Java环境配置
3. 张三毕业于北京大学（正确）
4. Spring Boot教程
5. Java面向对象
```

虽然第3条最关键，但它不一定排第一。

---

## Rerank 的作用

Rerank 做的事情其实很直接：

```text id="q6v1hz"
对候选结果重新打分排序
```

流程变成：

```text id="x3n8wr"
query
↓
embedding检索（召回）
↓
候选Top20
↓
rerank模型重新排序
↓
Top3 → LLM
```

---

# 我对 Rerank 的理解

刚开始看概念的时候感觉很抽象。

后来自己总结了一句：

```text id="t2p6ka"
Embedding负责“找得到”
Rerank负责“选得对”
```

---

# 为什么必须有 Rerank

如果没有 Rerank：

* 检索结果“看起来相关”
* 但其实语义只是沾边

比如：

```text id="h5m9qd"
问题：后端开发技术

可能返回：
- Java
- 后端架构设计
- 篮球训练方法（因为“训练”语义误匹配）
```

---

# 实际使用方式（简化版）

今天没有上复杂模型，只做了一个简化版本：

```python id="r9k3vx"
docs = retriever.get_relevant_documents(query)

# 简单 rerank（按score或规则）
sorted_docs = sorted(docs, key=lambda x: x.score, reverse=True)

top_docs = sorted_docs[:3]
```

虽然很原始，但效果确实比之前稳定。

---

# 一个明显的变化

加了 rerank 之后：

### 之前：

* 答案偶尔正确
* 偶尔跑偏
* 不稳定

### 之后：

* 命中率明显提升
* 答案更集中
* 噪音减少

---

# 今天踩的一个坑

## 以为 TopK 越大越好

一开始我设置：

```text id="u3v7nk"
k = 10
```

结果：

* 噪音增加
* rerank成本变高
* LLM更容易被带偏

后来改成：

```text id="f7m2qp"
k = 20 → rerank → 3
```

效果明显更稳定。

---

# 一个关键理解变化

今天最大的变化是认知：

以前以为：

```text id="a8m5ld"
RAG = 向量检索 + LLM
```

现在更像：

```text id="p3k7nv"
RAG = 召回系统 + 排序系统 + 生成系统
```

LLM其实只是最后一步。

---

# 为什么企业会特别在意 rerank

今天查资料时发现一个现实问题：

* embedding便宜但粗糙
* rerank贵但准确

所以实际系统一般是：

```text id="k6n2vq"
便宜模型负责召回
贵模型负责精排
```

这点和搜索引擎非常像。

---

# 一个类比（帮助理解）

可以这样理解：

```text id="y7m3ld"
Embedding = 图书馆找一堆相关书
Rerank = 图书管理员帮你挑最有用的3本
LLM = 看完书写答案
```

---

# 今天的收获

今天没有学很多“新API”，但理解变化比较大：

* 检索问题比模型问题更常见
* RAG不是“加知识”，而是“做筛选”
* rerank比embedding更影响最终效果

---

# 遇到的问题

## rerank没有标准答案

不同数据集效果差别很大：

* 有的文档 rerank提升明显
* 有的几乎没变化

说明：

```text id="v1m8qp"
RAG效果 = 系统工程问题
```

---

## 评价体系缺失

目前只能靠：

* 人工看结果
* 直觉判断

还没有引入标准评估方法。

---

# 明天计划

准备进入下一步：

* Multi-Query Retrieval
* Query Rewrite
* Retriever优化策略

目标是：

```text id="n6k2mv"
让检索结果“更全”，而不是只“更准”
```
