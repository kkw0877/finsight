import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import { createMockClient } from "./mock-client";
import { createRealClient } from "./real-client";
import type { SupabaseClientLike } from "./types";

/**
 * 브라우저 클라이언트 (Client Component 전용). server.ts와 동일하게
 * 테스트(Vitest, NODE_ENV=test)에서는 mock-client를 반환한다.
 */
export function createBrowserClient(): SupabaseClientLike {
  if (process.env.NODE_ENV === "test") {
    return createMockClient();
  }

  const client = createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return createRealClient(client);
}
