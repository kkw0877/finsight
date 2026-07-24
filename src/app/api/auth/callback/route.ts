import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Google OAuth 콜백 (@supabase/ssr 컨벤션). signin route에서 발급한
 * redirectTo(NEXT_PUBLIC_APP_URL/api/auth/callback)로 Google이 code를 돌려주면
 * 세션으로 교환해 쿠키를 설정한 뒤 대시보드로 보낸다.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
