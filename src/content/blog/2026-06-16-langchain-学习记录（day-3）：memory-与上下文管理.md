---
title: LangChain 学习记录（Day 3）：Memory 与上下文管理
description: 学习 LangChain 中的 Memory、Chat History 和上下文管理机制，理解多轮对话背后的实现原理
pubDate: 2026-06-16
category: AI技术
---


# LangChain 学习记录（Day 3）

## 学习目标

前两天主要学习了：

* PromptTemplate
* Chain
* Runnable
* LCEL

能够实现：

```text
用户提问
 ↓
Prompt
 ↓
LLM
 ↓
回答
```

但是很快发现一个问题。

---

# AI 真的记住了对话吗？

先看下面这个例子：

第一轮：

```text
用户：
我叫流光
```

模型回答：

```text
你好，流光！
```

第二轮：

```text
用户：
我叫什么名字？
```

如果直接调用 API：

```python
response = model.invoke("我叫什么名字")
```

模型大概率会回答：

```text
我不知道你的名字。
```

因为模型实际上根本没有记忆。

---

## 一个常见误区

很多人第一次使用 ChatGPT 时会认为：

```text
ChatGPT 记住了我的对话
```

实际上并非如此。

大模型本身没有长期记忆。

每次请求时：

```text
历史消息
+
当前消息
↓
发送给模型
↓
模型生成回答
```

模型只是看到了完整上下文。

因此产生了：

```text
它记得我
```

的错觉。

---

# 什么是 Context（上下文）

上下文可以理解为：

```text
当前对话的全部信息
```

例如：

```text
用户：
我是一名软件工程学生。

AI：
好的。

用户：
我学什么语言比较好？
```

如果第二句话单独发送：

```text
我学什么语言比较好？
```

信息是不完整的。

而带上历史记录：

```text
我是一名软件工程学生。

我学什么语言比较好？
```

模型就能给出更加准确的回答。

---

# Memory 的本质

学习 LangChain 后发现：

Memory 本质上并不是记忆。

而是：

```text
上下文管理器
```

负责：

* 保存历史消息
* 组织上下文
* 控制 Token 消耗
* 向模型提供历史信息

从软件工程角度看：

```text
Memory
=
会话状态管理
```

类似 Web 开发中的：

```text
Session
Cookie
Redis
```

---

# ChatMessageHistory

最基础的记忆组件：

```python
from langchain_community.chat_message_histories import ChatMessageHistory
```

作用：

```text
保存聊天记录
```

例如：

```text
Human:
你好

AI:
你好

Human:
我学习 Java
```

都会被记录下来。

结构类似：

```text
messages = [
    HumanMessage(),
    AIMessage(),
    HumanMessage()
]
```

---

# 对话系统的实现原理

以前认为：

```text
用户
↓
模型
↓
回答
```

就完成了聊天。

实际上真实流程更像：

```text
用户
 ↓
历史记录
 ↓
Prompt拼接
 ↓
LLM
 ↓
生成回复
 ↓
保存历史
```

形成循环：

```text
问
 ↓
答
 ↓
保存
 ↓
再问
```

---

# ConversationBufferMemory

最简单的 Memory。

工作方式：

```text
保存全部聊天记录
```

例如：

```text
用户：
你好

AI：
你好

用户：
我叫流光

AI：
好的

用户：
我叫什么？
```

发送给模型的内容实际上是：

```text
用户：你好
AI：你好

用户：我叫流光
AI：好的

用户：我叫什么？
```

因此模型能够回答：

```text
你叫流光。
```

---

# Buffer Memory 的问题

刚开始看起来很好。

但很快会出现问题：

```text
Token 爆炸
```

假设连续聊天：

```text
100轮
200轮
300轮
```

上下文会越来越长。

最终：

* 响应变慢
* 成本增加
* 超出上下文窗口

---

# ConversationSummaryMemory

为了解决长对话问题。

LangChain 提供：

```text
Summary Memory
```

思路：

```text
旧对话
 ↓
自动总结
 ↓
压缩保存
```

例如：

原始记录：

```text
用户学习Java

用户学习SpringBoot

用户准备实习面试

用户开发个人博客
```

压缩后：

```text
用户是一名软件工程学生，
正在学习Java并开发个人项目。
```

大幅减少 Token 消耗。

---

# Token 为什么重要

学习过程中逐渐意识到：

很多 AI 应用问题本质上都是：

```text
Token问题
```

因为：

```text
Token
=
成本
=
性能
```

例如：

GPT 模型：

```text
上下文越长
↓
费用越高
↓
速度越慢
```

因此：

优秀的 AI 工程师不仅关注模型能力。

更关注：

```text
如何管理上下文
```

---

# Memory 与数据库

看到这里我产生一个思考：

如果用户聊天一年呢？

显然：

```text
不能全部放进上下文
```

因此企业级方案通常会：

```text
短期记忆
+
长期记忆
```

---

## 短期记忆

保留最近几十轮对话。

例如：

```text
最近20轮
```

存放在：

```text
内存
Redis
```

---

## 长期记忆

重要信息存储到：

```text
MySQL
向量数据库
知识库
```

例如：

```text
用户喜欢动漫

用户学习Java

用户准备实习
```

需要时再检索出来。

---

# Memory 与 RAG 的联系

学习过程中发现：

Memory 和 RAG 非常相似。

Memory：

```text
从历史对话检索信息
```

RAG：

```text
从知识库检索信息
```

本质都是：

```text
检索
+
上下文增强
```

区别只是数据来源不同。

---

# 从软件工程角度理解 Memory

今天最大的收获是：

Memory 并不是 AI 独有的概念。

它本质上就是：

```text
状态管理
```

在传统开发中：

```text
用户登录状态
购物车状态
会话状态
```

都属于状态管理。

在 AI 应用中：

```text
聊天历史
用户偏好
长期记忆
```

同样属于状态管理。

---

# 实际项目中的应用

## AI 学习助手

记录：

```text
用户学习进度
用户掌握知识点
用户历史问题
```

实现个性化辅导。

---

## AI 客服

记录：

```text
订单信息
用户身份
历史咨询内容
```

避免重复提问。

---

## AI Agent

记录：

```text
任务目标
执行步骤
工具调用结果
```

支持复杂任务规划。

---

# 遇到的问题

## Memory 并非真正记忆

刚开始以为：

```text
Memory = AI拥有记忆
```

后来发现：

本质上仍然是 Prompt 工程。

只是自动化程度更高。

---

## 长对话成本高

上下文越长：

* Token越多
* 响应越慢
* 成本越高

需要合理设计记忆策略。

---

# 今日总结

今天主要学习了：

* Context（上下文）
* ChatMessageHistory
* ConversationBufferMemory
* ConversationSummaryMemory
* Token管理
* 对话系统实现原理

最大的收获是认识到：

> AI 并没有真正的记忆能力，所谓“记住用户”本质上是对历史信息的管理与利用。

从软件工程角度来看，Memory 更像是 AI 系统中的状态管理模块，而不是传统意义上的记忆系统。

---

# 明日学习计划

* Document Loader
* Text Splitter
* Embedding
* Vector Store
* RAG 基础架构


![笔记图片](/images/posts/2026-06-16-rd0tfj.png)