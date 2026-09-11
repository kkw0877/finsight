export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
};

/**
 * 발행된 글 없이 구조만 먼저 마련한 상태(콘텐츠 운영 방식 미정).
 * 글을 추가할 때: blog/{slug}/page.tsx 작성 후 여기 등록.
 */
export const blogPosts: BlogPost[] = [];

export function getAllPosts(): BlogPost[] {
  return blogPosts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
