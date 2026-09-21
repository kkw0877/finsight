# OWASP Top 10:2025 보안 스캔 리포트

- 스캔 일시: 2026-09-21T03:32:23Z
- 스캔 대상: `src/app/`, `src/services/`, `src/lib/`, `src/components/`, `src/hooks/`, `supabase/migrations/`, `package.json` (+ 루트 설정 파일 및 `.github/workflows/` 부수 확인)
- 커버리지: 소스코드 정적분석 ✅ / 의존성(npm audit) ✅ / 인프라(Supabase) ⚠️ 미연결, 정적 확인만

> 인프라 항목 주의: 이 CI 환경에는 Supabase MCP 서버가 연결되어 있지 않아 `get_advisors(security)` / `list_tables` 라이브 진단을 수행하지 못했다. **Supabase 미연결 — 정적 마이그레이션 파일 확인으로 대체**했으며, 실제 운영 DB 상태가 `supabase/migrations/*.sql`과 다를 가능성은 배제할 수 없다.

## 요약

🔴 critical 1  🟠 major 9  🟡 minor 3  ⚪ nit 0

| 카테고리 | 발견 수 |
|---|---|
| A01 Broken Access Control | 3 |
| A02 Security Misconfiguration | 0 |
| A03 Software Supply Chain Failures | 3 |
| A04 Cryptographic Failures | 1 |
| A05 Injection | 1 |
| A06 Insecure Design | 2 |
| A07 Authentication Failures | 0 |
| A08 Software or Data Integrity Failures | 1 |
| A09 Security Logging and Alerting Failures | 0 |
| A10 Mishandling of Exceptional Conditions | 2 |

총 13건.

---

## A01 Broken Access Control

### FINDING
file: src/app/api/upload/route.ts
line: 138
owasp: A01 Broken Access Control
severity: 🟠 major
title: 페이월이 서버 데이터에 미강제
tldr: 무료 한도를 초과해 `blurred: true`가 되어도 API는 `analysis`(거래내역 전체·요약·카테고리 집계)를 그대로 응답 본문에 담아 반환하므로, 클라이언트가 `blurred` 플래그만 무시하면(또는 네트워크 탭/CSS 조작으로) 결제 없이 전체 분석 결과를 볼 수 있다.
fix: |
  blurred가 true면 서버에서 transactions/categoryTotals/summaryText 등 민감 필드를 제거하거나 마스킹한 축소 응답만 반환하고, Pro 확인 후에만 전체 데이터를 내려준다.

### FINDING
file: src/app/dashboard/page.tsx
line: 24
owasp: A01 Broken Access Control
severity: 🟠 major
title: 대시보드 RSC 페이로드 전체 노출
tldr: `blurred` 여부와 무관하게 `aggregateTransactions` 결과 전체를 `DashboardContent`에 `initialAnalysis`로 넘기며, 실제 가림 처리는 `src/components/DashboardContent.tsx:72`에서 CSS `blur-sm` 클래스로만 이루어져 페이지 소스(RSC 페이로드)에는 전체 거래 내역이 그대로 포함된다 — 개발자도구로 CSS를 끄거나 페이로드를 직접 읽으면 무료 한도 초과 사용자도 전체 데이터를 볼 수 있다.
fix: |
  blurred일 때는 page.tsx에서 서버가 요약/거래 내역을 제거·마스킹한 값을 initialAnalysis로 전달하고, 클라이언트는 그 축소된 데이터만 렌더링하도록 한다(CSS 블러는 UX 보조 수단으로만 사용).

### FINDING
file: src/components/UploadWidget.tsx
line: 65
owasp: A01 Broken Access Control
severity: 🟡 minor
title: 업로드 응답 전체를 클라이언트 상태로 저장
tldr: `/api/upload` 응답(blurred=true 포함)을 검증 없이 그대로 `onResult`로 넘겨 `DashboardContent` state에 저장하므로, 위 API 응답 노출 문제(app/api/upload/route.ts)가 고쳐지지 않는 한 이 경로로도 동일하게 전체 데이터가 클라이언트에 남는다.
fix: |
  서버 응답 자체가 blurred일 때 민감 필드를 제거하도록 고치면(위 finding) 이 컴포넌트는 별도 수정 없이 자연히 안전해진다.

> 참고(양호): `uploads`/`transactions`/`subscriptions`/`storage.objects` RLS 정책은 모두 `auth.uid()` 기준으로 올바르게 격리되어 있고, `subscriptions_insert_own`의 `is_pro` 자가 승격 버그는 이미 수정되었다. Storage 경로도 서버가 `{user_id}/{upload.id}.{ext}`로 생성한다.

