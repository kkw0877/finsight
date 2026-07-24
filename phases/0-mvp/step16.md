# Step 16: final-smoke-deploy

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md`, `/docs/ARCHITECTURE.md` (골든 패스 전체 흐름 재확인)
- `phases/0-mvp/index.json` (지금까지 완료된 모든 step의 summary — 누적 컨텍스트로 이미 전달됨)

이것이 `0-mvp` task의 마지막 step이다. 지금까지 mock으로 전체 플로우를 만들고(Wave 1), Supabase/Claude/Polar를 실제 연동으로 교체했다(Wave 2). 이 step은 새 기능을 추가하지 않고, 프로덕션 배포와 골든 패스 검증만 한다.

## 작업

1. `vercel deploy --prod`로 프로덕션에 배포한다.
2. 골든 패스를 검증한다:
   - Google 로그인 → 대시보드 진입.
   - CSV 업로드 → 실제 Claude 분석 → 대시보드에 요약/도넛차트/추이차트/거래테이블 렌더 확인.
   - 같은 계정으로 4회째 업로드 시 quota 소진 → 결과 블러 + 업그레이드 CTA 노출 확인.
   - 업그레이드 CTA → 실제 Polar 체크아웃 페이지 진입 확인(**실제 카드 결제는 진행하지 않는다**).
   - 웹훅 수신 후 `is_pro`가 갱신되는지 확인(Polar 대시보드의 테스트 이벤트 발송 기능이나 안전한 재현 방법을 사용한다).
3. 발견된 문제는 이 step의 재시도 한도(3회) 내에서 수정한다. 원인이 외부 서비스 설정 누락 등 사용자 개입이 필요한 경우 `blocked` 처리한다.

## Acceptance Criteria

```bash
npm run build
npm run lint
npm run test
vercel deploy --prod
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 골든 패스 각 단계가 실제 배포 환경에서 정상 동작하는지 확인한다.
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "프로덕션 배포 URL과 골든 패스 검증 결과 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 새로운 기능을 추가하지 마라 — 이 step은 검증과 최종 배포만 한다.
- 발견된 버그 수정 범위를 벗어난 리팩터링을 하지 마라.
- 실제 카드 정보를 입력해 결제를 완료하지 마라 — 웹훅 테스트 이벤트 등 안전한 방식으로 검증하라.
- 기존 테스트를 깨뜨리지 마라.
