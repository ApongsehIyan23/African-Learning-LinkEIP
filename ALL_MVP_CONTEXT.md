# African Learning Link (ALL) — MVP Context & Architecture Blueprint

> **What this file is:** the single source of truth for the ALL MVP. It describes the system, the decisions behind it, the users, the database, the architecture, and the build plan. It is **reference only**. It does not instruct Claude Code to build, generate, scaffold, or run anything. Building is driven separately, one phase at a time, from the companion prompts file. Read this to understand the system; wait for a prompt before writing code.

---

## 1. Engagement background

African Learning Link (ALL) is a pan-African e-learning and mentorship platform by Lajik Tech Ltd. It publishes educational and career opportunities (scholarships, courses, internships, jobs, fellowships) and connects mentees with mentors. This MVP is built during a 10-week consulting engagement.

**The core problem (from the case document):** as ALL grew past its first 34+ users, operations ran on manual review: opportunities verified and published by hand, mentor matching done off-platform over WhatsApp and email, and no live view of engagement. Manual operations do not scale. The MVP systematizes the two workflows that have documented SOPs: opportunity verification, and mentor-mentee matching.

**Prototype already built (the starting point):** a clickable HTML/CSS/JS admin console with a Dashboard, an opportunity Verification Queue, and a Mentor Matching screen. It is responsive and uses in-memory data that resets on refresh. The MVP keeps this exact SOP logic but makes it real: persistent database, real accounts and roles, live updates, and a working AI discovery assist. The MVP is a rebuild in a real stack, not an extension of the static prototype, but every status, criterion, and gate below is already proven in that prototype.

---

## 2. Source-of-truth documents

Three documents govern every decision. Where this blueprint maps a feature to a rule, the citation points here.

- **Case Template** — the problem, the four core user groups, the expected outcomes.
- **Opportunity Verification & Publication SOP** — the opportunity lifecycle, the six verification criteria, the two-step approval gate, the register fields, the audit requirement.
- **Mentor-Mentee Matching Workflow SOP** — the matching lifecycle, the six matching criteria and their priorities, the accept/decline/confirm/feedback flow.

**Rule for all development:** every status state, form field, validation rule, and approval step must trace back to one of these. Do not invent business logic. Where a document is silent (noted below), the gap is flagged, not filled by guessing.

---

## 3. Guiding constraints

- **Free and minimal-setup only.** Every tool, service, and tier must be free and require no credit card. No paid hosting, no card-for-verification services.
- **Phased development with testing gates.** Build in milestones. Each milestone is a working checkpoint. **Test and confirm a phase works before starting the next.** A phase that fails its checkpoint is fixed before moving on, never built past.
- **Responsive on every interface.** The application must work and read well on mobile phones, tablets, laptops, and desktops. This is a requirement of every UI phase, not a final polish step. Every screen is checked at phone, tablet, and desktop widths before its phase passes.
- **Human authority is never bypassed.** Automation (the AI agent) assists; it never publishes, approves, or verifies on its own. Every public-facing action has a human gate behind it.

---

## 4. User roles, permissions, and actions

Five roles. Universities and employers are not separate workflows; they are submitter accounts, because their only action is to add opportunities that then go through the same verification queue.

### 4.1 Staff / operational roles

**Super Admin** (e.g. Deng)
- Can: everything. Final publish sign-off on opportunities (SOP 4.5). Confirm mentor verification. Manage users and roles. Manage the trusted-source list for the AI agent. See all queues, matches, and dashboard metrics.
- Cannot: nothing restricted. Top role.

**Verification Lead**
- Can: run the six-criteria check, approve an opportunity for publication, place on hold, reject with a recorded reason. Review and verify mentor applications.
- Cannot: give final publish sign-off (that is the second half of the two-step gate, Super Admin only).

**Submitter** (covers internal researchers, universities, and employers)
- Can: log new opportunities into the register manually (SOP 4.2). Use the AI discovery assist to find and confirm opportunities into the queue. Edit items still in Received or Under Review. Respond to "Awaiting Additional Information" holds on their own items. View the status of what they submitted.
- Cannot: approve, publish, or reject. Cannot touch an item once it has moved past initial screening into verification. Cannot see other submitters' private data beyond the shared queue.
- Note: a submitter account may carry an attached institution (a university or employer organization) for display and filtering. The permission is identical regardless of institution.

