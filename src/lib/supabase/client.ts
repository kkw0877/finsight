import { createMockClient } from "./mock-client";
import type { SupabaseClientLike } from "./types";

/**
 * 브라우저 클라이언트 (Client Component 전용).
 * server.ts와 동일한 SupabaseClientLike 인터페이스를 구현한다.
 * step 13에서 내부 구현을 실제 @supabase/ssr createBrowserClient로 교체한다.
 */
export function createBrowserClient(): SupabaseClientLike {
  return createMockClient();
}
