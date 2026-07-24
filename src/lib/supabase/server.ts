import { cookies } from "next/headers";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createMockClient } from "./mock-client";
import { createRealClient } from "./real-client";
import type { SupabaseClientLike } from "./types";

/**
 * 쿠키 기반 세션 클라이언트 (Route Handler / Server Component 전용).
 * 테스트(Vitest, NODE_ENV=test)는 기존 mock 저장소를 그대로 쓴다 — 실제 Supabase 프로젝트
 * 없이도 auth-flow/upload-api/dashboard-ui/billing-flow의 기존 테스트 스위트가 검증하는
 * "세션·DB 상태가 호출 간에 공유된다"는 전제를 유지하기 위함이다.
 */
export async function createServerClient(): Promise<SupabaseClientLike> {
  if (process.env.NODE_ENV === "test") {
    return createMockClient();
  }

  const cookieStore = await cookies();
  const client = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component에서는 쿠키를 쓸 수 없다(Next.js 제약) — Route Handler/Server Action 호출 시에만 반영된다.
          }
        },
      },
    },
  );

  return createRealClient(client);
}
