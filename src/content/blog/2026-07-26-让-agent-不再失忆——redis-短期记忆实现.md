---
title: '让 Agent 不再"失忆"——Redis 短期记忆实现'
pubDate: 2026-07-26
category: AI技术
---

# 让 Agent 不再"失忆"——Redis 短期记忆实现

> **系列**：云平台智能客服系统技术深度解析
> **关键词**：短期记忆、Redis 会话管理、消息持久化、双层记忆


---

## 一、对话系统的"失忆症"

标准 LLM 对话系统每次新会话都是白纸：

```
用户（第1次）：我是电商运维，主要用 C7 系列 ECS 做 Web 服务
Agent：好的，了解了。

—— 30 分钟后，新会话 ——

用户（第2次）：帮我推荐一款适合我业务的实例
Agent：好的，请问您是什么行业？主要用途是什么？
用户：...我刚说过了啊。😤
```

这种体验很差。**双层记忆系统**就是让 Agent 拥有"记住"的能力。

---

## 二、双层记忆架构总览

```
短期记忆 (Redis)
├── 会话级隔离：user:{user_id}:session:{session_id}
├── TTL：30分钟
├── 存储：最近 50 条消息
└── 作用：会话内连续性

        │ 会话结束时触发
        ▼

长期记忆 (Milvus)
├── 用户级隔离：filter by user_id
├── 持久化存储
├── 存储：向量化的用户偏好
└── 作用：跨会话用户画像
```

---

## 三、Redis 短期记忆实现

```python
import json, uuid
from datetime import timedelta
import redis.asyncio as aioredis
from langchain_core.messages import HumanMessage, AIMessage


class ShortTermMemory:
    SESSION_TTL = timedelta(minutes=30)
    MAX_MESSAGES = 50  # 保留最近 50 条

    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client

    async def create_session(self, user_id: str) -> str:
        session_id = str(uuid.uuid4())
        key = f"session:{user_id}:{session_id}:messages"
        await self.redis.expire(key, self.SESSION_TTL)
        return session_id

    async def add_message(self, user_id: str, session_id: str, message):
        key = f"session:{user_id}:{session_id}:messages"

        serialized = json.dumps({
            "type": message.type,
            "content": message.content,
            "timestamp": datetime.now().isoformat(),
        }, ensure_ascii=False)

        await self.redis.rpush(key, serialized)
        await self.redis.expire(key, self.SESSION_TTL)  # 活跃时自动续期

        # 只保留最近 N 条
        await self.redis.ltrim(key, -self.MAX_MESSAGES, -1)

    async def get_messages(self, user_id: str, session_id: str, limit=20):
        key = f"session:{user_id}:{session_id}:messages"
        raw = await self.redis.lrange(key, -limit, -1)

        messages = []
        for r in raw:
            data = json.loads(r)
            if data["type"] == "human":
                messages.append(HumanMessage(content=data["content"]))
            elif data["type"] == "ai":
                messages.append(AIMessage(content=data["content"]))
        return messages

    async def get_conversation_summary(self, user_id: str, session_id: str) -> str:
        """获取会话摘要——供长期记忆提取使用"""
        messages = await self.get_messages(user_id, session_id, limit=30)
        parts = []
        for msg in messages:
            role = "用户" if msg.type == "human" else "助手"
            content = msg.content[:300] + "..." if len(msg.content) > 300 else msg.content
            parts.append(f"[{role}]: {content}")
        return "\n".join(parts)
```

---

## 四、关键设计决策

### 为什么是 30 分钟 TTL？

- **太长（2 小时）**：Redis 内存压力大，且跨会话的短期间隔通常不超过 30 分钟
- **太短（5 分钟）**：用户可能短暂离开就丢失对话上下文
- **30 分钟**：覆盖大多数用户的自然会话间隔

### 为什么活跃时自动续期？

`await self.redis.expire(key, self.SESSION_TTL)` ——每次新消息都刷新 TTL。用户持续对话时不会因固定过期时间而突然丢失上下文。

### 为什么只保留最近 50 条？

LLM 上下文窗口虽然越来越大（Qwen 支持 128K），但过长的对话历史会稀释关键信息并增加推理成本。50 条消息覆盖了多数会话所需的信息量。

---

## 核心要点

1. **短期记忆的核心诉求是"会话连续性"**——30 分钟内用户无需重复说相同的事；
2. **Redis 的 TTL 机制天然适合会话管理**——自动过期 + 活跃续期；
3. **短期记忆是长期记忆的"原料"**——会话结束时的对话摘要是偏好提取的输入。

---