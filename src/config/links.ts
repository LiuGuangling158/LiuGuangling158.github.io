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
];

/** 友链 / 收藏站点 */
export const friendLinks: LinkItem[] = [
,
];
