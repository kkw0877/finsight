# 아키텍처

## 기술 스택
- **Next.js 15 (App Router) + TypeScript strict**
- **Supabase** — Auth(Google OAuth), DB(Postgres + RLS), Storage(원본 CSV)
- **Claude API (Anthropic SDK)** — CSV 파싱 + 인사이트 생성
- **Polar** — 구독 결제
- **Vercel + Vercel CLI** — 배포

## 디렉토리 구조
```
src/
├── app/                        # 페이지 + API 라우트 (App Router)
│   ├── (marketing)/            # 랜딩 페이지
│   ├── dashboard/               # 대시보드 (보호 라우트)
│   └── api/
│       ├── upload/route.ts      # CSV 업로드 + 동기 분석
│       ├── checkout/route.ts    # Polar 체크아웃 세션 생성
│       └── webhooks/polar/route.ts   # 구독 상태 동기화
├── components/                 # UI 컴포넌트 (요약 카드, 도넛차트, 추이 차트, 거래 테이블 등)
├── types/                      # TypeScript 타입 정의 (거래, 분석결과, 구독 등)
├── lib/
│   ├── csv.ts                   # 인코딩 감지(EUC-KR/CP949 → UTF-8) + 민감정보 마스킹 유틸
│   ├── quota.ts                 # Free/Pro quota 판정
│   └── supabase/
│       ├── server.ts             # 쿠키 기반 세션 클라이언트 (RLS 적용)
│       └── client.ts             # 브라우저 클라이언트
└── services/                   # 외부 API 래퍼 (서버 전용)
    ├── claude.ts                 # CSV 원문 → 거래 JSON 파싱 + 카테고리 분류/요약
    └── polar.ts                  # 체크아웃 세션 생성 + 웹훅 처리
```

## 패턴
Server Components를 기본으로 하고, 인터랙션이 필요한 곳(업로드 위젯, 차트, 업그레이드 버튼 등)만 Client Component로 만든다. 외부 API(Claude/Polar/Supabase) 호출은 전부 Route Handler 또는 `services/` 래퍼에서만 수행하고, 클라이언트 컴포넌트는 절대 직접 호출하지 않는다.

## 데이터 흐름

### CSV 업로드 → 분석 (동기 처리)
```
[로그인 필수: Google OAuth]

CSV 업로드 (Client)
  → /api/upload: 바이트 크기 캡(≤2MB) 검증
  → 인코딩 감지(EUC-KR/CP949 → UTF-8) + 행 수 캡(2,000행) 검증
  → Storage에 원본 저장(경로 {user_id}/{uploadId}) + 카드번호·계좌번호 등 마스킹(Claude 전송용 사본에만)
  → ① Claude(Haiku 4.5): CSV 원문 → 정규화된 거래 JSON
  → ② Claude(Sonnet 5/Opus 4.8): 거래 JSON → 카테고리 분류(9종 고정) + 요약 인사이트
  → 성공 시 uploads + transactions 저장 (동기 처리라 status 상태머신 없이 성공/실패로만 처리)
  → 동기 응답 → 대시보드 렌더 (요약 카드 + 도넛차트 + 월별 추이 차트 + 거래 테이블)
    (카테고리별/월별 집계는 별도 저장 없이 조회 시점에 SQL로 계산)

[Free quota 소진 시] 분석은 실행하되 결과 블러 + 업그레이드 CTA
```

Claude 호출을 "파싱"과 "분류/요약" 두 단계로 나눈 이유는, 반복 노동인 파싱은 싸고 빠른 모델(Haiku)로, "와"를 만드는 요약은 좋은 모델(Sonnet/Opus)로 처리해 비용을 최적화하기 위함이다. 파싱 결과(거래 JSON)를 저장해두면 재분석·향후 인사이트에서 재사용할 수 있다. CSV 원문 전체를 Claude에 보내므로 명세서가 크면 출력 토큰·지연·JSON 잘림 리스크가 있어, 행 수 캡(2,000행)으로 이를 제한한다. Route Handler의 `maxDuration`은 CSV 분석 지연시간을 실측한 스파이크 결과로 확정한다.

### 결제 (Polar)
```
업그레이드 클릭 → /api/checkout → Polar 체크아웃으로 리다이렉트 (이 시점엔 DB에 아무 것도 쓰지 않음)
Polar 웹훅(/api/webhooks/polar) → 서명 검증 → subscriptions 레코드 갱신(is_pro 반영)
앱은 is_pro 불리언으로 기능 분기 (quota 판정, 블러 페이월)
```
`checkout_pending`은 DB에 저장하지 않는다(UI 전용 상태) — 사용자가 체크아웃 페이지를 이탈해도 고착 상태가 생기지 않는다.

## 데이터 저장
- **원본 CSV(Storage) + 정규화 거래내역 + 분석결과** 모두 저장 (향후 개인화 재료, 히스토리 유료 혜택 전제).
- **Supabase RLS + Storage 버킷 정책으로 사용자별 격리**. 저장 암호화는 Supabase 기본 at-rest에 의존(MVP는 별도 컬럼 암호화 없음).
- DB 원본은 **원문 그대로** 보관. 마스킹은 Claude로 보내는 사본에만 적용.
- 카테고리별/월별 집계는 별도 저장하지 않고 조회 시점에 SQL로 계산한다.

## 상태 관리
- 서버 상태는 Server Component가 Supabase를 직접 쿼리해서 가져온다(별도 클라이언트 상태 저장소 없음).
- 클라이언트 상태(업로드 진행/로딩, "결제 확인 중" 표시 등)는 컴포넌트 로컬 `useState`로만 관리하고 DB에 저장하지 않는다.
- 세션은 `@supabase/ssr` 기반 쿠키로 관리된다.
- 분석 처리는 **동기 + 로딩 스피너** (백그라운드 큐 없음).

## 배포
Vercel + Vercel CLI(`vercel deploy` / `vercel deploy --prod`)로 배포한다. mock/스켈레톤 상태부터 가장 먼저 배포해 빌드·배포 파이프라인(환경변수, 함수 설정 등)을 조기에 검증하고, 이후 각 개발 단계(step)를 완료할 때마다 재배포해 항상 배포 가능한 상태를 유지한다.