### 4.2 Platform user roles

**Student / Mentee** (one account, two capacities)
- Can: browse and search **published** opportunities. Open the external application link. Register as a mentee, build a mentee profile, receive and accept or decline a mentor recommendation, give session feedback.
- Cannot: see unpublished, on-hold, or rejected opportunities. See any admin queue. See other users' profiles.

**Mentor**
- Can: register, build a mentor profile including capacity, get matched, accept or decline a mentee, hold sessions, give feedback.
- Cannot: enter the matchable pool until verified by staff (see flagged gap, 4.3). See any admin queue or other mentors' mentees.

### 4.3 Flagged gap (raise with Lajik, do not silently fill)

The Matching SOP sends a mentor from registration straight into matching with **no verification step**. A mentor is a trust gate like an opportunity: a person ALL puts in front of students. The MVP therefore includes a mentor verification checkpoint before a mentor becomes matchable, implemented but clearly labeled as an addition proposed for Lajik's confirmation, consistent with how the Opportunity SOP gates every public action. If Lajik declines it, the gate is a single flag to flip, not a redesign.

---

## 5. SOP-to-feature mapping

### 5.1 Opportunity verification lifecycle (8 states, SOP 7.2)

| State | SOP step | Meaning |
|---|---|---|
| Received | 4.2 | Logged into the register (manually or via AI agent, confirmed) |
| Under Review | 4.3 | Initial screening for relevance and sufficiency |
| Verification in Progress | 4.4 | Running the six-criteria check |
| Awaiting Additional Information | 6.2 / 6.3 | Returned to submitter or issuer for clarification |
| Approved for Publication | 4.5 | Verification Lead approved; awaiting final sign-off |
| Published | 4.5 | Super Admin published; live to students |
| Rejected | 6.4 | Failed criteria; reason recorded (required) |
| Expired or Closed | 6.5 | Deadline passed; pulled from active listings |

**Two-step publish gate (SOP 4.5):** "Approved for Publication" and "Published" are separate and are reached by different roles. A Verification Lead approves; only a Super Admin publishes. This is enforced in the database, not just hidden in the UI.

### 5.2 Six verification criteria (SOP Section 5)

Each opportunity is checked on: Authenticity (5.1), Accuracy (5.2), Relevance (5.3), Accessibility (5.4), Completeness (5.5), Timeliness (5.6), plus Paid-opportunity scrutiny (5.7) for any opportunity that asks applicants for money. Each criterion is recorded as pass / flag / fail with a note and who checked it.

### 5.3 Opportunity register fields (SOP 4.2 / 7.1)

title, provider, type, source link, deadline, eligibility, application link, geographic restrictions, date received, submitted by, verification notes, approval decision, publication date, status. Plus how it entered: manual or AI agent.

### 5.4 Matching lifecycle (8 states, Matching SOP step sequence)

Registered → Profile Incomplete (completeness decision, No branch) → Ready to Match → Searching (no suitable match yet) → Recommended → Declined (loops back to search) → Connected / Scheduled → Active / Monitoring (feedback collected).

### 5.5 Six matching criteria with SOP priorities (Matching SOP Section 2)

| Criterion | Priority |
|---|---|
| Career goals | High |
| Relevant skills & experience | High |
| Availability | High |
| Industry or field | Medium |
| Interests & mentoring preferences | Medium |
| Language | Medium |

**Scoring:** a transparent weighted score, High criteria weighted x2 against Medium x1, is a **proposed default**. The SOP explicitly states the exact scoring method is to be agreed with Lajik (SOP note 4). The per-criterion scores are stored so the total is always derivable and the method can change without data loss.

### 5.6 Matching profile fields (Matching SOP step 3)

role, field, career goals, skills, experience, languages, availability, interests. Mentors additionally have capacity and verification status.

---

## 6. AI discovery assist

An assistive agent that helps a submitter find opportunities faster. It does not replace manual entry and does not bypass any SOP gate.

**Principle:** the agent does discovery; the human keeps authority. The agent can only ever create items at the first status (Received), after explicit human confirmation. It never touches verification, approval, or publishing.

