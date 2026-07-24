# Step 14: real-claude-integration

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ADR.md` ADR-004 (2단계 호출 이유, 토큰/지연 리스크)
- `/docs/ARCHITECTURE.md` (`maxDuration`은 실측으로 확정한다는 대목)
- `/CLAUDE.md` CRITICAL 규칙(CSV 원문/Claude 프롬프트·응답 전문을 로그에 남기지 않음, 마스킹 사본만 전송)
- `src/services/claude.ts` (step 5 — 교체 대상 mock, 유지해야 할 함수 시그니처)
- `src/lib/csv.ts`의 `maskSensitiveData` (step 3)
- `src/app/api/upload/route.ts` (step 8 — `maxDuration` 설정 위치)

이 프로젝트는 `claude-api` 스킬을 사용해 정확한 모델 ID(파싱용 Haiku, 분류/요약용 Sonnet/Opus)를 재확인해야 한다 — 학습 데이터에만 의존해 모델 ID를 하드코딩하지 마라.

## 작업

1. `@anthropic-ai/sdk`를 설치한다.
2. `claude-api` 스킬을 로드해 최신 모델 ID와 권장 파라미터를 확인한다.
3. `src/services/claude.ts`의 **내부 구현만** 실제 Anthropic API 호출로 교체한다(step 5의 함수 시그니처 `parseCsvToTransactions`, `classifyAndSummarize`는 유지):
   - `parseCsvToTransactions`: Haiku 모델로 CSV(마스킹된 사본) → 정규화된 거래 JSON.
   - `classifyAndSummarize`: Sonnet 또는 Opus 모델로 거래 JSON → 카테고리 분류(9종 고정) + 자연어 요약.
4. 반드시 `lib/csv.ts`의 `maskSensitiveData`로 마스킹된 사본만 Claude로 전송한다 — CSV 원문을 전송하지 않는다(호출부인 upload-api, step 8은 이미 마스킹 사본을 만들고 있으므로 그 값을 그대로 사용한다).
5. Claude 응답이 기대한 JSON 형식이 아니거나 파싱 실패 시, 사용자에게는 일반적인 "분석 실패" 에러만 반환하고 원문/응답 전문은 로그에 남기지 않는다.
6. 분류 결과 카테고리가 9종 고정값을 벗어나는 경우를 대비해 애플리케이션 레벨에서 방어적으로 처리한다(예: 매핑 실패 시 '기타'로 폴백).
7. 실제 CSV 샘플로 지연시간을 간단히 실측해 `src/app/api/upload/route.ts`의 `maxDuration`(Route Handler 설정)을 확정한다.

## Acceptance Criteria

```bash
npm run build
npm run lint
npm run test   # SDK 클라이언트는 vi.mock으로 목킹해 네트워크 호출 없이 테스트
vercel deploy --yes
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - CSV 원문이 아닌 마스킹된 사본만 Claude로 전송되는가?
   - 로그/에러 메시지에 프롬프트·응답 전문이 남지 않는가?
   - `ANTHROPIC_API_KEY`가 `services/claude.ts` 밖에서 참조되지 않는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "사용한 모델 ID, 확정한 maxDuration 값 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- CSV 원문(마스킹 전)을 Claude로 전송하지 마라.
- Claude 프롬프트/응답 전문을 로그나 에러 메시지에 남기지 마라.
- `ANTHROPIC_API_KEY`를 `services/claude.ts` 밖에서 직접 참조하지 마라.
- 모델 ID를 학습 데이터 기억에만 의존해 하드코딩하지 마라 — 반드시 `claude-api` 스킬로 확인하라.
- 기존 테스트를 깨뜨리지 마라.
