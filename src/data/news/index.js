/**
 * News articles for The Blue Board's United Airlines News Hub.
 *
 * Each article is a curated commentary on United news with links to sources.
 * Tags reference hub slugs (ord, den, etc.) and fleet slugs (737-max-8, etc.)
 * to auto-generate cross-links to existing pages.
 *
 * DATA MODEL:
 *   slug        — URL-safe identifier (a-z, 0-9, hyphens only)
 *   title       — Article headline
 *   date        — ISO date string (YYYY-MM-DD)
 *   category    — Fleet | Routes | Lounges | Policy | Operations
 *   sources     — Array of { name, url } external references
 *   summary     — One-line description for index page + OG meta
 *   body        — Multi-paragraph HTML commentary (your analysis)
 *   tags        — Array of hub/fleet slugs for cross-linking
 *   ogImage     — Optional custom OG image URL (falls back to site default)
 */

import { hubOrder } from '../hubs/index.js';
import { fleetOrder } from '../fleet/index.js';

// ── Validation ──────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORIES = ['Fleet', 'Routes', 'Lounges', 'Policy', 'Operations'];

function validate(articles) {
  const slugs = new Set();
  for (const a of articles) {
    if (!a.slug || !SLUG_RE.test(a.slug)) {
      throw new Error(`News: invalid or missing slug: "${a.slug}"`);
    }
    if (slugs.has(a.slug)) {
      throw new Error(`News: duplicate slug: "${a.slug}"`);
    }
    slugs.add(a.slug);
    if (!a.title) throw new Error(`News [${a.slug}]: missing title`);
    if (!a.date || !/^\d{4}-\d{2}-\d{2}$/.test(a.date)) {
      throw new Error(`News [${a.slug}]: invalid or missing date (expected YYYY-MM-DD)`);
    }
    if (!a.summary) throw new Error(`News [${a.slug}]: missing summary`);
    if (!a.body) throw new Error(`News [${a.slug}]: missing body`);
    if (!CATEGORIES.includes(a.category)) {
      throw new Error(`News [${a.slug}]: invalid category "${a.category}" (expected: ${CATEGORIES.join(', ')})`);
    }
    // Validate source URLs are https
    if (a.sources) {
      for (const s of a.sources) {
        if (!s.url || !s.url.startsWith('https://')) {
          throw new Error(`News [${a.slug}]: source URL must be https: "${s.url}"`);
        }
      }
    }
  }
}

// ── Tag resolver ────────────────────────────────────────────────────

const knownHubs = new Set(hubOrder);
const knownFleet = new Set(fleetOrder);

/**
 * Resolves a tag to a { label, url } object, or null if unknown.
 * Hub tags → /hubs/{tag}, fleet tags → /fleet/{tag}.
 */
export function resolveTag(tag) {
  if (knownHubs.has(tag)) {
    return { label: tag.toUpperCase() + ' Hub', url: `/hubs/${tag}` };
  }
  if (knownFleet.has(tag)) {
    // Format fleet label: "737-max-8" → "737 MAX 8"
    const label = tag
      .replace(/-dreamliner$/, ' Dreamliner')
      .replace(/^a(\d)/, 'A$1')
      .replace(/-/g, ' ')
      .replace(/\b(max|er)\b/gi, (m) => m.toUpperCase())
      .replace(/^(\d)/, 'Boeing $1');
    return { label, url: `/fleet/${tag}` };
  }
  console.warn(`News: unknown tag "${tag}" — no cross-link generated`);
  return null;
}

// ── Articles (newest first) ─────────────────────────────────────────

export const articles = [
  {
    slug: 'united-opens-tickets-for-787-9-elevated-interior',
    title: 'United\'s First 787-9 with Polaris Studio Suites Enters Fleet April 22',
    date: '2026-03-19',
    category: 'Fleet',
    sources: [
      { name: 'PR Newswire (United Airlines)', url: 'https://www.prnewswire.com/news-releases/tickets-on-sale-today-for-uniteds-first-boeing-787-9-dreamliner-with-elevated-interior-flights-302407000.html' },
    ],
    summary: 'United begins selling tickets for its redesigned 787-9 Dreamliner featuring new Polaris Studio suites, 4K OLED screens at every seat, and Bluetooth connectivity throughout — inaugural SFO–Singapore flight departs April 22.',
    body: `<p>United's long-teased "Elevated" interior is finally bookable. Starting today, travelers can purchase seats on the airline's redesigned 787-9 Dreamliner — the most premium-dense international aircraft in United's fleet, with 99 of 222 seats in premium cabins.</p>

<p>The headliner is the new United Polaris Studio℠ suite: eight lie-flat, all-aisle-access seats that are 25% larger than standard Polaris seats, with privacy doors, a companion ottoman, wireless charging, and a massive 27-inch 4K OLED screen — the largest seatback display among U.S. carriers. Even Economy gets a meaningful upgrade: 13-inch 4K OLED screens with Bluetooth at every seat and larger overhead bins.</p>

<p>The inaugural international flight, UA1, departs San Francisco for Singapore on April 22, with SFO–London following on April 30. United plans to have at least 30 Elevated 787-9s flying by the end of 2027 — a significant fleet-wide transformation for long-haul travelers.</p>`,
    tags: ['sfo', '787-9-dreamliner'],
    ogImage: null,
  },
  {
    slug: 'united-delivers-first-737-max-to-guam',
    title: 'United Delivers First 737 MAX to Guam Fleet',
    date: '2026-03-19',
    category: 'Fleet',
    sources: [
      { name: 'United Airlines Newsroom', url: 'https://www.united.com/en/us/newsroom' },
    ],
    summary: 'United Airlines has stationed its first Boeing 737 MAX aircraft at Guam, expanding its Pacific island hub with modern, fuel-efficient narrowbodies.',
    body: `<p>United Airlines has delivered its first Boeing 737 MAX to its Guam hub, marking a significant fleet modernization for the airline's Pacific island operations. The 737 MAX replaces older 737-800s on key island-hopping routes across Micronesia.</p>

<p>The MAX's improved range and fuel efficiency make it well-suited for Guam's unique route network, which connects far-flung island communities across thousands of miles of open ocean. United is the only major U.S. carrier serving Guam as a hub, and the fleet upgrade signals continued investment in the Pacific.</p>

<p>For travelers, the 737 MAX brings Starlink WiFi eligibility, larger overhead bins, and improved cabin pressure — a meaningful upgrade on routes where the aircraft is often the only connection to the outside world.</p>`,
    tags: ['gum', '737-max-8'],
    ogImage: null,
  },
];

// ── Exports ─────────────────────────────────────────────────────────

// Validate at import time — build fails immediately on bad data
validate(articles);

/** Ordered list of slugs (newest first — same order as articles array) */
export const newsOrder = articles.map((a) => a.slug);

/** Map of slug → article for quick lookup */
export const newsMap = Object.fromEntries(articles.map((a) => [a.slug, a]));

/** Categories used across all articles */
export const newsCategories = CATEGORIES;