**Domain-restricted search.** The agent searches only a curated allowlist of trusted opportunity portals, never the open web. This means results arrive from sources that already satisfy the Authenticity criterion (5.1), so the agent does a first pass on the hardest criterion automatically. The allowlist is stored in a table so the Super Admin can edit it without a code change.

**Flow:** submitter opens "Find with AI" in their dashboard → sets parameters (type, field, geography, keywords) → the agent searches trusted domains → returns candidates with deadline, eligibility, and the real application URL taken from the search payload → submitter reviews → on confirmation, chosen items are written to the queue at "Received", tagged as AI-sourced, with the confirmation recorded in the activity log. From there they are ordinary opportunities and go through full verification.

**Stack for the agent (all free, no card):**
- **Tavily** for search, chosen for its `include_domains` filter which enforces the allowlist cleanly. Free tier, no credit card.
- **Google Gemini 2.5 Flash** via Google AI Studio for query generation and formatting, with function calling. Free tier.
- **One Supabase Edge Function** hosts the agent logic and holds the API keys as secrets. No separate backend server, no new hosting account.
- **A cache table** keyed by query with 24-hour expiry, so repeated searches do not burn free credits.

**Caveats to respect:**
- Free search credits are finite (Tavily ~1,000/month). One real search per confirmed batch, plus the 24-hour cache, keeps usage well within the free tier. Worth watching before a demo day.
- Brave Search is deliberately avoided because it requires a card for verification. Tavily needs no card. Serper is the documented fallback if Tavily's free tier ever changes.
- The strict system prompt instructs the LLM to output only opportunities present in the search results, always with the real deadline, eligibility, and direct URL, so it never invents links.

---

## 7. Real-time behavior

The application updates live across dashboards without manual refresh. This is a core MVP requirement, not an enhancement.

**Mechanism:** Supabase Realtime, built into the chosen backend on the free tier. It streams Postgres changes to subscribed clients over a managed websocket. No separate socket server is built or hosted.

**Required live behaviors:**
- When an opportunity becomes Published, it appears on students' opportunity listings immediately.
- When a match is confirmed, the mentee sees the matched mentor on their dashboard immediately, and vice versa.
- Admin queue counters and dashboard metrics update as items move between states.

**Security:** row-level security governs the realtime stream exactly as it governs normal reads. A student's live feed carries only published opportunities, never queue contents. The same rule secures both; it is not secured twice.

**Free-tier limit to note:** concurrent realtime connections are capped in the low hundreds on the free tier. Irrelevant for an MVP and demo; a scale-roadmap line item, not an MVP concern.

---

## 8. Database schema (normalized, 3NF)

Design rule: no repeating groups; every non-key column depends on the whole key and nothing but the key. Criteria and audit events are their own rows, not columns on a parent. Lookup values (status, type, role, criterion) are constrained enums. Derived values (match total) are not stored as the source of truth.

### 8.1 Users and organizations

**users** — one row per account (profile, linked to the auth system by id)
- id (PK), email, full_name, role (enum: super_admin, verification_lead, submitter, student_mentee, mentor), created_at

**institutions** — universities and employers as organizations
- id (PK), name, type (enum: university, employer), contact_user_id (FK users), created_at

### 8.2 Opportunity side

**opportunities** — the register (SOP 4.2 / 7.1)
- id (PK), title, provider, type (enum: scholarship, course, internship, job, fellowship), source_link, deadline, eligibility, application_link, geo_restrictions, date_received, submitted_by (FK users), institution_id (FK institutions, nullable), source_method (enum: manual, ai_agent), current_status (enum: the 8 states), publication_date (nullable), created_at

**opportunity_criteria** — one row per criterion per opportunity (SOP Section 5)
- id (PK), opportunity_id (FK), criterion (enum: authenticity, accuracy, relevance, accessibility, completeness, timeliness, paid_scrutiny), result (enum: pass, flag, fail, unchecked), note, checked_by (FK users), checked_at
- Unique (opportunity_id, criterion)

**opportunity_activity** — the audit log (SOP 6.4 traceability)
- id (PK), opportunity_id (FK), actor_id (FK users), action, note, created_at

### 8.3 Mentor matching side

