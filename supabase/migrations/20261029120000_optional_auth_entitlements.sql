-- HematPintar optional account layer.
--
-- Run this file manually in the Supabase SQL Editor. Do not run it from the
-- app or from an automated agent. The app only uses the browser-safe anon /
-- publishable key; a service role key must never be shipped to the frontend.
--
-- Rules enforced here:
--   * entitlements: users can only SELECT their own row. There is deliberately
--     no INSERT/UPDATE/DELETE policy for users.
--   * simulations: authenticated users can only access their own rows.
--   * The new-user trigger is SECURITY DEFINER so it can create the free
--     entitlement without granting users write access to entitlements.

create extension if not exists pgcrypto;

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

-- Users may read their own row only. No user-facing write policies exist.
drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Defense in depth: even without a policy, do not expose write privileges.
revoke all on table public.entitlements from anon, authenticated;
grant select on table public.entitlements to authenticated;

-- Create a free entitlement for every new auth user.
create or replace function public.handle_new_user_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.entitlements (user_id, plan)
  values (new.id, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_entitlement on auth.users;
create trigger on_auth_user_created_create_entitlement
  after insert on auth.users
  for each row
  execute function public.handle_new_user_entitlement();

-- Give existing users a free row when this migration is applied. Users who
-- already paid can be upgraded separately by an administrator/service role.
insert into public.entitlements (user_id, plan)
select id, 'free'
from auth.users
on conflict (user_id) do nothing;

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
-- time used for last-write-wins conflict checks. Do not add a trigger that
-- overwrites it with the upload time.

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
