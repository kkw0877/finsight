# Step 11: landing-page

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` (목표, 사용자, 핵심 기능, 디자인 원칙)
- `/docs/UI_GUIDE.md` (레이아웃, 타이포, AI 슬롭 안티패턴 표)
- `/docs/ADR.md` ADR-003(랜딩은 가치 설명 + 로그인 유도에 집중, 업로드는 대시보드 전용)
- `src/components/ui/` (step 2)
- 로그인 버튼/흐름 (step 7)

이전 step들에서 인증 흐름과 디자인 시스템이 완성됐다. 이 step은 마지막 남은 사용자 진입점인 마케팅 랜딩 페이지를 만든다.

## 작업

`src/app/(marketing)/page.tsx`에 다음을 포함한 랜딩 페이지를 만든다:
- 헤드라인 + 핵심 가치 설명(카드 명세서 CSV 업로드 → AI 분석 → 소비 패턴 파악).
- 핵심 기능 3~4개 요약(카테고리 자동분류, 요약 인사이트 등).
- "Google로 로그인" CTA(step 7의 로그인 흐름 재사용).

디자인은 UI_GUIDE.md 원칙(다크 미니멀, 좌측 정렬, 앰버 단일 포인트)을 따른다.

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
   - AI 슬롭 안티패턴 표(그라데이션 히어로, backdrop-blur, 중앙 정렬 등)를 위반하지 않았는가?
   - PRD MVP 제외 항목(후기/FAQ/데모 GIF)이 포함되지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "구현한 랜딩 페이지 구성 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 후기·FAQ·데모 GIF 등 부가 콘텐츠를 넣지 마라. 이유: PRD MVP 제외 사항.
- 중앙 정렬 레이아웃, 그라데이션 히어로, `backdrop-filter: blur()`, gradient-text, box-shadow 글로우를 쓰지 마라. 이유: UI_GUIDE AI 슬롭 안티패턴.
- Instrument Serif 서체를 쓰지 마라. 이유: UI_GUIDE — 이 프로젝트는 랜딩 히어로용 지면이 없어 폐기.
- 기존 테스트를 깨뜨리지 마라.
