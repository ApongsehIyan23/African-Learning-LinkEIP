-- ============================================================================
-- Seed the Super Admin (Deng) and optional test staff accounts.
--
-- ORDER MATTERS:
--   1. First, SIGN IN once with each email via the app's magic-link login.
--      That auto-creates the profile row (as 'student_mentee').
--   2. THEN run the relevant UPDATE below to promote the role.
--   3. Back in the app, REFRESH the page to pick up the new role.
--
-- Run in: Supabase Dashboard → SQL Editor. (auth.uid() is null here, so the
-- role-change guard treats this as a trusted backend action and allows it.)
-- Change the email addresses to the ones you actually logged in with.
-- ============================================================================

-- Super Admin (Deng)
update public.users
set role = 'super_admin',
    full_name = 'Deng (Super Admin)'
where email = 'apongsehiyan23+admin@gmail.com';

-- Optional: a Verification Lead (handy for Phase 2's two-step publish gate)
-- update public.users
-- set role = 'verification_lead', full_name = 'Verification Lead'
-- where email = 'apongsehiyan23+lead@gmail.com';

-- Optional: a Submitter
-- update public.users
-- set role = 'submitter', full_name = 'Submitter'
-- where email = 'apongsehiyan23+submitter@gmail.com';

-- Verify:
-- select email, role, full_name from public.users order by created_at;
