# Step 3: lib-utils

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (`lib/csv.ts`, `lib/quota.ts` 역할)
- `/docs/PRD.md` (인코딩 자동 대응, 과금 모델)
- `/docs/ADR.md` ADR-004(2단계 Claude 호출, 행수 캡), ADR-006(quota+블러 페이월)
- `/CLAUDE.md` — TDD 규칙(테스트 먼저 작성)
- `src/types/` (step 1에서 생성)

이 step은 외부 서비스 호출이 전혀 없는 순수 로직이다. **Mock-First 원칙은 외부 서비스 연동(Claude/Polar/Supabase)에만 적용되며, 이 step은 그 대상이 아니다** — 처음부터 실제 동작하는 구현을 작성하라.

## 작업

CLAUDE.md의 TDD 원칙에 따라 각 함수마다 테스트를 먼저 작성한 뒤 구현하라.

1. `src/lib/csv.ts`
   - `detectAndDecode(buffer: Buffer): string` — EUC-KR/CP949 인코딩을 감지해 UTF-8 문자열로 디코딩한다. UTF-8 입력도 올바르게 처리해야 한다.
   - `maskSensitiveData(csvText: string): string` — 카드번호·계좌번호로 보이는 패턴을 마스킹한다. 이 함수는 **Claude로 보내는 사본에만** 적용되고, DB 저장용 원본에는 적용되지 않는다는 것을 호출부(이후 step)가 명확히 알 수 있도록 함수명/위치를 이대로 유지하라.
   - `validateFileSize(bytes: number): void` — 2MB(2 _ 1024 _ 1024) 초과 시 에러를 throw한다.
   - `validateRowCount(csvText: string): void` — 2,000행 초과 시 에러를 throw한다.
2. `src/lib/quota.ts`
   - `FREE_MONTHLY_LIMIT = 3` 상수.
   - `canUpload(isPro: boolean, uploadsThisMonth: number): boolean` — Free는 월 3회, Pro는 무제한(항상 true).

각 함수는 정상 케이스, 경계값(정확히 캡에 걸리는 경우), 실패 케이스를 모두 테스트한다.

## Acceptance Criteria

```bash
npm run build
npm run lint
npm run test   # csv/quota 유닛 테스트 전부 통과
vercel deploy --yes
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙(마스킹은 Claude 전송 사본에만)을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "구현한 함수 목록과 테스트 커버리지 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 카드사별 커스텀 CSV 파서를 만들지 마라. 이유: ADR-004에 따라 CSV → 거래 정규화는 Claude(services/claude.ts)가 담당하고, 이 lib은 인코딩 변환·마스킹·캡 검증만 한다.
- `maskSensitiveData`의 결과를 DB 저장 경로에 사용하지 마라. 이유: CLAUDE.md CRITICAL — DB 원본은 마스킹 없이 원문 보관.
- 테스트 없이 구현 코드부터 작성하지 마라(TDD 위반).
- 기존 테스트를 깨뜨리지 마라.
