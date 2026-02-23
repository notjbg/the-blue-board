# Reddit Post Draft — r/unitedairlines

**Title:** The Blue Board v0.2 is here — 70+ updates in 8 days based on your feedback

---

A week ago I shared The Blue Board here and you all showed up — 11,000+ visitors, tons of feedback, and a bunch of ideas I never would've thought of. I took all of it and went heads down. Here's everything that shipped in v0.2:

## New Features

**🔗 Shareable flight links**
Every flight now has a shareable URL. Click the 📤 button on any flight popup → copies `theblueboard.co/?flight=UA1234` to your clipboard. Send it to whoever's picking you up, drop it in the group chat, post it wherever. They'll see the flight live on the map instantly.

**🔔 Push notification alerts**
Watch any flight and opt into browser push notifications. You'll get alerted on:
- Delays (and when delays get worse)
- Gate changes
- Departure and landing
- Cancellations and diversions

No account, no email, no sign-up. Just click Watch → Enable alerts.

**🌏 All 9 United hubs now tracked**
Added **Guam (GUM)** and **Tokyo Narita (NRT)**. New Pacific view toggle lets you see the full global network. Every hub has a dedicated guide page with terminal maps, Polaris lounge info, construction alerts, and quick links to live data.

**📊 Hub Health Bar**
Real-time on-time performance across all 9 hubs, right at the top:
- 🟢 >70% on-time
- 🟡 50–70%
- 🔴 <50%

Plus a network-wide status label (Smooth Ops / Some Delays / Rough Day).

**🚨 IRROPS Dashboard**
New disruption metrics panel: cancellations, 30/60-min delays, diversions, worst delays of the day, all broken down by hub.

**✈️ Real departure & arrival times**
Flight popups now show actual vs. scheduled times. If your flight's late, you'll see exactly how late and whether it's getting worse.

**👁️ Flight Watch**
Click Watch on any flight. Tracked flights appear in a panel with live status updates. Combined with push alerts, you can close the tab and still know what's happening.

**🔍 Smarter search**
Search by route (ORD-DEN or ORD DEN), flight number, tail number, or callsign. Results are instant.

**📱 Install as an app**
Full PWA support — add The Blue Board to your home screen on iOS/Android or install it on desktop. Works offline for the shell with live data on reconnect.

## Under the Hood

**Plane icons** — Replaced the emoji planes with proper SVG aircraft silhouettes. Fixed heading rotation that was off by 45°. They actually point the right direction now.

**Mobile layout** — Completely rebuilt with flexbox. No more scrolling to find the header. Touch targets properly sized. Map controls repositioned so they don't overlap.

**Service worker** — Rewrote it from scratch. The old one was intercepting map tile requests and CDN resources, causing blank maps for some users. Now it only caches what it should.

**Hub health reliability** — The health bar was only showing 3 of 9 hubs because FlightRadar24 was rate-limiting our API calls. Rebuilt with sequential fetching, retry logic, and a persistent cache so data survives temporary blocks.

**Fleet database** — Removed 97 undelivered MAX 9 aircraft that were showing as part of the fleet. Corrected Polaris lounge info, terminal assignments, and construction alerts across all hub pages.

**OTP calculations** — Fixed on-time performance math: now requires real timestamps (not estimates), minimum 5 operated flights, and clears stale data properly.

**Security** — XSS protection on inputs, CORS hardening, Content Security Policy headers, API routes blocked from crawlers.

**SEO & AI** — Added `llms.txt` so AI assistants can describe the site accurately, structured data markup, sitemap, and proper meta tags.

## By the Numbers
- 🔧 70+ commits in 8 days
- 🌏 9 hubs (up from 7)
- 📄 9 new hub guide pages
- ✈️ 3 new API endpoints
- 📱 Full PWA support
- 🔔 Push notifications
- 🔗 Deep-linkable flights
- 💰 Still free. Still no ads.

---

If you want to help keep the servers running: [buymeacoffee.com/theblueboard](https://buymeacoffee.com/theblueboard)

**What should v0.3 focus on?** I'm thinking historical delay trends, airline-wide stats, maybe airport weather radar on the map — but I want to hear what you actually want. Drop ideas below.

*[theblueboard.co](https://theblueboard.co)*
