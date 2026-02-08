# ✈️ The Blue Board

**An unofficial, real-time operations dashboard for United Airlines — built by flyers, for flyers.**

**[→ Live Dashboard](https://theblueboard.co)** · **[Buy Me a WiFi Day Pass ☕](https://buymeacoffee.com/notjbg)**

![The Blue Board — Live Operations Map](https://theblueboard.co/og-image.png)

---

## What Is This?

The Blue Board is a fan-built operations dashboard that lets you see United Airlines like an ops center would — live flight positions, hub schedules, fleet data, weather, and analytics, all in one dark, data-dense interface.

**Not affiliated with United Airlines, Inc.** This is an independent project by aviation enthusiasts.

---

## Features

### 📡 Live Ops
Real-time map tracking 600+ United flights. Filter by hub, flight phase, or search by flight number, tail, or route. Hub status sidebar shows departures/arrivals and identifies the busiest hub.

### 📅 Schedule
Departure and arrival schedules for all 7 UA hubs (ORD, DEN, IAH, EWR, SFO, IAD, LAX). Filter by status, aircraft type, or search. On-time performance stats. All times displayed in airport local timezone.

### ✈️ Fleet
Complete database of 1,200+ mainline aircraft — searchable by type, registration, config, WiFi, and IFE. Starlink tracker for 258+ equipped aircraft. Live fleet status correlates airborne flights with the database.

### 🌦 Weather
METAR observations with plain-English explainers, NEXRAD radar overlay, and FAA NAS delay/ground stop alerts for every hub. Each hub gets a unified weather card with conditions, visibility, wind, and ceiling.

### 📊 Analytics
Fleet composition by aircraft type, seat configuration analysis, WiFi/IFE coverage stats, and utilization metrics.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                     │
│                                                      │
│  public/index.html — single-file dark NOC dashboard  │
│  ├── Leaflet map + OpenStreetMap tiles               │
│  ├── NEXRAD radar tile overlay                       │
│  ├── Inline fleet database (1,200+ aircraft)         │
│  └── All API calls go through server-side proxies    │
└──────────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────┐
    │        Vercel Serverless Functions       │
    │                                          │
    │  /api/schedule  — FR24 schedule proxy    │
    │                   (cached, rate-limited, │
    │                    UA-filtered)          │
    │  /api/fr24-feed — Live flight positions  │
    │  /api/metar     — AWC weather proxy      │
    │  /api/faa       — FAA NAS status proxy   │
    │  /api/opensky   — OpenSky proxy          │
    │  /api/fleet     — Fleet data proxy       │
    └─────────────────────────────────────────┘
```

### Why Server-Side Proxies?

- **Rate limiting** — One server fetches data for all users, not 500 browsers hammering APIs independently
- **Caching** — Schedule data cached 60s (live) / 5min (historical), reducing upstream load by 90%+
- **UA filtering** — Server filters to United flights only, shrinking payloads dramatically
- **CORS** — Some sources (AWC, FAA) don't allow direct browser requests

---

## Data Sources

| Source | Data | Freshness | Notes |
|--------|------|-----------|-------|
| [Flightradar24](https://flightradar24.com) | Live positions + schedules | ~15s / ~60s | Server-side proxy with caching |
| [Aviation Weather Center](https://aviationweather.gov) | METAR observations | ~5min | NOAA/CORS proxy |
| [FAA NAS Status](https://nasstatus.faa.gov) | Delays & closures | ~5min | XML→JSON proxy |
| [United Fleet Site](https://sites.google.com/site/unitedfleetsite/) | Fleet database | Daily | Community-maintained |
| [Starlink Tracker](https://unitedstarlinktracker.com) | WiFi-equipped aircraft | Daily | [@martinamps](https://github.com/martinamps/ua-starlink-tracker) |
| [Iowa State NEXRAD](https://mesonet.agron.iastate.edu) | Radar imagery | ~5min | Direct tile server |

All sources are public. No API keys required.

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step, single file
- **Map:** [Leaflet](https://leafletjs.com) + OpenStreetMap
- **Radar:** Iowa State NEXRAD WMS tiles
- **Font:** [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- **Hosting:** [Vercel](https://vercel.com) (serverless functions + edge CDN)
- **Analytics:** Vercel Web Analytics
- **Design:** Dark NOC theme, inspired by Bloomberg terminals and airline ops centers

---

## Local Development

```bash
git clone https://github.com/notjbg/the-blue-board.git
cd the-blue-board

# Install Vercel CLI
npm i -g vercel

# Run locally (serves static files + serverless functions)
vercel dev

# Deploy to production
vercel --prod
```

---

## Project Structure

```
├── public/
│   ├── index.html       # The entire dashboard (~330KB single file)
│   ├── og-image.png     # Social media preview image
│   ├── robots.txt       # Search engine directives
│   └── sitemap.xml      # Sitemap
├── api/
│   ├── schedule.js      # FR24 schedule proxy (cached, rate-limited, UA-filtered)
│   ├── fr24-feed.js     # FR24 live flight feed proxy
│   ├── metar.js         # AWC METAR weather proxy
│   ├── faa.js           # FAA NAS status proxy (XML → JSON)
│   ├── opensky.js       # OpenSky flight data proxy
│   └── fleet.js         # Fleet data proxy
├── vercel.json          # Vercel config + headers
├── rebuild-fleet.cjs    # Utility: rebuild inline fleet database from Google Sheets
└── fix-fleet.cjs        # Utility: one-time fleet data cleanup
```

---

## Contributing

Feature ideas? Bug reports? [Open an issue](https://github.com/notjbg/the-blue-board/issues) — contributions welcome.

Want to support the project? [Buy me a WiFi day pass ☕](https://buymeacoffee.com/notjbg)

---

## Disclaimer

**The Blue Board is not affiliated with, endorsed by, or connected to United Airlines, Inc.** "United Airlines" and the United logo are trademarks of United Airlines, Inc.

All flight data is provided for informational purposes only and may be delayed, incomplete, or inaccurate. **Do not use this dashboard for operational or safety-critical decisions.** Always verify flight status directly with [united.com](https://www.united.com).

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*Built with ✈️ by [Jonah Berg](https://github.com/notjbg)*