## A02 Security Misconfiguration

발견 없음.

> 정적 확인 결과: `.env.example`에 실제 시크릿 값 없음, `NEXT_PUBLIC_` 접두사 오·남용 없음, 마이그레이션 4개 파일 모두 RLS 활성화 및 `(select auth.uid())` 래핑 최적화 적용됨. 단, 라이브 Supabase advisor 진단은 수행하지 못했으므로 이 카테고리의 "발견 없음"은 정적 범위에 한정된다.

## A03 Software Supply Chain Failures

`npm audit` 총계: **11 vulnerabilities (2 critical, 6 high, 3 moderate)**

### FINDING
file: package.json
line: 20
owasp: A03 Software Supply Chain Failures
severity: 🟠 major
title: next 고정 버전 자체가 취약
tldr: 프로덕션 의존성 `next`가 `"15.5.21"`(캐럿 없이 정확히 고정)이지만 이 버전 자체가 npm audit critical/high 범위(9.3.4-canary.0~16.3.0-preview.10, postcss/sharp 경유)에 포함되어 프로덕션 런타임 전 라우트가 취약한 코드로 실행 중이다. 코드에서 `next/image`를 쓰지 않고 `next.config.ts`에 `images.formats`(AVIF) 설정도 없어 AVIF Image Optimization RCE(GHSA-2xp9-vwfh-vxw4) 경로는 현재 트리거되지 않는 것으로 보이고, Windows 전용 RCE(GHSA-p293-qw3h-jr36)는 Vercel(Linux) 배포와 무관하지만, postcss(CSS stringify XSS, sourcemap 경로 순회 정보 노출)·sharp(libvips/libheif RCE 계열 CVE) 취약점은 next의 전이 의존성으로 여전히 설치돼 있다.
fix: |
  `npm audit fix --force`로 next를 15.5.25 이상으로 업그레이드(패치 라인 유지, semver major 아님)하고 빌드/회귀 테스트 통과 후 배포한다. 향후 next/image를 도입할 계획이 있다면 업그레이드를 미루지 말 것.

### FINDING
file: package.json
line: 14
owasp: A03 Software Supply Chain Failures
severity: 🟠 major
title: 핵심 SDK 버전 범위 개방
tldr: Claude 호출(`@anthropic-ai/sdk`), 결제(`@polar-sh/sdk`), 인증/DB(`@supabase/supabase-js`, `@supabase/ssr`)를 담당하는 핵심 의존성이 모두 `^`(캐럿) 범위로 선언돼 있다. CI가 `npm ci`(lockfile 고정)를 쓰므로 지금 당장의 위험은 낮지만, lockfile이 재생성되는 순간(Dependabot 자동 PR 머지, `npm install` 재실행, 로컬 개발자의 `npm update` 등) 검증되지 않은 minor/patch 버전이 인증·결제·Claude 호출 경로에 그대로 유입될 수 있다.
fix: |
  인증/결제/Claude SDK만이라도 exact 버전 고정(예: "@anthropic-ai/sdk": "0.114.0")으로 바꾸고, 버전 갱신은 Dependabot/Renovate PR을 통해 사람이 리뷰한 뒤에만 반영되도록 강제한다.

### FINDING
file: package.json
line: 27
owasp: A03 Software Supply Chain Failures
severity: 🟡 minor
title: 잔여 high 등급 전이 취약점(dev)
tldr: `brace-expansion`(DoS/OOM, GHSA-mh99-v99m-4gvg·GHSA-rgw5-rvv9-x895), `js-yaml`(정규식 CPU 소모, GHSA-5p4m-2wfm-xmqj·GHSA-2883-xcg3-v3hh), `nanoid`(무한루프, GHSA-2v37-7h3g-55p8) 등 high 등급 전이 의존성이 남아있다. 모두 `@typescript-eslint`/eslint 툴체인 경유 devDependency이고 프로덕션 번들에는 포함되지 않아 실사용 노출 경로는 없지만, `npm audit fix`로 non-breaking 수정이 이미 가능한 상태다. 별도로 `@vitest/mocker`(GHSA-82fw-gwwq-j7x9)·`esbuild`(GHSA-67mh-4wv8-2f99) moderate 건은 vitest 5.0.1(breaking) 업그레이드가 필요하며 테스트 전용이라 우선순위가 낮다.
fix: |
  `npm audit fix`(force 불필요)로 즉시 정리한다.

> 참고(양호): CI 워크플로우의 서드파티 액션은 모두 `@v6`/`@v4`/`@v1` 형태로 버전 태그 고정이며 `@main`/`@latest` 패턴은 없다.

