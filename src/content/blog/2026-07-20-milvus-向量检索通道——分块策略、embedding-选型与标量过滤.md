---
title: Milvus 向量检索通道——分块策略、Embedding 选型与标量过滤
pubDate: 2026-07-20
category: AI技术
---

# Milvus 向量检索通道——分块策略、Embedding 选型与标量过滤

> **系列**：云平台智能客服系统技术深度解析
> **关键词**：Milvus、文档分块、Embedding、DashScope、标量过滤、Collection Schema


---

## 一、为什么选择 Milvus？

| 维度 | Milvus | Chroma | FAISS | Pinecone |
|------|--------|--------|-------|----------|
| 分布式 | ✅ 原生 | ❌ 单机 | ❌ 库级别 | ✅ SaaS |
| 标量过滤 | ✅ 强大 | ⚠️ 基础 | ❌ | ✅ |
| 一致性 | ✅ 可配 | ❌ | N/A | ✅ |
| K8s 部署 | ✅ 友好 | ⚠️ | ❌ | N/A |
| 开源协议 | Apache 2.0 | Apache 2.0 | MIT | 闭源 |

对于企业级多租户场景，Milvus 的标量过滤能力是关键——我们需要按 `user_id`、`product_category`、`is_public` 等多维标签过滤检索结果。

---

## 二、分块策略：检索质量的基石

分块质量直接决定检索质量。本项目采用**分层分块**：

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter

# 第一层：按 Markdown 标题结构切分
header_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[("#", "h1"), ("##", "h2"), ("###", "h3")],
    strip_headers=True   # 每块携带上级标题 breadcrumb
)

# 第二层：语义切分（超长段落）
semantic_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=64,    # 12.5% 重叠保证跨块连续性
    separators=["\n\n", "\n", "。", "；", "，", " ", ""],
)
```

**参数选择依据**：
- `chunk_size=512`：检索精度与上下文完整度的平衡点；
- `chunk_overlap=64`：约 12.5% 重叠率，确保跨块的语义连续性；
- `strip_headers=True`：每块携带如 `# ECS 实例 > ## C7 系列` 的 breadcrumb，增强语义。

---

## 三、Embedding 模型选型

```python
from langchain_community.embeddings import DashScopeEmbeddings

embedding = DashScopeEmbeddings(
    model="text-embedding-v3",   # 阿里云最新 Embedding
    dimensions=1024               # 降维到 1024
)
```

**选择理由**：
1. **中文优化**——DashScope 在中文语义理解上优于多数开源模型；
2. **Matryoshka 表示**——原生支持 1024/512/256 维度输出，灵活平衡精度与存储；
3. **生态一致**——与 Qwen 大模型同一平台，无需额外鉴权配置。

---

## 四、Collection Schema 设计

```python
from pymilvus import CollectionSchema, FieldSchema, DataType

SCHEMA = CollectionSchema([
    FieldSchema("id", DataType.VARCHAR, max_length=64, is_primary=True),
    FieldSchema("embedding", DataType.FLOAT_VECTOR, dim=1024),
    FieldSchema("content", DataType.VARCHAR, max_length=4096),
    FieldSchema("source", DataType.VARCHAR, max_length=256),
    FieldSchema("product_category", DataType.VARCHAR, max_length=64),
    FieldSchema("chunk_type", DataType.VARCHAR, max_length=32),  # spec/faq/doc
    FieldSchema("is_public", DataType.BOOL),     # 公开知识 vs 内部资料
    FieldSchema("created_at", DataType.INT64),
])
```

每个标量字段都有明确用途：
- `product_category` → 按产品线过滤
- `chunk_type` → 按文档类型过滤（规格文档 vs FAQ vs 操作手册）
- `is_public` → 多租户数据隔离

---

## 五、混合检索：向量 + 标量过滤

```python
def hybrid_search(query: str, top_k: int = 5,
                  product_category: str = None) -> list:
    query_embedding = embedding.embed_query(query)

    # 构建过滤表达式
    filters = ["is_public == True"]
    if product_category:
        filters.append(f'product_category == "{product_category}"')

    results = collection.search(
        data=[query_embedding],
        anns_field="embedding",
        param={"metric_type": "COSINE", "params": {"nprobe": 16}},
        limit=top_k,
        expr=" && ".join(filters),
        output_fields=["content", "source", "chunk_type"]
    )

    return [{"content": h.entity.get("content"),
             "score": h.score,
             "source": h.entity.get("source")}
            for h in results[0]]
```

**`nprobe=16` 的选择**：Milvus IVF_FLAT 索引中，nprobe 控制搜索时探针数。16 在精确度和速度之间取得良好平衡——过低可能漏掉相关结果，过高则延迟增加。

---

## 本期核心要点

1. **分块策略决定检索上限**——按标题结构 + 语义边界的双层切分优于简单定长切分；
2. **标量字段不是装饰**——`product_category`、`is_public` 等标签是多租户安全和精准检索的基础；
3. **Embedding 选择要匹配场景**——中文客服场景需要中文优化的模型，而非盲目选最大的。

---


