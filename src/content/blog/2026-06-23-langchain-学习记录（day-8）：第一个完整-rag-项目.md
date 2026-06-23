---
title: LangChain 学习记录（Day 8）：第一个完整 RAG 项目
description: 把前面几天的零散模块串成一个完整 RAG 系统，并开始按“项目标准”整理结构
pubDate: 2026-06-23
category: AI技术
---


# LangChain 学习记录（Day 8）

## 今天的目标很明确

前几天一直在拆模块：

- embedding
- retriever
- rerank
- multi-query

今天开始做一件更实际的事：

把它们拼成一个完整项目，而不是“学习 demo”。

---

## 项目雏形（第一版）

先把整体流程固定下来：


Markdown文档
↓
Loader
↓
Text Splitter
↓
Embedding
↓
Vector DB（FAISS）
↓
Retriever（TopK）
↓
Multi-Query
↓
Rerank
↓
LLM
↓
回答


今天重点不是“加功能”，而是把结构整理清楚。

因为之前的问题是：

- 代码能跑
- 但一团乱
- 没有“系统感”

---

## 一、重新整理 RAG 的结构

今天做了一件比较关键的事：把整个流程拆成 3 层

---

### 1）数据层

文档来源：

- Markdown
- 笔记
- 博客

这一层只负责：

- 读数据
- 转 Document

---

### 2）检索层（核心）


Split → Embedding → Vector DB → Retriever


再加上优化：

- Multi-Query
- Rerank

这一层是整个系统最复杂的部分。

---

### 3）生成层


LLM + Prompt → 最终答案


这一层反而是最稳定的。

---

## 二、今天做的一个关键改动

之前是“写代码驱动流程”，今天改成：

先设计结构，再填代码

---

## 三、开始像“项目”而不是“练习”

今天整理的时候突然意识到一个变化：

以前写的是：

- 学习 LangChain 各个模块

现在变成：

- 做一个可以回答我博客内容的系统

---

## 四、RAG效果对比（很明显）

### 旧版本（Day5）

- 能搜到
- 但回答不稳定
- 经常跑偏

### Day8版本

增加：

- Multi-Query（扩大召回）
- Rerank（提升排序）
- chunk overlap 优化

效果：

- 命中率明显提升
- 答案更集中
- 噪音少很多

---

## 五、今天踩的坑

### 1. 模块太多开始乱

一开始代码结构是：

- 所有逻辑写在一个文件

结果：

- retriever 和 embedding 混在一起
- rerank 写在 notebook
- 后面完全不好维护

---

### 2. prompt 开始影响结果

同样的检索结果：

- 不同 prompt → 完全不同答案

说明：

> prompt 在 RAG 里影响比想象更大

---

### 3. chunk 策略比想象重要

稍微改一下：

- chunk size
- overlap

效果就会明显变化。

---

## 六、现在这个项目能做什么

目前系统已经可以：

- 读取本地 Markdown 博客
- 建立向量索引
- 支持语义搜索
- 支持多问法检索
- 返回相对稳定的回答

---

## 七、开始考虑“简历版本”

顺手整理了一下项目描述（初稿）：

### 项目名称
基于 LangChain 的个人知识库问答系统

### 功能

- 支持 Markdown 文档导入
- 基于 FAISS 构建向量检索
- 支持 Multi-Query 提升召回率
- 集成 Rerank 优化排序结果
- 支持基于上下文的问答生成

### 技术点

- LangChain
- Embedding（语义向量化）
- FAISS 向量数据库
- RAG 架构设计
- Retriever + Rerank pipeline

---

## 八、一个明显变化

到 Day8 的感觉已经不一样了：

以前：

- 我在学 LangChain

现在：

- 我在做一个信息检索系统

---

## 九、还缺什么

这个项目还不算完整工程，还缺：

- UI界面（目前是脚本）
- API封装（还没服务化）
- 评估指标（没有标准测试集）
- 日志系统（基本没有）

---

## 十、明天计划（Day9）

准备开始做：

- Agent 基础
- Tool 调用
- 或者把 RAG 封装成 API