-- ============================================================================
-- African Learning Link — Phase 1: Auth & Roles
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent: safe to re-run.
-- ============================================================================

-- 1. Five-value role enum (ALL_MVP_CONTEXT.md §4, §8.1) --------------------------
do $$
begin
  create type public.user_role as enum (
    'super_admin',
    'verification_lead',
    'submitter',
    'student_mentee',
    'mentor'
  );
exception
  when duplicate_object then null;
end
$$;

-- 2. users profile table (1:1 with auth.users), §8.1 ----------------------------
create table if not exists public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       public.user_role not null default 'student_mentee',
  created_at timestamptz not null default now()
);

-- 3. SECURITY DEFINER helpers --------------------------------------------------
-- These run as the function owner (bypassing RLS), so policies that call them
-- never recurse back into the users table's own RLS.

create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- 4. Auto-create a profile row on first login (§ "On first login...") ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'student_mentee'            -- safe default; staff/mentor roles are assigned later
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Guard against role self-escalation ----------------------------------------
-- A normal signed-in user can edit their own profile but CANNOT change their
-- role. Only a super_admin (or a trusted backend / the SQL editor, where
-- auth.uid() is null) may change a role.
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_super_admin() then
      raise exception 'Only a super_admin may change a user role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_users_role on public.users;
create trigger guard_users_role
  before update on public.users
  for each row execute function public.guard_role_change();

-- 6. Row-Level Security --------------------------------------------------------
alter table public.users enable row level security;

-- Read your own profile.
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (id = auth.uid());

-- A super_admin can read every profile.
drop policy if exists users_select_admin on public.users;
create policy users_select_admin on public.users
  for select using (public.is_super_admin());

-- Update your own profile (role change still blocked by the trigger above).
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- A super_admin can update any profile (including roles).
drop policy if exists users_update_admin on public.users;
create policy users_update_admin on public.users
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- NOTE: there are deliberately NO client insert/delete policies.
--  - Inserts happen only via the signup trigger (security definer).
--  - Deletes cascade from auth.users.
-- With RLS on and no matching policy, direct client inserts/deletes are denied.
