# Supabase Branching 운영 가이드

배경과 결정 근거는 `docs/ADR.md`의 ADR-011 참고. 이 문서는 설정·운영 절차만 다룬다.

## 브랜치 구성
- **Production**: 기존 Supabase 프로젝트(`main` 브랜치와 연결).
- **Staging (Persistent Branch)**: 상시 유지되는 QA/스테이징 환경. Google OAuth·Polar 웹훅을 이 브랜치의 고정 URL 기준으로 실제 등록한다.
- **PR Preview (Preview Branch)**: PR을 열면 자동 생성, 병합/종료 시 자동 삭제. Vercel Preview Deployment와 자동으로 짝지어진다.

모든 브랜치는 `supabase/migrations/`를 적용한 뒤 `supabase/seed.sql`(synthetic 데이터)로 초기화된다. 프로덕션 데이터나 실제 업로드 파일은 어떤 브랜치로도 복제하지 않는다.

## 최초 설정 (대시보드에서 사람이 직접 해야 하는 작업)
Claude가 대신 수행할 수 없는 단계 — 결제/OAuth 승인이 필요하다.

1. Supabase 대시보드 → 프로젝트 → **Free → Pro 플랜 업그레이드** (Branching은 Pro 이상 필요)
2. Supabase 대시보드 → **GitHub 연동** → `kkw0877/finsight` repo 연결, production branch = `main`
3. Supabase 대시보드에서 **Persistent Branch 생성** (이름 예: `staging`)
4. staging 브랜치의 API URL로 Google Cloud Console에 **전용 OAuth redirect URI** 추가, Polar 대시보드에 **staging용 테스트 모드 웹훅** 등록
5. Vercel 대시보드(또는 Supabase 대시보드) → **Vercel 통합 설치** 승인 — PR Preview Deployment에 Preview Branch의 API URL/키를 자동 주입
6. 터미널에서 `supabase login` (브라우저 OAuth)

## 로컬 개발 (CLI)
```bash
supabase login          # 최초 1회, 브라우저 인증
supabase start          # 로컬 Postgres/Auth/Storage 컨테이너 기동 (Docker 필요)
supabase db reset        # 마이그레이션 + seed.sql 적용
```
`supabase/config.toml`이 이미 설정되어 있어 별도 초기화는 필요 없다.

## 시드 데이터
`supabase/seed.sql`에 synthetic 테스트 사용자 2명(무료/Pro)과 샘플 업로드·거래내역이 정의되어 있다. 실제 카드 명세서 데이터는 절대 포함하지 않는다(CLAUDE.md CRITICAL). 스키마가 바뀌면 이 파일도 함께 갱신할 것.

## PR Preview에서의 알려진 제약
- `/api/auth/signin`, `/api/checkout`은 `VERCEL_ENV === "preview"`일 때 403을 반환한다 — 로그인/결제 플로우는 Preview에서 직접 확인할 수 없다.
- 이 두 플로우를 눈으로 확인해야 할 때는 로컬 개발 서버 또는 staging 브랜치를 사용한다.
- Preview 브랜치는 매번 새로 생성되므로, DB 마이그레이션·RLS 정책·쿼리 로직 검증이 주 용도다.

## 비용
- Pro 플랜: 월 $25~ (컴퓨트 크레딧 포함, 단 브랜칭 컴퓨트에는 적용 안 됨)
- 브랜치(Micro 컴퓨트): 시간당 약 $0.01344 → staging을 상시 유지하면 월 약 $10 추가
- PR Preview 브랜치는 PR이 열려 있는 동안만 과금되며 병합/종료 시 자동 삭제된다
