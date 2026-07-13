-- ReachAudit Customer Portal — Phase 2, milestone P1.
-- Spec: ReachAudit_Portal_Spec_Phase2_2026-07-11.md
-- Storage rule (locked): history without PII custody. Reports + compliance
-- JSONs are stored permanently; contact-level files (evidence, roadmaps,
-- uploads) live only in the auto-purged `transit` bucket.
--
-- Run ALL of this once: Supabase dashboard -> SQL Editor -> New query -> Run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- 1. portal_clients: one row per retainer customer.
--    `slug` matches the runner folder (audit_runner/clients/<slug>/).
--    Mirrors client.yaml identity only — never the SAN or roi values.
create table if not exists public.portal_clients (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  next_rescrub date,
  created_at   timestamptz not null default now()
);

-- 2. portal_members: email <-> client. A signed-in user sees only their
--    client's rows. Joey's row(s) carry is_admin = true (sees all clients).
create table if not exists public.portal_members (
  email      text not null,
  client_id  uuid not null references public.portal_clients (id) on delete cascade,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (email, client_id)
);

-- 3. audits: one row per published month. The portal DISPLAYS these numbers;
--    it never computes them — methodology stays locked in the runner.
create table if not exists public.audits (
  id           bigserial primary key,
  client_id    uuid not null references public.portal_clients (id) on delete cascade,
  stamp        text not null,                    -- '2026-07'
  score        integer,                          -- % reachable at publish time
  verdicts     jsonb,                            -- {"Reachable": n, "At-risk": n, "Dead": n}
  tiers        jsonb,
  delta        jsonb,                            -- month-over-month; null on first audit
  published_at timestamptz not null default now(),
  unique (client_id, stamp)
);

-- 4. uploads: customer drop-offs of next month's list (transit bucket).
create table if not exists public.uploads (
  id           bigserial primary key,
  client_id    uuid not null references public.portal_clients (id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  uploaded_at  timestamptz not null default now(),
  pulled_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer avoids RLS self-recursion on
-- portal_members and keeps every policy identical).
-- ---------------------------------------------------------------------------

create or replace function public.portal_my_clients()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select client_id from portal_members where email = auth.email()
$$;

create or replace function public.portal_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(bool_or(is_admin), false)
  from portal_members where email = auth.email()
$$;

grant execute on function public.portal_my_clients() to authenticated;
grant execute on function public.portal_is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.portal_clients enable row level security;
alter table public.portal_members enable row level security;
alter table public.audits         enable row level security;
alter table public.uploads        enable row level security;

-- Members see their own client(s); admin sees all. No anon access anywhere.
create policy "members read their clients" on public.portal_clients
  for select to authenticated
  using (portal_is_admin() or id in (select portal_my_clients()));

create policy "members read own membership" on public.portal_members
  for select to authenticated
  using (portal_is_admin() or email = auth.email());

create policy "members read their audits" on public.audits
  for select to authenticated
  using (portal_is_admin() or client_id in (select portal_my_clients()));

create policy "members read their uploads" on public.uploads
  for select to authenticated
  using (portal_is_admin() or client_id in (select portal_my_clients()));

-- Customers may record an upload for their own client only (P4 uses this).
create policy "members log their uploads" on public.uploads
  for insert to authenticated
  with check (client_id in (select portal_my_clients()));

-- No insert/update/delete policies on clients/members/audits on purpose:
-- only the runner's service-role key (publish.py) writes those.

-- ---------------------------------------------------------------------------
-- Storage buckets (both private)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('portal-docs', 'portal-docs', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('transit', 'transit', false)
  on conflict (id) do nothing;

-- Object paths are <client_id>/<stamp>/<filename>. Members can read
-- their client's folder in either bucket; uploads go to transit only.
create policy "portal members read their files" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('portal-docs', 'transit')
    and (
      portal_is_admin()
      or (storage.foldername(name))[1] in
         (select c::text from portal_my_clients() c)
    )
  );

create policy "portal members upload to transit" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'transit'
    and (storage.foldername(name))[1] in
        (select c::text from portal_my_clients() c)
  );

-- Transit purge: the bucket is transit-only by rule; nothing in it should
-- outlive a week. Until pg_cron is enabled, publish.py sweeps expired
-- transit objects on every publish. The manual sweep, if ever needed:
--   delete from storage.objects
--   where bucket_id = 'transit' and created_at < now() - interval '7 days';

-- ---------------------------------------------------------------------------
-- Seed: demo client + admin membership. The Lakeshore DEMO client publishes
-- like a real customer — that's the sales demo, no real data exposed.
-- ---------------------------------------------------------------------------

insert into public.portal_clients (slug, name, next_rescrub)
  values ('demo', 'Lakeshore Insurance (DEMO)', '2026-08-11')
  on conflict (slug) do nothing;

insert into public.portal_members (email, client_id, is_admin)
  select 'prindlejoey@gmail.com', id, true from public.portal_clients where slug = 'demo'
  on conflict do nothing;

insert into public.portal_members (email, client_id, is_admin)
  select 'joey@reachaudit.com', id, true from public.portal_clients where slug = 'demo'
  on conflict do nothing;
