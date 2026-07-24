import { createClient } from "@supabase/supabase-js";
import { createMockClient } from "@/lib/supabase/mock-client";
import { createRealClient } from "@/lib/supabase/real-client";
import type { SupabaseClientLike } from "@/lib/supabase/types";

/**
 * 서비스 롤 클라이언트 (RLS 우회, CLAUDE.md CRITICAL "Supabase 관리자 기능").
 * Polar 웹훅처럼 사용자 세션이 없는 서버-투-서버 호출에서만 사용한다 —
 * SUPABASE_SERVICE_ROLE_KEY는 이 파일 밖에서 참조하지 않는다.
 */
export function createServiceRoleClient(): SupabaseClientLike {
  if (process.env.NODE_ENV === "test") {
    return createMockClient();
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  return createRealClient(client);
}
