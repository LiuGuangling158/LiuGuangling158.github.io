---
title: SQLAlchemy 的 session 关闭后，对象属性就变鬼了
description: '笔记保存成功了，但后面只要访问 `note` 对象的任何属性，就抛异常'
pubDate: 2026-06-28
category: 踩坑日志
---


# SQLAlchemy 的 session 关闭后，对象属性就变鬼了

在写 NoteService 的时候，我遇到一个特别让人抓狂的 bug：

笔记保存成功了，但后面只要访问 `note` 对象的任何属性，就抛异常：

```
sqlalchemy.orm.exc.DetachedInstanceError:
Instance <Note at 0x...> is not bound to a Session;
attribute refresh operation cannot proceed
```

## 复现场景

这是我的原始代码（简化过）：

```python
session = db_manager.get_session()
note = Note(id=note_id, title="测试笔记", content_md="# Hello")
session.add(note)
session.commit()
session.close()

# 后面想用 note 的 id
print(note.id)  # 💥 DetachedInstanceError!
```

逻辑上没问题啊——我都 commit 了，数据都落库了，怎么连个 `id` 都读不了？

## 原理

SQLAlchemy 默认在 `commit()` 后会把所有对象的属性标记为 "expired"（过期）。之后任何对属性的访问都会触发一次隐式的数据库查询来刷新数据——但如果 session 已经关了，查询发不出去，就炸了。

这设计的初衷是好的：确保你拿到的永远是最新数据。但在我的场景里，笔记已经存好了，我只需要读它的 `id` 和 `title` 返回给前端，完全不需要再查一次数据库。

## 修复

改一行：

```python
self._SessionLocal = sessionmaker(
    bind=self.engine,
    expire_on_commit=False,  # 加这一行
)
```

`expire_on_commit=False` 告诉 SQLAlchemy：commit 后别把我的对象属性标记为过期，我信任这份数据。

## 反思

ORM 的"魔法"很多时候是双刃剑。`expire_on_commit` 默认 `True` 是有道理的——在长时间运行的 We