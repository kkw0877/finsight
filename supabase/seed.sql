-- 로컬 개발 / Supabase Branching(Preview·Staging) 전용 synthetic 시드 데이터.
-- 실제 사용자 데이터는 절대 포함하지 않는다 (CLAUDE.md CRITICAL: 카드 명세서는 민감 금융 데이터).
-- `supabase db reset` 또는 새 브랜치 생성 시 마이그레이션 적용 후 자동 실행된다 (config.toml [db.seed]).

-- ============================================================
-- 테스트 사용자 2명 (Google OAuth 없이 이메일/비밀번호로 auth.users 직접 생성)
-- ============================================================
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'free-user@example.com',
    extensions.crypt('seed-password', extensions.gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"무료 테스트 사용자"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'pro-user@example.com',
    extensions.crypt('seed-password', extensions.gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Pro 테스트 사용자"}'
  );

-- ============================================================
-- subscriptions
-- ============================================================
insert into public.subscriptions (user_id, is_pro) values
  ('11111111-1111-1111-1111-111111111111', false),
  ('22222222-2222-2222-2222-222222222222', true);

-- ============================================================
-- uploads + transactions (Pro 테스트 사용자 기준 샘플 명세서 1건)
-- ============================================================
insert into public.uploads (id, user_id, storage_path, status, row_count) values
  (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.csv',
    'success',
    5
  );

insert into public.transactions (upload_id, user_id, date, merchant, amount, category, memo) values
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-08-01', '스타벅스', 5800, '식비', null),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-08-03', '지하철', 1400, '교통', null),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-08-05', '넷플릭스', 17000, '구독서비스', null),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-08-10', '올리브영', 32500, '쇼핑', null),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-08-15', '전기요금', 45000, '주거_공과금', null);
