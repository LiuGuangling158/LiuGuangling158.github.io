---
title: Streamlit 的 session_state的一些问题
description: Streamlit的运行原理
pubDate: 2026-07-04
category: 踩坑日志
---

Streamlit 的 session_state

选 Streamlit 做前端的时候，想的很美：纯 Python、不用写 HTML/CSS/JS、一个文件搞定所有页面。

确实，MVP 跑了不到一周就搭完了 5 个页面。但维护到 v0.2 的时候，前端代码越来越难改。核心问题就一个：**Streamlit 的"无状态"渲染模型和"有状态"的 UI 需求之间的矛盾。**

## Streamlit 是怎么运行的

Streamlit 的运行模型很简单：**每次用户交互（点击按钮、输入文本、切换页面），整个脚本从头跑一遍。** 所有不在 `st.session_state` 里的变量都会被重置。

这意味着一个"查看详情 → 返回列表"的功能，在传统前端里是改个路由的事，在 Streamlit 里需要：

```python
# 手动管理页面状态
if "notes_page_view" not in st.session_state:
    st.session_state.notes_page_view = "list"
if "selected_note_id" not in st.session_state:
    st.session_state.selected_note_id = None
if "notes_page_offset" not in st.session_state:
    st.session_state.notes_page_offset = 0
```

三个状态变量，就为了实现"笔记列表 ↔ 笔记详情"的切换和一个分页。而且随着功能增加，状态变量会线性增长。

## 具体踩的坑

### 坑 1: 删除确认对话框

笔记删除需要二次确认。在 React 里，这是 `useState(true/false)` 的事。在 Streamlit 里：

```python
# 点击"删除"按钮
if st.button("🗑️ 删除此笔记"):
    st.session_state.confirm_delete = note_id
    st.rerun()  # 必须手动触发重跑！

# 检查是否需要显示确认框
if st.session_state.get("confirm_delete") == note_id:
    st.warning("确定要删除这篇笔记吗？")
    if st.button("✅ 确认删除"):
        # 执行删除...
        st.session_state.pop("confirm_delete", None)
        st.rerun()  # 删除完刷新回列表
    if st.button("❌ 取消"):
        st.session_state.pop("confirm_delete", None)
        st.rerun()  # 取消也刷新
```

每改一个状态，就得手动 `st.rerun()`。忘了写这行，UI 就不会更新——用户点了删除，界面纹丝不动。

### 坑 2: 按钮状态不可控

`st.button` 不支持 `disabled` 状态的计算属性——它每次都是新的。这意味着你不能"根据某个条件禁用按钮"，因为条件是上一次渲染的，而按钮是这一次渲染的。

解决方法只能是写一堆 `if`，把禁用态的逻辑放在按钮渲染之前。

### 坑 3: 分页的 offset 管理

```python
# 上一页
if st.button("← 上一页"):
    st.session_state.notes_page_offset = max(0, offset - 20)
    st.rerun()

# 下一页
if st.button("下一页 →"):
    st.session_state.notes_page_offset = offset + 20
    st.rerun()
```

看起来很简单。但如果你忘了边界检查（`max(0, ...)`），用户点到第一页后继续点"上一页"，offset 就会变成负数，SQLAlchemy 的 `.offset(-20)` 行为是不确定的（不同数据库表现不同）。

### 坑 4: 全局状态污染

`st.session_state` 是全局的。5 个页面共享同一个 session_state 命名空间。如果你在不同页面用了同名的 key（比如 `selected_note_id` 碰巧和出题模块的 `selected_quiz_id` 冲突），就会产生难以追踪的 bug。

目前的做法是用前缀约定（`notes_page_view`、`selected_note_id`），但这是靠纪律而不是靠机制。

## 怎么办

Streamlit 的 session_state 在当前版本（1.41）已经比早期好多了，但它的设计哲学决定了复杂交互就是会痛苦。几个经验：

1. **把状态变量放到最前面统一初始化。** 不要让它们散落在代码各处，否则重跑时容易覆盖。

2. **`st.rerun()` 要显式调用。** 任何改变状态的操作后面都要手动 `st.rerun()`，否则 UI 不会刷新。这跟 React 的自动重渲染完全不同。

3. **保持页面状态扁平。** 嵌套的状态（对象里的对象）在 Streamlit 里很不好维护，因为每次重跑都可能改变引用。

4. **考虑迁移到 React/Next.js。** 对于 MVP 验证，Streamlit 完全够用。但如果交互复杂度继续增长（拖拽排序、内联编辑、实时协作），就该考虑切前端了。README 的路线图里已经写了"Next.js + React（正式版）"，这不是随便写的。

## 总结

**Streamlit 适合"展示型"应用（Dashboard、报表、表单），不适合"交互型"应用（多步骤操作、复杂导航、实时状态同步）。**

学习助手目前处于两者之间——笔记列表和知识问答偏展示，但删除确认、分页、详情切换这些交互已经开始超出 Streamlit 的舒适区了。继续加功能的话，前端的 session_state 管理成本会指数级上升。
