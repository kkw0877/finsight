# Supabase Advisor 진단 리포트

- 스캔 일시: 2026-08-31
- 프로젝트: utlgdjjktzagdcfnvufv (ACTIVE_HEALTHY)
- 커버리지: 보안(security) ✅ / 성능(performance) ✅
- ⚠️ 부가 확인: `list_migrations` 대조 결과 원격 DB에는 `20260724000000_init_schema`만 적용되어 있고, 로컬에 이미 작성된 `20260820000000_fix_subscriptions_insert_policy.sql`, `20260829000000_wrap_auth_uid_in_rls_policies.sql` 두 마이그레이션이 아직 `supabase db push`로 반영되지 않았음을 발견했다. 아래 항목 중 일부는 "새로 고칠 것"이 아니라 "이미 고쳐놓은 것을 배포만 하면 되는 것"이다.

## 요약

🔴 critical **1**  🟠 major **1**(근본원인 기준, raw advisor 6건)  🟡 minor **2**(근본원인 기준, raw advisor 4건)  (security 2건 / performance 2건, raw advisor 총 10건)

| 분류 | 개수 |
|---|---|
| migration-fixable | 2 |
| needs-decision | 1 |
| dashboard-only | 1 |
| out-of-scope | 0 |

## Security

### ADVISOR
id: migration_not_deployed_subscriptions_self_promotion
level: ERROR (advisor 미노출, `list_migrations` 대조로 수동 확인)
severity: critical
classification: migration-fixable
title: 자가승격 수정 미배포
tldr: 원격 DB의 `subscriptions_insert_own` 정책이 아직 `user_id = auth.uid()`만 검사하는 옛 버전 그대로라, 인증된 사용자가 `subscriptions.insert({ user_id: auth.uid(), is_pro: true })`를 직접 호출해 Polar 결제 없이 스스로 Pro로 승격할 수 있는 상태다. 이미 로컬에 수정 마이그레이션이 작성돼 있지만(`20260820000000_fix_subscriptions_insert_policy.sql`) 원격에 반영되지 않아 취약점이 라이브로 열려 있다. Supabase 일반 보안 린터는 컬럼 값 검증 누락 같은 애플리케이션 로직까지는 못 보므로 `get_advisors`에는 나타나지 않는다.
remediation: (Supabase 문서 링크 없음 — 자체 마이그레이션 배포 필요)
migration_draft: |
  새 SQL 불필요. 이미 로컬에 있는 아래 파일들을 원격에 반영하기만 하면 된다:

    supabase/migrations/20260820000000_fix_subscriptions_insert_policy.sql
    supabase/migrations/20260829000000_wrap_auth_uid_in_rls_policies.sql

  적용 방법: `supabase db push` (migrations 폴더를 순서대로 적용)
  배포 후 검증: 인증된 사용자로 `is_pro=true` insert 시도 시 정책 위반으로 거부되는지 재확인.

### ADVISOR
id: auth_leaked_password_protection
level: WARN
severity: minor
classification: dashboard-only
title: 유출 비밀번호 검사 비활성
tldr: HaveIBeenPwned 기반 유출 비밀번호 차단 기능이 꺼져 있다. FinSight는 Google OAuth 단일 로그인이 CRITICAL 규칙으로 명시돼 있어 이메일/비밀번호 가입 경로가 없다면 실질 영향은 제한적이나, Auth 설정에서 email provider가 실제로 비활성화돼 있는지는 advisor로 확인 불가하니 별도 확인 권장.
remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Performance

### ADVISOR
id: auth_rls_initplan
level: WARN
severity: major
classification: migration-fixable
title: RLS auth.uid() 매행 재평가
tldr: uploads/transactions/subscriptions 6개 정책이 `auth.uid()`를 행마다 재평가해 데이터가 늘면 조회 성능이 선형으로 나빠진다(현재 rows: 0이라 체감 장애는 없음). 이미 로컬에 `(select auth.uid())`로 재작성하는 마이그레이션(`20260829000000_wrap_auth_uid_in_rls_policies.sql`)이 작성돼 있으나 원격 미반영 상태라 advisor 경고가 계속 뜬다.
remediation: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
migration_draft: |
  새 SQL 불필요. `supabase/migrations/20260829000000_wrap_auth_uid_in_rls_policies.sql`을
  `supabase db push`로 반영하면 6건 모두 해소되며 정책의 접근 범위는 변경되지 않는다.

### ADVISOR
id: unused_index
level: INFO
severity: minor
classification: needs-decision
title: 미사용 인덱스 3건
tldr: `uploads_user_id_idx`, `transactions_upload_id_idx`, `transactions_user_id_idx` 3건이 미사용으로 표시되지만, 세 테이블 모두 rows: 0인 MVP 초기 단계라 "불필요"와 "트래픽 없음"을 구분할 수 없다. 모두 FK 컬럼 위 인덱스로 RLS 필터·조인에 실사용 시 필요해질 가능성이 높다. **지난 스캔(2026-08-29)에서도 동일하게 검토했고 그때 "유지"로 결정됨 — 이번에도 결론 재확인.**
remediation: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index
options: |
  A. 유지 (추천, 지난 결정과 동일) — FK 컬럼 인덱스라 실사용 시작 즉시 필요해질 것이 거의 확실. rows:0에서는 판단 근거 자체가 없음.
  B. 지금 삭제 — 미세한 쓰기 비용 절감, 다만 재생성 필요 위험.
  C. 실사용자 유입 후 재판단 — 지금은 유의미한 신호가 안 나올 가능성 높음.

## 마이그레이션 가능

- **자가승격 수정 미배포** (`migration_not_deployed_subscriptions_self_promotion`, critical) — 새 SQL 불필요, 기존 파일 2개를 `supabase db push`로 반영
- **RLS auth.uid() 매행 재평가** (`auth_rls_initplan` × 6, major) — 새 SQL 불필요, 기존 파일 1개를 `supabase db push`로 반영

## 판단 필요

- **미사용 인덱스 3건** (`unused_index` × 3, minor) — 추천안: 유지(A). 지난 스캔과 동일한 결론

## 대시보드에서만 가능

- **유출 비밀번호 검사 비활성** (`auth_leaked_password_protection`) — Supabase 대시보드 > Authentication에서 활성화. Google OAuth 단일 로그인이라 영향 제한적

## 범위 밖

없음

## 다음 액션

1. **(critical, 최우선)** `supabase db push`로 `20260820000000_fix_subscriptions_insert_policy.sql` + `20260829000000_wrap_auth_uid_in_rls_policies.sql` 원격 반영 — 결제 우회 취약점이 지금도 라이브로 열려 있음
2. (minor, 판단 필요) 미사용 인덱스 3건 유지 — 별도 조치 불필요
3. (minor, 대시보드 전용) Leaked password protection 활성화 여부는 대시보드에서 별도 판단
