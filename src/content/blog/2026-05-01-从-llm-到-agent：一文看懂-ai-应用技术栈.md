---
title: 从 LLM 到 Agent：一文看懂 AI 应用技术栈
pubDate: 2026-05-01
category: AI技术
---

# 从 LLM 到 Agent：一文看懂 AI 应用技术栈

很多人在学习 AI Agent、RAG、LangChain 时，会感觉接触到一堆新名词：

* LLM
* Prompt
* Agent
* Tool Calling
* MCP
* RAG
* Embedding
* Vector Database
* LangChain
* LangGraph

实际上，这些技术并不是孤立存在的，而是一层层叠加，为 AI 系统不断增强能力。

整体关系如下：

```text
LLM
 ↓
Prompt
 ↓
Agent
 ↓
Tool Calling / MCP
 ↓
RAG
 ↓
Embedding
 ↓
Vector Database
 ↓
LangChain / LangGraph
```

---

# 一、LLM（Large Language Model）

常见模型：

* GPT
* Qwen
* DeepSeek

## 本质

大语言模型的核心工作其实非常简单：

```text
输入文本
 ↓
预测下一个 Token
 ↓
输出文本
```

例如：

```text
北京是中国的
```

模型预测：

```text
首都
```

不断重复这个过程，最终生成完整回答。

---

## LLM 的能力

大模型擅长：

* 文本生成
* 内容总结
* 逻辑推理
* 代码生成
* 问答对话

例如：

```text
解释什么是数据库索引
```

模型可以直接给出答案。

---

## LLM 的局限

大模型本身不会：

* 查询实时天气
* 访问数据库
* 搜索网页
* 读取本地文件
* 调用第三方 API

因此需要额外能力来扩展。

---

# 二、Prompt

Prompt 可以理解为：

> 给模型下达的指令。

例如：

```text
你是一名 Java 老师，请解释什么是多线程。
```

---

## Prompt 决定什么？

Prompt 会影响：

* 模型角色
* 输出格式
* 回答风格
* 任务目标

例如：

```text
使用表格回答
```

和：

```text
使用通俗语言回答
```

得到的结果完全不同。

---

## Prompt 与 LLM 的关系

```text
Prompt
 ↓
LLM
 ↓
Answer
```

可以简单理解为：

```text
Prompt = 指令
LLM = 大脑
```

---

# 三、Agent

传统聊天模式：

```text
用户
 ↓
LLM
 ↓
回答
```

Agent 模式：

```text
用户
 ↓
分析任务
 ↓
制定计划
 ↓
调用工具
 ↓
观察结果
 ↓
继续执行
 ↓
返回结果
```

---

## 什么是 Agent？

Agent 可以理解为：

> 具备行动能力的大模型。

它不仅会思考，还会执行任务。

例如：

```text
帮我总结这份 PDF 并翻译成中文
```

Agent 可能会：

```text
读取 PDF
 ↓
提取内容
 ↓
调用翻译工具
 ↓
整理结果
```

最终完成整个流程。

---

# 四、Tool Calling

Agent 想要执行任务，就必须学会使用工具。

常见工具包括：

* 搜索引擎
* 浏览器
* Python 解释器
* 数据库
* API 服务

---

## Tool Calling 流程

```text
LLM
 ↓
决定调用哪个工具
 ↓
执行工具
 ↓
获得结果
 ↓
继续推理
```

例如：

```text
查询新加坡天气
```

模型可能生成：

```json
{
  "tool": "weather",
  "city": "Singapore"
}
```

程序收到后调用天气接口，再把结果返回给模型。

---

# 五、MCP

MCP 全称：

```text
Model Context Protocol
```

可以理解为：

> AI 世界的统一接口标准。

---

## 为什么需要 MCP？

没有 MCP：

```text
模型A -> API1
模型B -> API2
模型C -> API3
```

每个模型都有自己的接入方式。

---

有 MCP：

```text
模型
 ↓
MCP
 ↓
各种工具
```

统一规范后，模型和工具之间的连接更加简单。

---

## MCP 与 Tool Calling 的关系

