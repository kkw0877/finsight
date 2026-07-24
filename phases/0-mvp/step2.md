# Step 2: design-system

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/UI_GUIDE.md` (전체 — 색상/타이포/컴포넌트/애니메이션/아이콘 규격의 단일 소스)
- `/docs/ADR.md` ADR-009, ADR-010 (컬러 결정 배경, Claude Design 재가공 히스토리)
- `src/types/transaction.ts` (step 1에서 생성 — `TransactionRow` 컴포넌트가 이 타입을 사용한다)

이전 step들에서 Next.js 스캐폴딩과 도메인 타입이 만들어졌다. 이 step은 UI_GUIDE.md에 정의된 디자인 토큰과 9개 UI 프리미티브를 구현한다. 이후 모든 화면(step 7, 9, 10, 11)이 이 컴포넌트들을 조합해서 만들어지므로, UI_GUIDE.md의 수치를 임의로 바꾸지 말고 정확히 반영하라.

## 작업

1. `src/styles/tokens/` 아래에 UI_GUIDE.md의 색상/타이포그래피/spacing/radii/shadow 값을 Tailwind v4 `@theme` 토큰으로 정의한다(배경 canvas/surface/surface-raised, 텍스트 ink 4단계, 시맨틱 positive/negative/warning/neutral, primary 앰버 램프 6종, hairline border). `src/app/globals.css`에서 이 토큰들을 import/선언한다.
2. `next/font/google`로 Instrument Sans(UI/본문)와 IBM Plex Mono(수치 전용)를 로드해 root layout에 적용한다. Instrument Serif는 로드하지 않는다(UI_GUIDE: 사용 안 함).
3. `src/components/ui/`에 UI_GUIDE.md 규격대로 9개 프리미티브를 구현한다:
   - `Button.tsx` — `variant: 'primary' | 'text'` prop. Primary는 `rounded-pill bg-primary text-on-primary`, press 시 `scale-[0.97]`.
   - `Card.tsx` — `rounded-md border border-hairline bg-surface p-6`, shadow 없음.
   - `Tag.tsx`, `Avatar.tsx`, `Input.tsx`, `Toast.tsx` — UI_GUIDE 컴포넌트 섹션 및 일관된 토큰 사용 원칙에 따라 구현(세부 규격이 명시되지 않은 부분은 카드/버튼/입력 필드에 적용된 톤·radius·hairline 원칙을 따라 판단).
   - `StatTile.tsx` — 요약 수치 카드. 금액은 `font-mono ... tabular-nums`.
   - `TransactionRow.tsx` — `Transaction` 타입(step 1)을 props로 받아 날짜/가맹점/금액/카테고리를 표시. 금액·날짜는 mono 폰트.
   - `Sparkline.tsx` — 작은 SVG 라인 스파크라인 (차트 라이브러리 사용 금지, 직접 SVG).
4. Lucide 아이콘 패키지를 추가하고, 사용 시 `strokeWidth={1.5}`, fill 없음, 둥근 배경 박스로 감싸지 않는 원칙을 지킨다.
5. 각 프리미티브에 대해 최소 렌더링 테스트(Vitest + Testing Library)를 작성한다 — 핵심 클래스(pill radius, shadow 없음 등)나 필수 prop 렌더링을 검증한다.

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
   - UI_GUIDE.md의 색상값/클래스 문자열을 정확히 반영했는가?
   - AI 슬롭 안티패턴 표(backdrop-filter, gradient-text, 그림자 글로우, 보라/인디고, 균일 rounded-2xl 등)를 위반하지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "구현한 토큰/컴포넌트 목록 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- UI_GUIDE.md에 명시된 색상/radius/타이밍 값을 임의로 다른 값으로 바꾸지 마라.
- AccountCard/Checkbox/Select/Switch/Dialog/Tabs/SidebarNav/Badge/Tooltip 등 9개 프리미티브 외 컴포넌트를 만들지 마라. 이유: ADR-010에서 MVP 범위 제외로 명시됨.
- 라이트모드 토큰이나 `prefers-color-scheme` 분기를 만들지 마라. 이유: UI_GUIDE.md — 다크모드 고정.
- recharts/chart.js 등 외부 차트 라이브러리를 추가하지 마라. 이유: ARCHITECTURE.md — 차트는 SVG 직접 구현.
- 기존 테스트를 깨뜨리지 마라.
