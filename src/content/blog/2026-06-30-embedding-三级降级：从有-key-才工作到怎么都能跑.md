---
title: 'Embedding 三级降级：从"有 Key 才工作"到"怎么都能跑"'
description: 这个项目的 Embedding 方案，经历的三次迭代
pubDate: 2026-06-30
---

Embedding 三级降级：从"有 Key 才工作"到"怎么都能跑"

这个项目的 Embedding 方案，经历了三次迭代，每次都踩了新坑。

## 第一版：只用 OpenAI

最初的设计很简单：

```python
async def embed(self, texts):
    return await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
```

有 API Key → 能跑。没 API Key → 整个 RAG 功能不可用。

问题是这个项目定位是本地学习工具，不是 SaaS。逼用户去注册 OpenAI、绑信用卡、拿 Key，然后才能用自己本地的笔记搜索？门槛太高了。

## 第二版：加本地模型 fallback

想到用 sentence-transformers 做备选：

```python
async def embed(self, texts):
    if "openai" in self._providers:
        try:
            return await openai_embed(texts)
        except Exception:
            pass
    # fallback 到本地
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
    return model.encode(texts).tolist()
```

看着没问题对吧？

坑在 **Embedding 维度不一样**。

- OpenAI `text-embedding-3-small` 输出 **1536 维**
- `all-MiniLM-L6-v2` 输出 **384 维**

ChromaDB 在创建 Collection 时不强制声明维度，但第一次写入的 Embedding 会锁定这个维度。如果你第一次用 OpenAI 写入了 1536 维的向量，后面用本地模型写入 384 维的，ChromaDB 不会报错——但如果 1536 维和 384 维的向量混在同一个 Collection 里，检索行为完全不可预测。

**怎么办？** 两种方案：

方案 A：创建两个 Collection（`knowledge_chunks_openai` 和 `knowledge_chunks_local`），按当前使用的 Embedding 模型路由。

方案 B：用一个 Collection，但只允许用一种 Embedding 来源，另一边做降级通知。

我选了方案 B——**不是技术原因，是产品原因**。这个项目的目标用户是学习者，不是 AI 工程师。让他们理解"为什么同一个知识库有些笔记能搜到有些搜不到"是不可能的。

实际做法：只要最开始用了 OpenAI Embedding，后续就必须保持一致。本地 fallback 的定位是"当 OpenAI 不可用时给个通知，而不是混用"。

## 第三版：三级优雅降级（最终方案）

结合前两次的经验，最终的 Embedding 路由长这样：

```python
async def embed(self, texts: list[str]) -> list[list[float]]:
    # Tier 1: OpenAI text-embedding-3-small（1536 维，最优质量）
    if "openai" in self._providers:
        try:
            return await self._providers["openai"].embed(texts)
        except Exception as e:
            print(f"[WARN] OpenAI embedding 失败: {e}，尝试本地 fallback...")

    # Tier 2: 本地 sentence-transformers（384 维，无需 API Key）
    try:
        return await self._embed_local(texts)
    except Exception as e:
        print(f"[WARN] 本地 embedding 失败: {e}")

    # Tier 3: 彻底放弃 Embedding
    raise RuntimeError(
        "没有可用的 Embedding Provider！\n"
        "  - 配置 OPENAI_API_KEY 使用 OpenAI Embedding\n"
        "  - 或安装 sentence-transformers: pip install sentence-transformers"
    )
```

而 NoteService 的写入链路对这层做了保护：

```python
# note_service.py
try:
    embeddings = await llm_router.embed(chunk_texts)
    await vector_store.add_chunks(chunks=chunks, embeddings=embeddings, ...)
except Exception as e:
    print(f"[WARN] Embedding/ChromaDB 写入失败: {e}")
    print(f"       笔记 '{title}' 已存入 SQLite，但未建立向量索引")
    # 不抛出异常，笔记仍然存入 SQLite
```

核心设计原则：**Embedding 失败不阻塞用户流程。**

- OpenAI 挂了 → 自动切本地模型
- 本地模型也没装 → 笔记照存 SQLite，只是搜不到
- RAG 问答时没检索结果 → LLM 告知用户"暂无相关内容"

## 教训

1. **维度不匹配是向量数据库的第一大坑。** 同一个 Collection 混入不同维度的向量，数据库不会报错，但检索结果完全错乱。这个问题 ChromaDB 0.6.x 仍然没有在写入时做强校验。
2. **优雅降级不是"优雅报错"。** 降级的目的是让用户无感知，而不是换一种方式告诉用户"出错了"。笔记仍然能存、能看，只是暂时搜不到——这比直接拒绝写入好得多。
3. **懒加载是本地大模型的正确打开方式。** `_embed_local` 里的 `SentenceTransformer` 模型是懒加载 + 缓存的——不用的时候不占内存，第一次用时才下载加载。这对本地应用很重要，毕竟 `all-MiniLM-L6-V2` 也有 80MB+。
