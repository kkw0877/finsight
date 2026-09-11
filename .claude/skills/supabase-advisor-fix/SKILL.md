---
name: supabase-advisor-fix
description: 실제 운영 중인 Supabase 프로젝트의 get_advisors(security + performance)로 라이브 진단 데이터를 받아 docs/supabase-advisors/에 마크다운 리포트로 저장하고, 사용자와 상의해 승인된 항목만 supabase/migrations/에 마이그레이션 파일 초안을 작성한다(원격 DB에 즉시 반영하지 않음 — apply_migration/execute_sql 미사용). 사용자가 "Supabase 어드바이저 점검해줘", "DB 보안/성능 점검하고 고쳐줘", "get_advisors 결과 보고 고쳐줘" 등을 요청하거나 /supabase-advisor-fix를 실행할 때 사용한다. 코드베이스 정적 스캔은 /owasp-scan이 담당하므로 이 스킬의 범위가 아니다.
---

# Supabase Advisor 진단 및 수정

실제 Supabase 프로젝트의 라이브 어드바이저 데이터를 받아 진단 리포트를 만들고(Phase A), 그 리포트를 근거로 사용자와 상의하며 실제로 고칠 것은 마이그레이션 파일로 작성한다(Phase B). Phase A만으로 끝내지 말고 반드시 Phase B로 이어가되, **각 수정은 사용자의 명시적 확인 없이는 파일을 쓰지 않는다.**

## Phase A: 진단

### 1. 프로젝트 상태 확인 (필수 선행 단계)

`.env`의 `NEXT_PUBLIC_SUPABASE_URL`(`https://<ref>.supabase.co` 형태)에서 project ref를 추출한다. ref를 하드코딩하지 마라 — 프로젝트가 재발급될 수 있다. 추출에 실패하면 사용자에게 알리고 6단계 정적 폴백으로 넘어간다.

`mcp__supabase__get_project(id=<ref>)`를 호출한다.

- `status == "ACTIVE_HEALTHY"` → 2단계로 진행.
- `COMING_UP`/`RESTARTING`/`RESTORING`/`UPGRADING` 등 전환 상태 → 최대 3회, 매번 짧게 간격을 두고 재조회한다. 그래도 `ACTIVE_HEALTHY`가 안 되면 현재 상태를 사용자에게 알리고 "잠시 후 다시 실행해 달라"고 안내한 뒤 여기서 멈춘다(정적 분석으로 강행하지 않는다 — 기동 중에는 advisor 데이터가 없거나 무의미할 가능성이 높다).
- `PAUSED`/`INACTIVE` → "Supabase 대시보드에서 프로젝트를 재개해야 한다"고 안내한다. 이 스킬은 프로젝트를 재개시키는 어떤 MCP 툴도 호출하지 않는다. 사용자가 "정적 분석만이라도 해달라"고 명시하면 6단계 폴백으로 진행.
- 조회 자체가 실패(MCP 미연결 등) → 사용자에게 알리고 6단계 폴백으로 진행.

### 2. 어드바이저 데이터 수집 (오케스트레이터가 직접 수행, ACTIVE_HEALTHY일 때만)

서브에이전트에는 `Bash`/MCP 툴을 주지 않으므로, 동적 데이터는 여기서 미리 모아 프롬프트 텍스트로 넘긴다.

- `mcp__supabase__get_advisors(project_id=<ref>, type: "security")`
- `mcp__supabase__get_advisors(project_id=<ref>, type: "performance")`
- `mcp__supabase__list_tables(project_id=<ref>, schemas: ["public"], verbose: true)` — 서브에이전트에 스키마 요약으로 제공

두 advisor 결과의 `lints`가 모두 비어 있으면 서브에이전트 호출을 생략하고 5단계로 건너뛰어 "이상 없음" 리포트만 짧게 작성한다.

### 3. 심각도 1차 매핑

