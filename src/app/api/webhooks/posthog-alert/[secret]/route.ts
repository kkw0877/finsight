import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/services/supabase-admin";
import { parseAlertPayload, verifyWebhookSecret } from "@/services/posthog-alert";
import { dispatchOncallAlert } from "@/services/github";

/**
 * PostHog error tracking alert(단건 `$error_tracking_issue_created` / 급증
 * `$error_tracking_issue_spiking`) 웹훅 — oncall 1차 방어선의 첫 단계다.
 *
 * 이 핸들러가 하는 일은 딱 세 가지뿐이다: 서명/시크릿 검증 → 멱등(event_id 선삽입) →
 * GitHub Actions로 dispatch. 노이즈/신호 판정과 분석·escalation은 여기서 하지 않는다 —
 * Vercel serverless는 `claude -p` 헤드리스 에이전트를 띄울 수 없으므로, 실제 판단은
 * `.github/workflows/oncall-prod-alert.yml`의 CI 잡에서 수행한다.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> },
): Promise<NextResponse> {
  const { secret } = await params;
  if (!verifyWebhookSecret(secret)) {
    return NextResponse.json({ error: "유효하지 않은 웹훅입니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const harness = parseAlertPayload(body);
  if (!harness) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabase = createServiceRoleClient();

  // 멱등: dispatch보다 먼저 event_id를 넣어, 동시에 도착한 재전송도 unique 제약으로 막는다.
  const { error: insertError } = await supabase.from("oncall_alert_events").insert({
    eventId: harness.eventId,
    triggerType: harness.triggerType,
    issueFingerprint: harness.fingerprint,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: "멱등 저장소 기록에 실패했습니다." }, { status: 500 });
  }

  try {
    await dispatchOncallAlert(harness);
  } catch (error) {
    // dispatch 실패는 우리 쪽 문제일 수 있으니, 방금 넣은 row를 되돌려 PostHog의
    // 정상 재시도가 이 event_id를 "이미 처리됨"으로 오판하지 않게 한다.
    // 에러 메시지(GitHub API 응답)는 시크릿을 담지 않으므로 그대로 로그에 남긴다.
    console.error("oncall dispatch failed:", error instanceof Error ? error.message : error);
    await supabase.from("oncall_alert_events").delete().eq("eventId", harness.eventId);
    return NextResponse.json({ error: "CI dispatch에 실패했습니다." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
