---
title: LangChain 学习记录（Day 1）：从 Prompt 到 AI 应用框架
description: 记录 LangChain 学习第一天的内容，包括框架定位、核心组件以及与直接调用大模型 API 的区别
pubDate: 2026-06-13
category: AI技术
---

# LangChain 学习记录（Day 1）

## 学习目标

在学习 LangChain 之前，我已经能够通过 OpenAI 或 DeepSeek API 调用大模型完成简单问答任务。

但随着需求复杂度增加，我发现仅依靠 API 调用难以解决以下问题：

* Prompt 管理混乱
* 上下文难以维护
* 无法访问外部知识库
* 多步骤任务代码重复
* Agent 功能难以实现

因此开始学习 LangChain，希望理解现代 AI 应用框架的设计思想。

---

# 什么是 LangChain

官方定义：

> LangChain 是一个用于构建基于大语言模型应用程序的开发框架。

但从软件工程角度来看，我更倾向于这样理解：

```text
Spring Boot 是 Web 开发框架

LangChain 是 AI 应用开发框架
```

两者都不是业务本身。

而是帮助开发者管理复杂系统。

---

# 为什么需要 LangChain

最简单的大模型调用：

```python
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role":"user","content":"什么是机器学习"}
    ]
)
```

看起来很简单。

但如果要实现：

* 多轮对话
* 文档问答
* 联网搜索
* 工具调用
* 数据库查询

代码会迅速膨胀。

例如：

```text
用户问题
 ↓
搜索知识库
 ↓
提取相关内容
 ↓
拼接Prompt
 ↓
调用模型
 ↓
返回结果
```

这实际上已经形成了一条工作流。

LangChain就是专门解决这种问题的。

---

# LangChain 的核心思想

经过阅读文档后，我发现 LangChain 的核心思想与软件工程中的设计模式十分相似。

其本质是：

```text
组件化
模块化
可组合
```

例如：

```text
Prompt
 ↓
Model
 ↓
Parser
```

每个部分都可以独立替换。

类似于：

```text
Controller
 ↓
Service
 ↓
Repository
```

这样的分层架构。

---

# 第一次接触 PromptTemplate

最开始我觉得：

```python
f"回答问题：{question}"
```

已经够用了。

后来发现项目变大后：

* Prompt数量越来越多
* 参数越来越多
* 难以统一管理

因此 LangChain 提供：

```python
PromptTemplate
```

例如：

```python
template = """
你是一名计算机老师。

请回答：

{question}
"""
```

相比字符串拼接：

优势更明显：

* 可复用
* 可维护
* 结构清晰

这其实体现了软件工程中的封装思想。

---

# 我的思考

学习第一天最大的收获并不是学会了几个 API。

而是理解了：

```text
大模型 ≠ AI应用
```

很多人认为：

```text
调用 API
=
AI开发
```

实际上：

```text
AI开发
=
模型能力
+
工程能力
+
业务逻辑
```

未来企业真正需要的往往不是训练 GPT 的工程师。

而是能够利用现有模型构建业务系统的开发者。

---

# 今日总结

今天主要完成了：

* LangChain 环境搭建
* 理解框架定位
* 学习 PromptTemplate
* 理解组件化设计思想

最大的收获是认识到：

> LangChain 并不是为了让模型更聪明，而是为了让开发者更高效地构建 AI 应用。

下一步计划学习：

* Chain
* Runnable
* Output Parser
* Memory
