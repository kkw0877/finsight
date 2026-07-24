import { createMockClient } from "./mock-client";
import type { SupabaseClientLike } from "./types";

/**
 * 쿠키 기반 세션 클라이언트 (Route Handler / Server Component 전용).
 * Mock-First 단계에서는 고정된 mock 로그인 유저 세션을 반환한다.
 * step 13에서 내부 구현을 실제 @supabase/ssr createServerClient로 교체한다.
 */
export async function createServerClient(): Promise<SupabaseClientLike> {
  return createMockClient();
}
