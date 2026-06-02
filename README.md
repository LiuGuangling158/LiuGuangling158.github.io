# 流光靈の小屋

清新萌系粉白风格的个人博客，基于 [Astro](https://astro.build)，部署至 [liuguangling158.github.io](https://liuguangling158.github.io)。

## 功能

- 本地 Markdown + Git 发布
- [Decap CMS](https://decapcms.org/) 网页后台（`/admin/`）
- 外链页、RSS、Sitemap
- Giscus 评论（懒加载，需自行配置 ID）

## 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:4321

## 发布文章

### 方式一：本地 Markdown

在 `src/content/blog/` 新建 `.md` 文件：

```md
---
title: 文章标题
description: 摘要（可选）
pubDate: 2025-05-23
tags: [标签1, 标签2]
draft: false
---

正文内容…
```

推送到 `main` 分支后，GitHub Actions 自动部署。

### 方式二：Decap CMS

1. 将本仓库推送到 GitHub：`liuguangling158/liuguangling158.github.io`
2. 配置 GitHub OAuth（Decap 需要，否则无法登录后台）：
   - 在 GitHub 创建 OAuth App：Homepage `https://liuguangling158.github.io`，Callback 使用 [Decap 文档](https://decapcms.org/docs/github-backend/) 推荐的 OAuth 服务
   - 常见做法：使用 Netlify 提供的免费 OAuth 代理，在 `public/admin/config.yml` 增加 `base_url` 与 `auth_endpoint`
3. 访问 https://liuguangling158.github.io/admin/

本地调试 CMS：

```bash
# config.yml 中启用 local_backend: true
npx decap-server
npm run dev
```

## Giscus 评论

1. 仓库 **Settings → General → Discussions** 开启
2. 创建分类（如 `Blog Comments`）
3. 打开 https://giscus.app/zh-CN 生成 `repoId`、`categoryId`
4. 填入 `src/config/site.ts` 中的 `giscus` 对象

## 自定义

| 内容       | 文件                      |
|------------|---------------------------|
| 站名、Giscus | `src/config/site.ts`    |
| 外链、友链 | `src/config/links.ts`     |
| 关于页     | `src/pages/about.astro`   |
| CMS 配置   | `public/admin/config.yml` |

## 部署到 GitHub Pages

1. 将代码推送到 `liuguangling158.github.io` 仓库的 `main` 分支
2. 仓库 **Settings → Pages → Build and deployment**：Source 选 **GitHub Actions**
3. 首次 push 后等待 Actions 完成，站点即可访问

## 命令

| 命令           | 说明     |
|----------------|----------|
| `npm run dev`  | 开发服务器 |
| `npm run build`| 生产构建 |
| `npm run preview` | 预览构建结果 |