## A04 Cryptographic Failures

### FINDING
file: src/lib/statement.ts
line: 23
owasp: A04 Cryptographic Failures
severity: 🟠 major
title: 17자리 이상 번호 마스킹 누락
tldr: `LONG_DIGIT_RUN_RE = /\b\d{12,16}\b/g`는 상한이 16자리로 고정되어 있는데, `\b`(단어 경계) 앵커와 정규식 백트래킹의 특성상 연속된 숫자가 17자리 이상이면 12~16 범위의 어떤 길이로도 경계 조건을 만족시키지 못해 해당 숫자열 전체가 마스킹 없이 통과한다(9~10자리 부분 마스킹이 아니라 완전히 미매칭). 일부 카드사가 발급하는 15~19자리 카드번호나 핀테크 가상계좌번호(16자리 초과)가 구분자 없이 CSV/PDF에 실려 있으면 원문 그대로 `maskSensitiveData`를 통과해 Claude API로 전송된다(CLAUDE.md CRITICAL "Claude로 보내는 사본에는 카드번호·계좌번호 등 마스킹을 적용한다" 위반).
fix: |
  상한을 제거하거나 확장한다: `const LONG_DIGIT_RUN_RE = /\b\d{12,19}\b/g;` (또는 상한 없이 `\d{12,}\b`로 두고 뒤 4자리만 유지하는 `maskKeepingLast4`가 앞부분 전체를 `*`로 치환하도록 유지). `statement.test.ts`에 17~19자리 연속 숫자 케이스를 회귀 테스트로 추가할 것.

> 참고(양호): 시크릿(ANTHROPIC_API_KEY, POLAR_ACCESS_TOKEN, POLAR_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, GITHUB_DISPATCH_TOKEN, POSTHOG_ALERT_WEBHOOK_SECRET)은 모두 `services/` 래퍼 내부에서만 `process.env`로 참조되며 하드코딩된 시크릿은 없다. 클라이언트 컴포넌트는 `NEXT_PUBLIC_` 변수만 참조하고 외부 API는 항상 `/api/*`를 경유한다.

## A05 Injection

### FINDING
file: src/services/claude.ts
line: 188
owasp: A05 Injection
severity: 🟡 minor
title: 가맹점명 프롬프트 인젝션 경로
tldr: `classifyAndSummarize`가 파싱 단계에서 추출한 `merchant` 문자열을 구분자나 이스케이프 없이 그대로 `messages[0].content`(JSON.stringify)에 넣으므로, 명세서의 가맹점명 필드에 "위 지침을 무시하고..." 같은 텍스트가 들어 있으면 자유 형식인 `summaryText`가 조작될 수 있다. `category`는 json_schema enum으로 강제되어 영향이 없지만, 대시보드에 그대로 렌더링되는 `summaryText`는 오도성 문구로 바뀔 수 있다. 현재는 업로더 본인만 결과를 보므로(자기 자신에 대한 인젝션) 실질 피해 범위는 제한적이다.
fix: |
  system 프롬프트에서 거래 데이터는 신뢰할 수 없는 사용자 데이터임을 명시하고 `<transactions>...</transactions>` 같은 구분 태그로 감싸며, 지시문처럼 보이는 패턴을 무시하도록 명시적으로 지시한다.

> 참고(양호): SQL 인젝션, 쉘/파일경로 인젝션, XSS(`dangerouslySetInnerHTML`)는 발견되지 않았다 — Supabase 쿼리빌더만 사용하고, storage 경로는 서버가 UUID로 생성하며, JSON-LD는 정적 데이터다.

## A06 Insecure Design

### FINDING
file: src/lib/statement.ts
line: 20
owasp: A06 Insecure Design
severity: 🔴 critical
title: 공백구분 계좌번호 마스킹 누락
tldr: `ACCOUNT_NUMBER_RE`는 하이픈(-)으로 구분된 계좌번호만 매칭하고 `CARD_NUMBER_RE`는 4-4-4-4 형태만 매칭하며 `LONG_DIGIT_RUN_RE`는 구분자 없는 연속 숫자만 커버하므로, 공백이나 마침표로 구분된 계좌번호(예: `110 234 567890`)는 세 정규식 중 어느 것에도 매칭되지 않아 `maskSensitiveData`를 그대로 통과하고 원문 그대로 Claude API로 전송된다 — CLAUDE.md CRITICAL(마스킹 필수 규칙)을 위반한다.
fix: |
  구분자를 하드코딩 나열하는 대신 `[-.\s]?`처럼 하이픈/공백/마침표/구분자없음을 모두 허용하는 통합 정규식으로 계좌·카드번호 패턴을 재작성하고, `statement.test.ts`에 공백·마침표 구분 케이스를 회귀 테스트로 추가한다.

