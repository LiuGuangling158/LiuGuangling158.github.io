---
title: LearnLoop-AI 学习记录（Day 13）— Streamlit 前端模式与痛点
description: 真的，Streamlit真的不如换Next.js
pubDate: 2026-07-09
category: AI技术
---

# LearnLoop-AI 学习记录（Day 13）— Streamlit 前端模式与痛点
---

## Session State 的正确用法（和错误用法）

复习页面的核心交互是：用户对知识点评分（0-5），提交后调 API，显示 SM-2 计算结果。

评分用 `st.select_slider`：

```python
score = st.select_slider(
    "回忆程度",
    options=[0, 1, 2, 3, 4, 5],
    format_func=lambda x: {0: "0-完全忘记", 1: "1-几乎忘记", 
                            2: "2-勉强回忆", 3: "3-正确回忆",
                            4: "4-较轻松", 5: "5-非常完美"}[x],
    key=f"score_{kp}",
)
```

问题来了——Streamlit 的交互模型是"任何组件值变化都会触发整页重新运行"。这意味着如果不用 `st.session_state` 保存状态，slider 一滑动，之前提交的结果就丢了。

解决：

```python
if "review_scores" not in st.session_state:
    st.session_state.review_scores = {}       # {kp: score}
if "review_submitted" not in st.session_state:
    st.session_state.review_submitted = {}    # {kp: result}
```

两个 dict 分别存"当前选中的分数"和"已提交的评分结果"。提交按钮的 callback 里更新 `review_submitted`，然后 `st.rerun()`。页面重新渲染时，根据 `review_submitted` 里有哪个知识点就显示哪个的结果。

这个模式在错题本的"我已掌握"按钮上也在用，属于 Streamlit 开发的基本功。核心原则：

> **任何需要在重新渲染后保留的状态，都放进 session_state。**

但不要什么东西都往里塞。一开始我把整个 SM-2 states 列表也放进去了，后来发现没必要——反正每次切换 tab 都会重新调 API，存了反而可能拿到过期数据。

---

## 从多个 API 加载数据——能并行吗

仪表盘需要 3 个 API 的数据：

```python
stats_resp = api_get("/schedule/stats")    # 统计卡片
daily_resp = api_get("/schedule/daily")    # 待复习任务
states_resp = api_get("/schedule/states")  # 知识点进度
```

这三个调用是串行的。每次 `api_get` 都是同步 HTTP 请求，在客户端阻塞。总延迟 = 三次网络往返之和。

理论上可以用 `asyncio` + `aiohttp` 并行发三个请求，把总延迟降到最长那个请求的耗时。但 Streamlit 的运行模型不支持——它是"从头到尾跑一遍脚本"的模式，没有事件循环给你用。

那能不能用 `concurrent.futures.ThreadPoolExecutor` 多线程？

试了一下，可以是可以，但带来的复杂度（线程间共享 session_state、错误处理、超时控制）比省下那几百毫秒大多了。这三个 API 都是查 SQLite，本来就很快，串行总共也就几十毫秒。不值得。

什么时候该优化？当其中一个 API 调用 LLM（比如生成报告）需要好几秒的时候。那可以把慢的那个接口用 `st.spinner` 包起来 + 缓存到 session_state，避免每次切换页面都重新调。

目前的做法：简单的 GET 接口串行调，慢的 LLM 接口加 spinner + 按钮触发。

---

## 进度条：EF 值怎么映射到视觉

知识点掌握分布里有一行：

```python
progress = min(1.0, max(0.0, (ef - 1.3) / 1.7))
st.progress(progress, text=f"{kp}")
```

EF 的范围是 [1.3, ~3.0]。把 1.3 映射到 0%，3.0 映射到 100%。`1.7 = 3.0 - 1.3` 是跨度。

为什么是 3.0 而不是更大的值？因为 EF 从 2.5 起步，每次完美评分涨 0.1，涨到 3.0 需要连续 5 次完美——这在实践中已经很罕见了。即使超过 3.0，`min(1.0, ...)` 也会把它截到 100%。

这个映射没有科学依据，纯粹是为了让进度条"看起来有意义"。用户不会纠结 EF 到底是多少，他们只需要一个视觉信号告诉自己"这个知识点掌握得怎么样了"。

---

## Tab 的坑

