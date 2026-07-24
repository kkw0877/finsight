# Step 8: upload-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (CSV 업로드 → 분석 동기 처리 흐름 전체 — 순서를 정확히 따를 것)
- `/docs/ADR.md` ADR-004(2단계 Claude 호출), ADR-006(quota+블러 페이월)
- `/CLAUDE.md` CRITICAL 규칙(외부 API는 route handler/services에서만, Storage 경로 규칙, 로그에 원문 금지)
- `src/lib/csv.ts`, `src/lib/quota.ts` (step 3)
- `src/lib/supabase/server.ts` (step 4)
- `src/services/claude.ts` (step 5)

이전 step들에서 인증(mock), lib 유틸, mock Supabase/Claude 서비스가 준비됐다. 이 step은 이것들을 조합해 실제 업로드 API를 완성한다 — ARCHITECTURE.md에 명시된 순서를 그대로 구현하라.

## 작업

`src/app/api/upload/route.ts` (POST 핸들러)를 구현한다. 처리 순서:

1. `lib/supabase/server.ts`의 `auth.getUser()`로 인증 확인. 비로그인 시 401.
2. `lib/quota.ts`의 `canUpload`로 quota 확인. **소진 상태여도 분석은 그대로 진행**하되, 응답에 `blurred: true`를 포함시킨다(ADR-006 — 분석 자체는 막지 않고 결과만 블러).
3. `lib/csv.ts`의 `validateFileSize`로 바이트 크기(≤2MB) 검증. 초과 시 400.
4. `lib/csv.ts`의 `detectAndDecode`로 인코딩 감지 + UTF-8 디코딩.
5. `lib/csv.ts`의 `validateRowCount`로 행수(≤2,000행) 검증. 초과 시 400.
6. mock Storage에 원본 CSV를 저장한다. 경로는 반드시 서버가 생성한 `{user_id}/{uploadId}.csv` 형식을 사용한다 — 사용자가 업로드한 원본 파일명을 경로에 쓰지 않는다.
7. `lib/csv.ts`의 `maskSensitiveData`로 Claude 전송용 마스킹 사본을 만든다.
8. `services/claude.ts`의 `parseCsvToTransactions` → `classifyAndSummarize`를 순서대로 호출한다.
9. mock DB(`uploads`, `transactions` 테이블)에 결과를 저장한다 — **원본 그대로**(마스킹 없이) 저장한다.
10. `AnalysisResult`를 동기 응답으로 반환한다.

에러 발생 시 CSV 원문이나 Claude 응답 전문을 로그·에러 메시지에 포함하지 않는다.

## Acceptance Criteria

```bash
npm run build
npm run lint
npm run test   # 정상 업로드, 크기 초과, 행수 초과, quota 소진, 비로그인 케이스
vercel deploy --yes
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md에 명시된 처리 순서를 정확히 따르는가?
   - 클라이언트 컴포넌트가 이 라우트를 거치지 않고 services/lib를 직접 호출하지 않는가?
   - quota 판정이 서버(이 라우트)에서 강제되는가?
   - CLAUDE.md CRITICAL 규칙(Storage 경로, 로그 금지, 마스킹 사본만 Claude 전송)을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "구현한 라우트와 응답 형태 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- quota 판정을 클라이언트에서 신뢰하지 마라 — 반드시 이 서버 라우트에서 강제하라.
- 업로드 원본 파일명을 Storage 경로에 사용하지 마라.
- 에러 메시지·로그에 CSV 원문 또는 Claude 프롬프트/응답 전문을 남기지 마라.
- DB 저장용 데이터에 마스킹을 적용하지 마라(DB 원본은 원문 그대로).
- 기존 테스트를 깨뜨리지 마라.
