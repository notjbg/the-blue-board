# Changelog

All notable changes to The Blue Board are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned per [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

80 commits since launch. Full release notes: [v1.1](https://github.com/notjbg/the-blue-board/releases/tag/v1.1)

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
- IRROPS data hydrates schedule cache for instant tab loading
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

Initial public launch. Full release notes: [v1.0](https://github.com/notjbg/the-blue-board/releases/tag/v1.0)

### Added
- Live flight tracking map (30s updates via FlightRadar24)
- Schedule tab with departures & arrivals at 7 United hubs
- Fleet database (1,078+ aircraft, Starlink WiFi status)
- Hub health bar with on-time performance
- IRROPS monitor with disruption scoring
- Weather & delays: METAR, FAA monitoring, radar map
- Global search (flights, tails, routes, hubs)
- First-time onboarding overlay
- Buy Me a Coffee integration
- Server-side API proxies (no client-side keys)
- JSON-LD structured data, Open Graph metadata
- Vercel hosting with edge caching

[1.1.1]: https://github.com/notjbg/the-blue-board/compare/v1.1...v1.1.1
[1.1]: https://github.com/notjbg/the-blue-board/compare/v1.0...v1.1
[1.0]: https://github.com/notjbg/the-blue-board/releases/tag/v1.0
