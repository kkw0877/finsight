# Step 15: real-polar-integration

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ADR.md` ADR-007 (Polar, `checkout_pending` 미저장, 웹훅 신뢰성 트레이드오프)
- `/CLAUDE.md` CRITICAL 규칙(시크릿은 서버 전용)
- `src/services/polar.ts` (step 6 — 교체 대상 mock, 유지해야 할 함수 시그니처)
- `src/app/api/webhooks/polar/route.ts` (step 10)
- `.env.example`의 `POLAR_WEBHOOK_SECRET` 관련 메모("웹훅 엔드포인트 등록 시 발급 — 배포 URL 필요")

이 프로젝트는 이미 실제 배포 URL이 있다(step 0부터 매 step `vercel deploy`로 배포됨). `.env`에 `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`이 이미 채워져 있으면 그대로 사용한다.

## 작업

1. Polar SDK(또는 REST API)를 사용해 `src/services/polar.ts`의 **내부 구현만** 실제 호출로 교체한다(step 6의 함수 시그니처 `createCheckoutSession`, `verifyAndParseWebhook`은 유지):
   - `createCheckoutSession`: 실제 Polar 체크아웃 세션 생성 API 호출.
   - `verifyAndParseWebhook`: `POLAR_WEBHOOK_SECRET`으로 실제 서명 검증 후 payload 파싱.
2. `src/app/api/webhooks/polar/route.ts`가 실제 서명 헤더를 검증하도록 갱신한다.
3. `POLAR_WEBHOOK_SECRET`이 비어 있으면(웹훅 엔드포인트가 아직 Polar 대시보드에 등록되지 않은 경우) 서명 검증을 절대 생략하지 말고 `blocked` 처리한다 — 사유에 "Polar 대시보드에 배포 URL로 웹훅 엔드포인트 등록 필요"를 명시한다.

## Acceptance Criteria

```bash
npm run build
npm run lint
npm run test   # Polar SDK는 vi.mock으로 목킹해 네트워크 호출 없이 테스트
vercel deploy --yes
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 웹훅 서명 검증이 항상 수행되는가(우회 경로 없음)?
   - `POLAR_ACCESS_TOKEN`/`POLAR_WEBHOOK_SECRET`이 `services/polar.ts` 밖에서 참조되지 않는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "실제 연동 완료 사실 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요(웹훅 미등록 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 웹훅 서명 검증을 생략하거나 우회하는 코드를 남기지 마라. 이유: 결제 위변조 리스크.
- `POLAR_WEBHOOK_SECRET`이 비어있는데도 검증을 skip하고 넘어가지 마라 — 즉시 `blocked` 처리하라.
- 다중 티어/연간 요금제 로직을 추가하지 마라. 이유: PRD MVP 제외 사항.
- 기존 테스트를 깨뜨리지 마라.
