-- ============================================================================
-- African Learning Link — Phase 2.5: AI discovery assist (ALL_MVP_CONTEXT.md §6)
-- Run ONCE in the Supabase SQL Editor (after 0002). Idempotent where practical.
--
-- The agent does DISCOVERY only. It can never verify, approve, or publish, and it
-- never writes opportunities itself. Confirmed candidates are inserted by the
-- SUBMITTER through the existing opportunities INSERT policy (status 'received',
-- source_method 'ai_agent'), so every SOP gate still applies. These two tables
-- only (a) hold the domain allowlist and (b) cache search results to conserve the
-- free Tavily/Gemini credits.
-- ============================================================================

-- 1. trusted_sources — the agent's domain allowlist (§8.4) ---------------------
create table if not exists public.trusted_sources (
  id         uuid primary key default gen_random_uuid(),
  domain     text not null unique,
  name       text not null,
  added_by   uuid references public.users (id) on delete set null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed the listed trusted portals (§8.4). Safe to re-run.
insert into public.trusted_sources (domain, name) values
  ('opportunitydesk.org',        'Opportunity Desk'),
  ('opportunitiesforafricans.com','Opportunities For Africans'),
  ('afterschoolafrica.com',      'After School Africa'),
  ('mastercardfdn.org',          'Mastercard Foundation'),
  ('chevening.org',              'Chevening'),
  ('daad.de',                    'DAAD'),
  ('andela.com',                 'Andela'),
  ('tonyelumelufoundation.org',  'Tony Elumelu Foundation')
on conflict (domain) do nothing;

-- 2. search_cache — 24-hour cache keyed by query (§8.4) ------------------------
create table if not exists public.search_cache (
  id         uuid primary key default gen_random_uuid(),
  query_key  text not null unique,
  results    jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists search_cache_expires_idx on public.search_cache (expires_at);

-- 3. Row-Level Security --------------------------------------------------------
alter table public.trusted_sources enable row level security;
alter table public.search_cache    enable row level security;

-- trusted_sources: any authenticated user may read the allowlist (the "Find with
-- AI" UI can show which portals are searched). Only a Super Admin may change it
-- (§4.1 — manage the trusted-source list), with no code change required.
drop policy if exists trusted_sources_select on public.trusted_sources;
create policy trusted_sources_select on public.trusted_sources
  for select to authenticated using (true);

drop policy if exists trusted_sources_insert on public.trusted_sources;
create policy trusted_sources_insert on public.trusted_sources
  for insert to authenticated with check (public.is_super_admin());

drop policy if exists trusted_sources_update on public.trusted_sources;
create policy trusted_sources_update on public.trusted_sources
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists trusted_sources_delete on public.trusted_sources;
create policy trusted_sources_delete on public.trusted_sources
  for delete to authenticated using (public.is_super_admin());

-- search_cache: NO policies. Only the Edge Function (service role, which bypasses
-- RLS) ever reads or writes it. Clients cannot touch the cache at all.

-- 4. Grants (RLS still gates every row) ---------------------------------------
grant select, insert, update, delete on public.trusted_sources to authenticated;
-- search_cache: deliberately no grants to anon/authenticated.