Supabase의 `level` 필드를 아래처럼 매핑한다: `ERROR`→🔴critical, `WARN`→🟠major, `INFO`→🟡minor. 서브에이전트는 실제 영향(예: 결제 우회로 직결되는지)을 근거로 상향 조정할 수 있으며, 그 경우 tldr에 이유를 남긴다.

### 4. 서브에이전트 병렬 호출 (또는 정적 폴백)

**한 메시지 안에서 Agent 툴을 2번 호출**한다 (`subagent_type`: `supabase-advisor-security-fixer`, `supabase-advisor-performance-fixer`).

모든 호출에 공통으로 넣을 내용:
- 1단계에서 확인한 프로젝트 상태(정상 수집 / 폴백 사유)
- 정상 수집 시: 해당 타입의 advisor 원본 항목 전체(`name`, `level`, `categories`, `description`, `detail`, `remediation`, `metadata`)를 텍스트로
- 폴백 시: "advisor 데이터 없음 — `supabase/migrations/*.sql`을 Read/Grep해서 같은 관점(security: RLS·정책·권한 / performance: 인덱스·쿼리)의 잠재 문제를 추정하라. 실제 운영 데이터가 아니므로 모든 판단 앞에 '(추정)'을 표시하라."
- 2단계에서 얻은 `list_tables` 요약
- `/CLAUDE.md`의 CRITICAL 규칙 전문(직접 Read해서 그대로 삽입)
- `supabase/migrations/20260820000000_fix_subscriptions_insert_policy.sql` 전문(RLS 관련 제안 시 재발 방지 반례로 반드시 참고)

각 에이전트는 자기 파일에 정의된 `### ADVISOR` 블록 형식으로만 응답한다.

### 5. 결과 취합 및 분류

두 응답에서 모든 `### ADVISOR` 블록을 모아 아래 네 가지로 분류한다:

- **migration-fixable**: 트레이드오프 없이 SQL 마이그레이션 한 번으로 안전하게 고칠 수 있음 (예: `function_search_path_mutable`, `extension_in_public`, `auth_rls_initplan` 재작성, 누락된 PK/인덱스로 인한 FK 경고)
- **needs-decision**: 되돌리기 어렵거나 명확한 트레이드오프가 있어 사용자 선택이 필요 (예: `unused_index` 삭제 여부, 신규 인덱스 추가로 인한 쓰기 비용, `multiple_permissive_policies` 통합이 접근 범위에 미치는 영향) — 서브에이전트가 2~3개 옵션과 각각의 장단점, 추천안을 제시한다
- **dashboard-only**: SQL 마이그레이션으로 고칠 수 없는 Auth/Project 설정 (예: `leaked_password_protection_disabled`, OTP 만료 시간) — 마이그레이션 제안 없이 "Supabase 대시보드 > Authentication에서 변경" 안내만 남긴다
- **out-of-scope**: DB가 아니라 애플리케이션 코드 변경이 필요 — 마이그레이션 대상이 아니며 `/review-code`나 수동 리뷰로 안내만 한다

### 6. 리포트 저장

`docs/supabase-advisors/advisor-scan-<YYYYMMDD>.md`로 저장한다(디렉토리가 없으면 Write 시 자동 생성되며, 같은 날짜에 이미 파일이 있으면 덮어쓴다).

리포트 구성:

```markdown
# Supabase Advisor 진단 리포트

- 스캔 일시: <ISO 날짜/시간>
- 프로젝트: <ref> (<상태: ACTIVE_HEALTHY | 폴백 사유>)
- 커버리지: 보안(security) <✅|⚠️ 사유> / 성능(performance) <✅|⚠️ 사유>

## 요약

🔴 critical <n>  🟠 major <n>  🟡 minor <n>  (security <n>건 / performance <n>건)

| 분류 | 개수 |
|---|---|
| migration-fixable | <n> |
| needs-decision | <n> |
| dashboard-only | <n> |
| out-of-scope | <n> |

## Security
<security 타입 ADVISOR 블록들, 없으면 "발견 없음">

## Performance
<performance 타입 ADVISOR 블록들, 없으면 "발견 없음">

## 마이그레이션 가능
<migration-fixable 항목 목록(제목 + 근거 advisor id)>

## 판단 필요
<needs-decision 항목 목록 + 제시된 옵션 요약>

## 대시보드에서만 가능
<dashboard-only 항목 목록>

## 범위 밖
<out-of-scope 항목 목록>

## 다음 액션
<critical/major 우선순위로 나열. 없으면 "critical/major 없음">
```

