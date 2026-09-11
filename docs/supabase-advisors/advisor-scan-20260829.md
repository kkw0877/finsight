# Supabase Advisor 진단 리포트

- 스캔 일시: 2026-08-29
- 프로젝트: utlgdjjktzagdcfnvufv (ACTIVE_HEALTHY)
- 커버리지: 보안(security) ✅ / 성능(performance) ✅

## 요약

🔴 critical **0**  🟠 major **7**  🟡 minor **3**  (security 1건 / performance 9건)

| 분류 | 개수 |
|---|---|
| migration-fixable | 1 (근본 원인 기준, advisor 6건 포함) |
| needs-decision | 1 (근본 원인 기준, advisor 3건 포함) |
| dashboard-only | 1 |
| out-of-scope | 0 |

## Security

### ADVISOR
id: auth_leaked_password_protection
level: WARN
severity: major
classification: dashboard-only
title: 유출 비밀번호 보호 비활성
tldr: HaveIBeenPwned 기반 유출 비밀번호 차단 기능이 꺼져 있다. FinSight는 Google OAuth 단일 로그인이라 이메일/비밀번호 계정 자체가 없어 실질 영향은 낮지만, Supabase Auth 설정 레벨의 기본 경고이므로 기록해 둔다.
remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Performance

### ADVISOR
id: auth_rls_initplan
level: WARN
severity: major
classification: migration-fixable
title: RLS auth.uid() 매행 재평가
tldr: uploads/transactions/subscriptions 3개 테이블의 select/insert 정책 6개가 모두 `auth.uid()`를 행마다 재평가해 대량 조회 시 성능이 저하된다. `(select auth.uid())`로 감싸면 쿼리플래너가 한 번만 평가하도록 최적화되며, 정책의 의미(접근 범위)는 전혀 바뀌지 않는다.
remediation: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
migration_draft: |
  -- 성능 개선: uploads/transactions/subscriptions RLS 정책 6개가 auth.uid()를
  -- 행마다 재평가해 대량 조회 시 느려진다 (Supabase advisor: auth_rls_initplan,
  -- docs/supabase-advisors/advisor-scan-20260829.md). auth.uid()를
  -- (select auth.uid())로 감싸 한 번만 평가하도록 재작성한다.
  -- 정책의 접근 범위(의미)는 변경하지 않는다 — 재작성 전후로 동일한 행만 허용된다.

  drop policy if exists "uploads_select_own" on public.uploads;
  create policy "uploads_select_own" on public.uploads
    for select
    to authenticated
    using (user_id = (select auth.uid()));

  drop policy if exists "uploads_insert_own" on public.uploads;
  create policy "uploads_insert_own" on public.uploads
    for insert
    to authenticated
    with check (user_id = (select auth.uid()));

  drop policy if exists "transactions_select_own" on public.transactions;
  create policy "transactions_select_own" on public.transactions
    for select
    to authenticated
    using (user_id = (select auth.uid()));

  drop policy if exists "transactions_insert_own" on public.transactions;
  create policy "transactions_insert_own" on public.transactions
    for insert
    to authenticated
    with check (user_id = (select auth.uid()));

  drop policy if exists "subscriptions_select_own" on public.subscriptions;
  create policy "subscriptions_select_own" on public.subscriptions
    for select
    to authenticated
    using (user_id = (select auth.uid()));

  drop policy if exists "subscriptions_insert_own" on public.subscriptions;
  create policy "subscriptions_insert_own" on public.subscriptions
    for insert
    to authenticated
    with check (user_id = (select auth.uid()) and is_pro = false);

### ADVISOR
id: unused_index
level: INFO
severity: minor
classification: needs-decision
title: 미사용 인덱스 3건
tldr: `uploads_user_id_idx`, `transactions_upload_id_idx`, `transactions_user_id_idx` 3개 인덱스가 사용된 적이 없다고 advisor가 보고한다. 다만 현재 세 테이블 모두 `rows: 0`(실사용자 데이터 없는 MVP 초기 단계)이라 advisor가 관측할 쿼리 자체가 없었을 뿐이며, `user_id`/`upload_id`는 애플리케이션이 항상 조회 조건으로 쓰는 컬럼(RLS 정책·대시보드 쿼리 모두 이 컬럼 기준)이라 실제로 불필요한 인덱스로 보기 어렵다.
remediation: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index
options: |
  A. 유지한다 (추천) — 실사용자 트래픽이 없어 advisor가 관측할 기회가 없었을 뿐, user_id/upload_id는 RLS 정책과 대시보드 조회에서 상시 사용되는 조건 컬럼이다. 지금 지웠다가 서비스 오픈 후 다시 필요해지면 재생성 비용(대용량 테이블에서는 락/시간)이 더 크다.
  B. 지금 삭제한다 — 쓰기 비용을 미세하게 줄일 수 있지만, 이미 RLS 정책이 이 컬럼들을 조건절로 쓰고 있어 서비스 오픈 직후 바로 다시 필요해질 가능성이 높다.
  C. 실사용자 트래픽이 쌓인 뒤(예: 프로덕션 오픈 후 1개월) advisor를 재실행해 그때도 unused로 나오면 그때 삭제를 재판단한다.

## 마이그레이션 가능

- **RLS auth.uid() 매행 재평가** (`auth_rls_initplan` × 6, uploads/transactions/subscriptions select+insert 정책 전체) — 접근 범위 변경 없는 순수 성능 재작성

## 판단 필요

- **미사용 인덱스 3건** (`unused_index` × 3) — 추천안: 유지(A). 이유: 데이터 0건인 MVP 단계라 advisor 관측 자체가 무의미하며, 해당 컬럼은 RLS 정책이 상시 사용 중

## 대시보드에서만 가능

- **유출 비밀번호 보호 비활성** (`auth_leaked_password_protection`) — Supabase 대시보드 > Authentication > Policies에서 활성화. Google OAuth 단일 로그인이라 실질 영향은 낮음

## 범위 밖

없음

## 다음 액션

1. (major) RLS `auth_rls_initplan` 6건을 하나의 마이그레이션으로 재작성 — 접근 범위 변경 없음, 승인 시 바로 파일 작성 가능
2. (minor, 판단 필요) 미사용 인덱스 3건 유지/삭제 여부 결정 — 유지 추천
3. (major, 대시보드 전용) Leaked password protection 활성화 여부는 대시보드에서 별도 판단
