---
title: LearnLoop-AI 学习记录（Day 12）— SM-2 算法与数据流设计
description: SM-2 算法本身，以及 LearnLoop-AIv0.4 里几个数据流设计上的决策。
pubDate: 2026-07-08
category: AI技术
---

# LearnLoop-AI 学习记录（Day 12）— SM-2 算法与数据流设计

> SM-2 算法本身，以及 v0.4 里几个数据流设计上的决策。

---

## SM-2 到底在算什么

SM-2 是 SuperMemo 的第二个版本算法，1990 年代的东西。核心逻辑就一个公式：

```
EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
```

其中 q 是用户评分（0-5），EF 是 Easiness Factor（难度系数，初始 2.5，下限 1.3）。

代码就是把这个公式直译过来：

```python
new_ef = ef + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))
new_ef = max(1.3, new_ef)
```

关键行为：
- **评 5 分**（非常轻松）：EF 涨 0.1，间隔拉长，说明这个知识点对你来说太简单了
- **评 4 分**（正确回忆）：EF 不变，间隔按 EF 倍率正常增长
- **评 3 分**（勉强记住）：EF 微降，间隔重置回短间隔
- **评 0-2 分**（忘记）：EF 大幅下降，间隔重置为 1 天

间隔的计算逻辑：

```python
if score >= 3:
    if repetitions == 0:
        new_interval = 1      # 第一次正确 → 1 天后
    elif repetitions == 1:
        new_interval = 6      # 第二次正确 → 6 天后
    else:
        new_interval = max(1, round(interval × ef))  # 之后：间隔 × EF
else:
    new_interval = 1          # 忘了 → 1 天后重新来
    new_repetitions = 1
```

前两次正确回忆的间隔是写死的（1 天和 6 天），之后才让 EF 介入。这个设计是有道理的——一个新知识点刚学完，间隔增长要保守；确认你真的记住了两次以后，才开始指数级拉长。

---

## EF 为什么设下限 1.3

`max(1.3, new_ef)` 这一行想了一会。

如果 EF 无限下降会怎样？假设一个知识点你每次都打 0 分，EF 会一直降，降到 1.0 以下，那 `interval × EF` 就比 interval 还小——复习间隔反而会缩短。其实从"遗忘"的角度来说这不算错，但降到 1.0 以下意味着你要每天复习同一个知识点。

SM-2 原始论文设的下限就是 1.3。实际效果：
- EF = 1.3 时，interval = 1，下次复习 = 1.3 × 1 ≈ 1 天（取整）
- 即使连续打低分，间隔也不会变成负数

但这个值确实有争议。如果你真的反复错同一个知识点（比如 Fault vs Failure 始终分不清），是不是应该允许"半天后再来一次"？半小时后？

想了下，决定先不改。原因：SM-2 设计的前提是"用户会认真评分"。如果你真的始终分不清 Fault 和 Failure，问题不在复习间隔，而在于你根本就没理解这两个概念。这时候应该去看笔记、做题，而不是反复点"我又忘了"。

这个判断可能不对，但先保留原算法，后面实际用了再根据数据调整。

---

## 创建 vs 更新 — 最容易搞混的地方

v0.4 做的时候，有一个很容易犯的错：把"创建 SM-2 状态"和"更新 SM-2 状态"混在一起。

**创建时机：**
- 笔记生成后（`notes.py generate`）
- 错题入库后（`quiz.py submit`）
- 不修改 ef/interval/repetitions，只确保记录存在

**更新时机：**
- 用户复习评分后（`schedule.py review`）
- 读当前状态 → SM-2 计算 → 写回新值

这两步绝对不能合并。如果 quiz 提交的时候就直接调 `update_review`，等于替用户决定了"你做错了 = 你完全忘了 = 打 0 分"。但实际情况可能是——用户只是粗心，或者题目本身误导，不代表他真的没掌握。

所以 quiz 提交时只调 `get_or_create_state`：确保这个知识点在 sm2_states 里有记录，`next_review_at` 设为今天（让它进入复习队列）。评分由用户在复习页面自己判断。

