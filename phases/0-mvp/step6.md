# Step 6: mock-polar-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (`services/polar.ts` 역할, 결제 데이터 흐름)
- `/docs/ADR.md` ADR-007 (Polar 결제/구독, `checkout_pending` 미저장 이유)
- `/docs/PRD.md` (과금 모델 — Free/Pro 단일 티어)
- `src/types/subscription.ts` (step 1)

**Mock-First**: 이 step에서는 실제 Polar API를 호출하지 않는다. 나중 step 15(`real-polar-integration`)에서 이 파일의 **내부 구현만** 실제 Polar SDK 호출로 교체하므로, 여기서 정하는 함수 시그니처를 유지할 수 있게 설계하라.

## 작업

`src/services/polar.ts`에 다음 두 함수를 구현한다:

```ts
export async function createCheckoutSession(userId: string): Promise<{ url: string }>
export async function verifyAndParseWebhook(payload: string, signature: string): Promise<{ userId: string; isPro: boolean } | null>
```

- `createCheckoutSession`: mock 구현은 고정된 더미 URL(예: `` `/mock-checkout?user=${userId}` ``)을 반환한다.
- `verifyAndParseWebhook`: mock 구현은 서명 검증을 하지 않고 `payload`를 JSON으로 파싱해 `{ userId, isPro }`를 반환한다(형식이 맞지 않으면 `null`).

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
   - ARCHITECTURE.md의 `services/polar.ts` 역할과 일치하는가?
   - ADR-007의 `checkout_pending` 미저장 원칙을 위반하지 않았는가(이 서비스는 DB 쓰기를 하지 않음)?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "구현한 함수 시그니처 요약(step 15가 참고할 수 있도록)"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 실제 Polar SDK를 설치하거나 호출하지 마라. `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`을 참조하지 마라. 이유: Mock-First — 실제 연동은 step 15 전용.
- `checkout_pending` 같은 중간 상태를 DB(mock supabase 포함)에 저장하는 로직을 만들지 마라. 이유: ADR-007 — 결제 페이지 이탈 시 고착 상태를 만들지 않기 위함.
- 다중 티어/연간 요금제 관련 로직을 만들지 마라. 이유: PRD MVP 제외 사항.
- 기존 테스트를 깨뜨리지 마라.
