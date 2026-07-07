---
title: LearnLoop-AI 学习记录（Day 11）— Service 层的价值
description: v0.4 的核心工作是打通 SM-2 链路。做这件事的过程里，最大的收获反而不是 SM-2 算法本身——那个算法 50 行就写完了——而是搞清楚了一个问题：代码该放在哪一层。
pubDate: 2026-07-07
category: AI技术
---

# LearnLoop-AI 学习记录（Day 11）— Service 层的价值

> v0.4 的核心工作是打通 SM-2 链路。做这件事的过程里，最大的收获反而不是 SM-2 算法本身——那个算法 50 行就写完了——而是搞清楚了一个问题：代码该放在哪一层。

---

## 问题从哪来的

Day 10 做 v0.4 的时候，有一个很具体的场景：

用户提交了答案，GradingAgent 批改完，发现错了 3 道题。这 3 道题对应的知识点（比如"黑盒测试方法"、"Verification vs Validation"），需要做两件事：

1. 在 sm2_states 表里创建或更新记录（确保这些知识点进入复习队列）
2. 检查这些知识点之间有没有混淆（Verification 和 Validation 之前已经混过 2 次了）

问题来了——这段逻辑该写在哪？

最直接的想法是写在 `quiz.py` 的 `submit_quiz` 函数里。反正错题入库的代码已经在那了，再往下加几行不就行了？

当时确实这么做了一段时间。写完大概是这样：

```python
# quiz.py submit_quiz 里
# ... 错题入库代码 ...
# 然后直接操作 SM-2
session = db_manager.get_session()
for r in results:
    if not r.get("is_correct"):
        state = session.query(SM2State).filter(...).first()
        if not state:
            state = SM2State(...)
            session.add(state)
session.commit()
```

看着能跑。但越想越不对。

---

## 为什么不该写在 API 层

后来把这段代码重构到 `sm2_service.py`，是因为想清楚了几个问题：

**1. 复用。** SM-2 状态的创建不只在 quiz 提交这一个地方。笔记生成后也要创建（`notes.py`），以后可能还有其他入口（手动添加知识点、从文件导入等）。如果每次都在 API 函数里写一遍 query + insert，代码重复多少遍？

**2. 测试。** 如果 SM-2 逻辑散落在各个 API 函数里，想测"评分后 EF 是否正确更新"就得启动整个 FastAPI 应用、构造完整的 HTTP 请求。但如果你有一个 `sm2_service.update_review()`，直接拿 Python 脚本调这个函数就行。

**3. 事务边界。** Service 层的方法自己管理 session——打开、操作、commit/rollback、关闭。API 层不需要知道 SM-2 的查询条件是什么、索引怎么建的。改数据库结构的时候只改 Service 就行。

**4. 概念内聚。** "创建 SM-2 状态"是一个业务概念，不属于 HTTP 请求解析的职责。API 层负责解析参数、调 Service、返回 JSON。Service 层负责数据库操作和业务逻辑。

---

## Service 单例模式

项目里已经有 `note_service.py` 和 `file_service.py` 两个 Service，都是全局单例：

```python
class SM2Service:
    """SM-2 状态管理服务（全局单例）"""
    
    def get_or_create_state(self, knowledge_point, user_id):
        ...
    
    def update_review(self, knowledge_point, score, user_id):
        ...

sm2_service = SM2Service()  # 模块级单例
```

单例在这个场景下是合理的——SM2Service 就是个无状态的函数集合，它依赖的 `db_manager` 自己也是单例。不需要每次调用都 new 一个对象。

但单例也有代价：所有状态靠数据库传递，不能往实例上挂属性。比如"当前用户"这种信息只能通过方法参数传进去。不过对于这个项目规模来说完全够用。

---

## 算法 vs 持久化的分离

SM2Service 里的 `update_review` 需要做 SM-2 计算。计算逻辑在哪？

答案是：在 `scheduler_agent.py` 的 `SM2Calculator` 类里。它是一个纯静态方法：

```python
class SM2Calculator:
    @staticmethod
    def calculate(ef, interval, repetitions, score) -> dict:
        # 纯数学计算
        ...
```

SM2Service 调它：

```python
def update_review(self, knowledge_point, score, user_id):
    state = query_from_db(...)
    calc = SM2Calculator()
    result = calc.calculate(state.ef, state.interval, 
                            state.repetitions, score)
    write_to_db(state, result)
    return result
```

为什么要这样分？因为 SM-2 算法本身不依赖数据库、不依赖 LLM、不依赖任何 I/O。它就是个数学公式，输 4 个数吐 4 个数。把它放在 Agent 里是因为它原本是 SchedulerAgent 的一部分，但实际调用时根本不经过 Agent 的 LLM 链路——Service 层直接 import 它的 Calculator。

如果以后 SM-2 算法要换（比如换成 FSRS、或者自己调参数），只改 Calculator 一个地方。Service 层的代码不用动。

---

## SQLAlchemy Session 的"传染"

之前 Day 9 提到 async 会传染——一个方法改成 async，调用链上所有方法都得改。SQLAlchemy 的 Session 也有类似的属性：session 对象的生命周期必须手动管理。

每次操作数据库都要：

```python
session = db_manager.get_session()
try:
    # 查询 / 写入
    session.commit()
except Exception:
    session.rollback()
    raise
finally:
    session.close()
```

这个模式在每个 Service 方法里重复了 7 次。可以写个 context manager 封装，但暂时没那么做——一是怕过度抽象，二是每个方法的异常处理细节不太一样（有的要 raise，有的只 warn）。

后面如果 Service 方法继续增多，这个可能是第一个要统一封装的东西。

---

## 一个具体例子：get_or_create 模式

`get_or_create_state` 是 Service 层最常用的方法。笔记生成后调它，quiz 提交后也调它。语义是"确保这个知识点在 sm2_states 里有记录"。

实现很简单：

```python
existing = session.query(SM2State).filter(
    SM2State.user_id == user_id,
    SM2State.knowledge_point == knowledge_point,
).first()

if existing:
    return existing.to_dict()  # 不修改，直接返回

# 不存在就创建
state = SM2State(
    id=f"sm2_{uuid4().hex[:12]}",
    knowledge_point=knowledge_point,
    ef=2.5, interval_days=1, repetitions=0,
    next_review_at=datetime.utcnow(),
)
session.add(state)
session.commit()
```

一个细节：这里的唯一键是 `(user_id, knowledge_point)` 的组合，而不是表的主键 `id`。代码里没加数据库唯一约束（SQLite 支持但当时忘了），靠查询去重。这个其实不太严谨——并发场景下可能插入重复记录。不过单用户单线程暂时碰不到。

返回值带一个 `is_new` 字段。调用方有时想知道"这是新创建的还是早已存在的"，比如做日志或统计的时候。

---

## 小结

Service 层不是什么新概念，但真正写代码的时候很容易跳过——"就几行查询，直接写 API 里吧"。

这次 v0.4 的经历是：一开始确实写在 API 里的，但第二个调用点（notes.py）出现时，立刻感受到了重复。重构到 SM2Service 以后，API 层变成了：

```python
# quiz.py
sm2_service.get_or_create_state(kp, "default")

# notes.py  
sm2_service.get_or_create_state(tag, "default")
```

两个调用点，一行搞定。这就是 Service 层的价值——不是让代码更短，而是让"这个逻辑只存在一个地方"。

后面写 v0.5 的时候，如果需要查"某个知识点的 SM-2 进度"，直接加一个 Service 方法就行，API 层和前端都受益。