# Step 1: core-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` (핵심 기능, 9종 고정 카테고리, 과금 모델)
- `/docs/ARCHITECTURE.md` (types/ 디렉토리 역할, 데이터 흐름)
- `src/`(프로젝트 루트에 step 0에서 생성된 스캐폴딩)를 확인하라.

이전 step(project-setup)에서 Next.js + TS strict 프로젝트 골격이 만들어졌다. 이 step은 이후 모든 step(lib, services, components, api routes)이 공유할 도메인 타입을 정의한다 — 여기서 정한 필드명/구조가 이후 step들의 계약이 되므로 신중하게 설계하라.

## 작업

`src/types/` 아래에 순수 TypeScript 타입 정의만 작성한다(런타임 로직 없음):

1. `src/types/transaction.ts`
   - `Category` — PRD가 정의한 9종 고정 카테고리의 union 타입: `'식비' | '교통' | '주거_공과금' | '쇼핑' | '의료_건강' | '구독서비스' | '여가_문화' | '저축_투자' | '기타'`
   - `Transaction` — `{ id, uploadId, userId, date, merchant, amount, category, memo? }`
2. `src/types/upload.ts`
   - `Upload` — `{ id, userId, storagePath, status: 'success' | 'failed', rowCount, createdAt }`
3. `src/types/analysis.ts`
   - `CategoryTotal` — `{ category: Category, total: number, percentage: number }`
   - `MonthlyTrendPoint` — `{ month: string, total: number }`
   - `AnalysisResult` — `{ summaryText: string, categoryTotals: CategoryTotal[], monthlyTrend: MonthlyTrendPoint[], transactions: Transaction[] }`
4. `src/types/subscription.ts`
   - `Subscription` — `{ userId, isPro: boolean, currentPeriodEnd?: string }`

각 타입은 실제로 필요한 필드만 최소한으로 정의한다. 이후 step에서 필드가 부족한 것으로 판명되면 그 step에서 확장하면 된다 — 여기서 미리 예측해서 필드를 추가하지 마라.

## Acceptance Criteria

```bash
npm run build   # 컴파일 에러 없음
npm run lint    # ESLint 통과
npm run test    # 기존 테스트 통과
vercel deploy --yes   # 재배포 성공
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약(정의한 타입 파일 목록 포함)"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- zod 등 런타임 검증 스키마를 추가하지 마라. 이유: 이 step은 순수 타입 정의만 다룬다(Simplicity First). 런타임 검증이 필요한 지점(API 입력 등)은 해당 step에서 필요 시 추가한다.
- `src/types/` 밖의 파일을 수정하지 마라.
- 기존 테스트를 깨뜨리지 마라.
