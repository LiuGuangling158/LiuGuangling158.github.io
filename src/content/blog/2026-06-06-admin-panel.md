---
title: 博客管理后台 —— 纯前端 GitHub API 在线管理系统
description: 零依赖纯前端 SPA，GitHub Token 登录，支持文章 CRUD、站点配置、友链、分类、技能、轮播图全套在线管理，通过 GitHub Contents API 直接读写仓库文件
pubDate: 2026-06-06
category: 前端开发
draft: false
---

## 概述

为博客实现了完整的网页管理后台（`/admin/`），替代了此前仅存在于 README 但从未落地的 Decap CMS 计划。管理后台采用纯前端方案，无需后端服务器，通过 GitHub REST API 直接操作仓库文件。

核心设计原则：**零依赖**、**即开即用**、**与博客风格统一**。

---

## 一、技术架构

### 1.1 技术选型

| 维度 | 选择 | 理由 |
|------|------|------|
| 前端框架 | Vanilla JS ES Modules | 零 npm 依赖，与博客无框架风格一致 |
| API 层 | GitHub Contents REST API | 直接读写仓库文件，无需中间服务 |
| 认证 | GitHub Personal Access Token | 利用 GitHub 原生鉴权，无需自建用户系统 |
| 路由 | Astro 静态路由 `/admin/` | 随博客一起构建部署 |
| 样式 | 扩展现有 sakura 主题 | 保持博客整体视觉风格 |

### 1.2 文件结构

```
src/pages/admin/index.astro          # 入口页面（注入 owner/repo）
public/admin/
├── admin.css                        # 管理后台样式
└── js/
    ├── main.js                      # 应用入口 + 标签页路由
    ├── api.js                       # GitHub API 封装（Unicode 安全 base64）
    ├── auth.js                      # Token 管理 + 登录界面
    ├── toast.js                     # Toast 通知
    ├── modal.js                     # 确认弹窗
    ├── sections/
    │   ├── posts.js                 # 文章 CRUD + Markdown 编辑器
    │   ├── site-config.js           # 站点 + Giscus 配置
    │   ├── links.js                 # 友链/社交链接
    │   ├── categories.js            # 分类管理
    │   ├── skills.js                # 技能徽章
    │   └── hero.js                  # 轮播图
    └── utils/
        ├── frontmatter.js           # YAML frontmatter 解析/生成
        └── dom.js                   # DOM 工具函数
```

### 1.3 数据流

```
localStorage Token → api.js (Authorization header)
                         ↓
              GitHub REST API ← sections/*.js (读/写/删)
                         ↓
                  toast.js ← 成功/失败反馈
                  modal.js ← 删除确认
```

---

## 二、功能模块

### 2.1 认证系统

- 登录界面：居中卡片 + Token 输入框 + 验证按钮
- Token 验证：调用 `GET /user` 端点，验证通过后显示 GitHub 用户名和头像
- Token 持久化存储于 localStorage，页面刷新后自动验证
- 登出功能清除 Token 并返回登录界面

### 2.2 文章管理

最复杂的模块，覆盖博客文章的全生命周期：

- **列表视图**：表格展示标题、分类、日期、发布状态（已发布/草稿），支持按发布日期倒序排列
- **编辑器**：双栏布局 —— 左侧 frontmatter 表单（标题、摘要、日期、分类、封面、草稿开关、文件名），右侧 Markdown 编辑区
- **Markdown 预览**：客户端实时渲染，支持标题、代码块、表格、图片等常见语法
- **文件命名**：自动按 `YYYY-MM-DD-{标题}.md` 格式生成，支持自定义
- **保留格式**：解析和再生 frontmatter 时保留 YAML 原始结构

### 2.3 站点配置

- **站点信息**：名称、SEO 标题、描述、头像路径、favicon、作者、URL、locale、GitHub 地址
- **Giscus 评论**：repo、repoId、category、categoryId、映射方式、主题、语言等全套配置
- 通过模板化方式重新生成 `site.ts` 文件，保留注释和结构

### 2.4 链接管理

- 社交链接和友链分组管理
- 每个链接支持名称、URL、描述和图标类型（GitHub/Bilibili/Twitter/邮箱/外链）
- 动态增删条目，修改后重新生成 `links.ts`

### 2.5 分类管理

- 每个分类包含 slug（标识）、name（显示名）、description（描述）
- 自动保留 `getCategory()` 辅助函数

### 2.6 技能徽章

- 标签式 UI：输入技能名 + Enter 添加，点击 × 移除
- 直观的增删交互

### 2.7 Hero 轮播图

- 图片列表管理：路径 + 描述，支持预览缩略图
- 轮播间隔设置

---

## 三、技术要点

### 3.1 Unicode 安全编解码

GitHub Contents API 使用 base64 编码传输文件内容。博客文章包含大量中文字符，标准的 `btoa`/`atob` 无法直接处理 Unicode。使用 `TextEncoder`/`TextDecoder` 配合 byte 数组实现安全的编解码：

```javascript
// 编码
#encode(str) {
  const bytes = new TextEncoder().encode(str);
  const binary = String.fromCodePoint(...bytes);
  return btoa(binary);
}

// 解码
#decode(b64) {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
```

### 3.2 TypeScript 配置文件处理

站点配置文件（`site.ts`、`links.ts`、`categories.ts`、`skills.ts`、`hero.ts`）使用 TypeScript 语法且各具不同的结构。采用 **模板化重新生成** 策略而非正则替换：

- 解析：正则提取当前值填充表单
- 编辑：用户在表单中修改
- 生成：模板函数将表单值序列化为合法的 TypeScript 代码
- 写入：通过 API 提交完整的新文件内容

此方式确保输出代码始终语法合法，且保留注释和格式化结构。

### 3.3 GitHub API 冲突处理

使用 SHA blob hash 实现乐观锁：读取文件时获取 SHA，写入时携带 SHA，若文件在读取后被其他人修改（如远程 push），GitHub 返回 409 Conflict，管理后台提示用户刷新后重试。

### 3.4 UI 设计

所有 UI 组件（Toast、Modal、表单、标签、表格）均扩展自博客现有的 sakura/kawaii 粉色主题，使用 `var(--color-sakura-*)` 色板、`card-kawaii` 圆角卡片和 `btn-kawaii` 按钮风格，确保管理后台与博客风格一致。

---

## 四、总结

本次开发实现了一个**零依赖、即开即用**的博客管理后台，覆盖了文章内容管理和站点配置的全场景需求。通过直接操作 GitHub API，无需额外部署后端服务，一个 GitHub Token 即可在浏览器中完成所有管理工作。

## 五、使用方式

1. 访问 `https://liuguangling158.github.io/admin/`
2. 输入 GitHub Personal Access Token（需 `repo` scope）
3. 登录后即可在浏览器中管理博客

