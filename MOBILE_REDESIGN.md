# Blue Board Mobile Redesign Spec

## Philosophy: Map-first mobile experience
70% of traffic is mobile. The map IS the product. Maximize map viewport, minimize chrome.

## File: `public/index.html` (single-file app, ~4500 lines)
**DO NOT** create new files, frameworks, or build systems. All changes go in this one file.

## Changes (ordered by priority)

### 1. Map overlay buttons → collapsed behind single icon
**Current:** 5 stacked buttons (Hubs, Long-haul, Weather, Pacific, Refresh) eating map space on the right side.
**Target:** Single layers/hamburger icon button (⋮ or ☰) in top-right of map. Tapping it reveals the 5 buttons in a small floating menu. Tap again or tap elsewhere to dismiss. Refresh button stays always-visible (it's an action, not a toggle).
**Where:** CSS around line 445-446 (`#tab-live #controls`), HTML at lines 697-705, JS for toggle behavior.
**Mobile only** (`@media max-width:768px`). Desktop unchanged.

### 2. Stats bar → compact scrollable strip
**Current:** 3x3 grid of 9 stats below the map. Takes ~150px vertical space.
**Target:** Single horizontal scrollable row. Each stat is a compact pill: `545 Airborne` side-by-side, not stacked. Horizontally scrollable with `-webkit-overflow-scrolling: touch`. Max height ~40px. Key stats (Airborne, Utilization, Starlink) come first in order.
**Where:** CSS at lines 447-451 (`#stats-bar` mobile overrides), HTML at lines 708-728.
**Reorder the stat items in HTML:** Airborne, Utilization, Starlink, Climbing, Cruising, Descending, Ground, Avg Alt, Avg Spd.

### 3. Alert ticker → static single-line
**Current:** Scrolling marquee animation, 28px tall.
**Target:** Static single line, truncated with ellipsis, same 28px. Show most important/recent alert. If multiple alerts, rotate every 5s with a fade transition (not scrolling). Keep the red "ALERTS" label on the left.
**Where:** CSS at lines 190-195 (`.ticker-wrap`, `.ticker`), JS that populates the ticker.

### 4. Bottom nav → 4 tabs max with larger icons
**Current:** 6 tabs (Live, Schedule, Fleet, Weather, Stats, Sources). Small 18px emoji icons.
**Target:** 4 tabs: Live, Schedule, Fleet, More (▾). "More" opens a small popup menu with Weather, Stats, Sources. Icons bumped to 22px. Labels bumped to 12px.
**Where:** CSS at lines 481-485, HTML at lines 670-680, JS at lines 1367+.

### 5. Hub health bar → hide on mobile by default
**Current:** Always visible row showing hub health percentages. Uses vertical space.
**Target:** Hidden by default on mobile. Accessible via a small "Hub Health ▾" toggle in the header area or within the sidebar.
**Where:** CSS line 531 (`#hub-health-bar`), add `display:none` in mobile media query.

### 6. Footer → condensed single line on mobile
**Current:** 3-line footer with links, hub list, data sources, support button, attribution.
**Target:** Single line: "The Blue Board · Independent · About & Disclaimer" with the BMAC button. Hub links and data source links hidden on mobile (they're accessible via the nav tabs and About modal).
**Where:** The inline-styled div starting at line 4344. Add a mobile class or use media query to hide the hub links div and data sources div.

### 7. Typography hierarchy
**Current:** Stats values and labels both 14px on mobile. Everything competes.
**Target:** Stat values: 13px bold. Stat labels: 10px muted. Header "THE BLUE BOARD" stays 14px. "LIVE · 673 flights" slightly emphasized. Create clear visual weight: header > live count > stats.

## Constraints
- **Single file only.** No new files.
- **Desktop must not change.** All changes inside `@media(max-width:768px)` or mobile-specific classes.
- **Test nothing is broken** on desktop widths after changes.
- **Preserve all functionality.** Just reorganize the mobile layout.
- **Keep the existing dark theme / color variables.**
- **Git: commit with message** `feat: mobile-first redesign — map-maximized layout`
- **Do NOT push or deploy.** Jonah will review first.
