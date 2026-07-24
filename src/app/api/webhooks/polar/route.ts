import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyAndParseWebhook } from "@/services/polar";
import type { Subscription } from "@/types/subscription";

/**
 * Polar 구독 상태 웹훅 (ADR-007). 검증된 payload만 subscriptions에 반영해
 * is_pro 불리언 하나로 분기되는 구조를 유지한다.
 */
export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("webhook-signature") ?? "";

  const result = await verifyAndParseWebhook(payload, signature);
  if (!result) {
    return NextResponse.json({ error: "유효하지 않은 웹훅입니다." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const subscription: Subscription = { userId: result.userId, isPro: result.isPro };
  await supabase.from("subscriptions").insert(subscription);

  return NextResponse.json({ ok: true });
}
