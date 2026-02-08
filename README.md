# ✈️ United Airlines NOC Dashboard

A real-time Network Operations Center dashboard for United Airlines, built as a single-page application with live data from public aviation APIs.

**[→ Live Dashboard](https://united-noc-vercel.vercel.app)**

---

## Overview

Bloomberg-terminal-inspired operations dashboard tracking United's mainline fleet across seven hub airports. All data is fetched live from public sources — no API keys, no authentication, no scraping.

### Tabs

| Tab | What it does |
|-----|-------------|
| **Live Ops** | Real-time flight map (OpenSky), hub status sidebar, flight phase breakdown, ticker alerts |
| **Fleet** | Full aircraft database (1,175+ mainline), searchable/sortable, Starlink status, live airborne tracking |
| **Weather** | NEXRAD radar overlay, METAR observations with plain-English explainers, FAA delay/ground stop status |
| **Analytics** | Fleet composition breakdown by type, seat configuration analysis, WiFi/IFE coverage stats |
| **Sources** | Attribution and freshness indicators for all data sources |

### Key Features

- **Interactive hub filtering** — click any hub (ORD, DEN, IAH, EWR, SFO, IAD, LAX) to filter the map and stats
- **Flight phase filtering** — filter by Ground / Climb / Cruise / Descent / Approach, composable with hub filter
- **Live fleet matching** — correlates OpenSky transponder data with the fleet database via ICAO24→N-number conversion
- **METAR decoder** — translates raw aviation weather into dispatcher-style briefings (wind, visibility, ceiling, phenomena)
- **Unified weather cards** — each hub shows radar context, current METAR, FAA status, and plain-English explainer in one card
- **Starlink tracker** — 258 aircraft equipped, sourced from [@martinamps](https://github.com/martinamps/ua-starlink-tracker)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                     │
│                                                      │
│  public/index.html — single-file, ~290KB             │
│  ├── Leaflet map + OpenStreetMap tiles               │
│  ├── NEXRAD radar tile overlay                       │
│  ├── Inline fleet database (FLEET_DB, STARLINK_DB)   │
│  └── Direct API calls (OpenSky, Google Sheets)       │
└──────────────┬──────────────────┬────────────────────┘
               │                  │
    ┌──────────▼──────┐  ┌───────▼────────┐
    │  /api/metar.js  │  │   /api/faa.js  │
    │  (CORS proxy)   │  │ (CORS + XML→   │
    │  AWC → JSON     │  │  JSON proxy)   │
    └─────────────────┘  └────────────────┘
```

**Why server-side proxies?** AWC (Aviation Weather Center) and FAA NAS don't send CORS headers, so browsers block direct requests. OpenSky and Google Sheets both serve `Access-Control-Allow-Origin: *`, so those go direct from the browser.

**Why client-side UAL filtering?** OpenSky's `operator=UAL` parameter is unreliable — it returns ~4,000 flights with only ~110 actual United. We filter client-side with `callsign.startsWith('UAL')` to get clean data.

---

## Data Sources

| Source | Endpoint | Freshness | Proxy? |
|--------|----------|-----------|--------|
| [OpenSky Network](https://opensky-network.org) | `/api/states/all` | ~15s | No (CORS ✓) |
| [Aviation Weather Center](https://aviationweather.gov) | `/api/data/metar` | ~5min | Yes (`/api/metar`) |
| [FAA NAS Status](https://nasstatus.faa.gov) | `/api/airport-status-information` | ~5min | Yes (`/api/faa`) |
| [United Fleet Site](https://sites.google.com/site/unitedfleetsite/mainline-fleet-tracking) | Google Sheets export | Daily | No (CORS ✓) |
| [Starlink Tracker](https://unitedstarlinktracker.com) | Embedded dataset | Daily | No (embedded) |
| [Iowa State NEXRAD](https://mesonet.agron.iastate.edu) | Tile server | ~5min | No (direct tiles) |

All sources are public, free, and require no API keys.

---

## Deployment

Deployed on [Vercel](https://vercel.com) with automatic deploys from this repo.

### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Project Structure

```
united-noc-vercel/
├── public/
│   └── index.html          # The entire dashboard (single file)
├── api/
│   ├── faa.js              # FAA NAS status proxy (XML → JSON)
│   ├── metar.js            # AWC METAR proxy
│   ├── opensky.js          # OpenSky proxy (fallback, not used by default)
│   └── fleet.js            # Google Sheets proxy (fallback, not used by default)
├── vercel.json             # Vercel routing + CORS headers
├── package.json
└── README.md
```

### Utility Scripts

| Script | Purpose |
|--------|---------|
| `rebuild-fleet.cjs` | Fetches latest fleet data from Google Sheets and rebuilds the inline `FLEET_DB` array |
| `fix-fleet.cjs` | One-time data cleanup for fleet entries |

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no framework, no build step)
- **Map:** [Leaflet](https://leafletjs.com) + OpenStreetMap
- **Radar:** Iowa State NEXRAD tile server
- **Font:** JetBrains Mono
- **Hosting:** Vercel (serverless functions for CORS proxies)
- **Design:** Dark theme, Bloomberg terminal aesthetic

---

## Credits

- Fleet data: [United Fleet Site](https://sites.google.com/site/unitedfleetsite/mainline-fleet-tracking) (community-maintained)
- Starlink data: [@martinamps](https://github.com/martinamps/ua-starlink-tracker) / [unitedstarlinktracker.com](https://unitedstarlinktracker.com)
- Flight tracking: [OpenSky Network](https://opensky-network.org)
- Weather: [NOAA Aviation Weather Center](https://aviationweather.gov)
- Airport status: [FAA NAS Status](https://nasstatus.faa.gov)
- Radar imagery: [Iowa State Mesonet](https://mesonet.agron.iastate.edu)

---

## License

Private project. Not for redistribution.
