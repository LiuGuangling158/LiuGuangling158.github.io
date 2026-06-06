export interface Category {
  slug: string;
  name: string;
  description: string;
}

export const categories: Category[] = [
  {
    slug: '前端开发',
    name: '前端开发',
    description:
      '前端技术文章，包括 Canvas、CSS 动画、交互设计与项目实战',
  },
  {
    slug: '产品设计',
    name: '产品设计',
    description: '产品需求文档与功能设计方案',
  },
  {
    slug: '技术架构',
    name: '技术架构',
    description: '系统架构设计与技术选型方案',
  },
  {
    slug: '编程入门',
    name: '编程入门',
    description: '编程语言入门教程与基础知识',
  },
  {
    slug: '教程分享',
    name: '教程分享',
    description: '博客使用指南与各类教程分享',
  },
  {
    slug: '随笔杂谈',
    name: '随笔杂谈',
    description: '个人随笔、公告与生活杂谈',
  },
  {
    slug: '二次元杂谈',
    name: '二次元杂谈',
    description: '关于动漫，galgame，小说，漫画的随笔杂谈',
  },
];

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
