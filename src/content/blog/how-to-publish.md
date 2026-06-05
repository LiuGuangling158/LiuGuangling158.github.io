---
title: 如何发布一篇文章
description: 本地 Markdown 与 Git 的发文方式说明
pubDate: 2026-05-23
category: 教程分享
draft: false
---

## 本地 Markdown + Git

1. 在 `src/content/blog/` 创建文件，例如 `2025-05-23-my-post.md`
2. 写入 Frontmatter 与正文（可参考本文件）
3. 提交并推送到 GitHub，Actions 会自动构建并部署

## Giscus 评论

在仓库开启 Discussions 后，到 [giscus.app](https://giscus.app/zh-CN) 获取 ID，填入 `src/config/site.ts` 即可。
