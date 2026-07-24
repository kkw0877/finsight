# Step 10: billing-flow

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` (과금 모델 — Free 월 3회 / Pro 무제한 단일 티어)
- `/docs/ADR.md` ADR-006(quota+블러 페이월), ADR-007(Polar, `checkout_pending` 미저장)
- `/docs/ARCHITECTURE.md` (결제 데이터 흐름)
- `src/services/polar.ts` (step 6 — mock)
- `src/app/dashboard/page.tsx` (step 9 — 업그레이드 CTA 자리)

이전 step에서 mock Polar 서비스와 대시보드의 블러+CTA UI가 만들어졌다. 이 step은 체크아웃/웹훅 라우트를 완성하고 CTA를 실제로 연결한다.

## 작업

1. `src/app/api/checkout/route.ts` (POST): 인증 확인(mock supabase) → `services/polar.ts`의 `createCheckoutSession(userId)` 호출 → 반환된 URL을 응답한다. **이 시점에는 DB에 아무 것도 쓰지 않는다** (ADR-007).
2. `src/app/api/webhooks/polar/route.ts` (POST): `services/polar.ts`의 `verifyAndParseWebhook`으로 payload를 처리하고, 성공 시 mock DB의 `subscriptions.isPro`를 갱신한다.
3. 대시보드(step 9)의 "Pro로 업그레이드" CTA 버튼이 `/api/checkout`을 호출하고, 반환된 URL로 이동(리다이렉트)하도록 연결한다.

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
   - 체크아웃 시작 시점에 DB 쓰기가 없는가(ADR-007)?
   - 웹훅 처리 후 `is_pro` 불리언 하나로 분기되는 구조가 유지되는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "구현한 라우트와 CTA 연결 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 체크아웃 시작 시점에 `checkout_pending` 등 중간 상태를 DB에 저장하지 마라. 이유: ADR-007.
- 다중 티어/연간 요금제 UI나 로직을 만들지 마라. 이유: PRD MVP 제외 사항.
- 실제 Polar 서명 검증이나 `POLAR_ACCESS_TOKEN`/`POLAR_WEBHOOK_SECRET`을 이 step에서 사용하지 마라. 이유: Mock-First — 실제 연동은 step 15.
- 기존 테스트를 깨뜨리지 마라.
