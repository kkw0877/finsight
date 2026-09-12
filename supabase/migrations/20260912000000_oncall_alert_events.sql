-- Oncall prod alert 1차 방어선의 멱등 저장소.
-- PostHog error tracking 웹훅(/api/webhooks/posthog-alert/[secret])이 GitHub Actions로
-- dispatch하기 전에 event_id를 여기 먼저 넣는다 — insert가 unique 제약으로 실패하면
-- 이미 처리된(또는 처리 중인) 이벤트라는 뜻이라 재전송을 멱등하게 무시한다.
-- 참고: docs/ADR.md ADR-012.
create table public.oncall_alert_events (
  event_id text primary key,
  trigger_type text not null check (trigger_type in ('issue_created', 'issue_spiking')),
  issue_fingerprint text not null,
  received_at timestamptz not null default now()
);

alter table public.oncall_alert_events enable row level security;
-- 정책을 두지 않는다: anon/authenticated는 기본적으로 전부 거부되고,
-- 이 테이블은 서비스 롤 클라이언트(웹훅 핸들러)만 접근한다(RLS를 우회함).
