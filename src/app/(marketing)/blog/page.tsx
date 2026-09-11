import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "가이드",
  description: "카드 명세서 정리와 지출 분석에 관한 가이드 모음",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-24">
      <h1 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-semibold text-ink">
        가이드
      </h1>

      {posts.length === 0 ? (
        <p className="mt-6 text-base leading-[1.6] text-ink-muted">
          아직 글이 없습니다. 곧 카드 명세서 정리와 지출 분석에 관한 가이드로 찾아오겠습니다.
          준비 중입니다.
        </p>
      ) : (
        <ul className="mt-6 space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="text-lg font-medium text-ink">
                {post.title}
              </Link>
              <p className="text-sm text-ink-muted">{post.description}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
