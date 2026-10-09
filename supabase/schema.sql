-- ============================================================
-- نظام إدارة المخزون — مخطط Supabase (PostgreSQL)
-- نفّذ هذا الملف كاملاً في: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) الجداول
create table if not exists public.warehouses (
  id text primary key,
  name text not null,
  location text,
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id text primary key,
  code text,
  name text,
  unit text,
  min numeric not null default 0,
  price numeric not null default 0,
  stock jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.movements (
  id text primary key,
  type text,
  item_id text,
  item_name text,
  qty numeric not null default 0,
  from_wh text,
  to_wh text,
  reason text,
  user_name text,
  created_at timestamptz not null default now()
);

-- 2) تفعيل الحماية (RLS)
alter table public.warehouses enable row level security;
alter table public.items      enable row level security;
alter table public.movements  enable row level security;

-- 3) سياسات الوصول — المستخدم المسجّل (حساب الفريق) فقط
drop policy if exists team_all_warehouses on public.warehouses;
drop policy if exists team_all_items      on public.items;
drop policy if exists team_all_movements  on public.movements;

create policy team_all_warehouses on public.warehouses
  for all to authenticated using (true) with check (true);

create policy team_all_items on public.items
  for all to authenticated using (true) with check (true);

create policy team_all_movements on public.movements
  for all to authenticated using (true) with check (true);

-- 4) تفعيل البث اللحظي (Realtime) بأمان دون تكرار
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'warehouses'
  ) then
    alter publication supabase_realtime add table public.warehouses;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'movements'
  ) then
    alter publication supabase_realtime add table public.movements;
  end if;
end $$;

-- 5) تضمن أن الحذف يرسل المعرّف في البث اللحظي
alter table public.warehouses replica identity full;
alter table public.items      replica identity full;
alter table public.movements  replica identity full;
