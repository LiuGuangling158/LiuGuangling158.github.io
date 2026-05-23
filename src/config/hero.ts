/** 首屏轮播背景（将图片放到 public/images/hero/ 并在此配置） */
export const heroImages = [
  { src: '/images/hero/hero-1.jpg', alt: '加藤惠' },
  { src: '/images/hero/hero-2.jpg', alt: 'saber' },
  { src: '/images/hero/hero-3.jpg', alt: '初音' },
] as const;

/** 每张背景停留时间（毫秒） */
export const heroIntervalMs = 5500;
