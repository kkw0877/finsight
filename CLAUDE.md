# 프로젝트: FinSight

카드 명세서 CSV를 업로드하면 Claude가 파싱·분류하고 지출 요약 인사이트를 제공하는 핀테크 SaaS.
상세 배경은 `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ADR.md`, `docs/UI_GUIDE.md` 참고.

## 기술 스택
- Next.js 15 (App Router)
- TypeScript strict mode
- Tailwind CSS
- Supabase (Auth: Google OAuth / Postgres + RLS / Storage)
- Claude API (Anthropic SDK) — 파싱: Haiku 4.5, 인사이트: Sonnet 5/Opus 4.8 (정확한 모델 ID는 claude-api 스킬로 확정)
- Polar (구독 결제)
- Vercel + Vercel CLI (배포)

## 아키텍처 규칙
- CRITICAL: 모든 외부 API 호출(Claude, Polar, Supabase 관리자 기능)은 app/api/ 라우트 핸들러 또는 services/ 에서만 수행. 클라이언트 컴포넌트에서 직접 호출 금지.
- CRITICAL: 카드 명세서는 민감 금융 데이터다. Supabase RLS(+ Storage 버킷 정책)로 사용자별 격리하고, Claude로 보내는 사본에는 카드번호·계좌번호 등 마스킹을 적용한다(DB 원본은 원문 보관). 저장 암호화는 Supabase 기본 at-rest에 의존한다(MVP는 별도 컬럼 암호화 없음).
- CRITICAL: 시크릿(Anthropic/Polar/Supabase service-role 키)은 `services/` 래퍼를 통해 서버에서만 접근한다. `NEXT_PUBLIC_` 접두사가 없는 환경변수는 클라이언트 번들에 절대 포함하지 않는다.
- CRITICAL: CSV 원문, Claude 프롬프트/응답 전문, API 키를 서버 로그·에러 메시지에 남기지 않는다.
- CRITICAL: Free/Pro 분기는 is_pro 불리언 하나로 판단. quota 판정·블러 페이월 로직은 서버에서 강제(클라이언트 신뢰 금지).
- Server Components 기본, 인터랙션이 필요한 곳만 Client Component.
- 컴포넌트는 components/, 타입은 types/, 외부 API 래퍼는 services/, 그 외 유틸(인코딩 감지·마스킹, quota 판정, Supabase 클라이언트 등)은 lib/ 로 분리.
- Storage 파일 경로는 서버가 `{user_id}/{upload.id}.csv` 형태로 생성한다. 사용자가 업로드한 원본 파일명을 경로에 사용하지 않는다.
- 색상은 무채색 베이스 + 앰버 포인트(#f59e0b). 보라/인디고 등 AI 슬롭 금지(docs/UI_GUIDE.md).

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
