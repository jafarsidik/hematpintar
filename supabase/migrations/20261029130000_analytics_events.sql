-- HematPintar opt-in analytics events.
--
-- Run this file manually in the Supabase SQL Editor after the optional auth
-- migration. Do not run it from the app or from an automated agent.
--
-- Privacy rules:
--   * The app inserts an event only when the user is logged in AND explicitly
--     opted in from Settings.
--   * The table intentionally has no financial payload, product name, email,
--     simulation content, or free-form text column.
--   * Users may only INSERT their own events. They have no SELECT/UPDATE/
--     DELETE policy; the service role/admin can read aggregate data.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_name text not null
    check (event_name in ('module_open', 'simulation_saved', 'upgrade_click')),
  module_type text
    check (
      module_type is null
      or module_type in ('household', 'margin', 'reseller', 'bundle')
    ),
  created_at timestamptz not null default now()
);

create index if not exists events_user_created_idx
  on public.events (user_id, created_at desc);

create index if not exists events_name_created_idx
  on public.events (event_name, created_at desc);

alter table public.events enable row level security;

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
  on public.events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on table public.events from anon, authenticated;
grant insert on table public.events to authenticated;
