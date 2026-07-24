# Step 9: dashboard-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` (결과 대시보드 구성 — 요약카드+도넛차트+월별추이차트+거래테이블, quota 소진 시 블러+CTA)
- `/docs/UI_GUIDE.md` (색상/레이아웃/타이포 규칙)
- `/docs/ADR.md` ADR-006(블러 페이월), ADR-010 트레이드오프 단락(9개 카테고리 색상 전략은 컴포넌트 구현 시점에 dataviz 스킬로 결정)
- `src/components/ui/` 전체 (step 2 — StatTile, TransactionRow, Card 등)
- `src/app/api/upload/route.ts` (step 8 — 응답 형태, `blurred` 플래그)
- `src/types/analysis.ts` (step 1)

이전 step에서 업로드 API가 완성됐다. 이 step은 대시보드 페이지와 업로드 위젯을 만들어 전체 사용자 흐름(업로드→분석→대시보드 렌더)을 완성한다. 카테고리 도넛차트 색상 팔레트를 정할 때는 `dataviz` 스킬을 참고하라.

## 작업

1. `src/app/dashboard/page.tsx` (Server Component): mock Supabase에서 최근 업로드의 `AnalysisResult`(또는 최신 uploads/transactions)를 조회해 렌더한다:
   - 요약 카드(`StatTile`) — 총 지출, 최다 카테고리 등.
   - `src/components/DonutChart.tsx` — 카테고리별 지출 비중 SVG 도넛차트. 9개 카테고리를 구분할 수 있는 팔레트를 정하되, 앰버(primary)는 CTA 전용으로 예약하고 카테고리 팔레트에 재사용하지 않는다.
   - `src/components/MonthlyTrendChart.tsx` — 월별 지출 추이 SVG 라인/바 차트.
   - 거래 테이블 — `TransactionRow`(step 2) 재사용.
2. `src/components/UploadWidget.tsx` (Client Component): 파일 선택 → `/api/upload` POST → 로딩 스피너 → 결과를 부모(대시보드)에 반영. 업로드 진행 상태는 로컬 `useState`로만 관리한다(DB 저장 없음).
3. 업로드 API 응답에 `blurred: true`가 포함되면 결과 영역에 blur 처리(CSS)를 적용하고 "Pro로 업그레이드" CTA를 노출한다(체크아웃 연결은 step 10에서).

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
   - Server Component 기본, 인터랙션 필요한 부분만 Client Component인가?
   - 차트가 외부 라이브러리 없이 SVG로 직접 구현됐는가?
   - UI_GUIDE.md 색상/레이아웃 원칙을 따르는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "구현한 페이지/컴포넌트 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- recharts/chart.js 등 차트 라이브러리를 추가하지 마라. 이유: ARCHITECTURE.md — SVG 직접 구현.
- 카테고리 수동 수정 UI를 만들지 마라. 이유: PRD MVP 제외(분석 결과는 읽기 전용).
- 다중 차트·필터·정렬 등 고급 인터랙션을 추가하지 마라. 이유: PRD MVP 제외 사항.
- 도넛차트 카테고리 팔레트에 앰버(primary) 색상을 재사용하지 마라. 이유: UI_GUIDE — 앰버는 단일 포인트 컬러(주요 CTA 전용).
- 기존 테스트를 깨뜨리지 마라.
