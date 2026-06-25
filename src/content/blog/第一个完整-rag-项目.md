---
title: LangChain 学习记录（Day 8）：第一个完整 RAG 项目
description: 把前面几天的零散模块串成一个完整 RAG 系统，并开始按“项目标准”整理结构
pubDate: 2026-06-23
updatedDate: 2026-06-25
category: AI技术
---

# LearnLoop-AI 学习记录（Day 8）— RAG 检索链路系统化

> 前几天一直在拆模块：Embedding → Retriever → Rerank → Multi-Query
> 今天开始做一件更实际的事：**把它们拼成一个完整项目，而不是"学习 demo"。**

---

## 项目雏形（当前版本 v0.2.0）

先把整体流程固定下来：

```
用户输入（问题/主题）
     ↓
TaskRouter（意图识别 → Agent 分发）
     ↓
┌─ 数据层 ──────────────────────────┐
│  Markdown 笔记                     │
│  ↓ Loader（NoteAgent 生成）        │
│  ↓ Text Splitter（按 H1-H3 标题切分）│
│  ↓ Embedding（OpenAI / 本地 fallback）│
│  ↓ Vector DB（ChromaDB）           │
└────────────────────────────────────┘
     ↓
┌─ 检索层 ──────────────────────────┐
│  Retriever（TopK 语义检索）        │
│  ↓ 拼接上下文                      │
│  ↓ LLM 生成（带引用来源）           │
└────────────────────────────────────┘
     ↓
┌─ 生成层 ──────────────────────────┐
│  DeepSeek / OpenAI + Prompt        │
│  ↓ JSON 结构化输出（答案 + 来源 + 置信度）│
│  ↓ Streamlit 前端渲染              │
└────────────────────────────────────┘
```

今天重点不是"加功能"，而是把结构整理清楚。

因为之前的问题是：

- 笔记生成后只在内存里，没入库
- RAG 知识库永远是空的
- 检索返回的距离值前端显示为 0.00

---

## 一、重新整理 RAG 的结构

今天做了一件比较关键的事：把整个流程拆成 3 层

### 1）数据层

```python
# backend/app/services/note_service.py
# 完整写入链路：
NoteAgent 生成 Markdown
  → SQLite INSERT（notes 表）
  → split_markdown_by_headers()  # 按标题层级智能分块
  → llm_router.embed()           # 三级 fallback
  → vector_store.add_chunks()    # ChromaDB 持久化
```

关键文件：
- `backend/app/utils/chunking.py` — 按 H1-H3 标题切分
- `backend/app/db/vector_store.py` — ChromaDB 封装（add / search / delete_by_note）
- `backend/app/db/models.py` — SQLAlchemy 7 张表（Note / Quiz / ErrorLog / SM2State...）

### 2）检索层（核心）

```python
# backend/app/agents/retrieval_agent.py
# RAG 问答流程：
VectorDB.search(query, top_k)
  → 拼接上下文（标注来源标题）
  → LLM 生成 JSON（answer + sources + confidence）
  → _enrich_sources()  # 注入检索相关度分数
```

这一层是整个系统最复杂的部分。

目前检索链路的优化点：
- ✅ 语义检索（ChromaDB 向量查询）
- ✅ Embedding 三级 Fallback（OpenAI → 本地 sentence-transformers → 跳过）
- ✅ 相关度分数显示（距离值 → 0-1 相关度转换）
- ⬜ Multi-Query 扩展召回（待实现）
- ⬜ Rerank 重排序（待实现）

### 3）生成层

LLM + Prompt → 最终答案

这一层反而是最稳定的。

6 个 Agent 各司其职：
- **NoteAgent** — 结构化 Markdown 笔记生成
- **QuizAgent** — 4 种题型 + 3 档难度出题
- **RetrievalAgent** — RAG 知识库问答
- **GradingAgent** — 批改评分 + 错误分类
- **MemoryAgent** — 错题追踪 + 薄弱点分析
- **SchedulerAgent** — SM-2 间隔重复调度

---

## 二、今天做的一个关键改动：Embedding 三级 Fallback

之前是"有 OpenAI Key 才做 Embedding"，今天改成：

```
Tier 1: OpenAI text-embedding-3-small（1536 维，最优质量）
   ↓ 失败
Tier 2: 本地 sentence-transformers all-MiniLM-L6-v2（384 维，无需 API Key）
   ↓ 失败
Tier 3: 跳过 ChromaDB 写入（笔记仍存入 SQLite，RAG 返回"暂无相关内容"）
```

关键设计原则：**优雅降级** — Embedding 失败不阻塞用户流程。

---

## 三、开始做"项目"

今天整理的时候突然意识到一个变化：

