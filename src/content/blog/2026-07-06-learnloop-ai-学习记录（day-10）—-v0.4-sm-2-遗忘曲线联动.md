---
title: LearnLoop-AI 学习记录（Day 10）— v0.4 SM-2 遗忘曲线联动
pubDate: 2026-07-06
category: AI技术
---

# LearnLoop-AI 学习记录（Day 10）— v0.4 SM-2 遗忘曲线联动

> Day 9 把文档上传、检索增强、前端缺的页面补完了。但"记→复"这一环还是摆设。
> SM-2 算法三天前就写好了，API 一直返假数据，数据库里 sm2_states 表空荡荡。
> 今天把这个闭环跑通。

---

## 问题的本质

v0.3 的状态是这样的：

- SM-2 算法（`SM2Calculator.calculate`）——早就写好了，纯数学计算，没问题
- sm2_states 表——建好了但从来没人往里写
- schedule API——`/daily` 传空数组，`/review` 用硬编码的 ef=2.5，`/stats` 返全 0
- 前端——既没有仪表盘也没有复习界面

说白了就是：算法、数据库、API、前端，四层各写各的，没人把它们串起来。

今天干的事——把 SM-2 这条链路从头到尾打通。

---

## 一、SM2Service ——缺的那一层

之前 sm2_states 表空着，是因为没有专门管它的 Service。笔记有 NoteService，文件有 FileService，SM-2 状态凭什么没有？

新建了 `backend/app/services/sm2_service.py`。仿 note_service 的写法，全局单例，方法直接对 DB 操作：

```
SM2Service:
  get_or_create_state()     → 查 sm2_states，没有就建初始状态
  update_review()           → 读当前状态 → SM2Calculator → 写回
  get_due_items()           → 查到期项，带 error_count 和优先级
  get_all_states()          → 全部知识点进度
  get_stats()               → 聚合统计（总数/到期/逾期/平均EF/连续天数）
  get_or_create_confusion() → 混淆对创建/累加
  get_confusion_pairs()     → 混淆对列表
  detect_confusions_from_errors() → 从错题知识点批量检测
```

几个设计决策：

**SM-2 计算不走 Agent。** `SM2Calculator.calculate()` 是个纯函数，输进去 ef/interval/repetitions/score，吐出来新的值。没必要经过 LLM，直接在 Service 层调用就行。

**混淆对按字母序存储。** `get_or_create_confusion` 里做了 `sorted([a, b])`，保证 (Verification, Validation) 和 (Validation, Verification) 是同一条记录。不然数据库里会有两条一样的东西。

**连续学习天数的计算。** 用的是 `sm2_states.updated_at` 的去重日期，从今天往回数连续出现的天数。简单粗暴但够用。

实测了一下——测试脚本里先创建状态、再评分、再查到期项、再跑混淆检测，全部通过。写了 7 个验证用例，没什么好说的。

---

## 二、API 终于不返假数据了

`schedule.py` 的三个端点之前全是 TODO/硬编码，今天全改了。

**GET /schedule/daily**：不再传 `sm2_states=[]`。现在先去 DB 查到期项（`sm2_service.get_due_items()`），再去查未解决的错题，两个拼起来给 SchedulerAgent 生成任务。返回的每个任务带上 error_count、overdue_days、priority。

**POST /schedule/review**：之前 ReviewRequest 只有 knowledge_point 和 score，然后代码里硬编码 `ef=2.5, interval=1, repetitions=0`。现在从 DB 读到当前状态，调用 `sm2_service.update_review()`，返回计算后的 ef/interval/next_review_at。评分之后数据库里真的有变化。

**GET /schedule/stats**：不再返全 0。从 `sm2_service.get_stats()` 拿数据——总知识点、到期数、逾期数、连续学习天数、掌握率、做题次数。仪表盘上的数字终于有意义了。

顺便加了两个新端点：
- `GET /schedule/states`——列出所有 SM-2 状态，复习页面用
- `POST /schedule/plan`——创建学习计划，虽然不是核心功能，但 LearningPlan 表反正建好了，顺手做了

---

## 三、不做的事比做的事重要

SM-2 状态什么时候创建？什么时候更新？

搞清楚了两个时机：

**创建时机**——笔记生成后、错题产生后。但不是创建后就马上让用户复习。初始状态 `next_review_at = now`，下次访问 `/daily` 的时候就会出现在待复习列表里。

**更新时机**——只有用户主动在复习页面评分的时候。SM-2 的哲学是：知识掌握程度由用户自己判断，系统只负责计算最佳复习间隔。不能替用户决定"你学会了"或"你没学会"。

所以 quiz 提交的时候虽然会调 `get_or_create_state`，但不会自动评分。只确保知识点在 sm2_states 里有一条记录。

具体改了两个地方：

**`notes.py`：** 笔记持久化成功后，把标题和标签当知识点，逐个调 `get_or_create_state`。套了 try/except，失败不影响笔记返回。

