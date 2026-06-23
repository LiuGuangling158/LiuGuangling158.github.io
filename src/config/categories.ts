export interface Category {
  slug: string;
  name: string;
  description: string;
}

export const categories: Category[] = [
  {
    slug: '前端开发',
    name: '前端开发',
    description: '前端技术文章，包括 Canvas、CSS 动画、交互设计与项目实战',
  },
  {
    slug: '游戏策划',
    name: '游戏策划',
    description: '游戏的拆解案和分析',
  },
  {
    slug: '技术架构和设计',
    name: '技术架构和设计',
    description: '系统架构设计与技术选型方案，产品需求文档与功能设计方案',
  },
  {
    slug: '编程学习记录',
    name: '编程学习记录',
    description: '编程语言以及算法的学习记录',
  },
  {
    slug: '教程分享',
    name: '教程分享',
    description: '博客使用指南与各类教程分享',
  },
  {
    slug: 'AI技术',
    name: 'AI技术',
    description: '关于AI的学习记录',
  },
  {
    slug: '二次元杂谈',
    name: '二次元杂谈',
    description: '关于动漫，galgame，小说，漫画的随笔杂谈',
  },
  {
    slug: '踩坑日志',
    name: '踩坑日志',
    description: '记录学习中遇到过的一些问题和解决方法',
  },
];

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
