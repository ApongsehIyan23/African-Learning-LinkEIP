-- ============================================================================
-- African Learning Link — Phase 2: Opportunity Verification Queue
-- Run ONCE in the Supabase SQL Editor (after 0001). Idempotent where practical.
--
-- Enforces the SOP in the DATABASE:
--   * 8-state lifecycle (ALL_MVP_CONTEXT.md §5.1)
--   * six criteria + paid scrutiny (§5.2)
--   * two-step publish gate: a Verification Lead can APPROVE; only a Super Admin
--     can PUBLISH (§5.1) — enforced inside SECURITY DEFINER functions, not the UI.
--   * rejection requires a recorded reason (§6.4)
-- All status transitions go through RPC functions; direct client UPDATEs of
-- status are impossible because there is no UPDATE policy on the table.
-- ============================================================================

-- 1. Enums ---------------------------------------------------------------------
do $$ begin
  create type public.opportunity_status as enum (
    'received',
    'under_review',
    'verification_in_progress',
    'awaiting_information',
    'approved_for_publication',
    'published',
    'rejected',
    'expired_closed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.opportunity_type as enum (
    'scholarship', 'course', 'internship', 'job', 'fellowship'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.source_method as enum ('manual', 'ai_agent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.criterion_type as enum (
    'authenticity', 'accuracy', 'relevance',
    'accessibility', 'completeness', 'timeliness', 'paid_scrutiny'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.criterion_result as enum ('unchecked', 'pass', 'flag', 'fail');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.institution_type as enum ('university', 'employer');
exception when duplicate_object then null; end $$;

-- 2. institutions (§8.1) — minimal; populated in a later roadmap phase ----------
create table if not exists public.institutions (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  type            public.institution_type not null,
  contact_user_id uuid references public.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- 3. opportunities register (§8.2 / §5.3) --------------------------------------
create table if not exists public.opportunities (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  provider         text not null,
  type             public.opportunity_type not null,
  source_link      text,
  deadline         date,
  eligibility      text,
  application_link text,
  geo_restrictions text,
  date_received    date not null default current_date,
  submitted_by     uuid not null,
  institution_id   uuid,
  source_method    public.source_method not null default 'manual',
  current_status   public.opportunity_status not null default 'received',
  publication_date date,
  created_at       timestamptz not null default now(),
  constraint opportunities_submitted_by_fkey
    foreign key (submitted_by) references public.users (id) on delete restrict,
  constraint opportunities_institution_id_fkey
    foreign key (institution_id) references public.institutions (id) on delete set null
);
create index if not exists opportunities_status_idx on public.opportunities (current_status);
create index if not exists opportunities_submitted_by_idx on public.opportunities (submitted_by);

-- 4. opportunity_criteria (§8.2) — one row per criterion per opportunity --------
create table if not exists public.opportunity_criteria (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  criterion      public.criterion_type not null,
  result         public.criterion_result not null default 'unchecked',
  note           text,
  checked_by     uuid,
  checked_at     timestamptz,
  constraint opportunity_criteria_checked_by_fkey
    foreign key (checked_by) references public.users (id) on delete set null,
  constraint opportunity_criteria_unique unique (opportunity_id, criterion)
);

-- 5. opportunity_activity (§8.2) — audit log -----------------------------------
create table if not exists public.opportunity_activity (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  actor_id       uuid,
  action         text not null,
  note           text,
  created_at     timestamptz not null default now(),
  constraint opportunity_activity_actor_id_fkey
    foreign key (actor_id) references public.users (id) on delete set null
);
create index if not exists opportunity_activity_opp_idx
  on public.opportunity_activity (opportunity_id, created_at);

-- 6. Role helper ---------------------------------------------------------------
create or replace function public.app_is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('super_admin', 'verification_lead')
  );
$$;

-- 7. Seed criteria rows + log on new opportunity -------------------------------
create or replace function public.opportunity_after_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare c public.criterion_type;
begin
  foreach c in array enum_range(null::public.criterion_type)
  loop
    insert into public.opportunity_criteria (opportunity_id, criterion)
    values (new.id, c)
    on conflict (opportunity_id, criterion) do nothing;
  end loop;

  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (new.id, new.submitted_by, 'created',
          'Opportunity logged (' || new.source_method || ')');
  return new;
end $$;

drop trigger if exists trg_opportunity_after_insert on public.opportunities;
create trigger trg_opportunity_after_insert
  after insert on public.opportunities
  for each row execute function public.opportunity_after_insert();

-- 8. Row-Level Security --------------------------------------------------------
alter table public.institutions          enable row level security;
alter table public.opportunities         enable row level security;
alter table public.opportunity_criteria  enable row level security;
alter table public.opportunity_activity  enable row level security;

-- Staff can read all user profiles (so the queue/log can show who did what).
drop policy if exists users_select_staff on public.users;
create policy users_select_staff on public.users
  for select using (public.app_is_staff());

-- institutions: readable by any authenticated user; writes later (roadmap).
drop policy if exists institutions_select on public.institutions;
create policy institutions_select on public.institutions
  for select to authenticated using (true);

-- opportunities SELECT: staff & submitters see the shared queue; everyone
-- (incl. students) sees published items. Multiple permissive policies are OR'd.
drop policy if exists opportunities_select_queue on public.opportunities;
create policy opportunities_select_queue on public.opportunities
  for select to authenticated
  using (public.app_is_staff() or public.current_app_role() = 'submitter');

drop policy if exists opportunities_select_published on public.opportunities;
create policy opportunities_select_published on public.opportunities
  for select to authenticated
  using (current_status = 'published');

-- opportunities INSERT: a submitter or super_admin logs a NEW item as their own,
-- always starting at 'received'.
drop policy if exists opportunities_insert on public.opportunities;
create policy opportunities_insert on public.opportunities
  for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and current_status = 'received'
    and public.current_app_role() in ('submitter', 'super_admin')
  );

-- NO update/delete policies on opportunities: all transitions go through the
-- RPCs below. Direct client status changes are therefore impossible.

-- criteria & activity: visible only if you can see the parent opportunity
-- (the subquery inherits the opportunities SELECT policies above). No client
-- write policies — only the SECURITY DEFINER RPCs write here.
drop policy if exists opportunity_criteria_select on public.opportunity_criteria;
create policy opportunity_criteria_select on public.opportunity_criteria
  for select to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id));