**`quiz.py`：** 错题入库后，对每个错题的 knowledge_point 调 `get_or_create_state`。然后收集所有错题的知识点，调 `detect_confusions_from_errors` 两两组合创建混淆对。同样套了 try/except。

---

## 四、Memory API

新建了 `backend/app/api/v1/memory.py`。三个端点：

- `GET /memory/weak-points`——从 error_log 按知识点聚合统计，返回错误次数排名。如果有 Memory Agent 的话顺带用 LLM 分析改进建议，没有也不影响返回基础数据。
- `GET /memory/confusions`——直接从 `sm2_service.get_confusion_pairs()` 拿，按 error_count 降序。简单。
- `GET /memory/report`——综合学习报告，调用 Memory Agent 的 report action。

weak-points 这个端点里的查询逻辑其实不复杂：`GROUP BY knowledge_point`，然后每个知识点附带前 3 个错题例子。后面可以优化——比如跟 SM-2 状态做 JOIN，展示"错得多且 EF 低"的知识点，比单纯按错误次数排更有用。但今天就先这样。

---

## 五、前端两个新页面

Streamlit 文件从 864 行涨到大概 1200 行。加了两个页面。

### 学习仪表盘

打开第一眼看到的页面。顶部四个卡片——连续学习天数、待复习数、总做题数、掌握率。下面列出今日待复习任务，按优先级标记红黄绿。然后是知识点掌握分布，EF 值映射成进度条。底部快捷入口。

仪表盘的数据来自三个 API（`/schedule/stats`、`/schedule/daily`、`/schedule/states`），一个请求失败不影响其他区块展示。

### 复习计划

核心交互页面。三个 tab：
1. "需重点复习"——有错题的知识点，带评分 slider（0-5），提交后显示 SM-2 计算结果和 EF 变化
2. "正常复习"——没错题的知识点，同样可以评分
3. "全部知识点"——表格形式展示所有 SM-2 状态

评分用的是 `st.select_slider`，6 个档位（完全忘记→非常完美），比纯数字直观一点。评分后立刻调 `/schedule/review`，返回的 `next_review_at` 和 `interval_days` 实时显示。

发现一个细节——评分后如果 EF 提升了，显示绿色箭头，下降了显示红色箭头。不是什么大功能，但能让用户感受到"我这分不是白打的"。

### 导航调整

页面从 7 个扩到 9 个。仪表盘排第一（打开就是它），复习计划排在错题本前面。系统信息页改名"⚙️ 系统信息"往后挪。

版本号也改成了 v0.4.0——config.py 和前端侧边栏两处。

---

## 六、一些反思

**1. Service 层的价值。** 之前 sm2_states 表空着，不是因为忘了，是因为没有一个"该负责这件事"的模块。Note 入库有 NoteService，文件解析有 FileService，那 SM-2 状态管理也应该有 SM2Service。建了 Service 之后，API 层直接调方法，逻辑清晰。这个模式后面可以坚持。

**2. 数据库操作不要偷懒。** Day 9 的 async 传染问题我还记着。这次 SM2Service 全部是同步方法（SQLAlchemy 的 Session 本身就是同步的），API 里直接调。不搞 `asyncio.create_task` 那种"射后不管"。

**3. 端到端测试很重要。** 不用启动 FastAPI 服务器，拿 Python 脚本直接调 Service 方法，创状态→评分→查到期→测混淆，一条链走完。比手动 curl 快得多。以后可以把这类测试脚本保留下来当回归测试。

**4. 前端页面多了确实该拆了。** 9 个页面塞在一个 1200 行的 py 文件里，翻起来有点累。Day 9 就在说这个问题，现在更明显了。但感觉还不是拆的最好时机——等页面间有共用的组件（比如"知识点卡片"在多处出现），再抽象成独立模块更自然。

**5. SM-2 的 EF 下限设 1.3，一天写死。** 从 `SM2Calculator` 的实现来看，EF 最低 1.3，这意味着即使每次都打 0 分，间隔也不会小于 1 天。真实 SM-2 算法也差不多是这样——你不能让用户一天内复习同一个知识点无限次。但想了一下：如果用户真的反复错同一个东西，是不是应该允许"当天再次复习"？这个先不急着改，看实际效果再说。

---

## 版本对比

| 项目 | v0.3 | v0.4 |
|------|------|------|
| SM-2 状态表 | 空表 | 笔记/错题自动创建 |
| schedule API | 硬编码假数据 | 真实 DB 查询 |
| 混淆对检测 | 表存在但不用 | 错题自动检测 |
| 前端页面 | 7 | 9 |
| 学习仪表盘 | ❌ | ✅ |
| 复习界面 | ❌ | ✅ (0-5 评分) |
| API 端点 | 20 | 27 |
| Memory API | ❌ | ✅ (3 端点) |

---