export type OncallTriggerType = "issue_created" | "issue_spiking";

/**
 * 멱등 저장소(oncall_alert_events) 행 — event_id 선삽입으로 중복 웹훅 배달을 막는다.
 */
export interface OncallAlertEvent {
  eventId: string;
  triggerType: OncallTriggerType;
  issueFingerprint: string;
  receivedAt?: string;
}

/**
 * CI(GitHub Actions)가 repository_dispatch의 client_payload로 받아 "하네스"로 읽는
 * 정규화된 알림 컨텍스트. PostHog 원본 이벤트 필드는 여기서만 파싱한다.
 *
 * GitHub repository_dispatch API는 client_payload의 top-level 속성을 최대 10개로
 * 제한한다(초과 시 422) — 필드를 추가할 땐 이 한도를 반드시 확인할 것. projectUrl은
 * 별도로 담지 않는다 — deepLink가 이미 그 값을 포함한다.
 */
export interface OncallAlertHarness {
  eventId: string;
  triggerType: OncallTriggerType;
  fingerprint: string;
  issueId: string;
  name: string;
  description: string;
  exceptionTimestamp: string;
  currentBucketValue: number | null;
  computedBaseline: number | null;
  deepLink: string;
}
