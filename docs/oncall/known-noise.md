# Known Noise — Oncall Prod Alert

`.github/workflows/oncall-prod-alert.yml`의 헤드리스 에이전트가 노이즈/신호 판정 시 1차로 대조하는 "알려진 일시적·단발·봇" 목록이다. 여기 없는 패턴이라고 무조건 신호는 아니다 — 최종 판단은 에이전트가 하네스 전체(새 에러 여부·급증·핵심 경로)를 보고 내린다.

이 목록은 오탐(false noise)이 발견될 때마다 팀이 추가/수정한다. 새 항목을 넣을 땐 왜 노이즈로 판단했는지 한 줄로 남긴다.

## 브라우저/클라이언트 환경성 에러

- `ResizeObserver loop limit exceeded` / `ResizeObserver loop completed with undelivered notifications` — 브라우저 렌더링 타이밍 경고, 기능에 영향 없음.
- `Script error.` (스택트레이스 없음) — 크로스오리진 스크립트(주로 브라우저 확장 프로그램)의 에러가 익명화되어 넘어온 것.
- `chrome-extension://`, `moz-extension://`, `safari-extension://` 로 시작하는 스택 프레임을 포함하는 에러 — 사용자가 설치한 확장 프로그램 문제, 우리 코드 밖.
- `NetworkError when attempting to fetch resource` / `Failed to fetch` / `Load failed` 단독 발생(빈도 낮고 특정 유저 1~2명에 국한) — 사용자 측 오프라인/네트워크 불안정.

## 봇/크롤러

- User-Agent에 `bot`, `crawler`, `spider`, `Googlebot`, `bingbot`, `AhrefsBot`, `Slurp` 등이 포함된 세션에서만 발생하는 에러.
- 로그인/업로드 없이 랜딩 페이지에서만 짧게 발생하고 반복되지 않는 단발성 JS 에러.

## 알려진 서드파티 노이즈

- PostHog/분석 SDK 자체의 네트워크 재시도 관련 경고(`posthog-js` 초기화 타이밍 이슈 등) — 상품 기능에 영향 없음.

## 노이즈로 보되 주의할 것

- 위 패턴이라도 **핵심 경로**(업로드 `/api/upload`, 결제 `/api/checkout`·`/api/webhooks/polar`, 인증 `/api/auth/*`)에서 **여러 유저**에 걸쳐 반복되면 노이즈로 단정하지 말고 신호로 취급한다.
