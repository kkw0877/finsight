# OWASP Top 10:2025 보안 스캔 리포트

- 스캔 일시: 2026-08-20
- 스캔 대상: `src/app/`, `src/services/`, `src/lib/`, `src/components/`, `src/hooks/`, `supabase/migrations/`, `.github/workflows/`, `package.json`, `next.config.ts`, `.env.example`
- 커버리지: 소스코드 정적분석 ✅ / 의존성(npm audit) ✅ / 인프라(Supabase) ⚠️ 프로젝트가 일시정지(INACTIVE) 상태라 `get_advisors` 결과(`{"lints": []}`)의 신뢰도가 낮음 — `supabase/migrations/*.sql` 정적 분석으로 대체

## 요약

🔴 critical **3**  🟠 major **7**  🟡 minor **3**  ⚪ nit **0**  (총 13건, 근본 원인 기준 10건 — 3건은 2개 카테고리에 중복 태깅)

| 카테고리 | 발견 수 |
|---|---|
| A01 Broken Access Control | 2 |
| A02 Security Misconfiguration | 1 |
| A03 Software Supply Chain Failures | 4 |
| A04 Cryptographic Failures | 1 |
| A05 Injection | 0 |
| A06 Insecure Design | 2 |
| A07 Authentication Failures | 0 |
| A08 Software or Data Integrity Failures | 1 |
| A09 Security Logging and Alerting Failures | 1 |
| A10 Mishandling of Exceptional Conditions | 1 |

> ⚠️ 아래 3개 근본 원인은 서로 다른 OWASP 카테고리 관점에서 각 스캐너가 독립적으로 발견해 중복 태깅되었습니다: 카드번호 마스킹 정규식 결함(A04+A06), 블러 페이월 설계 결함(A01+A06), `subscriptions` RLS self-promotion(A01+A02). 수정은 한 번만 하면 됩니다 — 아래 각 섹션에 교차 참조를 표시했습니다.

## A01 Broken Access Control

### FINDING
file: supabase/migrations/20260724000000_init_schema.sql
line: 92
owasp: A01 Broken Access Control
severity: major
title: 셀프 Pro 승급 가능
tldr: `subscriptions_insert_own` 정책이 `user_id = auth.uid()`만 검사하고 `is_pro` 값은 검사하지 않아, 인증된 사용자가 브라우저의 anon key로 자신의 세션을 이용해 Supabase REST/JS 클라이언트에서 직접 `subscriptions.insert({ user_id: <own>, is_pro: true })`를 호출하면 Polar 결제 없이 Pro 상태를 얻을 수 있다 (UPDATE 정책이 없어 웹훅이 나중에 덮어쓰기 전까지 유지됨). *(→ [A02] 동일 근본 원인, config-exception 스캐너는 critical로 판단)*
fix: |
  `subscriptions_insert_own` 정책을 제거하거나 `with check (user_id = auth.uid() and is_pro = false)`로 제한하고, 실제 `is_pro=true` 반영은 서비스 롤 클라이언트(webhook)를 통해서만 이루어지도록 강제한다.

### FINDING
file: src/app/api/upload/route.ts
line: 106
owasp: A01 Broken Access Control
severity: major
title: 블러 페이월 데이터 노출
tldr: `blurred`가 true여도 서버가 전체 `analysis`(거래 내역·요약·금액)를 그대로 JSON으로 응답하고, `DashboardContent.tsx`(72번 줄)와 `dashboard/page.tsx`(24번 줄)는 CSS `blur-sm`으로만 가리므로 DevTools/네트워크 탭/CSS 비활성화로 무료 한도 초과 후에도 원본 데이터를 그대로 볼 수 있어 페이월이 사실상 무력화된다. *(→ [A06] 동일 근본 원인)*
fix: |
  `blurred=true`인 경우 서버(`route.ts`, `dashboard/page.tsx`)에서 응답 페이로드 자체를 요약 통계만 남기고 거래 상세(merchant/amount/summaryText 등)는 제거한 뒤 내려보낸다.

## A02 Security Misconfiguration

### FINDING
file: supabase/migrations/20260724000000_init_schema.sql
line: 92-95
owasp: A02 Security Misconfiguration
severity: critical
title: subscriptions INSERT로 is_pro 자가 승격
tldr: `subscriptions_insert_own` 정책이 `is_pro` 값을 검증하지 않아, 아직 구독 행이 없는 신규 사용자가 anon key + 자신의 세션으로 PostgREST에 직접 `insert({user_id: self, is_pro: true})`를 호출해 결제 없이 Pro로 자가 승격할 수 있다. CLAUDE.md CRITICAL "Free/Pro 분기는 is_pro 하나로 판단하고 클라이언트를 신뢰하지 않는다"는 서버 API 코드(`app/api/webhooks/polar`)에서는 지켜지지만 RLS 계층에서는 강제되지 않는다. *(→ [A01] 동일 근본 원인, 이 스캐너는 critical로 판단 — 결제 우회로 직접 이어지는 경로라 더 높은 심각도 부여)*
fix: |
  INSERT 정책에 `with check (user_id = auth.uid() and is_pro = false)`를 추가하거나, client INSERT를 아예 금지하고 서비스 롤(webhook)만 행을 생성하도록 정책을 `to service_role`로 제한한다.

