-- ============================================================================
-- African Learning Link — Phase 4: Mentor Matching (ALL_MVP_CONTEXT.md §5.4–5.6)
-- Run ONCE in the Supabase SQL Editor (after 0004). Idempotent where practical.
--
-- Integrity, like Phase 2, lives in the DATABASE:
--   * profiles are user-owned; only the owner (via SECURITY DEFINER RPCs) writes them
--   * matching transitions (recommend / accept / decline / feedback) go through
--     SECURITY DEFINER RPCs that check role + state — no client UPDATE policy exists
--   * MENTOR VERIFICATION GATE (flagged addition, §4.3): an unverified mentor is
--     excluded from the matchable pool. It is one check, labelled below, so Lajik
--     can disable it by flipping ALL_REQUIRE_MENTOR_VERIFICATION to false.
-- Per-criterion scores are stored so the weighted total is always derivable (§5.5).
-- ============================================================================

-- 0. Feature flag for the flagged mentor-verification gate (§4.3) --------------
-- Flip to false here (and the pool stops requiring verification) if Lajik declines
-- the gate. This is the single toggle promised in the blueprint.
create or replace function public.mm_require_mentor_verification()
returns boolean language sql immutable as $$ select true $$;

-- 1. Enums --------------------------------------------------------------------
do $$ begin
  create type public.matching_status as enum (
    'registered', 'profile_incomplete', 'ready_to_match', 'searching',
    'recommended', 'declined', 'connected', 'active'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.match_status as enum ('recommended', 'declined', 'connected', 'active');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.match_criterion as enum
    ('goals', 'skills', 'availability', 'field', 'interests', 'language');
exception when duplicate_object then null; end $$;

-- 2. Profiles (§8.3 / §5.6) ----------------------------------------------------
create table if not exists public.mentor_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references public.users (id) on delete cascade,
  field        text,
  career_goals text,
  skills       text,
  experience   text,
  languages    text,
  availability text,
  interests    text,
  capacity     int not null default 1,
  verified     boolean not null default false,
  verified_by  uuid references public.users (id) on delete set null,
  status       public.matching_status not null default 'registered',
  created_at   timestamptz not null default now()
);

create table if not exists public.mentee_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references public.users (id) on delete cascade,
  field        text,
  career_goals text,
  skills       text,
  experience   text,
  languages    text,
  availability text,
  interests    text,
  status       public.matching_status not null default 'registered',
  created_at   timestamptz not null default now()
);

-- 3. Matches + per-criterion scores + feedback (§8.3) --------------------------
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  mentor_id     uuid not null references public.mentor_profiles (id) on delete cascade,
  mentee_id     uuid not null references public.mentee_profiles (id) on delete cascade,
  status        public.match_status not null default 'recommended',
  match_score   numeric(4, 3), -- cached convenience; truth is in match_criteria_scores
  recommended_at timestamptz not null default now(),
  confirmed_at  timestamptz
);
create index if not exists matches_mentee_idx on public.matches (mentee_id);
create index if not exists matches_mentor_idx on public.matches (mentor_id);

create table if not exists public.match_criteria_scores (
  id        uuid primary key default gen_random_uuid(),
  match_id  uuid not null references public.matches (id) on delete cascade,
  criterion public.match_criterion not null,
  score     numeric(4, 3) not null, -- 0..1
  weight    int not null,           -- High=2, Medium=1 (proposed default, §5.5)
  constraint match_criteria_unique unique (match_id, criterion)
);

create table if not exists public.match_feedback (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references public.matches (id) on delete cascade,
  submitted_by uuid references public.users (id) on delete set null,
  rating       int not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now()
);

-- 4. Row-Level Security --------------------------------------------------------
alter table public.mentor_profiles       enable row level security;
alter table public.mentee_profiles       enable row level security;
alter table public.matches               enable row level security;
alter table public.match_criteria_scores enable row level security;
alter table public.match_feedback        enable row level security;

