# 프로젝트: Finsight

## 기술 스택
- Next.js 15 (App Router)
- TypeScript strict mode
- Tailwind CSS
- Supabase (Auth: Google OAuth / Postgres / Storage)
- Anthropic SDK (Claude API)
- Polar (결제/구독)
- Vercel + Vercel CLI (배포)

## 아키텍처 규칙
- CRITICAL: Claude/Polar/Supabase 등 외부 API 호출은 서버 사이드(Route Handler)에서만 수행한다. 클라이언트 컴포넌트에서 직접 호출하지 않는다.
- CRITICAL: Claude API 키 등 시크릿은 `services/` 래퍼를 통해서만 접근한다. service-role 키는 `/api/webhooks/polar` 핸들러 밖으로 재사용하지 않는다.
- CRITICAL: CSV 원문, Claude 프롬프트/응답 전문, API 키를 서버 로그·에러 메시지에 남기지 않는다.
- CRITICAL: `NEXT_PUBLIC_` 접두사가 없는 환경변수(Anthropic/Polar/service-role 키)는 클라이언트 번들에 절대 포함하지 않는다.
- 컴포넌트는 `components/`, 타입은 `types/`, 외부 API 래퍼는 `services/`, 그 외 유틸(CSV 토큰화, Supabase 클라이언트 등)은 `lib/`에 분리한다.
- Storage 파일 경로는 서버가 `{user_id}/{upload.id}.csv` 형태로 생성한다. 사용자가 업로드한 원본 파일명을 경로에 사용하지 않는다.

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)
- 배포는 Vercel CLI로 수행한다(`vercel deploy` / `vercel deploy --prod`). mock/스켈레톤 상태부터 가장 먼저 배포해 파이프라인을 검증하고, 이후 각 개발 단계(step)를 완료할 때마다 재배포해 항상 배포 가능한 상태를 유지한다.

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # 테스트
vercel deploy         # 프리뷰 배포
vercel deploy --prod  # 프로덕션 배포
