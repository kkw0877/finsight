# UI 디자인 가이드

> 이 가이드의 토큰과 컴포넌트 규격은 Claude Design에서 생성한 디자인 시스템(PRD 기반 제안)을 이 프로젝트의 실제 제약(다크모드 고정, 앰버 단일 포인트)에 맞게 재가공한 것이다. 원본 대비 무엇을 바꾸고 뺐는지, 그 이유는 `docs/ADR.md`의 ADR-010 참고.

## 디자인 원칙
1. 도구처럼 보여야 한다 — 마케팅 페이지가 아니라 매일 쓰는 대시보드.
2. 무채색 베이스 + 포인트 색 1가지(앰버)만 쓴다. 강조가 필요할수록 색을 더 쓰고 싶은 유혹을 참는다.
3. 숫자(금액·증감)는 항상 탭형 고정폭(mono)으로 정렬하고, 증감은 `+`/`–` 부호와 색을 함께 써서 표시한다 — 색만으로 의미를 전달하지 않는다.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |

## 색상
다크모드 고정 — 라이트모드 토큰은 두지 않는다. 아래 값은 Tailwind `@theme`에 정의될 토큰 이름 기준.

### 배경
| 용도 | 값 |
|------|------|
| 페이지 | `bg-canvas` — `oklch(14% 0.005 264)` |
| 카드 | `bg-surface` — `oklch(23% 0.01 264)` |
| 팝오버/드롭다운/토스트 | `bg-surface-raised` — `oklch(26.5% 0.01 264)` |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트 | `text-ink` — `oklch(97% 0 0)` |
| 본문 | `text-ink-muted` — `oklch(75% 0.012 264)` |
| 보조 | `text-ink-subtle` — `oklch(58% 0.01 264)` |
| 비활성 | `text-ink-disabled` — `oklch(40% 0.008 264)` |

주 텍스트/본문은 원본 디자인 시스템의 다크모드 텍스트 토큰을 그대로 승계. 보조/비활성은 원본에 없던 단계라 같은 곡선으로 보간해 추가.

### 데이터/시맨틱 색상
| 용도 | 값 |
|------|------|
| 긍정/성공 | `text-positive` / `bg-positive` — `oklch(47% 0.12 162)` |
| 부정/에러 | `text-negative` / `bg-negative` — `oklch(52% 0.16 25)` |
| 경고 | `text-warning` / `bg-warning` — `oklch(72% 0.14 45)` |
| 중립/기본 | `text-neutral` — `oklch(58% 0.008 264)` |

긍정=원본 primary(Ledger Green)를 그대로 승계한 값 — primary가 앰버로 바뀌면서 비게 된 초록을 시맨틱 전용으로 돌린 것. 경고는 원본값(hue 75°)이 새 앰버(hue 70°)와 시각적으로 거의 구분이 안 돼 hue를 45°로 밀어 재계산.

### 포인트 컬러 (Primary / 앰버)
| 용도 | 값 |
|------|------|
| 기본 | `bg-primary` — `oklch(77% 0.165 70)` (`#f59e0b`) |
| hover | `bg-primary-hover` — `oklch(71% 0.165 70)` |
| active/press | `bg-primary-active` — `oklch(67% 0.155 70)` |
| focus 링 | `ring-primary-focus` — `oklch(74% 0.16 70)` |
| 옅은 배경(고스트 버튼 hover 등) | `bg-primary-tint` — `oklch(95% 0.025 70)` |
| 버튼 위 텍스트 | `text-on-primary` — `oklch(14% 0.005 264)` (페이지 배경과 동일한 어두운 톤) |

원본 초록 램프는 베이스가 어두운 톤(L 47%)이라 버튼 텍스트가 흰색이었다. 앰버 베이스는 밝은 톤(L 77%)이라 텍스트를 흰색이 아니라 어두운 잉크색으로 뒤집었다 — 실제 컴포넌트 구현 시 대비 재확인 필요.

## 컴포넌트
### 카드
```
rounded-md border border-hairline bg-surface p-6
```
`border-hairline` = `oklch(32% 0.01 264)` (다크 배경용으로 새로 도출 — 원본 hairline은 라이트모드용 값이라 그대로 못 씀). 그림자 없음 — 카드/버튼/테이블은 절대 shadow를 쓰지 않고, 구분은 hairline 보더나 배경색 차이로만 한다.

