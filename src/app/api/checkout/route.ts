import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/services/polar";

/**
 * 체크아웃 세션 생성 (ADR-007). 이 시점에는 DB에 아무 것도 쓰지 않는다 —
 * 결제 완료 여부는 오직 /api/webhooks/polar 를 통해서만 반영된다.
 */
export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { url } = await createCheckoutSession(user.id);
  return NextResponse.json({ url });
}
