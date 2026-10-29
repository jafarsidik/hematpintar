-- HematPintar modul Hemat Rumah Tangga: kebutuhan, link produk, dan anggaran.
--
-- Run this file manually in the Supabase SQL Editor. Do not run it from the
-- app or from an automated agent. The frontend only uses the browser-safe
-- anon/publishable key; a service role key must never be shipped to a browser.
--
-- Rules enforced here:
--   * shopping_needs, saved_products, household_budgets: RLS aktif, user hanya
--     dapat mengakses baris miliknya sendiri untuk semua operasi.
--   * saved_products.need_id mengacu ke shopping_needs dengan ON DELETE CASCADE
--     sehingga menghapus kebutuhan juga menghapus produk kandidatnya.
--   * chosen_product_id di shopping_needs diatur ON DELETE SET NULL agar
--     pilihan produk tidak menghapus kebutuhan saat produk kandidat dihapus.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Kebutuhan belanja rumah tangga
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_needs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  target_qty numeric check (target_qty > 0),
  unit text check (unit in ('g', 'kg', 'ml', 'l', 'pcs')),
  chosen_product_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_needs enable row level security;

drop policy if exists "shopping_needs_select_own" on public.shopping_needs;
create policy "shopping_needs_select_own"
  on public.shopping_needs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "shopping_needs_insert_own" on public.shopping_needs;
create policy "shopping_needs_insert_own"
  on public.shopping_needs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "shopping_needs_update_own" on public.shopping_needs;
create policy "shopping_needs_update_own"
  on public.shopping_needs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "shopping_needs_delete_own" on public.shopping_needs;
create policy "shopping_needs_delete_own"
  on public.shopping_needs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.shopping_needs from anon, authenticated;
grant select, insert, update, delete on table public.shopping_needs to authenticated;

create index if not exists shopping_needs_user_updated_idx
  on public.shopping_needs (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Produk kandidat (link) per kebutuhan
-- ---------------------------------------------------------------------------
create table if not exists public.saved_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  need_id uuid not null references public.shopping_needs (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  platform text not null check (char_length(platform) between 1 and 80),
  store_name text null,
  url text not null check (url ~* '^https?://'),
  price bigint not null default 0 check (price >= 0),
  pack_size numeric not null check (pack_size > 0),
  pack_unit text not null check (pack_unit in ('g', 'kg', 'ml', 'l', 'pcs')),
  shipping_cost bigint not null default 0 check (shipping_cost >= 0),
  voucher_discount bigint not null default 0 check (voucher_discount >= 0),
  note text null,
  price_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_products enable row level security;

drop policy if exists "saved_products_select_own" on public.saved_products;
create policy "saved_products_select_own"
  on public.saved_products
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "saved_products_insert_own" on public.saved_products;
create policy "saved_products_insert_own"
  on public.saved_products
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "saved_products_update_own" on public.saved_products;
create policy "saved_products_update_own"
  on public.saved_products
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "saved_products_delete_own" on public.saved_products;
create policy "saved_products_delete_own"
  on public.saved_products
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.saved_products from anon, authenticated;
grant select, insert, update, delete on table public.saved_products to authenticated;

create index if not exists saved_products_need_updated_idx
  on public.saved_products (need_id, updated_at desc);
create index if not exists saved_products_user_updated_idx
  on public.saved_products (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Anggaran bulanan rumah tangga
-- ---------------------------------------------------------------------------
create table if not exists public.household_budgets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  monthly_budget bigint not null check (monthly_budget >= 0),
  updated_at timestamptz not null default now()
);

alter table public.household_budgets enable row level security;

drop policy if exists "household_budgets_select_own" on public.household_budgets;
create policy "household_budgets_select_own"
  on public.household_budgets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "household_budgets_insert_own" on public.household_budgets;
create policy "household_budgets_insert_own"
  on public.household_budgets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "household_budgets_update_own" on public.household_budgets;
create policy "household_budgets_update_own"
  on public.household_budgets
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "household_budgets_delete_own" on public.household_budgets;
create policy "household_budgets_delete_own"
  on public.household_budgets
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.household_budgets from anon, authenticated;
grant select, insert, update, delete on table public.household_budgets to authenticated;

create index if not exists household_budgets_user_idx
  on public.household_budgets (user_id);

-- ---------------------------------------------------------------------------
-- Foreign key pilihan produk
-- ---------------------------------------------------------------------------
alter table public.shopping_needs
  add constraint shopping_needs_chosen_product_fk
  foreign key (chosen_product_id)
  references public.saved_products (id)
  on delete set null;
