# African Learning Link (ALL)

Pan-African e-learning and mentorship platform by Lajik Tech Ltd. This repository is
the MVP, built phase by phase. See `ALL_MVP_CONTEXT.md` for the full blueprint and
`ALL_MVP_PROMPTS.md` for the build plan.

**Current status: Phase 0 — Foundation.** Running, deployable empty app. No features yet.

## Stack

- **Front-end:** React + Vite + Tailwind CSS v4
- **Routing:** React Router
- **Backend:** Supabase (Auth, PostgreSQL, Row-Level Security, Realtime, Edge Functions)
- **Hosting:** Vercel (deploys from GitHub on push)

## Run locally

1. Install Node.js (v18+). Then install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file (copy `.env.example`) with your Supabase project values:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
   ```
   The publishable key is safe for the browser. **Never** put the Supabase secret /
   service_role key in a `VITE_` variable — anything prefixed `VITE_` is shipped to the
   client.
3. Start the dev server:
   ```bash
   npm run dev
   ```
   Open the printed URL (default http://localhost:5173). The Home page shows a live
   Supabase connection check.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key — public by design |

These must also be set in the Vercel project settings for deployment.

## Deployment

The app deploys to Vercel from this GitHub repo. On each push to `main`, Vercel builds
and redeploys. The two environment variables above must be configured in the Vercel
project (Settings → Environment Variables).
