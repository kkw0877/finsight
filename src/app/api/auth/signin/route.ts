import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST() {
  if (process.env.VERCEL_ENV === "preview") {
    return NextResponse.json(
      { error: "PR 프리뷰 환경에서는 Google 로그인을 사용할 수 없습니다." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback` },
  });
  return NextResponse.json({ ok: true, url: data.url });
}
