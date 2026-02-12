# ✈️ The Blue Board

**An unofficial, real-time operations dashboard for United Airlines — built by flyers, for flyers.**

**[→ Live Dashboard](https://theblueboard.co)** · **[☕ Support the Project](https://buymeacoffee.com/notjbg)** · **[💡 Suggest a Feature](https://github.com/notjbg/the-blue-board/issues)** · **[𝕏 Follow @theblueboard](https://x.com/theblueboard)**

![The Blue Board — Live Operations Map](https://theblueboard.co/og-image.png)

---

## What Is This?

The Blue Board is a fan-built operations dashboard that lets you see United Airlines like an ops center would — live flight positions, hub schedules, fleet data, delays, weather, and stats, all in one dark, data-dense interface.

**Not affiliated with United Airlines, Inc.** This is an independent project by an aviation enthusiast.

---

## Features

### 📡 [Live Ops](https://theblueboard.co#live)
Real-time map tracking 600+ United flights, updated every 30 seconds. Filter by hub, toggle longhaul routes, overlay NEXRAD weather radar. Hub status sidebar shows departure/arrival counts and identifies the busiest hub. Search any flight by number, tail, or route. Great circle route lines show flight paths with city names.

### ⚠️ IRROPS Monitor
Server-side disruption scoring across all 7 hubs — cancellations, delays (30m/60m), diversions, and FAA ground stops. Preloaded automatically on page load with 5-minute server-side caching. No manual trigger needed.

### 📅 [Schedule](https://theblueboard.co#schedule)
Departure and arrival boards for all 7 UA hubs (ORD, DEN, IAH, EWR, SFO, IAD, LAX). Filter by status or aircraft type. Equipment swap detection flags when a plane type changes. On-time performance stats. All times in airport-local timezone.

### ✈️ [Fleet](https://theblueboard.co#fleet)
Complete database of 1,175+ mainline aircraft — searchable and sortable by type, registration, seat config, WiFi, and IFE. Starlink tracker for 258+ equipped aircraft with sortable columns and filters by fleet, type, and operator. Live fleet status correlates airborne flights with the database.

### 🌦 [Delays · Weather · Hubs](https://theblueboard.co#weather)
FAA NAS delay and ground stop alerts, METAR observations with plain-English explainers, NEXRAD radar overlay, and hub health indicators. Each hub gets a unified card with conditions, visibility, wind, ceiling, and current delay status. Radar map renders instantly; weather data loads in parallel via batched API calls.

### 📊 [Stats](https://theblueboard.co#stats)
Live fleet utilization by aircraft type (airborne vs. total), flight phase distribution (climb/cruise/descent donut chart), hub-to-hub traffic flow matrix, top active routes, fleet delivery timeline with stacked histogram colored by aircraft family, and Starlink coverage metrics. All live data updates every 30 seconds.

### 🔍 Flight Search
Look up any UA flight number from the header search bar. Returns live position, route, aircraft details, and scheduled/actual times via the official Flightradar24 API.

### More
- **Deep-link hashes** — Share direct links to any tab (`#live`, `#schedule`, `#fleet`, `#weather`, `#stats`)
- **Flight watch** — Pin a flight and get browser push notifications on status changes
- **Hub health bar** — At-a-glance delay severity across all 7 hubs
- **Equipment swap alerts** — Badges when scheduled aircraft type changes
- **Mobile responsive** — Full touch-optimized layout for phones and tablets
- **Click the title** — "THE BLUE BOARD" header always takes you back to Live Ops

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                     │
│                                                      │
│  public/index.html — single-file dark NOC dashboard  │
│  ├── Leaflet map + CartoDB dark tiles                │
│  ├── NEXRAD radar tile overlay                       │
│  ├── Event delegation (data-action attributes)       │
│  ├── Fleet/Starlink data loaded async from /data/    │
│  └── All API calls go through server-side proxies    │
└──────────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────┐
    │        Vercel Serverless Functions       │
    │                                          │
    │  /api/schedule    — FR24 schedule proxy  │
    │                     (cached, rate-limited│
    │                      UA-filtered)        │
    │  /api/irrops      — Precomputed IRROPS   │
    │                     metrics (5min cache)  │
    │  /api/fr24-feed   — Live flight positions│
    │  /api/fr24-flight — Flight lookup        │
    │                     (official FR24 API)  │
    │  /api/metar       — AWC weather proxy    │
    │                     (batched, all hubs)   │
    │  /api/faa         — FAA NAS status proxy │
    │  /api/opensky     — OpenSky proxy        │
    │  /api/fleet       — Fleet data proxy     │
    └─────────────────────────────────────────┘
```

### Why Server-Side Proxies?

- **Rate limiting** — One server fetches data for all users, not 500 browsers hammering APIs independently
- **Caching** — Schedule data cached 60s (live) / 5min (historical), IRROPS cached 5min, reducing upstream load by 90%+
- **UA filtering** — Server filters to United flights only, shrinking payloads dramatically
- **CORS** — Some sources (AWC, FAA) don't allow direct browser requests
- **Batching** — METAR data for all 7 hubs fetched in a single request

---

## Data Sources

| Source | Data | Freshness | Notes |
|--------|------|-----------|-------|
| [Flightradar24](https://flightradar24.com) | Live positions, schedules, flight lookup | ~15s–60s | Server-side proxy with caching |
| [Aviation Weather Center](https://aviationweather.gov) | METAR observations | ~5min | NOAA/CORS proxy, batched |
| [FAA NAS Status](https://nasstatus.faa.gov) | Delays & ground stops | ~5min | XML→JSON proxy |
| [United Fleet Site](https://sites.google.com/site/unitedfleetsite/) | Fleet database | Daily | Community-maintained |
| [Starlink Tracker](https://unitedstarlinktracker.com) | WiFi-equipped aircraft | Daily | [@martinamps](https://github.com/martinamps/ua-starlink-tracker) |
| [Iowa State NEXRAD](https://mesonet.agron.iastate.edu) | Radar imagery | ~5min | Direct tile server |

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step, single file
- **Map:** [Leaflet](https://leafletjs.com) + CartoDB dark tiles
- **Radar:** Iowa State NEXRAD WMS tiles
- **Font:** [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- **Hosting:** [Vercel](https://vercel.com) (serverless functions + edge CDN)
- **Analytics:** Vercel Web Analytics + Speed Insights
- **Design:** Dark NOC theme, inspired by Bloomberg terminals and airline ops centers

---

## Security

- **Content Security Policy** — Strict CSP via Vercel headers with `default-src 'self'`, `frame-ancestors 'none'`, and scoped source directives
- **Security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- **XSS protection** — All dynamic API data is HTML-escaped before DOM insertion (including single quotes). Zero inline event handlers — all interaction via delegated `data-action` attributes.
- **CORS** — API endpoints locked to `theblueboard.co` origin
- **Input validation** — All API parameters validated and sanitized server-side
- **Tabnabbing protection** — All external links use `rel="noopener noreferrer"`

---

## Project Structure

```
├── public/
│   ├── index.html       # The entire dashboard (single file)
│   ├── data/
│   │   ├── fleet.json   # Fleet database (1,175+ aircraft)
│   │   └── starlink.json # Starlink-equipped aircraft (258+)
│   ├── og-image.png     # Social media preview image (1200×630)
│   ├── robots.txt       # Search engine directives
│   └── sitemap.xml      # Sitemap
├── api/
│   ├── schedule.js      # FR24 schedule proxy (cached, rate-limited, UA-filtered)
│   ├── irrops.js        # Server-side IRROPS aggregation (all hubs, 5min cache)
│   ├── fr24-feed.js     # FR24 live flight feed proxy
│   ├── fr24-flight.js   # FR24 official API flight lookup
│   ├── metar.js         # AWC METAR weather proxy (supports batched station IDs)
│   ├── faa.js           # FAA NAS status proxy (XML → JSON)
│   ├── opensky.js       # OpenSky flight data proxy
│   └── fleet.js         # Fleet data proxy
└── vercel.json          # Vercel config + security headers + CSP + caching
```

---

## ☕ Support The Blue Board

This project is free, ad-free, and open source. It costs real money to keep running — API calls, Vercel hosting, and the time to build and maintain it.

If The Blue Board has saved you a trip to the gate screen or helped you spot an equipment swap before boarding, consider supporting the project:

### **[→ Buy Me a Coffee ☕](https://buymeacoffee.com/notjbg)**

Every donation helps cover server costs and keeps the dashboard free for everyone. You can also suggest a feature with your coffee — I read every one.

---

## 💡 Feature Requests & Contributing

Got an idea? Found a bug? **[Open an issue →](https://github.com/notjbg/the-blue-board/issues)**

The community drives this project. Some of the best features came from user suggestions on Reddit and FlyerTalk. PRs welcome too — it's a single HTML file, so the barrier to entry is low.

**Follow [@theblueboard](https://x.com/theblueboard) on X** for updates, new features, and release notes.

---

## Disclaimer

**The Blue Board is not affiliated with, endorsed by, or connected to United Airlines, Inc.** "United Airlines" and the United logo are trademarks of United Airlines, Inc.

All flight data is provided for informational purposes only and may be delayed, incomplete, or inaccurate. **Do not use this dashboard for operational or safety-critical decisions.** Always verify flight status directly with [united.com](https://www.united.com).

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*Built on a ✈️ by [Jonah Berg](https://github.com/notjbg)*
