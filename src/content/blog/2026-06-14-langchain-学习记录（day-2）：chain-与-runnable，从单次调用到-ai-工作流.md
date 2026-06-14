---
title: LangChain 学习记录（Day 2）：Chain 与 Runnable，从单次调用到 AI 工作流
description: 学习 LangChain 中的 Chain 和 Runnable 机制，理解 AI 应用工作流的构建方式，以及与传统函数调用的区别
pubDate: 2026-06-14
category: AI技术
---


# LangChain 学习记录（Day 2）

## 学习目标

在 Day 1 中，我了解了 LangChain 的定位以及 PromptTemplate 的作用。

今天开始学习 LangChain 最重要的思想之一：

```text
Chain（链）
```

以及 LangChain Expression Language（LCEL）中的：

```text
Runnable
```

学习之前，我一直认为：

```text
用户输入
 ↓
大模型
 ↓
输出结果
```

就是 AI 应用的完整流程。

但随着学习深入，我发现实际项目远比这复杂。

---

# 为什么需要 Chain

先看一个简单场景：

用户提问：

```text
请介绍 Java 的特点。
```

最简单的实现：

```python
prompt
 ↓
LLM
 ↓
answer
```

这种方式适用于问答。

但如果用户要求：

```text
请生成一篇关于 Java 的文章，
然后总结成三个要点，
最后翻译成英文。
```

整个流程会变成：

```text
生成文章
 ↓
总结内容
 ↓
翻译结果
```

这实际上已经形成了多个步骤。

如果全部手动编写：

```python
step1()
step2()
step3()
```

代码很快会变得混乱。

因此 LangChain 引入了：

```text
Chain
```

用于组织多个 AI 任务。

---

# Chain 的本质

经过学习后，我发现 Chain 的思想其实并不复杂。

从软件工程角度来看：

```text
函数组合
+
流水线处理
```

就是 Chain 的核心。

例如：

```text
输入
 ↓
步骤A
 ↓
步骤B
 ↓
步骤C
 ↓
输出
```

类似 Linux 管道：

```bash
cat file.txt | grep java | sort
```

每个步骤独立完成自己的工作。

---

# Runnable 的出现

阅读新版文档时发现：

```text
LLMChain
ConversationChain
SequentialChain
```

很多旧版组件已经逐渐被弱化。

LangChain 推荐使用：

```text
Runnable
```

构建链式调用。

官方希望所有组件都遵循统一接口。

因此：

* PromptTemplate
* ChatModel
* Parser

本质上都属于 Runnable。

---

# 第一个 LCEL 示例

LangChain 提供了非常简洁的写法：

```python
prompt | model
```

例如：

```python
chain = prompt | model
```

执行流程：

```text
用户输入
 ↓
PromptTemplate
 ↓
ChatModel
 ↓
结果输出
```

如果继续增加：

```python
prompt | model | parser
```

流程变成：

```text
用户输入
 ↓
PromptTemplate
 ↓
ChatModel
 ↓
OutputParser
 ↓
最终结果
```

这让我想起了 Spring Boot 中的过滤器链。

---

# Output Parser

默认情况下：

模型返回的数据通常比较复杂。

例如：

```python
AIMessage(
    content="Java 是一种面向对象编程语言..."
)
```

实际项目中：

开发者往往只关心：

```text
Java 是一种面向对象编程语言...
```

因此需要：

```text
Output Parser
```

进行解析。

流程：

```text
模型输出
 ↓
Parser
 ↓
结构化数据
```

---

# Chain 的实际价值

学习过程中我尝试思考：

企业为什么需要 Chain？

假设开发一个智能客服。

用户问题：

```text
我的订单为什么还没发货？
```

系统可能需要：

```text
识别用户意图
 ↓
查询订单数据库
 ↓
获取物流信息
 ↓
组织回复内容
 ↓
生成答案
```

这显然不是一次模型调用能够完成的。

而是：

```text
多个步骤协同工作
```

Chain 正是为此设计的。

---

# RunnableParallel

除了串行执行。

LangChain 还支持：

```text
RunnableParallel
```

例如：

同时生成：

* 中文摘要
* 英文摘要

流程：

```text
原始文章
   ↓
 ┌──────┴──────┐
中文摘要    英文摘要
 └──────┬──────┘
        ↓
      输出
```

相比串行处理：

效率更高。

---

# RunnablePassthrough

学习过程中接触到了：

```text
RunnablePassthrough
```

作用：

保留原始输入。

例如：

```text
用户问题
 ↓
检索知识库
 ↓
保留原问题
 ↓
拼接Prompt
```

在后续 RAG 学习中会频繁使用。

---

# 从软件工程角度理解 Runnable

今天最大的收获是发现：

Runnable 的设计思想与面向对象设计非常相似。

它符合：

## SRP（单一职责原则）

每个组件只完成一个任务。

例如：

```text
Prompt负责构造提示词

Model负责生成结果

Parser负责解析结果
```

---

## OCP（开闭原则）

新增组件无需修改已有组件。

例如：

```text
Prompt
 ↓
Model
 ↓
Parser
```

未来增加：

```text
Prompt
 ↓
Model
 ↓
Parser
 ↓
Translator
```

无需修改原有代码。

---

## DIP（依赖倒置原则）

系统依赖 Runnable 抽象。

而不是具体实现。

因此：

```text
OpenAI
DeepSeek
Gemini
Claude
```

都可以自由替换。

---

# 实际开发中的应用

目前很多 AI 应用实际上都建立在 Chain 思想之上。

例如：

## AI 写作助手

```text
用户主题
 ↓
生成大纲
 ↓
生成正文
 ↓
润色内容
 ↓
最终文章
```

---

## AI 编程助手

```text
用户需求
 ↓
生成代码
 ↓
代码检查
 ↓
优化建议
 ↓
返回结果
```

---

## RAG 问答系统

```text
用户问题
 ↓
检索知识库
 ↓
获取相关文档
 ↓
构造Prompt
 ↓
生成答案
```

后续学习的 RAG 和 Agent 本质上也是更复杂的 Chain。

---

# 遇到的问题

## 官方文档更新较快

很多教程仍在使用：

```python
LLMChain
```

而新版推荐：

```python
prompt | model
```

导致学习资料存在版本差异。

---

## 组件较多

初次接触时容易混淆：

* Chain
* Runnable
* Agent
* Tool

需要逐步建立整体认知。

---

# 今日总结

今天主要学习了：

* Chain 的设计思想
* Runnable 统一接口
* LCEL 表达式
* Output Parser
* RunnableParallel
* RunnablePassthrough

最大的收获是认识到：

> LangChain 的核心并不是调用大模型，而是构建可维护、可扩展的 AI 工作流。

从软件工程角度来看，LangChain 更像一个 AI 应用开发框架，而 Chain 与 Runnable 则是这个框架的核心基础。

---

# 明日学习计划

* Memory
* Chat History
* Conversation Memory
* Message History
* 多轮对话实现原理

目标：

实现一个能够记住上下文的 AI 聊天助手。


![笔记图片](/images/posts/2026-06-14-vwpwj0.png)