```text
Tool Calling = 功能
MCP = 标准
```

Tool Calling 解决：

```text
怎么调用工具
```

MCP 解决：

```text
如何统一调用工具
```

---

# 六、RAG

RAG 全称：

```text
Retrieval Augmented Generation
```

即：

```text
检索增强生成
```

---

## 为什么需要 RAG？

很多知识不在模型训练数据中，例如：

* 企业内部文档
* 产品手册
* 学校规定
* 法律法规

此时需要先检索资料，再让模型回答。

---

## RAG 流程

```text
用户问题
 ↓
检索相关资料
 ↓
获取相关内容
 ↓
交给 LLM
 ↓
生成答案
```

例如：

```text
我的毕业设计要求是什么？
```

系统会：

```text
搜索毕业设计文档
 ↓
找到相关内容
 ↓
提供给模型
 ↓
生成答案
```

---

# 七、Embedding

Embedding 是 RAG 的核心技术之一。

---

## 问题

例如：

```text
电脑
计算机
Computer
```

字面完全不同。

如何知道它们语义接近？

---

## Embedding 的作用

Embedding 会把文本转换成向量。

例如：

```text
电脑
```

变成：

```text
[0.13, 0.57, 0.88, ...]
```

---

```text
计算机
```

变成：

```text
[0.15, 0.54, 0.90, ...]
```

由于向量距离很近：

```text
电脑 ≈ 计算机
```

系统就能理解语义相似性。

---

# 八、Vector Database（向量数据库）

Embedding 会产生大量向量。

这些向量需要存储和检索。

因此出现了向量数据库。

常见产品：

* Milvus
* Qdrant
* Weaviate

---

## 与传统数据库的区别

传统数据库：

```sql
WHERE id = 100
```

属于精确匹配。

---

向量数据库：

```text
查找与“人工智能”最相似的内容
```

属于语义匹配。

---

## 与 Embedding 的关系

```text
Embedding
 ↓
生成向量

Vector Database
 ↓
存储向量
 ↓
检索向量
```

二者通常一起使用。

---

# 九、LangChain

当 AI 应用逐渐复杂时：

```text
Prompt
LLM
RAG
Memory
Tool
Agent
```

全部手写会变得非常繁琐。

于是出现 LangChain。

---

## LangChain 是什么？

可以理解为：

> AI 应用开发工具箱。

它提供了大量现成组件：

* Prompt 管理
* Tool 管理
* Memory 管理
* RAG 流程
* Agent 框架

帮助开发者快速搭建 AI 应用。

---

# 十、LangGraph

随着 Agent 进一步复杂化：

* 多步骤任务
* 多 Agent 协作
* 长流程工作流

LangChain 已经不容易管理。

于是出现 LangGraph。

---

## LangGraph 的核心思想

把 Agent 流程表示为图结构。

例如：

```text
开始
 ↓
搜索资料
 ↓
总结内容
 ↓
检查质量
 ↓
返回结果
```

---

## 本质

LangGraph：

```text
状态机
+
Agent 工作流
```

特别适合构建复杂 Agent 系统。

---

# 最终关系图

完整技术栈如下：

```text
用户
 ↓
Prompt
 ↓
LLM
 ↓
Agent
 ↓
Tool Calling
 ↓
MCP
 ↓
各种工具
```

如果需要知识库：

```text
Agent
 ↓
RAG
 ↓
Embedding
 ↓
Vector Database
 ↓
检索结果
 ↓
LLM
 ↓
生成答案
```

开发时：

```text
LangChain
 ↓
管理 Agent

LangGraph
 ↓
管理复杂工作流
```

---

# 一句话理解整个技术栈

```text
LLM        = 大脑
Prompt     = 指令
Agent      = 行动能力
Tool       = 手脚
MCP        = 工具标准
RAG        = 外部知识
Embedding  = 语义编码
Vector DB  = 知识仓库
LangChain  = 开发框架
LangGraph  = 工作流引擎
```

从本质上看，这些技术并不是互相竞争的关系，而是在同一个 AI 系统中承担不同职责，共同构建出真正可用的智能应用。