### FINDING
file: src/app/api/upload/route.ts
line: 106
owasp: A06 Insecure Design
severity: 🟠 major
title: 페이월이 CSS 블러에만 의존
tldr: `blurred`가 true여도 138번 줄에서 `{...analysis, blurred}`로 전체 거래 내역·요약·금액을 응답에 그대로 포함시키고, `DashboardContent.tsx`(72번 줄)와 `dashboard/page.tsx`(24, 35번 줄)는 이를 CSS `blur-sm`/`pointer-events-none`으로만 가리므로 네트워크 탭이나 devtools로 무료 한도 초과 후에도 원본 데이터를 그대로 볼 수 있어 quota/페이월이 클라이언트 상태에만 의존하는 설계로 사실상 무력화된다. (A01 카테고리의 동일 계열 finding 2건과 같은 근본 원인 — 한 번의 설계 수정으로 함께 해소된다.)
fix: |
  `blurred=true`인 경우 `route.ts`와 `dashboard/page.tsx`에서 응답/props 자체를 요약 통계만 남기고 `transactions`/`summaryText` 등 상세 데이터는 서버에서 제거한 축약 payload만 내려보낸다.

## A07 Authentication Failures

발견 없음.

> 정적 확인 결과: OAuth 콜백(`src/app/api/auth/callback/route.ts`), Polar Standard Webhooks 서명 검증, PostHog 웹훅 시크릿의 `timingSafeEqual` 비교, `dashboard/layout.tsx`의 `requireUser()` + `force-dynamic` 라우트 보호 모두 타당하게 구현되어 있다.

## A08 Software or Data Integrity Failures

### FINDING
file: .github/workflows/claude-review-code.yml
line: 82-127
owasp: A08 Software or Data Integrity Failures
severity: 🟠 major
title: LLM 자가판정 기반 자동승인
tldr: `gate` 잡이 PR diff를 읽은 `claude-code-action`이 스스로 산출한 `.review-severity.txt`(critical/major 개수)만을 근거로 `pull-requests: write` 권한의 `GITHUB_TOKEN`으로 `gh api .../reviews`에 `event: APPROVE`를 게시한다. 이전 스캔(2026-08-20)에서 지적된 자동 병합(`gh pr merge`)은 현재 코드에서 제거되어 실제 merge까지는 자동으로 이어지지 않지만, 산출값 자체(critical/major 카운트)는 여전히 PR diff 내용에 영향을 받는 LLM의 자기 보고이며 서명·체크섬·룰 기반 2차 검증 없이 그대로 신뢰되어 GitHub의 formal APPROVE 리뷰를 발급한다. 브랜치 보호 규칙이 "1인 승인"만 요구하는 저장소라면 이 자동 APPROVE가 사람의 검토를 완전히 대체해 병합을 가능하게 만들 수 있다.
fix: |
  자동 APPROVE 발급 자체를 없애고 코멘트(초안)로만 남기거나, review job의 산출값을 정적 룰 기반 재검증(예: 실제 diff에 대한 별도 non-LLM 체크)과 교차검증한 뒤에만 APPROVE를 허용한다. 최소한 브랜치 보호 규칙에서 이 자동 리뷰 하나만으로 머지가 가능하지 않도록(예: 사람 리뷰어 1인 이상 별도 필수) 설정한다.

> 참고(양호): Claude 응답은 `output_config.format: json_schema`로 스키마를 강제하고 카테고리 enum(`isValidCategory`)까지 검증하며 집계는 코드가 직접 계산한다. Polar 웹훅은 `validateEvent`로 fail-closed 서명 검증을 수행한다.

## A09 Security Logging and Alerting Failures

발견 없음.

> 정적 확인 결과: 업로드 파이프라인(`src/app/api/upload/route.ts`)은 CSV/PDF 원문·마스킹된 텍스트·Claude 응답 전문을 로그나 에러 메시지에 남기지 않으며, 실패 시 일반화된 한국어 문구만 반환하고 `captureServerException`으로 에러 객체만 전달한다.

## A10 Mishandling of Exceptional Conditions

