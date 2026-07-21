# 아키텍처

## 디렉토리 구조
```
src/
├── app/                        # 페이지 + API 라우트 (App Router)
│   ├── (marketing)/            # 랜딩 페이지
│   ├── dashboard/               # 대시보드 (보호 라우트)
│   └── api/
│       ├── upload/route.ts      # CSV 업로드 + 동기 분석
│       ├── checkout/route.ts    # Polar 체크아웃 세션 생성
│       └── webhooks/polar/route.ts
├── components/                 # UI 컴포넌트
├── types/                      # TypeScript 타입 정의
├── lib/
│   ├── csv.ts                   # 범용 CSV 토큰화(papaparse 래핑) — 은행별 포맷 파서 아님
│   └── supabase/
│       ├── server.ts             # 쿠키 기반 세션 클라이언트 (RLS 적용)
│       └── client.ts             # 브라우저 클라이언트
└── services/                   # 외부 API 래퍼 (서버 전용)
    ├── claude.ts                 # 컬럼 매핑 추론 + 가맹점 카테고리 분류
    └── polar.ts                  # 체크아웃 세션 생성 + 웹훅 처리
```

## 패턴
Server Components를 기본으로 하고, 인터랙션이 필요한 곳(업로드 폼, 로딩/진행 상태, 업그레이드 버튼)만 Client Component로 만든다. 외부 API(Claude/Polar/Supabase) 호출은 전부 Route Handler 또는 Server Component에서만 수행하고, 클라이언트 컴포넌트는 절대 직접 호출하지 않는다.

## 데이터 흐름

### CSV 업로드 → 분석 (동기 처리)
```
사용자 CSV 업로드
  → /api/upload: 바이트 크기 캡(≤2MB) 검증
  → lib/csv.ts로 코드에서 헤더+행 토큰화 → 행 수 캡(2,000행) 검증
  → uploads 레코드 생성(status=processing) + Storage 원본 저장
  → services/claude.ts (1) 헤더 + 샘플 행(최대 10행) → 컬럼 매핑 규칙 추론
  → 코드가 매핑을 전체 행에 적용해 date/description/amount 추출
    (취소·환불 행, 파싱 실패 행은 스킵 → skippedRowCount에 반영)
  → services/claude.ts (2) 고유 적요(가맹점명) 목록 → 카테고리 분류(9종 고정)
  → transactions 저장, uploads.status=completed
  → 대시보드 갱신 — 카테고리별/월별 집계는 별도 저장 없이 조회 시점에 SQL로 계산
```

Claude 호출을 "컬럼 매핑"과 "카테고리 분류" 두 번으로 나눈 이유는, 행 단위 변환까지 Claude가 직접 하면 출력 토큰이 행 수에 비례해 지연시간·JSON 잘림·비용 문제가 커지기 때문이다. Claude는 의미 해석(컬럼이 무엇을 뜻하는지, 가맹점이 어떤 카테고리인지)만 담당하고, 실제 행 단위 적용은 코드가 처리한다. 토큰/지연시간 계산 근거와 검증 절차는 `docs/plan.md`의 "리스크 체크" 절을 참고한다.

### 결제 (Polar)
```
업그레이드 클릭 → /api/checkout → Polar 체크아웃으로 리다이렉트 (이 시점엔 DB에 아무 것도 쓰지 않음)
Polar 웹훅(/api/webhooks/polar) → 서명 검증 → subscriptions.status를 절대값으로 덮어씀
```
`checkout_pending`은 DB에 저장하지 않는다(UI 전용 상태) — 사용자가 체크아웃 페이지를 이탈해도 고착 상태가 생기지 않는다. 유료 권한 판정은 `status` 하나만 보지 않고 `status + current_period_end`를 매 요청 시 파생 계산한다.

## 상태 관리
서버 상태는 Server Component가 Supabase를 직접 쿼리해서 가져온다(별도 클라이언트 상태 저장소 없음). 클라이언트 상태(업로드 진행/로딩, "결제 확인 중" 표시)는 컴포넌트 로컬 `useState`로만 관리하고 DB에 저장하지 않는다. 세션은 `@supabase/ssr` 기반 쿠키로 관리된다.

## 배포
Vercel + Vercel CLI(`vercel deploy` / `vercel deploy --prod`)로 배포한다. mock/스켈레톤 상태부터 가장 먼저 배포해 빌드·배포 파이프라인(환경변수, 함수 설정 등)을 조기에 검증하고, 이후 각 개발 단계(step)를 완료할 때마다 재배포해 항상 배포 가능한 상태를 유지한다. Route Handler의 `maxDuration`은 CSV 분석 지연시간을 실측한 스파이크 결과로 확정한다(`docs/plan.md` 참고).
