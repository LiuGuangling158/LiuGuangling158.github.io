export const site = {
  name: '流光の小屋',
  title: '流光の小屋 — 个人博客',
  description: '清新萌系的个人博客，记录生活与技术。',
  author: 'liuguangling158',
  url: 'https://liuguangling158.github.io',
  locale: 'zh-CN',
  github: 'https://github.com/liuguangling158',
} as const;

/** 在 https://giscus.app/zh-CN 生成后填入；留空则评论区显示配置提示 */
export const giscus = {
  enabled: true,
  repo: 'liuguangling158/liuguangling158.github.io',
  repoId: '',
  category: 'Blog Comments',
  categoryId: '',
  mapping: 'pathname' as const,
  strict: '1',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'bottom' as const,
  theme: 'light',
  lang: 'zh-CN',
};
