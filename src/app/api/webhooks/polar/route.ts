import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/services/supabase-admin";
import { verifyAndParseWebhook } from "@/services/polar";
import type { Subscription } from "@/types/subscription";

const SIGNATURE_HEADER_NAMES = ["webhook-id", "webhook-timestamp", "webhook-signature"] as const;

/**
 * Polar 구독 상태 웹훅 (ADR-007). 검증된 payload만 subscriptions에 반영해
 * is_pro 불리언 하나로 분기되는 구조를 유지한다.
 *
 * Polar가 보내는 Standard Webhooks 서명은 세 헤더(webhook-id/webhook-timestamp/
 * webhook-signature)로 구성되므로, 이를 JSON으로 묶어 verifyAndParseWebhook의
 * signature 인자로 전달한다(함수 시그니처는 step 6과 동일하게 유지).
 *
 * 이 요청은 사용자 세션이 없는 서버-투-서버 호출이라 RLS를 통과할 수 없으므로,
 * 서비스 롤 클라이언트로만 DB에 반영한다(step 13에서 남긴 과제).
 */
export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signatureHeaders = JSON.stringify(
    Object.fromEntries(SIGNATURE_HEADER_NAMES.map((name) => [name, request.headers.get(name) ?? ""])),
  );

  const result = await verifyAndParseWebhook(payload, signatureHeaders);
  if (!result) {
    return NextResponse.json({ error: "유효하지 않은 웹훅입니다." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const subscription: Subscription = { userId: result.userId, isPro: result.isPro };
  await supabase.from("subscriptions").upsert(subscription, { onConflict: "userId" });

  return NextResponse.json({ ok: true });
}
