# 流光靈の小屋

清新萌系粉白风格的個人博客，基于 [Astro](https://astro.build) + [TailwindCSS](https://tailwindcss.com) 构建，部署至 [liuguangling158.github.io](https://liuguangling158.github.io)。

> 🎀 樱花飘落 · 二次元主题 · 在线管理后台

## ✨ 功能

- 📝 **Markdown/MDX 博客** — 本地编写，Git 推送自动发布
- 🖥️ **在线管理后台** — `/admin/` 纯前端 SPA，GitHub Token 登录，零依赖，在线编辑文章和站点配置
- 🗓️ **博客日历** — 按日期筛选文章，与分类联动
- 🏷️ **分类系统** — 7 大分类，支持分类归档页
- 🎠 **首页轮播** — 全屏背景图轮播，渐入淡出切换
- 🌸 **樱花飘落** — 纯 CSS 动画装饰，零 JS
- 💎 **技能徽章** — 首页展示技术栈标签
- 📑 **文章目录** — 侧边栏 TOC，滚动高亮
- 🔗 **友链页面** — 社交链接 + 友情链接展示
- 📡 **RSS / Sitemap** — 自动生成
- 💬 **Giscus 评论** — 懒加载，需自行配置
- 🤖 **GitHub Actions 部署** — push 到 `main` 自动上线

## 🚀 本地开发

```bash
# 要求 Node.js >= 22.12.0
npm install
npm run dev        # 开发服务器 → http://localhost:4321
npm run build      # 生产构建 → dist/
npm run preview    # 预览构建结果
```

## 📂 项目结构

```
src/
├── components/    # 13 个 Astro 组件
├── config/        # 站点配置 (5 个 TS 文件，管理后台可写)
├── content/       # 博客文章 + Content Collection schema
├── layouts/       # 3 个布局 (Base / Home / Post)
├── pages/         # 路由页面
├── styles/        # TailwindCSS 4 主题 + 全局样式
└── utils/         # 工具函数
public/
├── admin/         # 管理后台 SPA
└── images/        # 图片资源
```

## 📝 发布文章

在 `src/content/blog/` 新建 `.md` 文件：

```yaml
---
title: 文章标题
description: 摘要（可选）
pubDate: 2025-05-23
updatedDate: 2025-06-10   # 可选
category: 前端开发
draft: false              # true 时隐藏
cover: /images/covers/xxx.png  # 可选
---
```

推送到 `main` 分支，GitHub Actions 自动部署。

### 已有分类

| 分类 | 说明 |
|------|------|
| 前端开发 | Canvas、CSS 动画、交互设计与项目实战 |
| 游戏策划 | 游戏拆解与分析 |
| 技术架构和设计 | 系统架构、技术选型、产品需求文档 |
| 编程学习记录 | 编程语言与算法学习 |
| 教程分享 | 博客使用指南与各类教程 |
| AI技术 | AI 学习记录 |
| 二次元杂谈 | 动漫、Galgame、小说、漫画随笔 |

## 🛠️ 管理后台

访问 `/admin/`，使用 GitHub Personal Access Token 登录：
- **Classic Token**: 需 `public_repo` scope
- **Fine-grained Token**: 需 Contents Read+Write + 仓库访问权限

支持管理：
- 文章 CRUD（Markdown 编辑器、封面图上传、图片拖拽/粘贴）
- 站点配置（站名、Giscus 评论）
- 外链与友链
- 文章分类
- 技能标签
- 首页轮播图
- 图片资源（浏览/上传/删除）

Token 存储在浏览器 localStorage，不经过任何第三方服务器。

## 💬 Giscus 评论

1. 仓库 **Settings → General → Discussions** 开启
2. 创建分类（如 `Blog Comments`）
3. 打开 [giscus.app](https://giscus.app/zh-CN) 生成 `repoId`、`categoryId`
4. 填入 `src/config/site.ts` 的 `giscus` 对象

## 🔧 自定义

| 内容 | 文件 |
|------|------|
| 站名、头像、Giscus | `src/config/site.ts` |
| 社交链接、友链 | `src/config/links.ts` |
| 文章分类 | `src/config/categories.ts` |
| 技能徽章 | `src/config/skills.ts` |
| 轮播图 | `src/config/hero.ts` |
| 关于页 | `src/pages/about.astro` |
| 全局样式 | `src/styles/global.css` |

## 🚢 部署

1. 推送代码到 `liuguangling158.github.io` 仓库的 `main` 分支
2. 仓库 **Settings → Pages → Build and deployment**：Source 选择 **GitHub Actions**
3. 或运行 `./deploy.ps1` 一键推送

## 🧑‍💻 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Astro 6.x (SSG) |
| 样式 | TailwindCSS 4.x (CSS-based) |
| 内容 | MDX + Markdown |
| RSS/Sitemap | @astrojs/rss + @astrojs/sitemap |
| 代码高亮 | Shiki (github-light) |
| 评论 | Giscus |
| 部署 | GitHub Actions + GitHub Pages |
| 管理后台 | 原生 JS SPA，零依赖 |
