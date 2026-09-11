-- 성능 개선: uploads/transactions/subscriptions RLS 정책 6개가 auth.uid()를
-- 행마다 재평가해 대량 조회 시 느려진다 (Supabase advisor: auth_rls_initplan,
-- docs/supabase-advisors/advisor-scan-20260829.md). auth.uid()를
-- (select auth.uid())로 감싸 한 번만 평가하도록 재작성한다.
-- 정책의 접근 범위(의미)는 변경하지 않는다 — 재작성 전후로 동일한 행만 허용된다.

drop policy if exists "uploads_select_own" on public.uploads;
create policy "uploads_select_own" on public.uploads
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "uploads_insert_own" on public.uploads;
create policy "uploads_insert_own" on public.uploads
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()) and is_pro = false);
