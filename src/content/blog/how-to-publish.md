---
title: 如何发布一篇文章
description: 本地 Markdown 与 Decap CMS 两种发文方式说明
pubDate: 2025-05-23
tags:
  - 教程
draft: false
---

## 方式一：本地 Markdown + Git

1. 在 `src/content/blog/` 创建文件，例如 `2025-05-23-my-post.md`
2. 写入 Frontmatter 与正文（可参考本文件）
3. 提交并推送到 GitHub，Actions 会自动构建并部署

## 方式二：Decap CMS 网页后台

1. 部署后访问 `https://liuguangling158.github.io/admin/`
2. 使用 GitHub 登录（需先按 README 配置 OAuth）
3. 在后台新建/编辑文章并发布

## Giscus 评论

在仓库开启 Discussions 后，到 [giscus.app](https://giscus.app/zh-CN) 获取 ID，填入 `src/config/site.ts` 即可。