-- Profiles: the owner reads their own; staff read all (to verify + match). No
-- client write policy — all writes go through the SECURITY DEFINER RPCs below.
drop policy if exists mentor_profiles_select on public.mentor_profiles;
create policy mentor_profiles_select on public.mentor_profiles
  for select to authenticated using (user_id = auth.uid() or public.app_is_staff());

drop policy if exists mentee_profiles_select on public.mentee_profiles;
create policy mentee_profiles_select on public.mentee_profiles
  for select to authenticated using (user_id = auth.uid() or public.app_is_staff());

-- Matches: a participant (via their profile) or staff may read. Members read the
-- counterpart's details through mm_my_match() (SECURITY DEFINER), not directly.
drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches
  for select to authenticated using (
    public.app_is_staff()
    or exists (select 1 from public.mentee_profiles me where me.id = mentee_id and me.user_id = auth.uid())
    or exists (select 1 from public.mentor_profiles mo where mo.id = mentor_id and mo.user_id = auth.uid())
  );

drop policy if exists match_criteria_select on public.match_criteria_scores;
create policy match_criteria_select on public.match_criteria_scores
  for select to authenticated using (public.app_is_staff());

drop policy if exists match_feedback_select on public.match_feedback;
create policy match_feedback_select on public.match_feedback
  for select to authenticated using (
    public.app_is_staff()
    or exists (
      select 1 from public.matches m
      join public.mentee_profiles me on me.id = m.mentee_id
      join public.mentor_profiles mo on mo.id = m.mentor_id
      where m.id = match_id and (me.user_id = auth.uid() or mo.user_id = auth.uid())
    )
  );

-- 5. Profile save RPCs (owner-only; compute matching status) -------------------
create or replace function public._mm_next_status(existing public.matching_status, complete boolean)
returns public.matching_status language sql immutable as $$
  select case
    when existing in ('searching','recommended','declined','connected','active') then existing
    when complete then 'ready_to_match'::public.matching_status
    else 'profile_incomplete'::public.matching_status
  end
$$;