## A03 Software Supply Chain Failures

### FINDING
file: package.json
line: 18
owasp: A03 Software Supply Chain Failures
severity: major
title: next 프로덕션 high 취약점
tldr: 프로덕션 의존성 `next`가 "15.5.21"로 고정돼 있지만 이 버전 자체가 npm audit high 취약 범위(9.3.4-canary.0 ~ 16.3.0-preview.10, postcss/sharp 경유)에 포함되어 프로덕션 런타임 전 라우트가 영향을 받는다.
fix: |
  next를 16.3.1 이상(semver major)으로 업그레이드하고 마이그레이션 가이드에 따라 회귀 테스트 후 배포한다.

### FINDING
file: package.json
line: 38
owasp: A03 Software Supply Chain Failures
severity: major
title: vitest critical CVE(dev 전용)
tldr: devDependency `vitest`(해석 버전 2.1.9)가 GHSA-5xrq-8626-4rwp(UI 서버 임의 파일 read/exec, CVSS 9.8, `<=3.2.5` 영향)에 해당한다. 이 레포의 `npm run test`는 `vitest run`(UI 서버 미기동)만 쓰고 프로덕션에는 번들되지 않아 실사용 노출 경로는 없지만, 로컬에서 `vitest --ui`를 수동 실행하면 노출된다.
fix: |
  vitest를 4.1.11 이상으로 업그레이드한다. 즉시 프로덕션 리스크는 아니므로 next 업그레이드보다 후순위로 처리 가능.

### FINDING
file: package.json
line: 16
owasp: A03 Software Supply Chain Failures
severity: minor
title: supabase-js 인증 SDK 범위 개방
tldr: 인증/DB 클라이언트인 `@supabase/supabase-js`가 `^2.110.8`로 선언돼 2.x 내 모든 minor/patch를 자동 허용한다. CI가 `npm ci`(lockfile 고정)를 쓰므로 즉각적 위험은 낮지만 lockfile 재생성 시 검증되지 않은 버전이 인증 경로에 유입될 수 있다.
fix: |
  exact 버전 고정(예: "2.110.8")을 고려하고 Dependabot/Renovate로 버전 변경을 PR 리뷰 대상화한다.

### FINDING
file: package.json
owasp: A03 Software Supply Chain Failures
severity: minor
title: 잔여 high/moderate 전이 취약점
tldr: `brace-expansion`(DoS, CVSS 7.5), `js-yaml`, `nanoid`, `postcss`, `sharp`, `vite` 등 high 등급과 `@vitest/mocker`/`esbuild`/`vite-node` 등 moderate 등급 전이 의존성이 남아있다. 모두 fixAvailable로 표시되어 있고 devDependency 체인 또는 next 번들 경로에 있다.
fix: |
  `npm audit fix`로 fixAvailable 항목을 우선 정리하고, next/vitest major 업그레이드 이후 재점검한다.

## A04 Cryptographic Failures

### FINDING
file: src/lib/statement.ts
line: 19
owasp: A04 Cryptographic Failures
severity: major
title: 마스킹 정규식 구분자 의존
tldr: `CARD_NUMBER_RE`/`ACCOUNT_NUMBER_RE`가 4자리씩 하이픈(-) 또는 공백으로 구분된 형식만 매칭하므로, 구분자 없이 붙어있는 카드/계좌번호(예: `1234567890123456`)나 다른 구분자를 쓴 번호는 마스킹되지 않은 채 그대로 Claude API로 전송된다. *(→ [A06] 동일 근본 원인, injection-design 스캐너는 critical로 판단 — 마스킹 우회를 설계 결함으로 보아 더 높은 심각도 부여)*
fix: |
  구분자 없는 연속 숫자(카드 13~16자리, 계좌 10~14자리)도 매칭하도록 정규식을 확장하거나, Luhn 등으로 카드번호 후보를 판별하는 방식으로 보강한다.

## A05 Injection

발견 없음.

## A06 Insecure Design

### FINDING
file: src/lib/statement.ts
line: 19
owasp: A06 Insecure Design
severity: critical
title: 구분자 없는 카드번호 마스킹 누락
tldr: 구분자 없이 연속된 16자리 카드번호(일부 카드사 CSV 내보내기에서 흔한 포맷)나 구분자 없는 계좌번호가 `maskSensitiveData`를 그대로 통과해 마스킹되지 않은 원문이 Claude API로 전송된다. *(→ [A04] 동일 근본 원인)*
fix: |
  구분자 없는 연속 숫자열을 커버하는 보조 정규식(날짜·금액과의 오탐 방지 로직 병행)을 추가하고, `statement.test.ts`에 구분자 없는 케이스를 회귀 테스트로 추가한다.