drop policy if exists opportunity_activity_select on public.opportunity_activity;
create policy opportunity_activity_select on public.opportunity_activity
  for select to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id));

-- 9. Lifecycle RPCs (the only way to change status) ----------------------------

-- received -> under_review
create or replace function public.opp_start_review(p_opp uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.opportunity_status;
begin
  if not public.app_is_staff() then raise exception 'Not authorized'; end if;
  select current_status into v from public.opportunities where id = p_opp for update;
  if v is null then raise exception 'Opportunity not found'; end if;
  if v <> 'received' then raise exception 'Can only start review from Received (current: %)', v; end if;
  update public.opportunities set current_status = 'under_review' where id = p_opp;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'under_review', 'Initial screening started');
end $$;

-- under_review -> verification_in_progress
create or replace function public.opp_start_verification(p_opp uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.opportunity_status;
begin
  if not public.app_is_staff() then raise exception 'Not authorized'; end if;
  select current_status into v from public.opportunities where id = p_opp for update;
  if v is null then raise exception 'Opportunity not found'; end if;
  if v <> 'under_review' then raise exception 'Can only start verification from Under Review (current: %)', v; end if;
  update public.opportunities set current_status = 'verification_in_progress' where id = p_opp;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'verification_in_progress', 'Six-criteria verification started');
end $$;

-- set / update one criterion (staff, during review phases)
create or replace function public.opp_set_criterion(
  p_opp uuid, p_criterion public.criterion_type,
  p_result public.criterion_result, p_note text
) returns void language plpgsql security definer set search_path = public as $$
declare v public.opportunity_status;
begin
  if not public.app_is_staff() then raise exception 'Not authorized'; end if;
  select current_status into v from public.opportunities where id = p_opp for update;
  if v is null then raise exception 'Opportunity not found'; end if;
  if v not in ('under_review', 'verification_in_progress', 'awaiting_information') then
    raise exception 'Criteria can only be set during review (current: %)', v;
  end if;
  update public.opportunity_criteria
     set result = p_result, note = p_note, checked_by = auth.uid(), checked_at = now()
   where opportunity_id = p_opp and criterion = p_criterion;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'criterion_updated',
          p_criterion::text || ' → ' || p_result::text
          || case when coalesce(btrim(p_note),'') <> '' then ' — ' || p_note else '' end);
end $$;

-- -> awaiting_information (note required)
create or replace function public.opp_request_info(p_opp uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.opportunity_status;
begin
  if not public.app_is_staff() then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_note), '') = '' then raise exception 'A note is required when requesting information'; end if;
  select current_status into v from public.opportunities where id = p_opp for update;
  if v is null then raise exception 'Opportunity not found'; end if;
  if v not in ('under_review', 'verification_in_progress') then
    raise exception 'Can only request info during review (current: %)', v;
  end if;
  update public.opportunities set current_status = 'awaiting_information' where id = p_opp;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'awaiting_information', btrim(p_note));
end $$;

-- awaiting_information -> verification_in_progress (staff or the submitter)
create or replace function public.opp_resume(p_opp uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.opportunity_status; v_owner uuid;
begin
  select current_status, submitted_by into v, v_owner from public.opportunities where id = p_opp for update;
  if v is null then raise exception 'Opportunity not found'; end if;
  if not (public.app_is_staff() or v_owner = auth.uid()) then raise exception 'Not authorized'; end if;
  if v <> 'awaiting_information' then raise exception 'Can only resume from Awaiting Additional Information (current: %)', v; end if;
  update public.opportunities set current_status = 'verification_in_progress' where id = p_opp;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'verification_in_progress', 'Resumed after information provided');
