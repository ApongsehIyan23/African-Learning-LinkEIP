# African Learning Link (ALL) — Design Prompt

> **How to use this file.** This is a design-only prompt. Paste it into Claude Code
> after Phase 0 (Foundation) exists, so Claude Code has a real codebase to inspect,
> but before any feature UI is built. It produces a palette, an inspiration analysis,
> and a unified design system and component plan. It builds NO React components; each
> step stops for your approval. Once you approve Step 3, the design system it produces
> is what the build phases (ALL_MVP_PROMPTS.md) style against.
>
> **Prerequisite:** the `UI_design_choices` folder must be in the working directory,
> containing the logo file and the `inspo[number].[ext]` inspiration screenshots.

---

## The prompt

```
I want you to act as a Senior UI/UX Designer and Frontend Architect for the African
Learning Link (ALL) platform. We are building a React application styled with Tailwind
CSS, backed by Supabase (not a self-hosted Node server). Before anything, read
ALL_MVP_CONTEXT.md to understand the app's purpose, users, and workflows, and inspect
the existing prototype/codebase to see the design patterns we have already built and
validated.

Look inside the `UI_design_choices` directory. It contains:
1. Our application's official logo file.
2. Several high-resolution UI inspiration screenshots labeled `inspo[number].[ext]`.

Execute the following steps IN ORDER. Do NOT write any React component code until
Steps 1, 2, and 3 are complete and I have approved them. Stop for my approval at the
end of each step.

### Step 1: Brand & Logo Analysis
1. Inspect our logo in `UI_design_choices`.
2. Extract its primary, secondary, and accent hex colors. Report the exact values you
   sampled AND how confident you are: if the logo is a compressed or flattened raster,
   anti-aliasing can skew the samples, so tell me the colors you found and ask me to
   confirm before you anchor the whole system to them. Do not silently build on a
   guessed hex.
3. Build an accessible, production-ready Tailwind color system around the confirmed
   logo colors. Every text-on-background pairing must meet WCAG AA contrast. Define
   surface colors (backgrounds, cards, borders), interactive states (hover, active,
   focus), and semantic colors (success, warning, error) that harmonize with the logo.
   Note: our existing prototype uses a purple-led palette; reconcile the logo's colors
   with that, and tell me where they agree or conflict.
Then STOP and show me the palette for approval.

### Step 2: Inspiration Layout & Design System Extraction
1. Analyze each `inspo*` screenshot individually.
2. For each, break down: layout and grid (sidebar vs top-nav, columns, card
   arrangement, information density); design tokens (type hierarchy, weights, sizes,
   tracking, border radii, shadow/elevation, spacing, iconography style); and notable
   UI components (tables, widgets, data visualizations, navigation).
3. STRICT CONTENT RULE: ignore all literal text, brand names, numbers, and copy in the
   inspo images. Treat every text element as a structural placeholder only. These shots
   are likely from other domains (finance, SaaS, crypto) and their labels will leak
   into our UI if you are not deliberate. ALL copy in our app must be rewritten from
   scratch in OUR domain vocabulary: opportunities, verification status, the six
   criteria, mentors, mentees, matches, verification turnaround, submitters. If a
   pattern is beautiful but domain-wrong, keep the structure, replace the content.
4. Reconcile with what exists: our prototype already uses a sidebar architecture with
   cards, a detail drawer, and status badges. Where an inspo pattern improves on ours,
   say so; where ours should stay for consistency with screens the client has already
   seen, keep it. The goal is an evolution of our proven layout, not a replacement that
   surprises the client.
Then STOP and show me the per-image analysis for approval.

### Step 3: Synthesis & Implementation Plan
1. Propose a unified design system (tailwind.config.js and/or CSS variables) merging
   the best structural patterns from the inspo shots with the confirmed logo palette
   and our existing prototype patterns. It must read as ONE coherent product, not a
   tour of the different screenshots.
2. Outline a component-by-component plan: how each layout translates into clean,
   modular React + Tailwind components, with domain-accurate copy, and how each stays
   responsive on mobile, tablet, and desktop (a hard requirement for every component).
Then STOP and show me the design system and component plan for approval. Do NOT begin
implementation until I approve this step.

Start now by reading ALL_MVP_CONTEXT.md, inspecting the codebase for app context, and
analyzing `UI_design_choices` for Step 1.
```

---

## Notes for you (not part of the prompt)

- **Watch the palette reconciliation.** If the logo colors clash with the prototype's
  purple, decide early which wins. The prompt forces Claude Code to surface the
  conflict rather than silently pick one.
- **Judge coherence at Step 3.** Following several shots too literally yields a UI that
  looks like three apps stitched together. When you review the design system, the thing
  to check hardest is whether it reads as one product.
- **You are the taste gate.** The prompt enforces process (analyze, reconcile, stop for
  approval); only you can judge whether the result actually looks good.