### 버튼
```
Primary: rounded-pill bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active active:scale-[0.97] transition-[150ms] focus-visible:ring-2 focus-visible:ring-primary-focus
Text:    text-ink-subtle hover:text-ink transition-[150ms]
```
모든 버튼은 pill(radius 999px). press 시 `scale(0.97)` + 100ms — 시스템 전체에서 공유하는 유일한 마이크로 인터랙션.

### 입력 필드
```
rounded-sm bg-surface border border-hairline px-4 py-3 text-ink placeholder:text-ink-disabled focus:border-primary focus-visible:ring-2 focus-visible:ring-primary-focus
```

## 레이아웃
- 전체 너비: `max-w-[1200px]` (컨테이너). 순수 텍스트 컬럼은 `max-w-[680px]`
- 정렬: 좌측 정렬 기본. 중앙 정렬 금지
- 간격: 8px 기반 스케일(4/8/12/16/24/32/48/64/96). 카드 내부 패딩 최소 24px(`p-6`), 스택 요소 간 기본 `gap-3`~`gap-4`, 섹션 간 최소 48px(`space-y-12`)

## 타이포그래피
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | `text-[32px] leading-[1.2] tracking-[-0.01em] font-semibold text-ink` |
| 카드 제목 | `text-sm font-medium text-ink-subtle` |
| 본문 | `text-base leading-[1.6] text-ink-muted` |
| 캡션/라벨 | `text-xs leading-[1.4] text-ink-subtle` |
| 금액·날짜 등 모든 수치 | `font-mono text-[15px] leading-[1.4] font-medium text-ink tabular-nums` |

폰트: **Instrument Sans**(UI/본문), **IBM Plex Mono**(금액·증감·표 안의 날짜 등 모든 수치 — 표에서 자릿수가 맞춰져야 하므로 예외 없이 적용). `next/font/google`로 로드.

**Instrument Serif는 쓰지 않는다.** 원본 디자인 시스템은 랜딩 히어로 같은 "희귀한 에디토리얼 순간"에만 이 서체를 예약해뒀는데, FinSight는 다크모드 고정 대시보드 툴이고 랜딩 부가 콘텐츠 자체가 MVP 제외 대상이라 그 서체를 쓸 지면이 없다.

## 애니메이션
- hover/focus 전환: 150ms ease
- press/active: 100ms, `scale(0.97)`
- 값 변경(잔액 갱신 등): 200ms crossfade — 슬라이드·바운스 금지
- 그 외 모든 애니메이션(스프링, 페이지 전환 코레오그래피 등) 금지

### 랜딩 전용 확장
아래 두 종류만 랜딩 페이지(`app/(marketing)`) 한정으로 기존 예산에 추가한다. 다른 화면(대시보드 등)에는 적용하지 않는다.
- **스크롤 등장(reveal)**: 뷰포트에 처음 들어올 때 `opacity 0→1` + `translate-y 8px→0`, 200–300ms ease-out, 1회성(재진입 시 재실행 없음). `prefers-reduced-motion: reduce`에서는 Tailwind `motion-reduce:` 변형으로 전환 없이 항상 최종 상태로 렌더링한다.
- **숫자 카운트업**: 강조 수치가 뷰포트에 들어올 때 시작값에서 목표값까지 최대 800ms 동안 증가한다. `font-mono tabular-nums`는 유지하고, 애니메이션 유무와 무관하게 최종 문자열은 항상 동일해야 한다. reduced motion에서는 즉시 목표값을 표시한다.
- 여전히 금지: 스프링/바운스 이징, 자동재생 루프, hover 반복 애니메이션, 스크롤 위치 결합 패럴랙스, 여러 섹션이 순차 코레오그래피처럼 이어지는 연출.

## 아이콘
- Lucide 아이콘 사용 (실제 브랜드 아이콘 자산이 없어 임시로 채택 — 자산 확보 시 교체)
- strokeWidth 1.5, 채움(fill) 없음
- 둥근 배경 박스로 감싸지 않는다
- 이모지·유니코드 글리프를 아이콘 대용으로 쓰지 않는다
