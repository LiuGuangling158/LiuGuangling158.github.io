---
title: 博客写作指南：格式规范与图片插入
description: 详细介绍如何正确编写博客文章，包括 Frontmatter 格式、常见错误处理和图片插入方法
pubDate: 2026-05-31
category: 教程分享
draft: false
cover: /images/hero/hero-1.jpg
---

# 博客写作指南

欢迎来到流光の小屋！这篇文章将详细介绍如何在本博客上发布文章。

## 一、文件结构

在 `src/content/blog/` 目录下创建 `.md` 文件，文件名建议格式：

```
YYYY-MM-DD-文章标题.md
```

## 二、Frontmatter 格式（必须正确！）

文章顶部的 **Frontmatter** 是 YAML 格式，必须用 `---` 包裹：

```yaml
---
title: 文章标题                    # ✅ 必填，字符串
description: 文章描述（可选）       # ❌ 可选，字符串
pubDate: 2026-05-31               # ✅ 必填，日期格式 YYYY-MM-DD
updatedDate: 2026-06-01           # ❌ 可选，更新日期
tags:                              # ❌ 可选，标签数组（已废弃，请使用 category）
  - 标签1
  - 标签2
category: 分类名                   # ✅ 新方式，文章分类（每篇文章一个分类）
draft: false                       # ❌ 可选，默认 false（true=草稿不发布）
cover: /images/cover.jpg           # ❌ 可选，封面图路径
---
```

## 三、常见错误与解决方法

| 错误类型 | 错误描述 | 解决方法 |
|---------|---------|---------|
| **YAML 语法错误** | `Error: YAML parsing failed` | 检查冒号 `:` 后是否有空格，缩进是否用空格（不能用 Tab） |
| **pubDate 格式错误** | `Error: Invalid date` | 确保格式是 `YYYY-MM-DD`，例如 `2026-05-31` |
| **category 格式错误** | `Error: Expected string` | category 必须是字符串，每篇文章只能有一个分类 |
| **draft 类型错误** | `Error: Expected boolean` | draft 只能是 `true` 或 `false`，不能加引号 |

## 四、在文章中插入图片

### 4.1 图片存放位置

所有图片需要放在 `public/images/` 目录下：

```
public/
└── images/
    ├── hero/           # 首页轮播图
    └── your-image.png  # 你的图片
```

### 4.2 插入方式

#### 方式 1：Markdown 语法（推荐）

```markdown
![图片描述文字](/images/your-image.png)
```

**示例：**
```markdown
![我的截图](/images/screenshot.png)
```

#### 方式 2：HTML 语法（适合需要控制尺寸）

```html
<img src="/images/your-image.png" alt="图片描述" width="600" />
```

#### 方式 3：带样式的图片

```html
<img 
  src="/images/your-image.png" 
  alt="图片描述" 
  style="max-width: 100%; height: auto; border-radius: 8px;" 
/>
```

### 4.3 注意事项

1. **图片路径**：使用绝对路径 `/images/xxx.png`，不要用相对路径
2. **图片命名**：建议使用英文或数字，避免中文和特殊字符
3. **图片格式**：支持 `png`、`jpg`、`jpeg`、`gif`、`webp` 等格式
4. **图片大小**：建议压缩后再上传，避免页面加载过慢

## 五、完整示例

```yaml
---
title: 我的旅行日记
description: 记录美好的旅行瞬间
pubDate: 2026-05-31
tags:
  - 旅行
  - 生活
category: 生活
draft: false
cover: /images/landscape.jpg
---

# 我的旅行日记

这是一张美丽的风景照：

![美丽的风景](/images/landscape.jpg)

## 更多照片

<figure>
  <img src="/images/sunset.png" alt="日落" width="600" />
  <figcaption>海边日落</figcaption>
</figure>

---

## 六、检查命令

写完后可以运行以下命令检查格式是否正确：

```bash
npm run build
```

如果有错误，终端会显示具体的错误位置和原因。

祝你写作愉快！✿
