import { timingSafeEqual } from "crypto";
import type { OncallAlertHarness, OncallTriggerType } from "@/types/oncall";

const TRIGGER_EVENT_MAP: Record<string, OncallTriggerType> = {
  $error_tracking_issue_created: "issue_created",
  $error_tracking_issue_spiking: "issue_spiking",
};

/**
 * PostHog error tracking alert(단건/급증) 웹훅 검증 + 파싱.
 *
 * PostHog의 범용 webhook 데스티네이션(template-webhook)은 Polar의 Standard Webhooks와
 * 달리 요청 서명을 제공하지 않는다 — 대신 URL 자체에 시크릿 토큰을 심는(Slack Incoming
 * Webhook과 동일한) 방식으로 검증한다: POST /api/webhooks/posthog-alert/[secret].
 * POSTHOG_ALERT_WEBHOOK_SECRET이 없으면 즉시 false(fail-closed, Polar 패턴과 동일).
 */
export function verifyWebhookSecret(secret: string | undefined): boolean {
  const expected = process.env.POSTHOG_ALERT_WEBHOOK_SECRET;
  if (!expected || !secret) return false;

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(secret);
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * 웹훅 body를 OncallAlertHarness로 정규화한다. `$error_tracking_issue_created`/
 * `_spiking` 이외의 이벤트나 event.uuid가 없는 형태 이상 페이로드는 null을 반환한다
 * (서명은 맞지만 처리 대상이 아니거나 방어적으로 무시해야 하는 경우 — 500이 아니다).
 */
export function parseAlertPayload(body: unknown): OncallAlertHarness | null {
  if (typeof body !== "object" || body === null) return null;

  const event = (body as { event?: unknown }).event;
  if (typeof event !== "object" || event === null) return null;

  const eventName = (event as { event?: unknown }).event;
  const triggerType = typeof eventName === "string" ? TRIGGER_EVENT_MAP[eventName] : undefined;
  if (!triggerType) return null;

  const eventId = (event as { uuid?: unknown }).uuid;
  if (typeof eventId !== "string" || eventId.length === 0) return null;

  const properties = (event as { properties?: unknown }).properties;
  const props = typeof properties === "object" && properties !== null ? (properties as Record<string, unknown>) : {};

  const issueId = (event as { distinct_id?: unknown }).distinct_id;
  const project = (body as { project?: unknown }).project;
  const projectUrl =
    typeof project === "object" && project !== null && typeof (project as { url?: unknown }).url === "string"
      ? ((project as { url: string }).url)
      : "";

  const fingerprint = typeof props.fingerprint === "string" ? props.fingerprint : "";
  const exceptionTimestamp = typeof props.exception_timestamp === "string" ? props.exception_timestamp : "";

  return {
    eventId,
    triggerType,
    fingerprint,
    issueId: typeof issueId === "string" ? issueId : "",
    name: typeof props.name === "string" ? props.name : "",
    description: typeof props.description === "string" ? props.description : "",
    exceptionTimestamp,
    currentBucketValue: typeof props.current_bucket_value === "number" ? props.current_bucket_value : null,
    computedBaseline: typeof props.computed_baseline === "number" ? props.computed_baseline : null,
    deepLink: projectUrl
      ? `${projectUrl}/error_tracking/fingerprint/${encodeURIComponent(fingerprint)}?timestamp=${encodeURIComponent(exceptionTimestamp)}&utm_source=alert&utm_campaign=error_tracking_alert&utm_medium=github`
      : "",
  };
}