create or replace function public.mm_save_mentee_profile(
  p_field text, p_goals text, p_skills text, p_experience text,
  p_languages text, p_availability text, p_interests text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_existing public.matching_status; v_complete boolean; v_id uuid;
begin
  if public.current_app_role() not in ('student_mentee', 'super_admin') then
    raise exception 'Only a student/mentee can create a mentee profile';
  end if;
  v_complete := coalesce(btrim(p_field),'') <> '' and coalesce(btrim(p_goals),'') <> ''
            and coalesce(btrim(p_skills),'') <> '' and coalesce(btrim(p_availability),'') <> ''
            and coalesce(btrim(p_languages),'') <> '';
  select status into v_existing from public.mentee_profiles where user_id = v_uid;
  insert into public.mentee_profiles (user_id, field, career_goals, skills, experience, languages, availability, interests, status)
  values (v_uid, p_field, p_goals, p_skills, p_experience, p_languages, p_availability, p_interests,
          public._mm_next_status(v_existing, v_complete))
  on conflict (user_id) do update set
    field=excluded.field, career_goals=excluded.career_goals, skills=excluded.skills,
    experience=excluded.experience, languages=excluded.languages, availability=excluded.availability,
    interests=excluded.interests, status=public._mm_next_status(mentee_profiles.status, v_complete)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.mm_save_mentor_profile(
  p_field text, p_goals text, p_skills text, p_experience text,
  p_languages text, p_availability text, p_interests text, p_capacity int
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_existing public.matching_status; v_complete boolean; v_id uuid;
begin
  if public.current_app_role() not in ('mentor', 'super_admin') then
    raise exception 'Only a mentor can create a mentor profile';
  end if;
  v_complete := coalesce(btrim(p_field),'') <> '' and coalesce(btrim(p_goals),'') <> ''
            and coalesce(btrim(p_skills),'') <> '' and coalesce(btrim(p_availability),'') <> ''
            and coalesce(btrim(p_languages),'') <> '' and coalesce(p_capacity,0) >= 1;
  select status into v_existing from public.mentor_profiles where user_id = v_uid;
  insert into public.mentor_profiles (user_id, field, career_goals, skills, experience, languages, availability, interests, capacity, status)
  values (v_uid, p_field, p_goals, p_skills, p_experience, p_languages, p_availability, p_interests, greatest(coalesce(p_capacity,1),1),
          public._mm_next_status(v_existing, v_complete))
  on conflict (user_id) do update set
    field=excluded.field, career_goals=excluded.career_goals, skills=excluded.skills,
    experience=excluded.experience, languages=excluded.languages, availability=excluded.availability,
    interests=excluded.interests, capacity=excluded.capacity,
    status=public._mm_next_status(mentor_profiles.status, v_complete)
  returning id into v_id;
  return v_id;
end $$;

-- 6. Mentor verification gate (staff) -----------------------------------------
create or replace function public.mm_verify_mentor(p_mentor uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.app_is_staff() then raise exception 'Not authorized'; end if;
  update public.mentor_profiles set verified = true, verified_by = auth.uid() where id = p_mentor;
  if not found then raise exception 'Mentor not found'; end if;
end $$;

-- 7. Recommend (staff): writes the match + per-criterion scores ----------------
create or replace function public.mm_recommend(p_mentee uuid, p_mentor uuid, p_scores jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_match uuid; v_verified boolean;
begin
  if not public.app_is_staff() then raise exception 'Not authorized'; end if;

  -- MENTOR VERIFICATION GATE (§4.3) — the single flagged check.
  if public.mm_require_mentor_verification() then
    select verified into v_verified from public.mentor_profiles where id = p_mentor;
    if v_verified is null then raise exception 'Mentor not found'; end if;
    if not v_verified then raise exception 'This mentor is not verified yet and cannot be matched'; end if;
  end if;

  if exists (select 1 from public.matches where mentee_id = p_mentee and status in ('recommended','connected','active')) then
    raise exception 'This mentee already has an active recommendation or match';
  end if;

  insert into public.matches (mentor_id, mentee_id, status, match_score, recommended_at)
  values (
    p_mentor, p_mentee, 'recommended',
    (select round(sum((e->>'score')::numeric * (e->>'weight')::numeric) / nullif(sum((e->>'weight')::numeric), 0), 3)
       from jsonb_array_elements(p_scores) e),
    now()
  )
  returning id into v_match;

  insert into public.match_criteria_scores (match_id, criterion, score, weight)
  select v_match, (e->>'criterion')::public.match_criterion, (e->>'score')::numeric, (e->>'weight')::int
  from jsonb_array_elements(p_scores) e;

  update public.mentee_profiles set status = 'recommended' where id = p_mentee;
  return v_match;
end $$;

-- 8. Accept / decline (mentee owner or staff) ----------------------------------
create or replace function public._mm_is_participant(p_match uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    join public.mentee_profiles me on me.id = m.mentee_id
    join public.mentor_profiles mo on mo.id = m.mentor_id
    where m.id = p_match and (me.user_id = auth.uid() or mo.user_id = auth.uid())
  )
$$;

create or replace function public.mm_accept(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_status public.match_status; v_mentee uuid; v_mentor uuid; v_mentee_uid uuid;
begin
  select status, mentee_id, mentor_id into v_status, v_mentee, v_mentor from public.matches where id = p_match for update;
  if v_status is null then raise exception 'Match not found'; end if;
  select user_id into v_mentee_uid from public.mentee_profiles where id = v_mentee;
  if not (public.app_is_staff() or v_mentee_uid = auth.uid()) then raise exception 'Only the mentee can accept'; end if;
  if v_status <> 'recommended' then raise exception 'Can only accept a recommended match'; end if;
  update public.matches set status = 'connected', confirmed_at = now() where id = p_match;
  update public.mentee_profiles set status = 'connected' where id = v_mentee;
  update public.mentor_profiles set status = 'connected' where id = v_mentor;
end $$;

create or replace function public.mm_decline(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_status public.match_status; v_mentee uuid; v_mentee_uid uuid;
begin
  select status, mentee_id into v_status, v_mentee from public.matches where id = p_match for update;
  if v_status is null then raise exception 'Match not found'; end if;
  select user_id into v_mentee_uid from public.mentee_profiles where id = v_mentee;
  if not (public.app_is_staff() or v_mentee_uid = auth.uid()) then raise exception 'Only the mentee can decline'; end if;
  if v_status <> 'recommended' then raise exception 'Can only decline a recommended match'; end if;
  update public.matches set status = 'declined' where id = p_match;
  update public.mentee_profiles set status = 'ready_to_match' where id = v_mentee; -- back into the pool
end $$;

-- 9. Feedback (participant or staff); moves the match to Active / Monitoring ----
create or replace function public.mm_feedback(p_match uuid, p_rating int, p_comment text)
returns void language plpgsql security definer set search_path = public as $$
declare v_status public.match_status; v_mentee uuid; v_mentor uuid;
begin
  if not public._mm_is_participant(p_match) and not public.app_is_staff() then raise exception 'Not authorized'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1–5'; end if;
  select status, mentee_id, mentor_id into v_status, v_mentee, v_mentor from public.matches where id = p_match;
  if v_status not in ('connected','active') then raise exception 'Feedback is only for a confirmed match'; end if;
  insert into public.match_feedback (match_id, submitted_by, rating, comment) values (p_match, auth.uid(), p_rating, btrim(p_comment));
  update public.matches set status = 'active' where id = p_match;
  update public.mentee_profiles set status = 'active' where id = v_mentee;
  update public.mentor_profiles set status = 'active' where id = v_mentor;
end $$;

-- 10. Member read: my current match + counterpart details + criteria breakdown -
create or replace function public.mm_my_match()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_mentee uuid; v_mentor uuid; v_match record; v_i_am text; v_other_user uuid; v_result jsonb;
begin
  select id into v_mentee from public.mentee_profiles where user_id = v_uid;
  select id into v_mentor from public.mentor_profiles where user_id = v_uid;

  select * into v_match from public.matches
   where (v_mentee is not null and mentee_id = v_mentee) or (v_mentor is not null and mentor_id = v_mentor)
   order by recommended_at desc limit 1;
  if v_match.id is null then return null; end if;

  if v_mentee is not null and v_match.mentee_id = v_mentee then v_i_am := 'mentee';
  else v_i_am := 'mentor'; end if;

  select jsonb_build_object(
    'match_id', v_match.id,
    'status', v_match.status,
    'match_score', v_match.match_score,
    'i_am', v_i_am,
    'counterpart', case when v_i_am = 'mentee'
      then (select jsonb_build_object('name', coalesce(u.full_name, u.email), 'field', mo.field,
              'career_goals', mo.career_goals, 'skills', mo.skills, 'experience', mo.experience,
              'languages', mo.languages, 'availability', mo.availability, 'interests', mo.interests)
            from public.mentor_profiles mo join public.users u on u.id = mo.user_id where mo.id = v_match.mentor_id)
      else (select jsonb_build_object('name', coalesce(u.full_name, u.email), 'field', me.field,
              'career_goals', me.career_goals, 'skills', me.skills, 'experience', me.experience,
              'languages', me.languages, 'availability', me.availability, 'interests', me.interests)
            from public.mentee_profiles me join public.users u on u.id = me.user_id where me.id = v_match.mentee_id)
    end,
    'criteria', (select coalesce(jsonb_agg(jsonb_build_object('criterion', criterion, 'score', score, 'weight', weight) order by weight desc), '[]'::jsonb)
                 from public.match_criteria_scores where match_id = v_match.id)
  ) into v_result;
  return v_result;
end $$;

-- 11. Grants (each RPC self-checks role/ownership) -----------------------------
grant select on public.mentor_profiles, public.mentee_profiles, public.matches,
  public.match_criteria_scores, public.match_feedback to authenticated;

grant execute on function
  public.mm_save_mentee_profile(text, text, text, text, text, text, text),
  public.mm_save_mentor_profile(text, text, text, text, text, text, text, int),
  public.mm_verify_mentor(uuid),
  public.mm_recommend(uuid, uuid, jsonb),
  public.mm_accept(uuid),
  public.mm_decline(uuid),
  public.mm_feedback(uuid, int, text),
  public.mm_my_match()
to authenticated;