정적 폴백을 사용했다면 커버리지 라인에 "⚠️ 정적 분석 대체, 신뢰도 낮음"을 명시한다(2026-08-20 owasp-scan 리포트와 동일한 관례).

### 7. 채팅 요약 (Phase A 종료)

리포트 전문을 채팅에 다시 출력하지 않는다. 총 개수, critical/major 개수, 저장된 파일 경로만 요약하고, needs-decision 항목이 있으면 그 목록만 짧게 미리 보여준다.

## Phase B: 사용자와 상의하며 실제 수정

Phase A 리포트를 근거로 진행한다. **어떤 항목도 사용자의 명시적 확인 없이 다음 단계로 넘어가지 않는다.**

### 8. 항목별 상의

- `migration-fixable` 항목: "이대로 마이그레이션 파일을 만들까요?"라고 구체적인 변경 내용과 함께 확인만 받는다.
- `needs-decision` 항목: 제시된 옵션(예: "인덱스를 지운다 / 유지한다 / 일정 기간 모니터링 후 재판단한다")과 장단점을 보여주고 사용자의 선택을 기다린다.
- `dashboard-only`, `out-of-scope` 항목: 마이그레이션을 만들지 않고 안내만 한다.

### 9. 마이그레이션 파일 초안 작성 (승인된 항목만)

파일당 하나의 논리적 변경 단위로 SQL을 작성한다.

파일명: `supabase/migrations/<YYYYMMDDHHMMSS>_<slug>.sql` (예: `20260828120000_wrap_auth_uid_in_rls_policies.sql`)

파일 상단 주석에 반드시 포함한다:
- 무엇이 문제였는지 (advisor id + 한 문장 요약)
- 근거 리포트 경로 (`docs/supabase-advisors/advisor-scan-<날짜>.md`)
- (needs-decision이었던 경우) 사용자가 어떤 선택을 했는지

**Write하기 전에 정확한 SQL 전문을 채팅에 먼저 보여주고 최종 확인을 받는다. 확인 없이 Write하지 않는다.**

### 10. 다음 액션 안내

마이그레이션 파일 작성 후 아래를 안내하고 종료한다. **이 스킬은 `supabase db push`, `git add`/`commit`, PR 생성을 스스로 하지 않는다** — 마이그레이션 파일 작성까지가 이 스킬의 책임이며, 반영/커밋/PR은 항상 사용자의 별도 요청에 따른다(CLAUDE.md "커밋은 명시적 요청 시에만" 전역 방침).

- 로컬에서 생성된 마이그레이션 파일 diff를 리뷰할 것
- 원격 반영은 `supabase db push`(또는 `supabase migration up`)로 사용자가 직접 실행
- 커밋이 필요하면 conventional commits로 명시적으로 요청
- PR 생성이 필요하면 별도로 요청

## 범위 밖

- `mcp__supabase__apply_migration`/`execute_sql`로 원격에 즉시 반영하지 않는다.
- `mcp__supabase__create_branch`/`merge_branch`(Supabase branching)는 사용하지 않는다.
- 정기 실행(CI 자동화)은 하지 않는다 — 온디맨드 스킬이다.
- 프로젝트를 재개(unpause)시키는 동작은 하지 않는다 — 대시보드 안내만 한다.
- 코드베이스 정적 스캔은 `/owasp-scan`이 담당한다. 이 스킬은 라이브 Supabase advisor 데이터를 다룬다.
