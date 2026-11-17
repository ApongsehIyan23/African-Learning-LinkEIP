# African Learning Link (ALL) — MVP Build Prompts

> **How to use this file.** These are the prompts you paste into Claude Code, **one at a time, in order**. Do not paste the whole file at once, and do not paste the next prompt until the current phase's checkpoint has been tested and passes. Each prompt assumes Claude Code has already read `ALL_MVP_CONTEXT.md`. The first prompt below tells it to read that file and then stop.
>
> **Token discipline:** paste only the prompt for the phase you are starting. Each prompt ends by asking Claude Code to stop at the checkpoint and wait for you to test, so it does not run ahead into the next phase and spend credits.
>
> **Setup help is built in:** every prompt instructs Claude Code to check whether you already have the tools, accounts, and API keys that phase needs, and to walk you through getting any you are missing, one step at a time, before it writes code that depends on them.

---

## Prompt 0 — Orientation (paste first, builds nothing)

```
Read the file ALL_MVP_CONTEXT.md in full. It is the complete blueprint for the
African Learning Link (ALL) MVP: the users, the SOP-driven workflows, the database
schema, the architecture, the stack, and the phased build plan.

Do NOT write, scaffold, generate, or run any code yet. Do not create files.

After reading, reply with:
1. A short confirmation that you understand the system in your own words (no more
   than one paragraph).
2. The list of the five user roles and the one flagged gap (mentor verification).
3. The phase plan as you understand it, and a note that each phase must be tested
   and confirmed before the next begins.
4. Any point in the blueprint you find ambiguous or contradictory, as questions.

Then stop and wait. I will give you the Phase 0 prompt when I am ready.
```

---

## Prompt 1 — Phase 0: Foundation

```
We are starting Phase 0 (Foundation) from ALL_MVP_CONTEXT.md. Goal: a running,
deployed empty app. No features yet.

First, SETUP CHECK. Before writing any code, check what I already have and walk me
through anything I am missing, one step at a time, waiting for me after each step:
- Node.js and npm installed (tell me how to check, and how to install if missing).
- A GitHub account and git configured locally.
- A Supabase account and a new Supabase project (guide me through creating it, and
  tell me exactly which values to copy: the project URL and the anon public key).
- A Vercel account connected to my GitHub.
Do not proceed to code until I confirm each of these is ready.

Then build Phase 0 only:
- A React + Vite + Tailwind CSS project.
- React Router with placeholder routes for the main sections.
- The Supabase client initialized from environment variables (never hardcode keys).
- A single page that loads and confirms the Supabase connection works.
- A GitHub repo, and Vercel deployment from it.

Make the base layout responsive from the start (mobile, tablet, desktop).

CHECKPOINT: the empty app loads at a public Vercel URL, and the local-to-GitHub-to-
Vercel deploy pipeline works. When you reach this, STOP. Tell me exactly how to test
it myself. Do not start Phase 1. I will test, then give you the next prompt.
```

---

## Prompt 2 — Phase 1: Auth and roles

```
Phase 0 is tested and passing. We are starting Phase 1 (Auth and roles) from
ALL_MVP_CONTEXT.md.

SETUP CHECK first: confirm the Supabase project has email auth available, and guide
me through enabling magic-link (email) sign-in in the Supabase dashboard if it is not
already on. Wait for my confirmation.

Then build Phase 1 only:
- The `users` table per the schema (Section 8.1), with the five-value role enum.
- Magic-link login and logout.
- On first login, a user profile row linked to the auth user.
- Role-based route protection: each role reaches only its allowed areas (Section 4).
- A way for me to seed a Super Admin account (Deng) for testing.
- Keep every screen responsive (mobile, tablet, desktop).

Enforce permissions with Supabase row-level security, not just UI hiding.

CHECKPOINT: a Super Admin logs in and reaches the admin console; a student logs in
and reaches the student view; a wrong-role user is blocked from a forbidden page; the
login screen works on all widths. When you reach this, STOP and tell me how to test
each case. Do not start Phase 2.
```

---

## Prompt 3 — Phase 2: Opportunity Verification Queue

```
Phase 1 is tested and passing. We are starting Phase 2 (Opportunity Verification
Queue, end to end) from ALL_MVP_CONTEXT.md.

No new external accounts needed. Build Phase 2 only:
- The opportunity tables: `opportunities`, `opportunity_criteria`, `opportunity_activity`
  (Section 8.2), with the 8-status enum and the criteria enum.
- The Verification Queue UI: table of opportunities, status lanes/filters, search.
- The detail drawer: register fields, the six criteria as pass/flag/fail with notes,
  verification notes, the activity log.
- The SOP lifecycle actions, each writing to the activity log.
- The two-step publish gate enforced IN THE DATABASE (Section 5.1): a Verification
  Lead can Approve but NOT Publish; only a Super Admin can Publish.
- Rejection requires a recorded reason (block it otherwise).
- Responsive on all widths.

Use the real statuses, criteria, and gate from the blueprint. Do not invent states.

CHECKPOINT: a Submitter logs an opportunity; a Verification Lead approves it; a Super
Admin publishes it; it moves through the real states; a Lead is blocked from
publishing; a reasonless rejection is refused; the log records each step; it works on
all widths. STOP and tell me how to test each case. Do not start Phase 2.5.
```

---

## Prompt 4 — Phase 2.5: AI discovery assist

