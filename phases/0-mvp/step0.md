# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (디렉토리 구조, 기술 스택)
- `/docs/ADR.md` ADR-001 (조기·잦은 배포 원칙)
- `/docs/PRD.md`
- `/CLAUDE.md`

이 프로젝트는 아직 `package.json`조차 없는 완전 그린필드 상태다. 이 step은 전체 MVP의 첫 단계로, 기능 없는 최소 스켈레톤을 만들고 배포 파이프라인을 조기에 검증하는 것이 목적이다.

## 작업

1. Next.js 15 (App Router) + TypeScript strict mode 프로젝트를 `src/` 디렉토리 레이아웃으로 스캐폴딩한다. ARCHITECTURE.md에 명시된 디렉토리 구조를 따른다:
   ```
   src/
   ├── app/
   ├── components/ui/
   ├── styles/tokens/
   ├── types/
   ├── lib/supabase/
   └── services/
   ```
   이 step에서는 디렉토리와 최소 root layout/page만 만든다. `app/api/*`, `app/dashboard/`, `app/(marketing)/` 등 실제 라우트는 아직 만들지 마라 — 각 기능은 이후 전용 step에서 구현한다.
2. Tailwind CSS v4를 CSS-first(`@theme`) 방식으로 설정한다. 실제 디자인 토큰 값은 이후 step(design-system)에서 채운다 — 이 step에서는 Tailwind가 정상 동작하는 최소 설정만 한다.
3. ESLint를 설정한다(Next.js 기본 config 기반).
4. Vitest + React Testing Library로 테스트 인프라를 구성하고, `npm run test` 스크립트를 연결한다. 뼈대가 동작함을 보여주는 최소 sanity 테스트 1개를 포함한다.
5. Root layout에 다크모드 고정(라이트모드 토글 없음)을 반영한 최소 shell을 만든다. 실제 폰트 로딩(next/font)과 토큰은 이후 step에서 다룬다.
6. `vercel whoami`로 이미 로그인된 Vercel CLI 계정이 있다(사용자가 이미 인증 완료). 프로젝트가 아직 Vercel에 링크되어 있지 않으므로, `vercel deploy --yes` 로 비대화형으로 링크 + 프리뷰 배포한다. 이 명령이 대화형 프롬프트 없이 동작하는지 확인하라.

## Acceptance Criteria

```bash
npm run build   # 컴파일 에러 없음
npm run lint    # ESLint 통과
npm run test    # sanity 테스트 통과
vercel deploy --yes   # 프리뷰 배포 성공 (URL 출력 확인)
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `app/api/*`, `app/dashboard/`, `app/(marketing)/` 등 실제 기능 라우트를 만들지 마라. 이유: 이 step은 파이프라인 검증만을 위한 스켈레톤이며, 각 기능은 전용 step에서 구현한다(Simplicity First).
- 디자인 토큰 실제 값이나 UI 컴포넌트를 만들지 마라. 이유: design-system step(step 2)의 범위다.
- `.env`, `.env.example`을 수정하거나 새 환경변수를 추가하지 마라. 이유: 필요한 값은 이미 채워져 있고, 이 step은 외부 서비스를 호출하지 않는다.
- 기존 테스트를 깨뜨리지 마라.
