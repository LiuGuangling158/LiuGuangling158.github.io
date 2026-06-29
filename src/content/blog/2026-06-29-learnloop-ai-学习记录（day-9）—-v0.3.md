---
title: LearnLoop-AI 学习记录（Day 9）— v0.3
description: 文件上传、检索增强、前端缺的页面，一口气搞完。
pubDate: 2026-06-29
category: AI技术
---

# LearnLoop-AI 学习记录（Day 9）— v0.3

> 今天没学什么新东西，主要是把 v0.2 的坑填了。
> 文件上传、检索增强、前端缺的页面，一口气搞完。

---

## 文件上传（终于不是 TODO 了）

之前 `/api/v1/rag/upload` 一直是个 TODO 桩，返回 "文件上传功能待实现"。

今天把它做了。

流程不复杂：

```
上传 PDF/MD/TXT → FileService 提取文本 → 扔给 NoteService.save_note()
→ 分块 → Embedding → ChromaDB → 完事
```

FileService 里 PDF 用 PyMuPDF（fitz）逐页提取，MD 和 TXT 直接 decode。本来以为要装新依赖，结果一看 requirements.txt，`pymupdf==1.25.0` 早就躺在那了——之前搭骨架的时候顺手加的吧，现在直接用。

然后上传文档走的是跟 AI 生成笔记完全一样的入库链路。为啥要另起一套呢？分块、向量化、存 ChromaDB，这些步骤一模一样。唯一的区别是 `source_type` 字段标成 `"uploaded"`，方便前端区分。

对应的 API 端点补了四个：`/rag/upload`、`/rag/sources`、`/rag/sources/{id}` DELETE、`/rag/stats`。

---

## 检索增强：多加几层试试

Day 8 的检索是单 query 直接搜 ChromaDB。能用，但总感觉不够——用户问的问题跟笔记里的措辞往往对不上。

加了两个东西：

**Multi-Query 扩展。** 在搜之前，让 LLM 把用户问题改写成几个不同角度的 query。比如用户问 "V&V 的区别"，LLM 可能会生成 "软件测试中验证与确认的区别"、"Verification vs Validation in ISTQB" 之类的变体。然后每个 query 都去 ChromaDB 搜一遍，结果去重合并。

效果说实话不稳定——有时候变体 query 质量很高能多召回不少东西，有时候 LLM 瞎编几个差不多的问题没什么增量。反正失败了就退回单 query，成本也不高，聊胜于无。

**Rerank 重排序。** 向量检索返回的 Top-K 按距离排，但距离近不代表真的最相关。把前 15 个 chunk 扔给 LLM 按 0-10 打分重排，取 Top-5。每个 chunk 截断到 500 字符，一次调用也就千把 token。

本来想用 Cross-Encoder 模型做重排，但 bge-reranker 要下 1.3G 的模型。算了，LLM 打分够用了，反正检索出来的候选也就那么几个。

RetrievalAgent 的 execute 方法现在变成了：

```
单 query → expand(3变体) → 并行搜索 → 合并去重 → rerank(取Top-5) → LLM生成
```

以及每层都套了 try/except + fallback——扩展失败退回单 query，重排失败保留原顺序。反正不能让增强功能把主流程搞崩。

---

## 修了三个 Bug

**ChromaDB 删除问题。** `note_service.py` 里 `delete_note` 是同步方法，但删 ChromaDB 用了 `asyncio.create_task()`。这叫"射后不管"——task 可能没跑完方法就 return 了，ChromaDB 里的向量数据删不掉。改成 `async def delete_note` + `await vector_store.delete_by_note()`，乖乖等它跑完。然后调用链往上蹿——`notes.py` 的 handler 也得加 await。

async 这玩意就是这样，改一个方法签名，一路传染到最外层。

**Quiz 不入库。** 之前 Quiz Agent 出完题前端展示一下就没了，数据库里不留痕。生成的时候顺手写一下 quizzes 表。

**错题不入库。** 提交答案批改完，错误的题目也没存。现在 `/quiz/{id}/submit` 批改后自动把错题写进 error_log 表，前端错题本就能直接查了。

---

## 前端加了两页

从 5 个页面扩到 7 个：

**知识库管理页。** 上面四个统计卡片（总文档/AI生成/上传/向量块），中间文件上传区域，下面已上传文档列表。上传支持 PDF/MD/TXT，可以自定义标题。这页其实主要是给 `/rag/upload` 和 `/rag/sources` 配个前端。

**错题本页。** 三个统计数字（总错题/未解决/已掌握），然后按知识点分组展示错题。每条错题显示你的答案 vs 正确答案，还有个"我已掌握"按钮，点了调 `/quiz/errors/{id}/resolve`。

笔记列表页也加了搜索框和来源过滤（全部/AI生成/上传的），后端走 SQL LIKE 模糊匹配。空列表不再是干巴巴的"暂无数据"，而是告诉用户下一步该干嘛。

---

## 新增的 API 端点

- `POST /rag/upload` — 上传文件入库
- `GET /rag/sources` — 知识库文档列表
- `DELETE /rag/sources/{note_id}` — 删除上传的文档
- `GET /rag/stats` — 统计信息
- `GET /notes/search` — 笔记搜索+过滤
- `GET /quiz/history` — 做题历史（之前返空数组）
- `GET /quiz/errors/list` — 错题列表
- `PUT /quiz/errors/{error_id}/resolve` — 标记已掌握

从 12 个端点涨到 20 个。大部分是之前留的 TODO，今天一口气填了。

---

## 几点零散的想法

1. 文件上传直接复用 NoteService 的入库链路，不用重写。项目里如果有一条"中轴线"，新功能往上挂就行，别每次都另起炉灶。

2. 优雅降级这个东西，单独看每个 fallback 好像多此一举，但堆在一起系统就稳了。Embedding 失败、Query 扩展失败、Rerank 失败——都不会让用户看到 500。

3. LLM 当 Reranker 用其实还行，比想象中靠谱。主要是零成本接入，不用下模型不用部署新服务。当然如果以后检索量大了还是得正经上一个 Reranker 模型。

4. 前端页面多了之后开始觉得 Streamlit 单文件有点撑了。目前 7 个页面全塞在一个 500 行的 py 文件里，翻起来有点累。后面页数再涨可能得拆。

---

## 项目状态

| 项目 | v0.2 | v0.3 |
|------|------|------|
| API 端点 | 12 | 20 |
| 前端页面 | 5 | 7 |
| RAG 检索 | 单 query | Multi-Query + Rerank |
| 文件上传 | ❌ | ✅ |
| 错题本 | 仅 DB 模型 | 前后端联动 |
| Quiz | 不存库 | 入库+历史 |

---