# Step 5: mock-claude-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (`services/claude.ts` 역할, 2단계 호출 흐름 — 파싱 → 분류/요약)
- `/docs/ADR.md` ADR-004 (CSV 파싱을 Claude에 위임하는 이유, 2단계 분리 이유)
- `/docs/PRD.md` (9종 고정 카테고리 목록)
- `src/types/transaction.ts`, `src/types/analysis.ts` (step 1)
- `src/lib/csv.ts` (step 3 — 이 서비스가 받는 입력은 이미 인코딩 변환이 끝난 CSV 텍스트)

**Mock-First**: 이 step에서는 실제 Anthropic API를 호출하지 않는다. 나중 step 14(`real-claude-integration`)에서 이 파일의 **내부 구현만** 실제 Claude SDK 호출로 교체하므로, 여기서 정하는 함수 시그니처를 유지할 수 있게 설계하라.

## 작업

`src/services/claude.ts`에 다음 두 함수를 구현한다:

```ts
export async function parseCsvToTransactions(csvText: string, uploadId: string, userId: string): Promise<Transaction[]>
export async function classifyAndSummarize(transactions: Transaction[]): Promise<AnalysisResult>
```

- `parseCsvToTransactions`: mock 구현은 CSV 텍스트를 줄 단위로 분리하고, 쉼표 기준으로 컬럼을 간단히 나눠 날짜/가맹점/금액 필드를 추정해 `Transaction[]`을 만든다. 실제 다양한 카드사 포맷을 완벽히 지원할 필요는 없다 — 목적은 이후 step(업로드 API, 대시보드)의 흐름을 검증하는 것이다. 빈 입력이나 파싱이 불가능한 입력에는 에러를 throw한다.
- `classifyAndSummarize`: 가맹점명 키워드 매칭(간단한 규칙, 예: "스타벅스"/"편의점" → 식비) 등으로 9종 고정 카테고리 중 하나를 배정하고, 카테고리별 합계·비중(`CategoryTotal[]`)과 월별 추이(`MonthlyTrendPoint[]`)를 계산하며, `"이번 달 식비 42만원(전체의 31%)…"` 형태의 자연어 요약 문자열을 생성한다.

## Acceptance Criteria

```bash
npm run build
npm run lint
npm run test   # 정상 CSV, 빈 CSV, 파싱 불가 케이스 테스트 포함
vercel deploy --yes
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md의 2단계 호출 구조(파싱/분류)를 함수 분리로 반영했는가?
   - 카테고리가 PRD의 9종 고정값만 사용하는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "구현한 함수 시그니처와 mock 로직 요약(step 14가 참고할 수 있도록)"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 실제 Anthropic SDK(`@anthropic-ai/sdk`)를 설치하거나 호출하지 마라. `ANTHROPIC_API_KEY`를 참조하지 마라. 이유: Mock-First — 실제 연동은 step 14 전용.
- PRD의 9종(식비/교통/주거_공과금/쇼핑/의료_건강/구독서비스/여가_문화/저축_투자/기타) 외의 카테고리 값을 만들지 마라.
- 정교한 카드사별 파서를 만들지 마라. 이유: mock의 목적은 흐름 검증이지 파싱 정확도가 아니다 — 과도한 정교화는 step 14에서 버려질 코드를 늘릴 뿐이다.
- 기존 테스트를 깨뜨리지 마라.
