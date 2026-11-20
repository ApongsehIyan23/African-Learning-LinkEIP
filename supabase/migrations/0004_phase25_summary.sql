-- ============================================================================
-- African Learning Link — Phase 2.5 follow-up: distinct Summary vs Eligibility
-- Run ONCE in the Supabase SQL Editor (after 0003). Idempotent.
--
-- "summary"     = WHAT the opportunity is / what it offers.
-- "eligibility" = WHO can apply (already exists).
-- Two separate fields so neither is crammed into the other.
-- ============================================================================

alter table public.opportunities
  add column if not exists summary text;

comment on column public.opportunities.summary is
  'Short "what it is / what it offers" summary, distinct from eligibility (who can apply). Phase 2.5.';

-- Extend the edit RPC so a submitter/super admin can also edit the summary.
-- (Drop the old 9-arg version first; this adds p_summary, making it 10 args.)
drop function if exists public.opp_update_fields(
  uuid, text, text, public.opportunity_type, text, date, text, text, text);

create or replace function public.opp_update_fields(
  p_opp uuid, p_title text, p_provider text, p_type public.opportunity_type,
  p_source_link text, p_deadline date, p_summary text, p_eligibility text,
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
         source_link = p_source_link, deadline = p_deadline,
         summary = p_summary, eligibility = p_eligibility,
         application_link = p_application_link, geo_restrictions = p_geo
   where id = p_opp;
  insert into public.opportunity_activity (opportunity_id, actor_id, action, note)
  values (p_opp, auth.uid(), 'edited', 'Register fields updated');
end $$;

grant execute on function public.opp_update_fields(
  uuid, text, text, public.opportunity_type, text, date, text, text, text, text
) to authenticated;
