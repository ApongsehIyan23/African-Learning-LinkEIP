-- ============================================================================
-- African Learning Link — Phase 5 demo seed (realistic ALL-domain examples)
-- Run in the SQL Editor AFTER you have at least one account. Safe to re-run
-- (guarded on a marker title so it won't duplicate).
--
-- Seeds a spread of opportunities across the lifecycle (received → published)
-- so the Dashboard metrics, pipeline and the student listing all have content.
-- Mentor/mentee demo data needs real signups (use the name+role@ aliases).
-- ============================================================================

do $$
declare v_sub uuid;
begin
  -- Attach the opportunities to a submitter (fall back to any account).
  select id into v_sub from public.users
   order by case role when 'submitter' then 0 when 'super_admin' then 1 else 2 end, created_at
   limit 1;
  if v_sub is null then
    raise exception 'No users exist yet — sign up at least one account first.';
  end if;

  if exists (select 1 from public.opportunities where title = 'Mastercard Foundation Scholars Program 2026') then
    raise notice 'Demo opportunities already seeded — skipping.';
    return;
  end if;

  insert into public.opportunities
    (title, provider, type, source_link, deadline, eligibility, summary, geo_restrictions,
     application_link, submitted_by, source_method, current_status, publication_date, date_received)
  values
    ('Mastercard Foundation Scholars Program 2026', 'Mastercard Foundation', 'scholarship',
     'https://mastercardfdn.org', current_date + 90,
     'Academically talented young Africans with demonstrated financial need.',
     'A comprehensive scholarship covering tuition, accommodation, books and living costs for undergraduate and postgraduate study at partner universities.',
     'Pan-African', 'https://mastercardfdn.org/apply', v_sub, 'manual', 'published', current_date - 4, current_date - 12),

    ('DAAD EPOS Development-Related Postgraduate Scholarships', 'DAAD', 'scholarship',
     'https://daad.de', current_date + 45,
     'Graduates from development countries with at least two years of professional experience.',
     'Funds a Master''s or PhD in a development-related subject in Germany, including a monthly stipend, travel and health insurance.',
     'Africa; development countries', 'https://daad.de/apply', v_sub, 'manual', 'published', current_date - 2, current_date - 9),

    ('Google Africa Developer Scholarship 2026', 'Google', 'course',
     'https://developers.google.com', current_date + 30,
     'Aspiring developers across Africa; no prior degree required.',
     'A fully funded learning track in web, Android or cloud development with mentorship and certification.',
     'Africa', 'https://developers.google.com/africa', v_sub, 'manual', 'published', current_date - 1, current_date - 6),

    ('Tony Elumelu Foundation Entrepreneurship Programme', 'Tony Elumelu Foundation', 'fellowship',
     'https://tonyelumelufoundation.org', current_date + 20,
     'Early-stage African entrepreneurs with a scalable business idea.',
     'A seed-capital fellowship offering USD 5,000 non-refundable funding, training and mentorship for African startups.',
     'Pan-African', 'https://tonyelumelufoundation.org/apply', v_sub, 'manual', 'approved_for_publication', null, current_date - 5),

    ('Andela Technical Leadership Fellowship', 'Andela', 'fellowship',
     'https://andela.com', current_date + 60,
     'Senior engineers ready to grow into technical leadership roles.',
     'A structured fellowship pairing senior engineers with global teams to build leadership and delivery skills.',
     'Africa; remote', 'https://andela.com/fellowship', v_sub, 'manual', 'verification_in_progress', null, current_date - 3),

    ('UNICEF Innovation Internship 2026', 'UNICEF', 'internship',
     'https://unicef.org', current_date + 25,
     'Students and recent graduates in tech, design or public health.',
     'A paid internship working on technology-for-good projects with UNICEF''s innovation unit.',
     'Global; Africa priority', 'https://unicef.org/careers', v_sub, 'manual', 'under_review', null, current_date - 2),

    ('AfDB Young Professionals Program', 'African Development Bank', 'job',
     'https://afdb.org', current_date + 40,
     'Graduates under 32 with a Master''s degree and relevant experience.',
     'A two-year rotational program launching careers in development finance at the African Development Bank.',
     'Pan-African', 'https://afdb.org/ypp', v_sub, 'manual', 'received', null, current_date);

  raise notice 'Seeded 7 demo opportunities (submitted_by %).', v_sub;
end $$;