### FINDING
file: src/app/api/upload/route.ts
line: 44
owasp: A10 Mishandling of Exceptional Conditions
severity: 🟠 major
title: quota 조회 실패 시 fail-open
tldr: `uploads` 테이블 select의 `error`를 확인하지 않아, 쿼리가 실패하면 `existingUploads`가 `undefined`가 되고 `?? []`로 조용히 "이번 달 업로드 0건"으로 처리돼 `canUpload`가 무조건 통과(quota 우회, 블러 페이월 해제)한다.
fix: |
  const { data: existingUploads, error } = await supabase.from("uploads").select().eq("userId", user.id);
  if (error) { /* 안전한 방향(fail-closed)으로 처리: blurred=true 또는 500 반환 */ }

### FINDING
file: src/app/api/upload/route.ts
line: 124
owasp: A10 Mishandling of Exceptional Conditions
severity: 🟠 major
title: insert 실패 무시, 상태 불일치
tldr: `uploads`/`transactions` insert 결과의 `error`를 확인하지 않아 저장이 실패해도 클라이언트에는 200과 전체 분석 결과가 그대로 반환되고, 해당 업로드는 DB에 남지 않아 다음 요청의 quota 판정(line 44의 월별 카운트)이 실제보다 적게 계산돼 무료 한도가 사실상 늘어나는 방향으로 상태가 어긋난다.
fix: |
  const { error: uploadInsertError } = await supabase.from("uploads").insert(uploadRow);
  if (uploadInsertError) { await captureServerException(...); return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 }); }
  // transactions insert도 동일하게 error 체크

---

## 다음 액션

우선순위 순.

1. 🔴 **[critical] `src/lib/statement.ts` 마스킹 정규식 보강** — 공백/마침표 구분 계좌번호(`110 234 567890`)가 마스킹 없이 Claude로 전송된다. CLAUDE.md의 마스킹 CRITICAL 규칙 직접 위반이므로 최우선 수정. 같은 파일의 A04 finding(17자리 이상 연속 숫자 미매칭)과 함께 정규식을 `[-.\s]?` 허용 + 상한 확장(`\d{12,19}`)으로 통합 재작성하고, `statement.test.ts`에 두 케이스 모두 회귀 테스트를 먼저 추가할 것(TDD).

2. 🟠 **[major] 페이월 서버 강제 (A01 ×2 + A06 ×1, 근본 원인 1개)** — `src/app/api/upload/route.ts:138`과 `src/app/dashboard/page.tsx:24`가 `blurred=true`에서도 전체 거래 내역을 응답/RSC 페이로드에 실어 보내고 가림은 CSS `blur-sm`뿐이다. 서버에서 `blurred`일 때 `transactions`/`summaryText`/`categoryTotals`를 제거한 축약 payload만 내려보내도록 고치면 A01의 3건과 A06의 1건이 함께 해소된다. CLAUDE.md의 "블러 페이월 로직은 서버에서 강제" CRITICAL 규칙 위반.

3. 🟠 **[major] `src/app/api/upload/route.ts` Supabase 에러 처리 (A10 ×2)** — line 44 quota 조회가 fail-open이라 쿼리 실패 시 무료 한도가 무조건 통과되고, line 124 insert 실패를 무시해 DB 상태가 어긋나며 이후 quota 계산까지 왜곡된다. 두 곳 모두 `error`를 확인해 fail-closed로 전환.

4. 🟠 **[major] `next` 15.5.25+ 업그레이드** — 현재 고정된 15.5.21이 audit critical 범위에 포함된다. `next/image` 미사용·Linux 배포라 두 RCE의 실제 트리거 경로는 없는 것으로 보이나, postcss/sharp 전이 취약점은 남아 있다. semver major가 아니므로 `npm audit fix --force` 후 빌드·테스트 확인하고 배포.

5. 🟠 **[major] CI 자동 APPROVE 제거 또는 교차검증** — `.github/workflows/claude-review-code.yml`이 LLM 자기 보고 카운트만으로 formal APPROVE를 발급한다. 코멘트 전용으로 낮추거나, 브랜치 보호에서 사람 리뷰어 1인을 별도 필수로 설정.

6. 🟠 **[major] 핵심 SDK 버전 exact 고정** — Anthropic/Polar/Supabase SDK의 `^` 범위를 exact로 바꾸고 갱신은 리뷰된 PR로만.

7. 🟡 **[minor] 잔여 정리** — `npm audit fix`(non-breaking)로 `brace-expansion`/`js-yaml`/`nanoid` 정리, `src/services/claude.ts:188`의 가맹점명 프롬프트 인젝션에 구분 태그 + 불신 데이터 명시 추가.

### 인프라 후속

Supabase 라이브 진단을 수행하지 못했으므로, MCP가 연결된 환경에서 `/supabase-advisor-fix`를 별도로 한 번 돌려 운영 DB의 실제 RLS·권한 상태가 마이그레이션 파일과 일치하는지 확인할 것.