### FINDING
file: src/app/api/upload/route.ts
line: 85
owasp: A06 Insecure Design
severity: major
title: 페이월이 CSS 블러에만 의존
tldr: `blurred` 플래그는 서버가 계산하지만 실제 데이터 노출 차단은 클라이언트 렌더링(CSS)에만 의존하는 설계 결함. *(→ [A01] 동일 근본 원인)*
fix: |
  서버가 blurred 상태에서는 민감 데이터 자체를 응답에서 제거한 축약 payload만 반환하도록 설계를 바꾼다.

## A07 Authentication Failures

발견 없음.

## A08 Software or Data Integrity Failures

### FINDING
file: .github/workflows/claude-review-code.yml
line: 83-141
owasp: A08 Software or Data Integrity Failures
severity: critical
title: LLM 자가판정 기반 자동병합
tldr: `gate`/`automerge` 잡이 PR diff를 읽은 `claude-code-action`이 스스로 산출한 `.review-severity.txt`(critical/major/minor 개수)만을 근거로 `contents: write` 권한의 `GITHUB_TOKEN`으로 `gh pr merge --squash`를 실행한다. 이 카운트는 공격자가 통제 가능한 PR diff 내용(프롬프트 인젝션)에 의해 조작될 수 있고, 사람의 독립적 승인이나 산출값 자체의 무결성 검증(서명/체크섬/2차 검증) 없이 그대로 신뢰되어 main 브랜치 병합을 트리거한다.
fix: |
  automerge를 완전 자동화하지 말고 사람의 최종 승인(required review) 게이트를 남기거나, review job 산출값을 별도의 신뢰 가능한 체크(정적 룰 기반 재검증)로 교차검증한 뒤에만 머지를 허용한다. `automerge` 잡의 `GITHUB_TOKEN` 권한을 최소 범위로 낮추고, PR diff에 review 카운트 조작 시도 지시문이 포함되는지 필터링을 추가하는 것도 고려한다.

## A09 Security Logging and Alerting Failures

### FINDING
file: src/app/api/webhooks/polar/route.ts
line: 26
owasp: A09 Security Logging and Alerting Failures
severity: minor
title: 웹훅 서명 실패 무로깅
tldr: `verifyAndParseWebhook`이 서명 검증에 실패해 `null`을 반환해도 이 경로에서 아무 로그도 남기지 않아, 위조된 웹훅 호출 시도(반복 공격 등)를 탐지할 방법이 없다.
fix: |
  요청 payload/헤더 원문은 남기지 말고 `console.warn("polar webhook signature verification failed")` 같은 이벤트만 기록해 탐지 가능하게 한다.

## A10 Mishandling of Exceptional Conditions

### FINDING
file: src/app/api/upload/route.ts
line: 65-70
owasp: A10 Mishandling of Exceptional Conditions
severity: major
title: PDF 파싱 예외 메시지 그대로 노출
tldr: `extractTextFromPdf`(unpdf/pdf.js)가 던지는 임의의 예외를 `catch (err) { ... (err as Error).message }`로 그대로 400 응답에 실어 보낸다. `pdf.ts` 내부의 통제된 에러 외에, 손상되거나 비정상적인 PDF에 대해 라이브러리가 던지는 내부 예외 메시지(파싱 상태·내부 구조 정보)까지 동일 경로로 클라이언트에 그대로 전달된다.
fix: |
  catch 블록에서 알려진 Error(커스텀 에러 클래스 또는 메시지 화이트리스트)인지 구분해, 알려지지 않은 예외는 "PDF를 처리할 수 없습니다." 같은 고정 메시지로 치환한다.

## 다음 액션

**Critical 3건 — 최우선 수정**
1. `supabase/migrations/20260724000000_init_schema.sql:92` — `subscriptions` INSERT RLS 정책에 `is_pro` 검증 추가 (A01/A02, 결제 우회로 직결)
2. `.github/workflows/claude-review-code.yml:83-141` — CI 자동병합이 LLM 자가판정만 신뢰하는 구조 개선 (A08, main 브랜치 무결성)
3. `src/lib/statement.ts:19` — 구분자 없는 카드/계좌번호 마스킹 정규식 보강 (A04/A06, CLAUDE.md CRITICAL #2 직접 위반)

**Major 7건 — 다음 우선순위**
- 블러 페이월 서버 응답 필터링 (A01/A06, `src/app/api/upload/route.ts`, `src/app/dashboard/page.tsx`)
- `next` 16.3.1 업그레이드 (A03, 프로덕션 high 취약점)
- `vitest` 4.1.11 업그레이드 (A03, dev 전용이나 critical CVE)
- PDF 파싱 예외 메시지 화이트리스트 처리 (A10)

**Minor 3건** — 웹훅 서명 실패 로깅, supabase-js 버전 고정, 잔여 전이 취약점 정리(`npm audit fix`)는 여유 있을 때 처리.
