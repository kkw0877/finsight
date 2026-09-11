import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/posthog-server";
import { createCheckoutSession } from "@/services/polar";

/**
 * 체크아웃 세션 생성 (ADR-007). 이 시점에는 DB에 아무 것도 쓰지 않는다 —
 * 결제 완료 여부는 오직 /api/webhooks/polar 를 통해서만 반영된다.
 */
export async function POST() {
  if (process.env.VERCEL_ENV === "preview") {
    return NextResponse.json(
      { error: "PR 프리뷰 환경에서는 결제를 사용할 수 없습니다." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { url } = await createCheckoutSession(user.id);
  await captureServerEvent({ distinctId: user.id, event: "checkout_started" });

  return NextResponse.json({ url });
}