| 以前 | 现在 |
|------|------|
| 写的是"学习各个 LLM 模块" | 做的是"一个可以持续积累知识的学习助手" |
| Agent 各自独立 | NoteService 编排完整写入链路 |
| API 返回 hardcoded `[]` | SQLite + ChromaDB 真实读写 |
| 前端 4 个 demo 页面 | 5 个页面 + 笔记管理（列表/详情/删除） |

---

## 四、RAG 效果对比（很明显）

### 旧版本（v0.1 MVP）
- 笔记生成后不存库 → RAG 永远搜不到
- 前端 `relevance_score` 字段不存在 → 永远显示 0.00

### v0.2 版本
修复：
- ✅ 笔记生成 → 自动分块 → Embedding → ChromaDB 入库
- ✅ 相关度分数：距离值 → `1/(1+distance)` 转 0-1 相关度
- ✅ LLM sources 注入检索 score（`_enrich_sources` 按 title 匹配）
- ✅ 前端显示真实相关度

效果：
- 命中率从 0% → 有笔记入库即可命中
- 来源标注清晰（笔记标题 + 得分）
- LLM 未返回 source 时 fallback 到检索结果

---

## 五、今天踩的坑

### 1. SQLAlchemy DetachedInstanceError

commit 后 session 关闭，对象属性不可访问。

**解决**：`sessionmaker(expire_on_commit=False)`

### 2. ChromaDB 距离值 ≠ 相关度

ChromaDB 返回的是 L2 距离（越小越相关），前端直接显示为 0.00。

**解决**：`_distance_to_relevance()` — `1.0 / (1.0 + abs(distance))`

### 3. 前后端字段名不一致

- VectorStore 返回 `score`
- 前端读 `relevance_score`

**解决**：统一为 `score`，RetrievalAgent 在 LLM 返回后自动注入

### 4. Prompt 影响比想象大

同样的检索结果，不同 Prompt → 完全不同回答。

说明：**Prompt 在 RAG 里影响比检索本身更大**。

### 5. Chunk 策略比想象重要

稍微改一下 chunk_size / overlap，效果就会明显变化。

当前策略：按 Markdown 标题层级（H1-H3）切分，保留章节结构。

---

## 六、现在这个项目能做什么

- ✅ 读取/生成 Markdown 学习笔记
- ✅ 自动建立向量索引（SQLite + ChromaDB）
- ✅ 支持语义搜索 + LLM 带引用回答
- ✅ Multi-Agent 协作（6 个 Agent 自动路由）
- ✅ LLM 多模型可切换（DeepSeek / OpenAI / Ollama）
- ✅ Streamlit 完整前端（5 页面）
- ✅ 笔记管理（列表分页 / 详情 / 删除）
- ✅ SM-2 间隔重复算法（待前端联动）

---

## 七、项目档案

项目名称
**LearnLoop-AI — AI 驱动的个性化学习助手**

核心理念
"学 → 练 → 测 → 记 → 复" 五步闭环

技术栈
- **后端框架:** FastAPI + Uvicorn
- **前端:** Streamlit（纯 Python）
- **LLM:** DeepSeek / OpenAI / Ollama（多模型路由）
- **Agent 框架:** 自研 BaseAgent + Orchestrator + Service Layer
- **向量数据库:** ChromaDB（语义检索）
- **关系数据库:** SQLite + SQLAlchemy（WAL 模式）
- **Embedding:** OpenAI / sentence-transformers（三级 Fallback）
- **文本切块:** 自研 Markdown Splitter（按标题层级）
- **调度算法:** SM-2 间隔重复

架构特点
- 6 个专业 Agent，TaskRouter 自动意图分发
- NoteService 编排完整持久化链路
- Embedding 三级优雅降级
- 前后端字段统一，类型安全

---

## 八、一个明显变化

到 v0.2 的感觉已经不一样了：

| 以前 | 现在 |
|------|------|
| 我在学 FastAPI / ChromaDB | 我在做一个学习知识管理系统 |
| Agent 是 demo | Agent 是真正在协作的系统组件 |
| API 返回假数据 | API 读写真实数据库 |

---

## 九、还缺什么（v0.3 → v1.0）

- ⬜ 文件上传入库（PDF/MD/TXT 解析 → 同 Chunk → Embed → ChromaDB 链路）
- ⬜ Multi-Query 扩展召回（提升覆盖）
- ⬜ Rerank 重排序（提升精度）
- ⬜ 错题本 + SM-2 遗忘曲线前端联动
- ⬜ 易混概念对自动检测
- ⬜ 评估指标（检索命中率、回答准确率测试集）
- ⬜ Docker 一键部署
- ⬜ JWT 用户认证