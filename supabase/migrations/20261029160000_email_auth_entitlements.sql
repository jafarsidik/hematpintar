-- HematPintar email/password account layer with entitlements.
--
-- Run this file manually in the Supabase SQL Editor. Do not run it from the
-- app or from an automated agent. The frontend only uses the browser-safe
-- anon/publishable key; a service role key must never be shipped to a browser.
--
-- Rules enforced here:
--   * entitlements: users can only SELECT their own row. There is deliberately
--     no INSERT/UPDATE/DELETE policy, so users cannot change their plan or
--     email.
--   * simulations: authenticated users can only access their own rows for all
--     operations.
--   * The new-user trigger is SECURITY DEFINER so it can create the free
--     entitlement and copy the email without granting users write access.
--
-- This migration is idempotent. It can be applied after
-- 20261029140000_username_auth_profiles.sql; old username artifacts are
-- dropped if they exist.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Entitlements (plan + email per account)
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free'
    check (plan in ('free', 'plus', 'business')),
  valid_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

-- Backfill email column for existing tables created by older migrations.
alter table public.entitlements
  add column if not exists email text;

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Defense in depth: even without a policy, do not expose write privileges.
revoke all on table public.entitlements from anon, authenticated;
grant select on table public.entitlements to authenticated;

-- Create a free entitlement for every new auth user and copy their email so
-- manual payment matching is straightforward.
create or replace function public.handle_new_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.entitlements (user_id, email, plan, valid_until)
  values (new.id, new.email, 'free', null)
  on conflict (user_id) do update
  set email = excluded.email;

  return new;
end;
$$;

-- Replace the older username-based trigger so a new user gets exactly one
-- email-based entitlement row.
drop trigger if exists on_auth_user_created_create_profile on auth.users;
drop trigger if exists on_auth_user_created_create_entitlement on auth.users;
create trigger on_auth_user_created_create_entitlement
  after insert on auth.users
  for each row
  execute function public.handle_new_user_email();

-- Backfill entitlement rows (and emails) for existing users.
insert into public.entitlements (user_id, email, plan)
select id, email, 'free'
from auth.users
on conflict (user_id) do update
set email = excluded.email;

-- ---------------------------------------------------------------------------
-- Simulations (per-user, all operations limited to own rows)
-- ---------------------------------------------------------------------------
create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_type text not null
    check (module_type in ('household', 'margin', 'reseller', 'bundle')),
  name text not null check (char_length(name) between 1 and 120),
  payload jsonb not null,
  schema_version integer not null default 1 check (schema_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists simulations_user_updated_idx
  on public.simulations (user_id, updated_at desc);

alter table public.simulations enable row level security;

drop policy if exists "simulations_select_own" on public.simulations;
create policy "simulations_select_own"
  on public.simulations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "simulations_insert_own" on public.simulations;
create policy "simulations_insert_own"
  on public.simulations
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "simulations_update_own" on public.simulations;
create policy "simulations_update_own"
  on public.simulations
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "simulations_delete_own" on public.simulations;
create policy "simulations_delete_own"
  on public.simulations
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.simulations from anon, authenticated;
grant select, insert, update, delete on table public.simulations to authenticated;

-- ---------------------------------------------------------------------------
-- Remove legacy username artifacts (if the older migration was applied)
-- ---------------------------------------------------------------------------
drop table if exists public.profiles;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
drop function if exists public.handle_new_user_username();
