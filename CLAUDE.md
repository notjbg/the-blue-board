# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The Blue Board is an unofficial real-time United Airlines operations dashboard
(theblueboard.co): a single-file SPA dashboard plus Astro-built content pages, served on
Vercel with serverless API proxies and Supabase for persistence.

## Commands

Bun is the package manager and script runner (`bun install`; version pinned in package.json).

```sh
bun run test          # Vitest suite — see Testing below; NEVER bare `bun test`
bunx vitest run tests/schedule.test.js   # run a single test file
bun run test:watch    # vitest watch mode
bun run typecheck     # tsc --noEmit (astro strict tsconfig)
bun run build         # full build: starlink refresh → vite dashboard bundle → astro → SEO stamp → agent markdown
bun run build:dashboard  # rebuild only public/js/dashboard.js from src/dashboard/main.js
bun run dev           # dev server (see gotcha below)
bun run ui-audit      # Playwright + axe accessibility/screenshot audit against prod (or AUDIT_URL)
```

CI (`.github/workflows/test.yml`) gates on typecheck + test + build; all three must pass
before any PR. There is no separate lint/format step — those three commands are the whole gate.

Note: the first step of `bun run build` fetches the live Starlink count and, on success,
rewrites `src/data/starlink-live.json` (a committed file). A failed fetch never fails the
build, but a successful one can dirty the tree — don't commit that data bump into an
unrelated change.

## Testing

Run the test suite with `bun run test` (which runs `bunx vitest run`), NEVER bare `bun test`.
Bun's built-in test runner reports ~28 false failures and silently drops ~33 tests here because
the suite is written for vitest's API (vi.stubEnv, fake timers, vi.mock). The canonical, green
command is `bun run test`. This note overrides the global "use `bun test`" default for this repo.

Tests live flat in `tests/*.test.js` with fixtures in `tests/fixtures/`. Several tests are
deliberate pins that fail when data/facts drift (e.g. `tests/tracker-data.test.js` pins the
FAA's 89-airport count) — a failure there usually means the data needs a verified update, not
that the test is wrong.

## Dev-server gotcha

`bun run dev` (`scripts/run-astro-dev.mjs`) stamps `public/index.html` and restores a startup
snapshot on exit — if it is killed after other commits touched that file, it reverts them on
disk. For agent work, prefer running `bunx astro dev` directly.

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Architecture

Three layers (diagrammed in README.md):

1. **Browser SPA** — `public/index.html` is the entire dashboard (one file, dark NOC theme,
   Leaflet map). Its JS logic is bundled by Vite from `src/dashboard/main.js` into
   `public/js/dashboard.js` (**gitignored build artifact** — never edit it; edit
   `src/dashboard/main.js` and run `bun run build:dashboard`). Styles are in
   `public/css/style.css`. Zero inline event handlers: all interaction goes through delegated
   `data-action` attributes, and all dynamic API data is HTML-escaped (`src/lib/escape.js`)
   before DOM insertion.

2. **Vercel serverless functions** — everything under `api/`. The browser never calls
   upstream APIs directly; every data source (Flightradar24, AeroDataBox, FAA NAS, AWC METAR,
   Claude delay explanations, etc.) is proxied server-side for caching, rate limiting,
   UA-only filtering, and CORS. Files prefixed `_` (e.g. `api/_cache.ts`, `api/_rate-limit.ts`,
   `api/_supabase.ts`, `api/_cost-state.ts`) are shared helpers, not routes. Cron jobs live in
   `api/cron/` and are scheduled in `vercel.json`; they authenticate via `CRON_SECRET`
   (`api/_cron-auth.ts`) and fail closed without it.

3. **Supabase (Postgres)** — waitlist, schedule snapshots, news notifications, watch
   subscriptions, spend/cost state. Migrations are numbered files in `sql/`; all user-facing
   tables use RLS.

Astro (`astro.config.mjs`, `output: 'static'`) builds the content pages: hub pages
(`src/pages/hubs/[hub].astro` from `src/data/hubs/`), 19 fleet type pages
(`src/pages/fleet/[type].astro` from `src/data/fleet/`), news (`src/data/news/`), trackers,
sitemaps and RSS. Because output is static, request-time logic cannot go in Astro middleware —
that's why root-level `middleware.ts` (Vercel Routing Middleware) exists: it serves Markdown
twins of pages to `Accept: text/markdown` agents via prerendered files under `/_agent/`
(built by `scripts/build-agent-markdown.mjs`; decision logic unit-tested in
`src/lib/agent-negotiation.js`).

Shared pure logic lives in `src/lib/` (delay-risk scoring, METAR parsing, schedule status,
IROPS scoring, etc.) so it is testable without a Vercel runtime — keep new logic there rather
than inline in `api/` handlers or the dashboard.

### Schedule data sourcing

Hub schedule boards route through `api/schedule.ts` with source priority controlled by
`SCHEDULE_SOURCE_PRIORITY` (see `.env.example`, which documents every knob):
`provider` (AeroDataBox — the only full forward board; production) with FR24 official API and
live-feed fallback. Spend is guarded by a cross-instance daily unit budget
(`api/_cost-state.ts`) and warmed by the hourly `api/cron/warm-schedules.ts` cron. Don't add
new upstream calls without going through the existing cache/rate-limit/budget helpers.

## Key conventions

- **Facts discipline** — every page-level factual number (hub counts, fleet database size,
  Starlink counts, etc.) imports from `src/data/facts.js`, the single source of truth. Static
  files that can't import it (`public/index.html`, `public/llms*.txt`, `README.md`) carry
  hand-sync comments; Starlink figures in those files are rewritten at build time. When a fact
  changes: update facts.js, then grep for the old value to catch stragglers.

- **Trackers** — `/trackers` pages render entirely from `src/data/trackers/atc.js` and
  `united-hubs.js`, validated at import time by `src/data/trackers/index.js` (bad data fails
  the build on purpose). Every entry change needs a source URL, dates only get the precision
  the source supports, and changelogs are reverse-chronological. See MAINTENANCE.md for the
  full update ritual, status discipline rules, and the hand-sync list for headline stats
  (OG images, page stats arrays).

- **Security posture** — strict CSP and headers are set in `vercel.json` (and pinned by
  `tests/csp.test.js`); API endpoints validate inputs server-side and are origin-locked;
  the delay-explain endpoint sanitizes input before it reaches Claude. Preserve these
  patterns in new endpoints.

- **Generated assets** — OG images (`scripts/generate-og.py`) and maskable PWA icons
  (`scripts/generate-maskable-icons.py`) are one-off Python scripts whose output is committed
  to `public/`; they are not part of `bun run build`. Rerun by hand only when the source art
  or headline stats change, then commit the PNGs.

- **Docs worth reading before larger work** — `DESIGN.md` (design system + decisions log),
  `MAINTENANCE.md` (tracker data updates), `docs/HANDOFF.md` (v2.0 program history, known
  gotchas, deferred work), `.env.example` (documents every environment variable and the
  schedule-source routing), `CHANGELOG.md` (release history; version in package.json).
