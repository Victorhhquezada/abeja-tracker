# ABEJA

A mobile-first strength & power training tracker, built for a 16-year-old competitive amateur boxer. It's the weight-room layer that sits alongside boxing training — not a boxing app, and not a general fitness app: no diet tracking, no bodyweight logging, no boxing scheduling. Just the lifting program, logged and tracked day to day.

Live at **[abeja-tracker.victorhhquezada.workers.dev](https://abeja-tracker.victorhhquezada.workers.dev)** — installable to the home screen as a PWA-style app icon.

## What it does

- **Daily workout view ("Hoy")** — today's prescribed exercises with sets/reps/RPE targets, an overload suggestion based on your last session, and one tap to mark the session complete.
- **Exercise input matched to what you can actually vary** — weight input for barbell/plate work, reps-only input for fixed-resistance implements (a single tire, a band, a sandbag that only comes in two weights), and a plain done/not-done checkbox for planks and other unmeasured holds.
- **Week and month views** — see the week's plan at a glance, or tap any day on the month calendar for a detail view of what was actually logged.
- **Streak system** — a ring that fills in as the week's training days get completed, plus a full-year dot graph (green = trained, red = missed, blue = rest day) so consistency is visible at a glance.
- **Earned streak protection** — train 15 days straight (3 clean weeks, Mon–Fri) without needing one, and you bank a protection you can activate the day after a missed session to keep the streak alive. No silent auto-forgiveness — it's an earned, spendable resource, and using one resets the clock on earning the next.
- **Meme popup** — every completed session pops a random meme from a small, growing collection.
- **Progress view** — charts of logged weight/reps over time per exercise.

## How the program itself works

The actual lifting program (exercises, sets, reps, block structure, checkpoints) lives in [`data/training-plan.json`](data/training-plan.json) — it's data, not code, so the plan can be revised without touching the app. It's built around a few explicit priorities: punch power/explosiveness first, then injury durability, then work capacity, then general strength — and it's designed for a lifter with no prior loading history, so technique gates load, RPE stays capped well below failure, and 1RM testing is avoided throughout. The plan's own `notes` field documents the research behind those choices in more depth.

## Tech stack

- **Frontend:** React + TypeScript, built with Vite. Plain CSS (no framework) with light/dark theme support.
- **Backend:** a single Cloudflare Worker (`app/worker/index.ts`) that serves the built SPA as static assets and handles three API routes (`/api/auth`, `/api/state`, `/api/save`) directly — not Cloudflare Pages, no separate backend service.
- **Storage:** Cloudflare KV — one JSON blob holding every logged session, keyed by date.
- **Auth:** a single shared password (`APP_PASSWORD`), exchanged for an HMAC-signed session token (`APP_TOKEN_SECRET`), verified with the Web Crypto API on every request.

## Project structure

```
data/training-plan.json   canonical copy of the lifting program (source of truth)
app/
  src/                     the React app
    data/training-plan.json   bundled copy consumed by the app — kept in sync with the one above
    data/memes.ts              the meme pool for the completion popup
    pages/                     Hoy / Semana / Mes / Progreso
    components/
    trainingSchedule.ts        schedule resolution, streak, and streak-protection logic
  worker/index.ts          the Cloudflare Worker (API + static asset serving)
  public/                  icons, fonts, meme images
```

## Local development

```bash
cd app
npm install
npm run build      # tsc -b && vite build
npx wrangler dev    # serves the built app + API locally, with local KV
```

`app/.dev.vars` (gitignored) holds `APP_PASSWORD` and `APP_TOKEN_SECRET` for local dev.

## Deploying

```bash
cd app
npm run build
npx wrangler deploy
```

This repo is private — the training data belongs to a minor.
