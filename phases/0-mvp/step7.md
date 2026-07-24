# Step 7: auth-flow

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` (Google OAuth 단일 로그인, 업로드는 로그인 필수)
- `/docs/ADR.md` ADR-003 (이메일/비밀번호 로그인 미지원 이유, 비로그인 체험 없음)
- `/docs/ARCHITECTURE.md` (Server/Client Component 패턴)
- `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts` (step 4 — mock 인증 클라이언트)
- `src/components/ui/Button.tsx` (step 2)

이전 step에서 mock Supabase 클라이언트(`auth.getUser`, `auth.signInWithOAuth`, `auth.signOut`)가 만들어졌다. 이 step은 그 mock 위에서 로그인/로그아웃 흐름과 보호 라우트를 구현한다. 실제 Google OAuth 설정(Supabase 프로젝트 연동)은 step 13에서 다룬다 — 여기서는 mock 세션으로 흐름만 완성한다.

## 작업

1. 로그인 페이지 또는 컴포넌트: "Google로 로그인" 버튼(step 2의 `Button` 사용)이 `auth.signInWithOAuth({ provider: 'google' })`를 호출한다.
2. `src/app/dashboard/layout.tsx`: 보호 레이아웃. `auth.getUser()`로 세션을 확인해 비로그인 사용자는 로그인 페이지로 리다이렉트한다. 로그인된 mock 유저 정보(이메일/이름)를 헤더에 표시하고, 로그아웃 버튼(`auth.signOut()` 호출)을 둔다.
3. 로그아웃 후에는 `/dashboard` 재접근 시 다시 리다이렉트되는지 확인한다.

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
   - PRD/ADR-003대로 Google OAuth 단일 로그인만 구현했는가(이메일/비밀번호 로그인 없음)?
   - 비로그인 사용자가 대시보드/업로드에 접근할 수 없는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "구현한 페이지/레이아웃 경로 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이메일/비밀번호 로그인 UI나 회원가입 폼을 만들지 마라. 이유: ADR-003, PRD MVP 제외 사항.
- 비로그인 상태에서 업로드나 대시보드 콘텐츠를 미리보기로 노출하지 마라. 이유: PRD — "업로드는 대시보드에서만 가능, 비로그인 체험 없음".
- 실제 Google OAuth 리다이렉트 URL/Supabase 프로젝트 설정을 이 step에서 다루지 마라. 이유: Mock-First — 실제 연동은 step 13.
- 기존 테스트를 깨뜨리지 마라.
