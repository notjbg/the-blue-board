# Design System — The Blue Board

The Blue Board uses a dark NOC (Network Operations Center) aesthetic inspired by Bloomberg terminals and airline ops centers. All design decisions optimize for data density, readability in low-light environments, and professional aviation operations feel.

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--ua-blue` | `#005DAA` | United Airlines brand blue. Primary accent, CTAs, active states, featured borders. |
| `--ua-dark` | `#0a0e14` | Page background. Near-black with slight blue tint. |
| `--ua-panel` | `#111827` | Card/panel backgrounds. Elevated surface. |
| `--ua-border` | `#1e293b` | All borders and dividers. Subtle, low-contrast. |
| `--ua-text` | `#e2e8f0` | Primary text. High contrast on dark backgrounds. |
| `--ua-muted` | `#94a3b8` | Secondary text: dates, metadata, labels, subtitles. |
| `--ua-accent` | `#8ab4f8` | Links, interactive text, hover states. Light blue. |
| `--ua-green` | `#22c55e` | Live indicators, positive status, on-time. |
| `--ua-yellow` | `#eab308` | Warnings, moderate delays. |
| `--ua-red` | `#ef4444` | Critical alerts, cancellations, severe delays. |

## Typography

| Role | Font | Size | Weight | Notes |
|------|------|------|--------|-------|
| Body text | Inter | 13px | 400 | `line-height: 1.7` on content pages, `1.4` on dashboard |
| Headings (h1) | Inter | 22px | 700 | `letter-spacing: -.5px`, `text-wrap: balance` |
| Headings (h2) | Inter | 16px | 700 | Section dividers, with bottom border |
| Headings (h3) | Inter | 13px | 600 | `color: var(--ua-accent)` |
| Data/metadata | JetBrains Mono | 10-11px | 400-600 | Dates, categories, stats, IATA codes. `text-transform: uppercase; letter-spacing: .5px` |
| Stat values | JetBrains Mono | 20-24px | 700 | Large numbers in stat cards |

Both fonts are self-hosted as WOFF2 in `/fonts/` to eliminate FOUT.

## Layout

- **Container:** `max-width: 900px`, `padding: 20px 16px`, centered.
- **Content measure:** Body text capped at ~680px for optimal readability.
- **Sections:** Separated by `border-top: 1px solid var(--ua-border)` with `padding-top: 24px; margin-bottom: 40px`.
- **Cards:** `background: var(--ua-panel); border: 1px solid var(--ua-border); border-radius: 6px; padding: 14-20px`.
- **Featured/highlight:** `border-left: 3px solid var(--ua-blue)` on highlight boxes and featured cards.

## Components

### Breadcrumb Navigation
`font-size: 11px`, `color: var(--ua-muted)`, links in `var(--ua-accent)`. Pattern: `← The Blue Board / Section / Page`.

### Jump Navigation Pills
Rounded pills (`border-radius: 20px`) with `font-size: 10px`, uppercase, `letter-spacing: .8px`. Hover: fill with `var(--ua-blue)`, lift `translateY(-1px)` with box-shadow.

### Cross-Nav (Hub Nav / Fleet Nav)
Rectangular pills (`border-radius: 4px`) with `font-size: 11px`, `font-weight: 600`. Active state: `border-color: var(--ua-blue); color: var(--ua-blue); background: rgba(0,93,170,.1)`.

### Highlight Box
`background: var(--ua-panel); border-left: 3px solid var(--ua-blue); padding: 12px 16px; border-radius: 0 6px 6px 0; font-size: 12px`. Used for CTAs and callouts.

### Footer
Shared component (`src/components/Footer.astro`). Dark panel with disclaimer, data sources (FR24, AWC, FAA), donation CTA button, and social links. `font-size: 9px`.

## Responsive

Single breakpoint at **600px**.

- Headings: `h1` drops from 22px to 18px.
- Grids: 2-column → 1-column.
- Stat rows: stack vertically.
- Touch targets: minimum 44px hit area.

## Accessibility

- All interactive elements have visible focus states.
- Color contrast: `--ua-text` on `--ua-dark` = 13.7:1 (AAA), `--ua-muted` on `--ua-dark` = 7.4:1 (AAA).
- Semantic HTML: `<article>`, `<nav>`, `<main>`, proper heading hierarchy.
- External links: `target="_blank" rel="noopener noreferrer"` with visual indicator.
- `color-scheme: dark` on `<html>` for native dark mode support.

## Anti-Patterns (Avoid)

- No hero images or large photographs. This is a data-dense ops tool.
- No gradients or glassmorphism. Flat `var(--ua-panel)` surfaces.
- No colorful category badges. Differentiate by text label, not color.
- No drop shadows on cards. Border-only elevation.
- No animations beyond subtle transitions (200ms cubic-bezier) and the live pulse.
- No emoji overload. One functional emoji per label maximum.