end $$;

-- verification_in_progress -> approved_for_publication (lead OR super admin)
create or replace function public.opp_approve(p_opp uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.opportunity_status; v_bad int;
begin
  if not public.app_is_staff() then raise exception 'Not authorized'; end if;
  select current_status into v from public.opportunities where id = p_opp for update;
  if v is null then raise exception 'Opportunity not found'; end if;
  if v <> 'verification_in_progress' then
    raise exception 'Can only approve from Verification in Progress (current: %)', v;
  end if;
  select count(*) into v_bad from public.opportunity_criteria
   where opportunity_id = p_opp
     and criterion in ('authenticity','accuracy','relevance','accessibility','completeness','timeliness')
     and result in ('unchecked', 'fail');
  if v_bad > 0 then
    raise exception 'All six core criteria must be checked and none failed before approval';
  end if;
  update public.opportunities set current_status = 'approved_for_publication' where id = p_opp;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'approved', 'Approved for publication (awaiting Super Admin sign-off)');
end $$;

-- approved_for_publication -> published (SUPER ADMIN ONLY — second gate)
create or replace function public.opp_publish(p_opp uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.opportunity_status;
begin
  if not public.is_super_admin() then
    raise exception 'Only a Super Admin can publish an opportunity';
  end if;
  select current_status into v from public.opportunities where id = p_opp for update;
  if v is null then raise exception 'Opportunity not found'; end if;
  if v <> 'approved_for_publication' then
    raise exception 'Can only publish from Approved for Publication (current: %)', v;
  end if;
  update public.opportunities
     set current_status = 'published', publication_date = current_date
   where id = p_opp;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'published', 'Published — live to students');
end $$;

-- -> rejected (reason REQUIRED)
create or replace function public.opp_reject(p_opp uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.opportunity_status;
begin
  if not public.app_is_staff() then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required to reject an opportunity';
  end if;
  select current_status into v from public.opportunities where id = p_opp for update;
  if v is null then raise exception 'Opportunity not found'; end if;
  if v in ('published', 'rejected', 'expired_closed') then
    raise exception 'Cannot reject from % ', v;
  end if;
  update public.opportunities set current_status = 'rejected' where id = p_opp;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'rejected', btrim(p_reason));
end $$;

-- -> expired_closed (staff)
create or replace function public.opp_mark_expired(p_opp uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.opportunity_status;
begin
  if not public.app_is_staff() then raise exception 'Not authorized'; end if;
  select current_status into v from public.opportunities where id = p_opp for update;
  if v is null then raise exception 'Opportunity not found'; end if;
  if v not in ('published', 'approved_for_publication') then
    raise exception 'Can only expire a published/approved opportunity (current: %)', v;
  end if;
  update public.opportunities set current_status = 'expired_closed' where id = p_opp;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'expired_closed', 'Marked expired / closed');
end $$;

-- edit register fields (owner submitter while early, or super admin)
create or replace function public.opp_update_fields(
  p_opp uuid, p_title text, p_provider text, p_type public.opportunity_type,
  p_source_link text, p_deadline date, p_eligibility text,
  p_application_link text, p_geo text
) returns void language plpgsql security definer set search_path = public as $$
declare v public.opportunity_status; v_owner uuid;
begin
  select current_status, submitted_by into v, v_owner from public.opportunities where id = p_opp for update;
  if v is null then raise exception 'Opportunity not found'; end if;
  if not (
    public.is_super_admin()
    or (v_owner = auth.uid() and v in ('received', 'under_review'))
  ) then
    raise exception 'You can only edit your own item while it is in Received or Under Review';
  end if;
  if coalesce(btrim(p_title), '') = '' or coalesce(btrim(p_provider), '') = '' then
    raise exception 'Title and provider are required';
  end if;
  update public.opportunities
     set title = p_title, provider = p_provider, type = p_type,
         source_link = p_source_link, deadline = p_deadline, eligibility = p_eligibility,
         application_link = p_application_link, geo_restrictions = p_geo
   where id = p_opp;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'edited', 'Register fields updated');
end $$;

-- 10. Allow authenticated users to call the RPCs (each self-checks the role) ---
grant execute on function
  public.opp_start_review(uuid),
  public.opp_start_verification(uuid),
  public.opp_set_criterion(uuid, public.criterion_type, public.criterion_result, text),
  public.opp_request_info(uuid, text),
  public.opp_resume(uuid),
  public.opp_approve(uuid),
  public.opp_publish(uuid),
  public.opp_reject(uuid, text),
  public.opp_mark_expired(uuid),
  public.opp_update_fields(uuid, text, text, public.opportunity_type, text, date, text, text, text)
to authenticated;
