export type LinkItem = {
  name: string;
  url: string;
  desc?: string;
  icon?: 'github' | 'bilibili' | 'twitter' | 'mail' | 'link';
};

/** 我的常用链接 */
export const socialLinks: LinkItem[] = [
    {
      name: 'GitHub',
      url: 'https://github.com/liuguangling158',
      desc: '代码与开源',
      icon: 'github',
    },
    {
      name: '邮箱',
      url: '3282982622@qq.com',
      desc: '欢迎来信',
      icon: 'mail',
    },
    {
      name: '哔哩哔哩',
      url: 'https://space.bilibili.com/3537120759122626',
      desc: 'up主个人主页',
      icon: 'bilibili',
    },
];

/** 友链 / 收藏站点 */
export const friendLinks: LinkItem[] = [
    {
      name: '示例友链',
      url: 'https://astro.build',
      desc: '可在 src/config/links.ts 中修改',
    },
];