**mentor_profiles** — one row per mentor
- id (PK), user_id (FK users, unique), field, career_goals, skills, experience, languages, availability, interests, capacity (int), verified (bool), verified_by (FK users, nullable), status (enum: the 8 matching states), created_at

**mentee_profiles** — one row per mentee
- id (PK), user_id (FK users, unique), field, career_goals, skills, experience, languages, availability, interests, status (enum: the 8 matching states), created_at

**matches** — one row per pairing
- id (PK), mentor_id (FK mentor_profiles), mentee_id (FK mentee_profiles), status (enum: recommended, declined, connected, active), match_score (cached convenience; truth is in match_criteria_scores), recommended_at, confirmed_at (nullable)

**match_criteria_scores** — one row per criterion per match (Matching SOP Section 2)
- id (PK), match_id (FK), criterion (enum: goals, skills, availability, field, interests, language), score (0..1), weight

**match_feedback** — one row per feedback submission (Matching SOP step 8)
- id (PK), match_id (FK), submitted_by (FK users), rating, comment, created_at

### 8.4 AI agent support

**trusted_sources** — the agent's domain allowlist
- id (PK), domain, name, added_by (FK users), active (bool)
- Seed: opportunitydesk.org, opportunitiesforafricans.com, afterschoolafrica.com, mastercardfdn.org, chevening.org, daad.de, andela.com, tonyelumelufoundation.org

**search_cache** — 24-hour cache to conserve free API credits
- id (PK), query_key, results (json), created_at, expires_at

### 8.5 Why this is 3NF (summary)

- Verification criteria and match criteria are in their own tables, so nothing repeats inside a parent row.
- The activity log is separate, so an opportunity's current status is a single value and its history is rows elsewhere.
- Match totals are derivable from match_criteria_scores; match_score is a cached convenience only, and can be dropped for strict normalization without losing data.
- Institutions are split from users, so organization attributes do not depend on a person.
- Every status, type, role, and criterion is a constrained enum, removing transitive dependencies through free text.

---

## 9. Software architecture

**Pattern:** a Backend-as-a-Service architecture. The client talks directly to a managed backend; there is no separately built or hosted application server. This is deliberate, to stay free and minimal-setup within the engagement timeline.

**The three layers and how they communicate:**

- **Front-end (client-side):** a React single-page application, served as static files. It renders the role-specific dashboards and talks to the backend over HTTPS using the backend's client SDK. It subscribes to Realtime channels for live updates.
- **Back-end (server-side):** Supabase. Provides authentication, auto-generated data APIs, row-level security (the permission engine that enforces the SOP gates), Realtime, and one Edge Function for the AI agent (the only custom server-side code, needed because API keys must not live in the browser).
- **Database:** PostgreSQL, managed inside Supabase. Holds the schema in Section 8.

**Data flow:** the React app authenticates a user and receives a session. Every data request carries that session, so row-level security decides what the user may read and do. Writes that must obey a gate (publish, reject, mentor-verify) are constrained by database policy, so no crafted request can skip a step the UI appears to forbid. Published-opportunity reads and confirmed-match reads also flow over Realtime subscriptions, filtered by the same security rules.

---

## 10. Technology stack (all free, no credit card)

| Layer | Choice | Why |
|---|---|---|
| Front-end framework | React + Vite | Prototype is already component-shaped; Vite is the fastest zero-config start |
| Styling | Tailwind CSS | Ports the existing CSS-variable design system; utility-first, responsive by default |
| Routing | React Router | Nav across Dashboard, Verification Queue, Mentor Matching, and user views |
| Backend platform | Supabase | Auth, auto APIs, row-level security, Realtime, Edge Functions, all free tier |
| Database | PostgreSQL (via Supabase) | Included; real relational database for a 3NF schema |
| AI search | Tavily | `include_domains` enforces the trusted allowlist; free, no card |
| AI LLM | Google Gemini 2.5 Flash (AI Studio) | Free tier, function calling for the search tool |
| Agent host | Supabase Edge Function | Keeps keys secret without a separate backend host |
| Frontend hosting | Vercel | Free, deploys from GitHub on push, gives a shareable live URL |
| Source control | GitHub | Required for Claude Code and for Vercel deploys |

