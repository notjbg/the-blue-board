# Changelog

All notable changes to The Blue Board are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned per [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-03-19

### Added
- United Airlines News Hub (`/news`) with curated article pages, SEO-optimized with NewsArticle structured data, BreadcrumbList schema, and OG/Twitter meta tags
- Individual article pages (`/news/[slug]`) with source links, cross-links to related hub/fleet pages via tags, donation CTA, and Pro waitlist teaser
- Google News sitemap (`/news-sitemap.xml`) for Google News indexing eligibility
- Dynamic RSS feed (`/feed.xml`) now includes news articles with publication dates — replaces static feed
- "Latest News" banner on dashboard (between header and tab bar) — dismissible, persists per-article via localStorage, tracks clicks via Vercel Analytics
- Email digest endpoint (`/api/news-notify`) using Resend Broadcasts API — idempotent, auth-gated, tracks last-sent slug in Supabase
- Shared `Footer.astro` component — extracted from hub and fleet layouts to eliminate DRY violation
- `DESIGN.md` — formalized design system (color tokens, typography, layout, components, accessibility)
- `TODOS.md` — deferred work tracking (auto-curated news aggregation)
- News data validation at build time (slug format, required fields, duplicate detection, https-only sources)
- Tag resolver for cross-linking articles to hub and fleet pages with build-time warnings for unknown tags
- 20 new tests: 11 for news data model + tag resolver, 9 for news-notify endpoint (auth, idempotency, broadcast API)

### Changed
- Sitemap now includes `/news` index and all article pages
- `llms.txt` and `llms-full.txt` updated with news hub documentation
- Dashboard brand strip includes "News" link
- `vercel.json` adds cache headers for `/news/*` and function config for `news-notify`
- `buildMetadata.js` extended with news lastmod path helpers

### Removed
- Static `public/feed.xml` (replaced by Astro-generated dynamic feed at `src/pages/feed.xml.ts`)

## [1.3.8] - 2026-03-17

### Added
- 19 SEO-optimized fleet type pages (`/fleet/737-max-9`, `/fleet/a321neo`, etc.) with structured data (Product, FAQ, BreadcrumbList schemas), full aircraft registry tables, and inter-type navigation
- Fleet overview index page (`/fleet`) with all 19 types
- Welcome email via Resend on first waitlist signup, with de-duplication for repeat submissions
- Rate limiter test for waitlist API (covers 429 response path)
- `text-wrap: balance` on headings in hub and fleet content pages

### Changed
- Dashboard section headings bumped from 10px to 11px with tighter letter-spacing for readability
- Body line-height set to 1.4 (was browser default ~1.2)
- Hub health bar touch targets enlarged (padding 2px→4px, min-height 28px)
- Header H1 letter-spacing reduced from 1.5px to 1px
- `color-scheme: dark` added to all page templates (dashboard, hub, fleet)

### Fixed
- Security hardening: Supabase service role key for server-side API, RLS on waitlist table, prompt injection sanitization on delay-explain endpoint
- Waitlist API uses upsert with conflict on email (prevents duplicates)
- Dynamic import for Resend to prevent function crash when module unavailable
- Fleet type deep links from dashboard now route correctly to static pages

### Removed
- Legacy `public/fleet.html` (replaced by Astro-generated fleet pages)

## [1.3.7] - 2026-03-15

### Fixed
- Normalized inconsistent WiFi provider names in Fleet tab — "Sat KA"/"Satl Ka"/"Satl KU"/"Satl Ku"/"ViaSatKA" now display as clean labels ("Satellite Ka", "Satellite Ku", "ViaSat Ka")
- Fleet WiFi filter dropdown collapsed from 8 duplicate-ish entries to 6 distinct, properly named options
- WiFi names now consistent across all views: fleet table, aircraft detail panel, flight popups, schedule enrichment, equipment swap comparison, and fleet match info

## [1.3.6] - 2026-03-12

### Changed
- Extracted `tryOfficialFallback()` helper to DRY up two fallback call sites in schedule routing
- Removed cron Phase 2 (tomorrow warming) — stays within Vercel 300s limit; tomorrow data loads on-demand
- Increased cron inter-hub delay (3s→12s) to avoid FR24 rate limiting across consecutive hubs

### Fixed
- Retry-After header now honored in FR24 scraping — releases concurrency slot during wait to avoid starvation
- Fixed potential double-release of FR24 concurrency slot when Retry-After triggers `continue` through `finally` block

### Added
- 2 new schedule tests: rate-limited mid-loop continuation, breaker-tripped partial result
- `fr24-usage.test.js` — 7 tests covering CORS, preflight, proxy, and caching for credit monitoring endpoint

## [1.3.5] - 2026-03-12

### Fixed
- Reduced frequent partial schedule data — lowered batch size (6→3) and increased delays to avoid FR24 rate limiting
- Rate-limited pages no longer abort the entire fetch loop — pauses 2s and continues with remaining pages
- Increased cron warmer inter-hub delay (1s→3s) to reduce FR24 burst pressure

### Changed
- Credit usage widget is now admin-only — visit `?admin` to enable, `?admin=off` to disable

## [1.3.4] - 2026-03-12

### Changed
- Inverted FR24 schedule routing — scraping is now primary, official API is fallback-of-last-resort (projected ~96-99% credit savings)
- Added `SCHEDULE_SOURCE_PRIORITY` env var for one-click rollback (`scrape` default, `official`, `scrape-only`)

### Added
- Circuit breaker on official API fallback — trips after 5 fallbacks in 15 minutes to prevent credit burn during sustained scraping outages
- `/api/fr24-usage` endpoint — proxies FR24 credit consumption data with 5-minute cache
- FR24 credit usage widget in dashboard footer — shows remaining credits with color-coded progress bar (green/yellow/red)
- 6 new schedule tests covering scrape-first routing, fallback, circuit breaker, and scrape-only mode

## [1.3.3] - 2026-03-12

### Fixed
- Hub health bar now shows all 9 hubs — previously only ORD displayed because schedule preload overwrote IROPS-derived data for hubs without loaded schedule data
- Consolidated two competing hub health renderers into a single `renderHubHealthBar()` function, eliminating a race condition between IROPS and schedule data paths

## [1.3.2] - 2026-03-12

### Changed
- Strip `hubFlights` from IROPS API response — reduces payload from ~4.6MB to ~100KB (schedule tab fetches its own data)

### Fixed
- Weather tab layout gap when hub cards are loading — added min-height to `.hub-cards` container

### Added
- CI/CD test workflow — `npm test` runs automatically on pushes to main and pull requests

## [1.3.1] - 2026-03-12

### Fixed
- Onboarding overlay no longer blocks tab interaction — tabs are clickable while the welcome modal is visible
- Alerts ticker no longer shows "0 mainline aircraft" before fleet data loads
- Offline banner no longer flashes briefly on page load for connected users

### Changed
- Search "no results" message now distinguishes flight numbers ("not currently airborne") from tail numbers ("not found in live feed")

## [1.3] - 2026-03-10

### Added
- **AI-Powered Delay Explanations** — Claude Haiku explains why a flight is delayed in plain language, with inbound aircraft context
- **Delay Risk Engine v3** — 8-signal scoring with phenomena-aware weather, IROPS stress, ETA-based turnaround analysis
- **Aircraft Journey Chain Tracking** — see where an aircraft has been and predict downstream delay propagation
- **Schedule Filters** — filter by route type (domestic/international), Starlink-equipped, time range, and delay risk level
- **Live Starlink Data** — replaced static Starlink database with live API feed and flight connectivity predictions
- **Fleet Stats Chips** — at-a-glance fleet statistics in the fleet panel
- **Clickable LIVE STATUS Card** — click to focus the flight on the map
- **"Daily Cockpit" v1.3 Feature Set** — My Flights, Delay Risk, Connection Risk, Home Airport
- **Background Cache Warming** — Vercel cron pre-warms schedule data for faster tab loads

### Changed
- **TypeScript migration** — core modules migrated to TypeScript for type safety
- **CSS extraction** — styles extracted from inline to dedicated stylesheets
- **JS modularization** — monolithic scripts split into focused modules
- **Architecture overhaul** — shared cache layer, hub data split, expanded test coverage
- **Official FR24 API** — schedule data now uses official FlightRadar24 API with scraping fallback
- **Cron interval** — warming interval changed from 5min to 15min to reduce API costs
- **Flight cards redesign** — compact inline row layout with reduced cache banner padding
- **UI/UX polish** — "Risk" renamed to "Delay" for clarity, improved feature discovery
- **SEO, security, and performance** — audited and hardened foundations
- **"View on Map" button** — now switches to LIVE tab first before focusing flight

### Fixed
- FR24 API: datetime format, pagination, field mapping, tomorrow skip, hub closure detection
- FR24 rate-limiting: adaptive handling, concurrency control, retry logic, browser User-Agent
- Schedule resilience: partial data instead of 502, non-fatal batching, stale-complete fallback
- Schedule gate format and hub cache warming
- Flight schedule: broken pagination, missing hub timeouts, restrictive flight regex
- Direction filtering with ICAO/IATA code matching
- Cron auth, IROPS performance, flight-times 404
- Client-side schedule cache: stop caching partial/empty results, stop IROPS from clobbering cache
- ORD international flights: parallel batching to fetch all schedule pages
- In-air flight status detection and watched flight map highlighting
- Flight-times API: prefer in-air flights over future scheduled
- Activity log scanning for in-air flight lookup
- Scroll on international flights (overflow:visible override)
- AI explanation: third-person voice, plain text output, explicit API key passing
- Schedule footer built with DOM nodes instead of innerHTML (XSS hardening)
- Recurring upstream data source failures for schedule data

### Security
- innerHTML replaced with DOM node construction in schedule footer
- Anthropic SDK API key passed explicitly (not leaked via env)

## [1.2] - 2026-03-01

### Added
- **Fleet Health Dashboard** — live fleet status with health categories, pie chart, and aircraft count by type
- **Special Aircraft Tracker** — named and special-livery aircraft panel in Fleet tab
- **Aircraft Detail Modal** — click any tail number for registration, type, engine, status, live flight, and history
- **Equipment Swap Impact Analysis** — schedule tab highlights equipment changes with seat and amenity impact
- **Unit test suite** — tests for API endpoints and operational logic
- **Shared API rate limiting** — all endpoints protected with per-IP rate limits

### Changed
- **Design/UX audit** — typography scale, contrast improvements, interaction polish across the app
- Hub weather cards moved above IROPS monitor in weather tab
- FAA endpoint: fragile regex XML parsing replaced with `fast-xml-parser`
- SEO & LLM discoverability improvements (structured data, meta tags)
- Typography unified: `var(--font-ui)` replaces `var(--mono)` on UI buttons
- Rate limiter prefers `x-real-ip` over `x-forwarded-for`

### Fixed
- Schedule tab loading: timeout, retry with backoff, clear error states on reload
- Ticker scrolling: proper content width measurement, GPU-accelerated animation, JS fallback
- Mobile schedule/fleet tabs hidden behind bottom navigation bar
- iOS Safari table rendering bug (overflow:hidden + sticky header killed tbody paint)
- Mobile ticker not rotating: skip desktop animation path, fix race condition
- Live Fleet Status panel empty on direct `#fleet` hash navigation
- Hash deep links fired data loads before app initialization
- Onboarding overlay logic inverted for first-time visitors
- Tab deep-link selector targeted `.tab-panel` instead of `.tab-content` with wrong display toggle
- Fleet status badge fallback color used CSS variable instead of raw hex
- Aircraft deep-link modal opened over onboarding overlay
- Nested scroll trap on mobile schedule tab

### Security
- Shared rate limiting on all API endpoints with per-IP tracking

## [1.1.1] - 2026-02-23

### Added
- **Astro migration** — hub pages now built from shared templates instead of 9 copy-pasted HTML files
  - `src/layouts/HubLayout.astro` — shared layout (CSS, footer, live script, nav)
  - `src/data/hubs.js` — all hub content and metadata in one file
  - `src/pages/hubs/[hub].astro` — single dynamic route generates all 9 pages
  - Adding a new hub = adding one object to the data file
- Branded 404 page — "Flight not found." with hub links and dashboard CTA
- Ops Impact Assessment — weather intelligence beyond flight categories (snow, gusts, freezing precip flagged even when VFR)
- Hub health cancellation rate detection (shows `100% CX` instead of grey dot when hub is shut down)

### Changed
- Build system: raw static files → Astro static site generator (build time ~600ms)
- 3,001 lines of duplicated hub HTML deleted, replaced by 1,555 lines of templates
- Updated OG image with latest UI screenshot
- README updated with changelog link, PWA, ops impact, mobile redesign, 9 hubs

### Fixed
- XSS: all innerHTML interpolations now escaped (`err.message`, `schedCurrentHub`, aircraft type codes)
- GUM/NRT hub pages: removed duplicate "Active Flights" stat, consolidated live panel layout

### Security
- Defense-in-depth escaping on all remaining innerHTML interpolations

## [1.1] - 2026-02-23

80 commits since launch.

### Added
- Shareable flight links (`?flight=UA1234`) with push notification watch alerts
- Departure & arrival times in flight popup (FlightAware + FR24 fallback)
- Tokyo Narita (NRT) and Guam (GUM) — now 9 hubs
- Pacific view toggle for transpacific route coverage
- Dedicated SEO-optimized hub pages for all 9 hubs (`/hubs/ord`, etc.)
- Ops Impact Assessment — flags snow, gusts ≥30kt, freezing precip, thunderstorms even when VFR
- Hub health cancellation rate detection (shows `100% CX` instead of grey dot)
- Dedicated fleet landing page (`/fleet`)
- PWA support — installable home screen app with service worker
- Engagement-based donation prompts, supporters wall, membership CTA
- `llms.txt` for AI discoverability
- JSON-LD breadcrumbs and Dataset schema markup
- Sitemap with all hub pages

### Changed
- Mobile-first redesign: map-maximized layout, bottom tab bar, collapsible filters
- SVG plane icons replace emoji for cross-platform accuracy
- Service worker rewrite: split caches, no cross-origin interception
- Core Web Vitals: deferred Leaflet, preloaded LCP tile, fixed INP
- IROPS data hydrates schedule cache for instant tab loading
- Hub health: sequential fetching with retries, timezone-aware rollover
- Donation CTA copy refined

### Fixed
- Transpacific routes crossing the antimeridian
- International Date Line flight track rendering
- Plane popover re-click and stale popup state
- OTP calculation: real timestamps required, min 5 flights, stale data clearing
- Hub health uses yesterday's data before 6 AM local
- Schedule API handler-level timeout for Vercel
- FR24 summary fallback when FlightAware blocked
- Schedule race condition and ticker min-width
- Weather summary contradicting actual METAR conditions
- Viewport-constrained layout (no scroll-to-see on mobile)

### Security
- XSS fix and CORS hardening (GUM/NRT rollout)
- 12 Codex code review findings resolved
- `robots.txt` blocks API/data crawling
- Handler-level API timeouts

## [1.0] - 2026-02-12

Initial public launch.

### Added
- Live flight tracking map (30s updates via FlightRadar24)
- Schedule tab with departures & arrivals at 7 United hubs
- Fleet database (1,078+ aircraft, Starlink WiFi status)
- Hub health bar with on-time performance
- IROPS monitor with disruption scoring
- Weather & delays: METAR, FAA monitoring, radar map
- Global search (flights, tails, routes, hubs)
- First-time onboarding overlay
- Buy Me a Coffee integration
- Server-side API proxies (no client-side keys)
- JSON-LD structured data, Open Graph metadata
- Vercel hosting with edge caching

[1.3]: https://github.com/notjbg/the-blue-board/compare/v1.2...v1.3
[1.2]: https://github.com/notjbg/the-blue-board/compare/v1.1.1...v1.2
[1.1.1]: https://github.com/notjbg/the-blue-board/compare/v1.1...v1.1.1
[1.1]: https://github.com/notjbg/the-blue-board/compare/v1.0...v1.1
[1.0]: https://github.com/notjbg/the-blue-board/releases/tag/v1.0
