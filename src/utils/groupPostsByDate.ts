import type { CollectionEntry } from 'astro:content';

export type DateGroup = {
  /** YYYY-MM-DD */
  key: string;
  date: Date;
  posts: CollectionEntry<'blog'>[];
};

/** 取文章展示用日期：有更新日用更新日，否则用发布日 */
export function getPostDisplayDate(post: CollectionEntry<'blog'>): Date {
  return post.data.updatedDate ?? post.data.pubDate;
}

export function isUpdatedPost(post: CollectionEntry<'blog'>): boolean {
  if (!post.data.updatedDate) return false;
  return post.data.updatedDate.getTime() !== post.data.pubDate.getTime();
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function groupPostsByDate(
  posts: CollectionEntry<'blog'>[]
): DateGroup[] {
  const map = new Map<string, CollectionEntry<'blog'>[]>();

  for (const post of posts) {
    const d = getPostDisplayDate(post);
    const key = toDateKey(d);
    const list = map.get(key) ?? [];
    list.push(post);
    map.set(key, list);
  }

  const groups: DateGroup[] = [...map.entries()].map(([key, groupPosts]) => {
    const sorted = [...groupPosts].sort(
      (a, b) => getPostDisplayDate(b).getTime() - getPostDisplayDate(a).getTime()
    );
    const [y, m, day] = key.split('-').map(Number);
    return {
      key,
      date: new Date(y, m - 1, day),
      posts: sorted,
    };
  });

  return groups.sort((a, b) => b.date.getTime() - a.date.getTime());
}