这个区分看起来简单，但做需求分析的时候容易漏。如果你习惯性地想"用户做错了题，当然应该立刻复习"，那就犯了"替用户做判断"的错。SM-2 的哲学是：系统负责计算间隔，用户负责判断掌握程度。

---

## 混淆对检测的字母序 trick

混淆对检测的逻辑本身不复杂：如果同一批错题里有 "Verification" 和 "Validation" 两个知识点，就创建一条混淆对记录。

但有一个细节：用户可能第一次错的是 (Verification, Validation)，第二次错的是 (Validation, Verification)。如果不处理，数据库里会有两条记录，分别记了 1 次。

解决：`get_or_create_confusion` 里做了 `sorted([concept_a, concept_b])`，保证无论如何传入，存储的都是按字母序排列的 (Validation, Verification)。

```python
a, b = sorted([concept_a, concept_b])

existing = session.query(ConfusionPair).filter(
    ConfusionPair.concept_a == a,
    ConfusionPair.concept_b == b,
).first()
```

一个小操作，省了一个 SQL 的 OR 条件或者应用层去重。

如果以后需求变了——比如用户说"我想看按混淆时间排序、而不是字母序"——这个字母序存储会有问题，因为 concept_a 和 concept_b 的位置不代表方向。但目前够用。

---

## 数据流交叉 —— API 之间的联动

v0.4 做的一个比较大的改动是让不同 API 之间产生联动。之前各 API 各管各的：

```
POST /notes/generate → NoteAgent → 返回笔记
POST /quiz/submit   → GradingAgent → 返回成绩
GET /schedule/daily → SchedulerAgent → 返回任务
```

v0.4 改成了：

```
POST /notes/generate → NoteAgent → 返回笔记
                                  → sm2_service.get_or_create_state(tags)

POST /quiz/submit   → GradingAgent → 返回成绩
                                  → sm2_service.get_or_create_state(error_kps)
                                  → sm2_service.detect_confusions_from_errors(error_kps)

GET /schedule/daily → sm2_service.get_due_items() → SchedulerAgent → 返回任务
```

notes 和 quiz 的副作用会体现在 schedule 的查询结果里。这是"学→记→复"闭环的数据基础。

但有一个风险：这些联动都是同步的。如果 `sm2_service.get_or_create_state` 很慢（比如表很大），它会拖慢 `/notes/generate` 的返回。当前 SQLite 单用户场景不会有问题，但如果以后要支持大批量导入笔记，可能需要改成后台任务。

目前的应对是：联动代码全在 try/except 里，失败只打印 WARN，不抛异常，不影响主流程返回。这是一种防御性编程，代价是可能悄悄丢了数据（SM-2 状态没创建成功但用户不知道），但换来了可用性（笔记至少能正常生成和展示）。

---

## weak-points 的查询设计

`/memory/weak-points` 这个端点有意思在于：它返回的东西其实不需要 LLM。

```python
# 按知识点分组统计
errors = session.query(ErrorLog).filter(
    ErrorLog.user_id == user_id,
    ErrorLog.is_resolved == False,
).all()

by_kp = {}
for e in errors:
    kp = e.knowledge_point or "未分类"
    if kp not in by_kp:
        by_kp[kp] = {"count": 0, "examples": []}
    by_kp[kp]["count"] += 1
```

这不就是 `GROUP BY + COUNT` 加几个例子嘛。LLM 在这里只是锦上添花——如果有 Memory Agent 可用，就多生成一段"改进建议"文字；没有也不影响返回基础数据。

这说明一个问题：很多"AI 功能"的核心数据其实不需要 AI。把统计部分做好，LLM 只负责锦上添花的部分（措辞、建议、总结）。这个分层思路后面可以推广到报告生成、学习分析等场景。

---

## 小结

今天的东西比较碎：

1. **SM-2 公式**——EF 计算公式 + 前两次间隔写死的设计原因 + EF 下限 1.3 的取舍
2. **创建 vs 更新**——不能替用户做判断，系统管间隔、用户管评分
3. **字母序去重**——小 trick 省掉 SQL 复杂度
4. **API 间联动**——副作用的设计、防御性编程的权衡
5. **弱 AI 化**——核心统计不需要 LLM，LLM 只做锦上添花