复习页面有三种知识点：有错题的、没错题的、全部的。用了 `st.tabs`：

```python
tab1, tab2, tab3 = st.tabs(["🔴 需重点复习", "🟢 正常复习", "📋 全部知识点"])
```

一个坑：**三个 tab 的内容都会在页面加载时全部渲染，不只是当前激活的 tab。**

这意味着如果全部知识点有 100 个，即使你只看"需要重点复习"那个 tab（可能就 3 个），Streamlit 也会把 100 个的 HTML 全生成出来。页面会变慢。

当前数据量小（几个到十几个知识点），没感觉。但如果以后知识库大了，可能需要：
- 全部知识点 tab 里做分页，或者
- 用 `st.expander` 默认折叠，点击才展开

但目前不是瓶颈，先不管。

---

## 快捷按钮跳转——Streamlit 的"路由"

仪表盘底部有 4 个快捷入口按钮，点了应该跳到对应页面。但 Streamlit 没有"路由"——它的页面切换靠的是侧边栏的 `st.radio`。

做法是用 `st.rerun()` 触发页面重新渲染……但这并不能改变选中的 radio 值。也就是说，点击"📝 生成笔记"按钮后，页面刷新了，但侧边栏仍然选中"📊 学习仪表盘"。

这是 Streamlit 的一个固有限制：没有编程式导航。Radio 的值只能是用户手动点的。

目前的做法是：快捷按钮用了一些提示性的文字，但不能真正跳转。用户需要手动点侧边栏。如果以后要解决这个问题，可以：

1. 把 radio 的值也放进 session_state，按钮点击时修改它
2. 或者用 `st.query_params` 做 URL 参数导航

两者都有坑。方案 1 需要把 `st.radio` 换成手动管理 value 的写法。方案 2 在 Streamlit 1.41 里可用但体验不完美（URL 变了但侧边栏不变）。

暂时留着一个 TODO。反正这个功能不是核心路径。

---

## 单文件 1200 行的感受

Day 9 就在说"前端该拆了"。现在 1200 行，感觉更强烈了。

具体痛点：
1. 翻代码累——想改一个组件（比如统计卡片）得在整个文件里搜
2. 变量名冲突——页面多了以后，`col1, col2` 这种变量到处都是，虽然在不同 if 分支里不会真正冲突，但读代码的时候分不清
3. 复用困难——知识点评分组件在两个 tab 里重复写了两次（一个有错误数展示、一个没有），稍微有点不一样就得复制粘贴

但拆也有拆的问题：
- Streamlit 多页应用是每个页面一个 py 文件放在 `pages/` 目录下，自动加载
- 但共享的 session_state 管理、API 封装函数、CSS 样式就要抽到单独的模块 import
- 目前这些公共代码大概 150 行，抽成一个 `common.py` 可能刚好

打算 v0.5 拆。拆的标准不是"文件太大"，而是"有足够多的公共代码值得抽象"。现在公共部分（api_get/api_post、check_backend、CSS 样式）确实该抽出去了。

---

## 一个意外的教训：st.select_slider 的 value 参数

评分 slider 给了一个默认值：

```python
value=current_score,  # 从 session_state 里读的上次评分
```

如果 `current_score` 是 None（第一次进来），`st.select_slider` 会报错——它不接受 None。

修：检查 None 时不传 value 参数，让 slider 用组件自己的默认值（中间位置）。

这种类型不匹配在 Python 里很容易踩——Streamlit 组件的参数类型检查在运行时，IDE 帮不了你。

---

## 小结

Streamlit 适合快速出原型，但有几个硬伤：

1. **没有事件循环**——不能并行发请求，多 API 数据只能串行
2. **没有路由**——页面跳转只能靠用户手动点侧边栏
3. **全量渲染**——所有 tab 内容一起生成，页面大了会慢
4. **状态管理靠 session_state**——用起来方便但多了会乱

但也有好处——纯 Python、热重载、部署简单。对于 MVP 阶段来说够了。如果项目继续发展，正式版换 Next.js 是有道理的——不是 Streamlit 不好，而是它的设计目标就不是做复杂多页应用。

当前 v0.4 的前端复杂度还在可控范围——9 个页面、1200 行。但能感觉到天花板不远了。v0.5 拆文件的时候再做一次专门的总结。