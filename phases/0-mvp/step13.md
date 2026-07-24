# Step 13: real-supabase-integration

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ADR.md` ADR-002, ADR-003, ADR-005
- `/CLAUDE.md` CRITICAL 규칙(RLS/Storage 격리, 시크릿은 서버 전용, `NEXT_PUBLIC_` 접두사 규칙)
- `src/lib/supabase/server.ts`, `client.ts`, `types.ts` (step 4 — 교체 대상 mock, 유지해야 할 함수 시그니처)
- `supabase/migrations/` (step 12 — 아직 실제 프로젝트에 미적용)
- `.env.example` (필요한 환경변수 목록 — 실제 값은 이미 `.env`에 채워져 있음)

Wave 2의 첫 실제 연동이다. `.env`에는 이미 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있다 — 새로 발급받을 필요는 없고 값을 신뢰하고 사용하면 된다. 단, Supabase 대시보드의 Auth > Providers > Google OAuth 설정과 Vercel 프로젝트의 환경변수는 이 프로젝트 코드 밖의 수동 설정 영역이다.

## 작업

1. `@supabase/ssr`, `@supabase/supabase-js` 패키지를 설치한다.
2. `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`의 **내부 구현만** mock에서 실제 Supabase 클라이언트 생성 코드로 교체한다. step 4에서 정의한 함수 시그니처(`createServerClient`, `createBrowserClient`)는 최대한 유지해 호출부(auth-flow, upload-api, dashboard-ui, billing-flow)를 대규모로 고치지 않아도 되게 한다.
3. `@supabase/ssr` 컨벤션에 따라 Google OAuth 콜백 라우트(`src/app/api/auth/callback/route.ts` 등)를 추가한다.
4. step 12에서 작성한 SQL 마이그레이션을 실제 연결된 Supabase 프로젝트에 적용한다(`supabase db push` 또는 Supabase 대시보드 SQL Editor). Supabase CLI가 프로젝트에 링크되어 있지 않거나 적용 권한이 없으면 즉시 `blocked` 처리하고 사유를 기록한다.
5. Vercel 프로젝트 환경변수에 Supabase 관련 값들이 설정되어 있는지 확인하고, 없으면 `vercel env add`로 추가한다.
6. 로그인 → 업로드 → 대시보드 흐름이 실제 Supabase 세션/DB로 정상 동작하는지 검증한다.

## Acceptance Criteria

```bash
npm run build
npm run lint
npm run test
vercel deploy --yes
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `service_role` 키가 서버 전용 코드에서만 쓰이고 클라이언트 번들에 포함되지 않는가?
   - RLS 정책이 실제로 사용자별 격리를 강제하는가(다른 사용자 데이터 접근 불가)?
   - 호출부 파일들이 대규모로 리팩터링되지 않고 `lib/supabase/*.ts` 내부 교체로 흡수됐는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "실제 연동 완료 사실과 검증한 흐름 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요(Google OAuth 미설정, 마이그레이션 적용 권한 없음 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `SUPABASE_SERVICE_ROLE_KEY`를 클라이언트 컴포넌트나 `NEXT_PUBLIC_` 환경변수로 노출하지 마라.
- 실제 Supabase 프로젝트/OAuth 설정에 접근할 수 없으면 mock으로 되돌려 이 step을 억지로 통과시키지 마라 — 즉시 `blocked` 처리하라.
- `auth-flow`(step 7), `upload-api`(step 8), `dashboard-ui`(step 9), `billing-flow`(step 10)의 로직을 대규모로 재작성하지 마라 — `lib/supabase/*.ts` 내부 구현 교체로 최대한 흡수하라.
- 기존 테스트를 깨뜨리지 마라.
