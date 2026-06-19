---
title: AI API Dashboard项目实施计划
description: 一个用于监控 AI API 使用情况的桌面工具。
pubDate: 2026-06-19
---

# AI API Dashboard

一个用于监控 AI API 使用情况的桌面工具。

最开始做这个项目，是因为平时会同时使用 DeepSeek、OpenAI 等多个平台。每个平台都有自己的后台页面，查看余额、Token 消耗和费用统计都比较麻烦，而且数据无法统一管理。

这个项目希望把这些信息集中到一个桌面应用里，在不打开浏览器的情况下就能查看：

* 账户余额
* Token 消耗
* API 调用记录
* 费用统计
* 模型使用情况
* 历史趋势图

后续还计划加入 API Gateway，实现统一转发、统一统计和成本分析。

---

# 功能

## 余额监控

支持查看各个平台的余额情况。

例如：

```text
DeepSeek    ¥128.35
OpenAI      $26.71
```

余额会定时刷新。

---

## Token 统计

统计：

* 今日 Input Token
* 今日 Output Token
* 本月 Input Token
* 本月 Output Token

方便了解实际使用情况。

---

## 请求记录

保存最近的 API 调用记录：

```text
时间
模型
Token
耗时
状态
```

例如：

```text
2026-06-19 13:24
deepseek-v4-flash
input: 1240
output: 388
latency: 1.6s
success
```

---

## 费用统计

根据模型价格自动计算费用。

支持：

* 今日费用
* 本周费用
* 本月费用

模型价格统一存储在数据库中，后续价格调整时无需修改代码。

---

## 图表

计划提供：

* Token 趋势图
* 费用趋势图
* 响应时间趋势图
* 模型使用占比图

用于观察长期使用情况。

---

## 余额提醒

当余额低于设定值时弹出通知。

例如：

```text
余额不足

当前余额：¥8.43

建议及时充值
```

---

# 技术选型

## 界面

使用 PyQt6。

负责：

* 悬浮窗
* 设置页面
* 系统托盘
* 图表展示

---

## 数据存储

使用 SQLite。

原因：

* 部署简单
* 无需额外安装数据库
* 方便打包

---

## 图表

使用 Matplotlib。

用于绘制：

* 折线图
* 柱状图
* 饼图

---

## 网络请求

使用 requests。

负责访问各平台接口并获取数据。

---

# 数据来源

项目的数据主要来自两部分。

## Provider API

用于获取：

* 账户余额
* 账户信息

目前计划支持：

* DeepSeek
* OpenAI

后续增加：

* Claude
* Gemini

---

## 本地埋点

用于记录：

* Token 消耗
* 请求次数
* 请求耗时
* 成功率

不同平台的数据格式并不统一，因此通过统一埋点进行统计。

---

# 项目结构

```text
ai-api-dashboard/

├── main.py
├── requirements.txt
│
├── app/
│
├── api/
│   ├── provider_base.py
│   ├── deepseek.py
│   └── openai.py
│
├── database/
│   ├── database.py
│   ├── models.py
│   └── repositories.py
│
├── services/
│   ├── monitor_service.py
│   ├── stats_service.py
│   └── alert_service.py
│
├── ui/
│   ├── main_window.py
│   ├── dashboard.py
│   └── settings.py
│
├── charts/
│
└── assets/
```

---

# 开发计划

## 第一阶段

先完成基础框架。

内容包括：

* 项目结构
* 配置管理
* 数据库
* 主窗口

目标是让程序能够正常启动。

---

## 第二阶段

接入 DeepSeek。

完成：

* API Key 配置
* 余额查询
* 自动刷新

---

## 第三阶段

实现 Dashboard。

完成：

* 余额展示
* Token 统计
* 请求记录

---

## 第四阶段

加入图表功能。

完成：

* Token 趋势图
* 费用趋势图
* 响应时间趋势图

---

## 第五阶段

实现悬浮窗和系统托盘。

支持：

* 窗口置顶
* 自动隐藏
* 开机启动

---

## 第六阶段

实现 SDK。

方便在自己的项目中接入统计功能。

示例：

```python
@tracker.track(
    provider="deepseek",
    model="deepseek-v4-flash"
)
def chat():
    pass
```

---

# 后续规划

## AI API Gateway

目前 Dashboard 负责展示和统计数据。

后续计划增加 Gateway 层。

架构如下：

```text
Client
  ↓
Gateway
  ↓
DeepSeek
OpenAI
Claude
Gemini
```

所有请求先进入 Gateway，再转发到对应平台。

---

## 统一调用

例如：

```python
client.chat(
    model="gpt-5"
)
```

由 Gateway 自动完成路由。

开发者不需要关心底层平台差异。

---

## 统一统计

自动记录：

* Token
* 响应时间
* 请求次数
* 花费
* 错误率

所有数据统一进入 Dashboard。

---

## 智能路由

根据任务类型自动选择模型。

例如：

```text
简单问答
↓
DeepSeek

复杂推理
↓
Claude

代码任务
↓
GPT
```

在效果和成本之间寻找平衡。

---

## 请求缓存

缓存重复请求。

减少 Token 消耗和响应时间。

---

## 成本分析

统计：

* 每个模型的费用
* 每个项目的费用
* 每个用户的费用

方便长期管理和优化。

---

# 项目目标

最开始只是希望解决查看余额和统计数据不方便的问题。

如果后续功能逐步完善，希望它能够从一个简单的桌面工具发展成一套完整的 AI 开发辅助平台。

规划路线：

```text
Dashboard
↓
API Gateway
↓
模型路由
↓
成本分析
↓
Agent 监控
```

一步一步把常用的 AI 开发工具整合到同一个平台中。

```
```