```
Phase 2 is tested and passing. We are starting Phase 2.5 (AI discovery assist) from
ALL_MVP_CONTEXT.md. Read Section 6 carefully; the agent must never bypass the human
confirmation or any SOP gate.

SETUP CHECK first, one step at a time, waiting after each:
- A Tavily account and API key (guide me to tavily.com, confirm the free tier needs
  no credit card, tell me where to copy the key). 
- A Google AI Studio account and a Gemini API key (guide me through aistudio.google.com,
  confirm free tier, where to copy the key).
- Guide me through storing BOTH keys as Supabase Edge Function secrets, never in the
  frontend and never committed to git.
Do not write agent code until both keys are set as secrets and I confirm.

Then build Phase 2.5 only:
- The `trusted_sources` table (Section 8.4), seeded with the listed domains.
- The `search_cache` table with 24-hour expiry.
- ONE Supabase Edge Function that: takes the submitter's parameters, calls Tavily with
  `include_domains` set to the active trusted sources, passes results to Gemini with a
  strict prompt (output only opportunities present in the results, always include real
  deadline, eligibility, and direct URL, never invent links), and returns clean
  candidates. Check the cache first; store results after.
- A "Find with AI" UI in the submitter dashboard: parameter form, results list,
  review, and a confirm action that writes chosen items to the queue at Received,
  tagged source_method = ai_agent, with the confirmation written to the activity log.
- Responsive on all widths.

The agent only creates items at Received, only after my confirmation. It never
verifies, approves, or publishes.

CHECKPOINT: a search returns real results from trusted portals only; I confirm a
couple; they appear in the queue at Received tagged AI-sourced, with the confirmation
logged; manual entry still works too; responsive on all widths. STOP and tell me how
to test. Do not start Phase 3.
```

---

## Prompt 5 — Phase 3: Student-facing opportunities

```
Phase 2.5 is tested and passing. We are starting Phase 3 (Student-facing
opportunities) from ALL_MVP_CONTEXT.md.

No new accounts needed. Build Phase 3 only:
- The student opportunity listing: only PUBLISHED opportunities are visible.
- Search and filter (by type, field, geography).
- The external application link.
- Row-level security must guarantee a student can never read unpublished, on-hold, or
  rejected items, not even via a crafted request.
- Responsive on all widths.

CHECKPOINT: an opportunity published in Phase 2 appears on the student's screen;
nothing unpublished leaks; search and filter work; responsive on all widths. STOP and
tell me how to test, including how to confirm the leak-proofing. Do not start Phase 4.
```

---

## Prompt 6 — Phase 4: Mentor Matching

```
Phase 3 is tested and passing. We are starting Phase 4 (Mentor Matching, end to end)
from ALL_MVP_CONTEXT.md. Read Sections 5.4-5.6 and the flagged gap in 4.3.

No new accounts needed. Build Phase 4 only:
- The tables: `mentor_profiles`, `mentee_profiles`, `matches`, `match_criteria_scores`,
  `match_feedback` (Section 8.3), with the 8-state matching enum.
- Mentor and mentee registration and profiles with the SOP step-3 fields.
- The six-criteria weighted scoring (High x2, Medium x1) as the proposed default;
  store per-criterion scores so the total is derivable.
- The matching flow: search, compare, recommend, accept or decline, confirm and
  schedule, feedback, following the matching lifecycle states.
- The mentor verification gate (flagged addition): an unverified mentor cannot enter
  the matchable pool; a staff role verifies them. Keep this clearly labeled so it can
  be toggled if Lajik declines it.
- Responsive on all widths.

CHECKPOINT: a mentee registers, gets a ranked recommendation, accepts; the connection
is confirmed; an unverified mentor cannot be matched until verified; the per-criterion
breakdown shows; responsive on all widths. STOP and tell me how to test each case. Do
not start Phase 5.
```

---

## Prompt 7 — Phase 5: Dashboard, realtime, polish

```
Phase 4 is tested and passing. We are starting Phase 5 (Dashboard, realtime, polish),
the final MVP phase, from ALL_MVP_CONTEXT.md. Read Section 7 on realtime.

SETUP CHECK: confirm Supabase Realtime is enabled for the relevant tables, and guide
me through turning it on in the dashboard if needed. Wait for confirmation.

Then build Phase 5 only:
- Dashboard metrics computed live from the database (queue counts, published active,
  on hold, average verification turnaround), not hardcoded.
- Supabase Realtime wired across dashboards:
  - publishing an opportunity makes it appear on a student's listing live;
  - confirming a match makes the mentor appear on the mentee's dashboard live;
  - admin counters update as items change state.
  Realtime must respect row-level security (a student's live feed carries only
  published items).
- Demo seed data across both workflows using realistic ALL-domain examples.
- A final responsive pass on every screen (phone, tablet, desktop).

CHECKPOINT: dashboard numbers are live; a publish shows up on a student screen live; a
confirmed match shows up on the mentee's dashboard live; the whole app holds up on a
phone. STOP and tell me how to test each live behavior. This completes the MVP.
```

---

## After the MVP

Once all phases pass, ask Claude Code to produce a short README covering: how to run
the project locally, the environment variables needed, how to wake the Supabase
project before a demo, and the known free-tier limits (Tavily monthly credits,
Supabase realtime connection cap, project pausing after inactivity). Keep the
out-of-scope items (analytics funnels, autonomous agent, full institutional
workflows) listed as the post-MVP roadmap.
