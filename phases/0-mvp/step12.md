# Step 12: supabase-schema-rls

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (데이터 저장 섹션 — uploads/transactions/subscriptions, 원본 그대로 보관)
- `/docs/ADR.md` ADR-002(Supabase 단일 백엔드), ADR-003(사용자 식별 전제), ADR-005(원본 CSV까지 전부 저장, RLS·Storage 정책으로 격리)
- `/CLAUDE.md` CRITICAL 규칙(RLS + Storage 버킷 정책으로 사용자별 격리)
- `src/lib/supabase/types.ts` (step 4 — mock 클라이언트가 기대하는 테이블/컬럼 형태와 실제 스키마가 맞아야 한다)
- `src/types/` (step 1 — Transaction, Upload, Subscription)

Wave 1(mock 기반 전체 플로우)이 완료됐다. 이제부터는 mock을 실제 서비스로 하나씩 교체하는 Wave 2다. 이 step은 **SQL 마이그레이션 작성만** 한다 — 실제 프로젝트에 적용(migration up)하는 것은 다음 step(`real-supabase-integration`)에서 실제 연동과 함께 신중하게 수행한다.

## 작업

`supabase/migrations/` 디렉토리(Supabase CLI 컨벤션)에 SQL 마이그레이션 파일을 작성한다:

1. `uploads` 테이블 — `id, user_id, storage_path, status ('success'|'failed'), row_count, created_at`
2. `transactions` 테이블 — `id, upload_id, user_id, date, merchant, amount, category, memo, created_at`
3. `subscriptions` 테이블 — `user_id (PK), is_pro, updated_at`
4. 세 테이블 모두 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `user_id = auth.uid()` 조건의 select/insert 정책(본인 행만 조회/삽입 가능). 예외 없이 전체 허용 정책(`USING (true)`)을 만들지 않는다.
5. Storage 버킷(예: `csv-uploads`) 생성 SQL 또는 정책 — 본인 폴더(`{user_id}/...`)만 접근 가능하도록 제한.

로컬에 Supabase CLI가 설치되어 있으면 문법을 검증한다. 없으면 SQL을 신중히 리뷰하는 것으로 대체한다.

## Acceptance Criteria

```bash
npm run build
npm run lint
# Supabase CLI가 있으면: supabase db lint (또는 supabase migration list)로 문법 확인
# 없으면 SQL 파일을 직접 리뷰해 문법 오류가 없는지 확인
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 모든 테이블에 RLS가 활성화되고 `auth.uid()` 기반 정책이 있는가?
   - Storage 버킷 정책이 사용자별 폴더로 격리되는가?
   - `src/lib/supabase/types.ts`(mock 인터페이스)가 기대하는 테이블/컬럼과 이름이 일치하는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "작성한 마이그레이션 파일과 테이블/정책 요약(step 13이 참고할 수 있도록)"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 실제 Supabase 프로젝트에 마이그레이션을 적용하지 마라(`supabase db push` 등). 이유: 실 데이터베이스 변경은 실제 연동과 함께 다음 step에서 검증하며 수행한다.
- RLS를 비활성화하거나 전체 허용 정책(`USING (true)`)을 만들지 마라. 이유: CLAUDE.md CRITICAL — 사용자별 격리 필수.
- `SUPABASE_SERVICE_ROLE_KEY` 등 시크릿을 SQL이나 코드에 하드코딩하지 마라.
- 기존 테스트를 깨뜨리지 마라.
