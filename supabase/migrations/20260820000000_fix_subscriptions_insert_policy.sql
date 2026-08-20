-- 취약점 수정: subscriptions_insert_own 정책이 is_pro 값을 검증하지 않아
-- 인증된 사용자가 결제(Polar) 없이 스스로 subscriptions.insert({ is_pro: true })를 호출해
-- Pro로 자가 승격할 수 있었다 (OWASP A01/A02, docs/security-scans/owasp-scan-20260820.md).
-- is_pro=false로 삽입하는 것만 허용하고, 실제 Pro 전환은 서비스 롤(webhook)만 수행하도록 강제한다.

drop policy if exists "subscriptions_insert_own" on public.subscriptions;

create policy "subscriptions_insert_own" on public.subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid() and is_pro = false);
