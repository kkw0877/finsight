import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { MockUser } from "@/lib/supabase/types";

/**
 * 보호 라우트(대시보드)에서 사용하는 서버 전용 세션 체크.
 * 비로그인 사용자는 /login으로 리다이렉트한다.
 */
export async function requireUser(): Promise<MockUser> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
