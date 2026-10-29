-- HematPintar username/password account layer.
--
-- Run this file manually in the Supabase SQL Editor. Do not run it from the
-- app or from an automated agent. The frontend only uses the browser-safe
-- anon/publishable key; a service role key must never be shipped to a browser.
--
-- Rules enforced here:
--   * profiles: users can only SELECT their own row. There is deliberately no
--     INSERT/UPDATE/DELETE policy, so users cannot change their username.
--   * entitlements: users can only SELECT their own row. There is deliberately
--     no INSERT/UPDATE/DELETE policy for users.
--   * simulations: users can only access their own rows for all operations.
--   * The new-user trigger is SECURITY DEFINER so it can create the profile and
--     free entitlement without granting users write access.
--
-- This migration is idempotent and can be run after
-- 20261029120000_optional_auth_entitlements.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT/UPDATE/DELETE policy and no write privilege for users.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Entitlements
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'plus', 'business')),
  valid_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Defense in depth: even without a policy, do not expose write privileges.
revoke all on table public.entitlements from anon, authenticated;
grant select on table public.entitlements to authenticated;

-- ---------------------------------------------------------------------------
-- Simulations
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

-- updated_at is intentionally set by the client so it mirrors the local edit
-- time used for last-write-wins conflict checks.

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
-- New auth user trigger
-- ---------------------------------------------------------------------------
-- The username must come from the signUp metadata. Invalid or missing
-- usernames abort the auth insert instead of creating a half-configured user.
create or replace function public.handle_new_user_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));

  if requested_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;

  insert into public.profiles (user_id, username)
  values (new.id, requested_username);

  insert into public.entitlements (user_id, plan, valid_until)
  values (new.id, 'free', null)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Replace the older entitlement-only trigger so a new user gets exactly one
-- profile and one entitlement row.
drop trigger if exists on_auth_user_created_create_entitlement on auth.users;
drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_user_username();

-- Backfill profile rows for existing users whose metadata already contains a
-- valid username. Conflicting usernames are skipped; the app still falls back
-- to the username metadata when no profile row exists.
insert into public.profiles (user_id, username)
select
  id,
  lower(trim(raw_user_meta_data ->> 'username'))
from auth.users
where lower(trim(coalesce(raw_user_meta_data ->> 'username', ''))) ~ '^[a-z0-9_]{3,20}$'
on conflict do nothing;

-- Give existing users a free entitlement when this migration is applied.
insert into public.entitlements (user_id, plan)
select id, 'free'
from auth.users
on conflict (user_id) do nothing;