**Accounts needed, all free, none requiring a card:** GitHub, Supabase, Vercel, Tavily, Google AI Studio. Deliberately not used: Render, Koyeb, Brave Search. One backend platform (Supabase), not two.

**Operational notes:**
- Supabase pauses a free project after ~1 week of inactivity. Open the dashboard once before any demo to wake it.
- Keep the Tavily free-credit count in mind before demo days; the cache protects it.

---

## 11. Phased build plan with testing gates

Development proceeds one phase at a time. **Each phase ends in a checkpoint that must be tested and confirmed working before the next phase begins.** A phase that fails its checkpoint is fixed, not built past. Every phase that produces UI is verified responsive at phone, tablet, and desktop widths as part of its checkpoint.

**Phase 0 — Foundation.** Repo, React+Vite+Tailwind, Supabase project connected, deployed to Vercel.
- Checkpoint: the empty app loads at a public Vercel URL. The pipeline (local → GitHub → Vercel) works.

**Phase 1 — Auth and roles.** Magic-link login, users table, role assignment, route protection.
- Checkpoint: a Super Admin logs in and reaches the admin console; a student logs in and reaches the student view; a wrong-role user cannot reach a forbidden page. Login screen responsive on all widths.

**Phase 2 — Opportunity Verification Queue, end to end.** Opportunity tables, 8 statuses, the drawer, six criteria, two-step publish gate enforced in the database, activity log.
- Checkpoint: a Submitter logs an opportunity, a Verification Lead approves it, a Super Admin publishes it; it moves through the real states; the gate blocks a Lead from publishing; a rejection without a reason is refused; the log records each step. Responsive on all widths.

**Phase 2.5 — AI discovery assist.** The Edge Function, trusted_sources table, Tavily + Gemini call, review-and-confirm UI, search_cache.
- Checkpoint: a Submitter searches (e.g. "fully funded masters in tech for Rwandans"), gets real results from trusted portals only, confirms a couple, and they appear in the queue at Received tagged AI-sourced, with the confirmation logged. Responsive on all widths.

**Phase 3 — Student-facing opportunities.** The public listing, search and filter, only published items visible.
- Checkpoint: an opportunity published in Phase 2 appears on the student's screen; nothing unpublished leaks. Listing responsive on all widths.

**Phase 4 — Mentor Matching, end to end.** Profiles, six-criteria scoring, 8 matching states, recommend / accept / decline / connect, mentor verification gate.
- Checkpoint: a mentee registers, gets a ranked recommendation, accepts; the connection is confirmed; an unverified mentor cannot enter the pool. Responsive on all widths.

**Phase 5 — Dashboard, realtime, polish.** Live metrics computed from the database, Realtime wired across dashboards, demo seed data, final responsive pass.
- Checkpoint: dashboard numbers are live not hardcoded; publishing an opportunity makes it appear on a student screen live; confirming a match makes the mentor appear on the mentee's dashboard live; the whole app holds up on a phone.

**Explicitly out of MVP scope:** the engagement-funnel and drop-off analytics, any fully autonomous (non-confirmed) agent behavior, and institutional workflows beyond simple opportunity submission. These are roadmap items, kept out to prevent scope creep.

---

## 12. Decisions log (chronological, for traceability)

- Opportunities-first: the Verification Queue was built before mentor matching because only opportunity verification had a documented SOP at the time.
- Single Super Admin (Deng) for the prototype; the two-step publish gate is two sequential actions by one person until a second staff role exists.
- Plain HTML/CSS/JS prototype chosen first to demonstrate the SOP flow cheaply; MVP rebuilds it in a real stack.
- Responsive prototype delivered (mobile, tablet, desktop).
- Mentor Matching screen added once its SOP arrived; mentor verification gate flagged as an addition beyond that SOP.
- AI agent reframed from "find and publish" to "find and confirm into queue", preserving the human gate.
- Universities and employers collapsed into the Submitter role; they add opportunities, nothing more.
- Backend-as-a-Service (Supabase) chosen over a self-built server to stay free and minimal-setup.
- AI agent backend settled as domain-restricted Tavily + Gemini in a Supabase Edge Function, after a recommendation; Render/Koyeb/Brave rejected to avoid a second host and any credit-card requirement.
- Real-time settled as Supabase Realtime, no self-hosted websocket server.
