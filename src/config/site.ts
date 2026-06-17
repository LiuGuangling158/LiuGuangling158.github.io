export const site = {
  name: '流光靈の博客',
  title: '流光靈の博客 — 个人博客',
  description: '欢迎来到流光靈的个人博客，记录生活与技术',
  /** 头像：public/avatar.jpg */
  avatar: '/avatar.jpg',
  /** 浏览器图标：public/favicon.png */
  favicon: '/favicon.png',
  author: 'liuguangling158',
  url: 'https://liuguangling158.github.io',
  locale: 'zh-CN',
  github: 'https://github.com/liuguangling158',
  /** 站点架构知识图谱仪表盘 */
  dashboardUrl: 'https://liuguangling158.github.io/architecture/',
} as const;

/** 在 https://giscus.app/zh-CN 生成后填入；留空则评论区显示配置提示 */
export const giscus = {
  enabled: true,
  repo: 'liuguangling158/liuguangling158.github.io',
  repoId: 'R_kgDORj9EDQ',
  category: 'Blog Comments',
  categoryId: 'DIC_kwDORj9EDc4C-o38',
  mapping: 'pathname' as const,
  strict: '1',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'bottom' as const,
  theme: 'light',
  lang: 'zh-CN',
};
