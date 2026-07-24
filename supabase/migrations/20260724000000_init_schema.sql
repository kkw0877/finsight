-- FinSight 초기 스키마: uploads / transactions / subscriptions
-- + RLS 정책(본인 행만 조회/삽입) + csv-uploads Storage 버킷 정책
-- 참고: docs/ARCHITECTURE.md(데이터 저장), docs/ADR.md ADR-002/003/005, CLAUDE.md CRITICAL(RLS 격리)
--
-- 주의: 이 마이그레이션은 파일로만 존재하며 이 step에서는 실제 프로젝트에 적용하지 않는다.
-- 적용(supabase db push)은 step 13(real-supabase-integration)에서 수행한다.

-- ============================================================
-- uploads
-- ============================================================
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  storage_path text not null,
  status text not null check (status in ('success', 'failed')),
  row_count integer not null,
  created_at timestamptz not null default now()
);

create index uploads_user_id_idx on public.uploads (user_id);

alter table public.uploads enable row level security;

create policy "uploads_select_own" on public.uploads
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "uploads_insert_own" on public.uploads
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================
-- transactions
-- ============================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  date date not null,
  merchant text not null,
  amount numeric not null,
  category text not null check (
    category in (
      '식비',
      '교통',
      '주거_공과금',
      '쇼핑',
      '의료_건강',
      '구독서비스',
      '여가_문화',
      '저축_투자',
      '기타'
    )
  ),
  memo text,
  created_at timestamptz not null default now()
);

create index transactions_upload_id_idx on public.transactions (upload_id);
create index transactions_user_id_idx on public.transactions (user_id);

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "transactions_insert_own" on public.transactions
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================
-- subscriptions
-- ============================================================
create table public.subscriptions (
  user_id uuid primary key references auth.users (id),
  is_pro boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "subscriptions_insert_own" on public.subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================
-- Storage: csv-uploads 버킷 (원본 CSV, 사용자별 폴더 격리)
-- 경로 규칙: {user_id}/{upload.id}.csv (ARCHITECTURE.md)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('csv-uploads', 'csv-uploads', false)
on conflict (id) do nothing;

create policy "csv_uploads_select_own_folder" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'csv-uploads'
    and (storage.foldername(name)) [1] = auth.uid()::text
  );

create policy "csv_uploads_insert_own_folder" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'csv-uploads'
    and (storage.foldername(name)) [1] = auth.uid()::text
  );
