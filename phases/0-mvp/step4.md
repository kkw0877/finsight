# Step 4: mock-supabase-client

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (`lib/supabase/server.ts`, `client.ts` 역할 — 쿠키 기반 세션 클라이언트 / 브라우저 클라이언트)
- `/docs/ADR.md` ADR-002(Supabase 단일 백엔드), ADR-003(Google OAuth), ADR-005(원본 CSV까지 전부 저장)
- `/CLAUDE.md` CRITICAL 규칙(RLS/Storage 격리, 시크릿은 서버 전용)
- `src/types/` (step 1 — Transaction, Upload, Subscription)

**이 프로젝트는 Mock-First로 진행 중이다.** 외부 서비스(Supabase 포함)는 먼저 mock으로 구현해 전체 플로우를 조기에 검증하고, 이후 전용 step(step 13 `real-supabase-integration`)에서 이 두 파일의 **내부 구현만** 실제 `@supabase/ssr`로 교체한다. 따라서 이 step에서 정하는 함수 시그니처가 이후 호출부(step 7, 8, 9, 10)와 step 13의 계약이 된다 — 신중하게 설계하라.

## 작업

1. `src/lib/supabase/types.ts`에 이 프로젝트가 실제로 사용하는 supabase-js 서브셋만 흉내내는 최소 인터페이스를 정의한다:
   ```ts
   interface MockUser { id: string; email: string; name?: string }

   interface SupabaseClientLike {
     auth: {
       getUser(): Promise<{ data: { user: MockUser | null } }>
       signInWithOAuth(opts: { provider: 'google'; options?: { redirectTo?: string } }): Promise<{ data: { url: string | null } }>
       signOut(): Promise<{ error: null }>
     }
     from(table: 'uploads' | 'transactions' | 'subscriptions'): TableQuery
     storage: {
       from(bucket: string): {
         upload(path: string, file: Buffer | Blob): Promise<{ data: { path: string } | null; error: Error | null }>
         download(path: string): Promise<{ data: Blob | null; error: Error | null }>
       }
     }
   }
   ```
   `TableQuery`는 이후 step들이 실제로 필요로 하는 오퍼레이션(select/insert/eq/single 등)만 최소로 지원한다 — 범용 쿼리 빌더를 만들지 마라.
2. `src/lib/supabase/server.ts` — `createServerClient(): Promise<SupabaseClientLike>` (또는 동기 버전, 실제 `@supabase/ssr`의 시그니처와 유사하게). 고정된 mock 로그인 유저(예: `id: 'mock-user-1'`) 세션을 반환한다.
3. `src/lib/supabase/client.ts` — `createBrowserClient(): SupabaseClientLike`. 동일 인터페이스.
4. 데이터는 모듈 스코프 인메모리 저장소(Map/Array)로 관리한다. 서버 프로세스 재시작 시 초기화된다는 한계를 짧은 주석 하나로 명시한다(향후 개발자 혼란 방지 목적의 유일한 예외적 주석).
5. 삽입/조회가 정상 동작함을 검증하는 유닛 테스트를 작성한다.

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
   - ARCHITECTURE.md의 `lib/supabase/` 역할 분리를 따르는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가(이 step은 mock이므로 시크릿 사용 없음)?
3. 결과에 따라 `phases/0-mvp/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "정의한 SupabaseClientLike 인터페이스와 지원 오퍼레이션 요약(step 13에서 참고할 수 있도록 구체적으로)"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 범용 SQL-like 쿼리 빌더를 구현하지 마라. 이유: 이후 step들이 실제로 필요로 하는 오퍼레이션만 지원하면 충분하고, 과설계는 step 13의 real 교체를 오히려 복잡하게 만든다.
- RLS나 사용자 간 데이터 격리를 이 mock에서 흉내내려 하지 마라(단일 mock 유저만 존재). 이유: 실제 격리 검증은 step 12/13에서 실제 Postgres RLS로 이루어진다 — 이 step에서 흉내내면 이중 관리 부담만 생긴다.
- 실제 `@supabase/ssr`, `@supabase/supabase-js` 패키지를 설치하거나 호출하지 마라(Mock-First — 이 step은 mock 전용).
- 기존 테스트를 깨뜨리지 마라.
