# The Blue Board v0.2 — Changelog

*Everything that shipped since the initial Reddit launch (Feb 11, 2026)*

---

## ✨ New Features

### Shareable Flight Links
Share any flight with a link: `theblueboard.co/?flight=UA1234`. Click the 📤 Share button on any flight popup to copy the link. Send it to family, post it in group chats — they'll see the flight live on the map.

### Push Notification Alerts
Watch a flight and get browser push notifications when something changes — delays, gate changes, departures, landings, cancellations, diversions. No account needed.

### Flight Watch System
Watch any flight from its popup. Tracked flights appear in the 👁️ panel with live status updates and in-page alerts.

### Real-Time Departure & Arrival Times
Flight popups now show actual departure and arrival times alongside scheduled times, with delay indicators when flights are running late.

### Expanded to 9 Hubs
Added **Guam (GUM)** and **Tokyo Narita (NRT)** — all 9 United hubs are now tracked. Pacific view toggle lets you see GUM/NRT routes at a glance.

### Hub Health Bar
Live on-time performance across all 9 hubs, color-coded (🟢 >70% · 🟡 50–70% · 🔴 <50%) with a network-wide status label (Smooth Ops / Some Delays / Rough Day).

### IRROPS Dashboard
Real-time disruption metrics: cancellations, delays (30/60 min), diversions, worst delays, and per-hub breakdowns — all from the Schedule tab.

### Hub Guide Pages
Dedicated SEO-optimized pages for all 9 hubs with terminal info, lounge details, construction alerts, and quick links to live data. Linked from the hub health bar.

### PWA Support
Install The Blue Board as an app on your phone or desktop. Full offline shell with service worker caching.

### Route & Tail Number Search
Search by route (ORD-DEN, ORD DEN), flight number, tail number, or callsign from the global search bar.

### Engagement-Based Donation Prompts
Non-intrusive BMAC prompts that appear based on actual usage, not timers. Plus a supporters wall for contributors.

### SEO & AI Optimization
- `llms.txt` for AI assistants
- Structured data (Dataset schema, breadcrumbs)
- Sitemap, `robots.txt` API blocking
- Open Graph and Twitter Card meta tags

---

## 🔧 Improvements & Fixes

### Map & UI
- Fixed plane icon rotation (heading offset was wrong)
- Replaced emoji plane icons with SVG silhouettes for cross-platform consistency
- Fixed International Date Line crossings in flight tracks
- Mobile layout overhaul: flexbox viewport, no more scroll-to-see-header, proper touch targets
- Mobile map controls repositioned to avoid overlap
- Hub health bar and stats bar flex properly on small screens

### Performance & Reliability
- Hub health bar: sequential fetching with retries and per-hub caching to survive FlightRadar24 rate limits
- Service worker rewrite: split caches, stopped intercepting CDN requests, proper cache validation
- IRROPS API: 15-min cache, 90s function timeout, stale-cache fallback on failures
- Schedule API: handler-level timeouts to prevent silent Vercel hangs
- Flight times: FR24 summary fallback when FlightAware blocks Vercel IPs

### Data Accuracy
- Removed 97 undelivered MAX 9 from fleet database
- Hub page accuracy audit: corrected terminal info, Polaris lounges, construction alerts, CommutAir removal
- Fixed OTP calculation: real timestamps required, minimum 5 flights, stale data clearing
- Fixed cancellation detection and display in schedules

### Security
- XSS fixes in user-facing inputs
- CORS hardening on API endpoints
- Content Security Policy headers
- API routes blocked from crawlers

---

## 📊 By the Numbers
- **70+ commits** since launch
- **9 hubs** (up from 7)
- **2 major new features** (shareable links + push alerts)
- **3 new API endpoints** (IRROPS, flight times, FAA alerts)
- **9 hub guide pages**
- **Full PWA support**

---

*Built by the community, for the community. Not affiliated with United Airlines.*
