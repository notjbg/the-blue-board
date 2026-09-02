// CARTO basemap tile URL.
//
// CARTO started requiring an API key on its raster basemaps in Sep 2026. A request with no `?key=`
// still returns a tile, but every one is stamped with a diagonal "API KEY REQUIRED —
// carto.com/basemaps/apikey" watermark. Both Leaflet maps (Live Ops and the NEXRAD radar) draw
// these tiles, so both go through this one template.
//
// The key is a public, per-domain tile key — it rides on every tile URL in the browser, so it is
// not a secret — but the repo is public, so it is inlined at build time from
// VITE_CARTO_BASEMAP_KEY (Vercel Production + Preview; see .env.example) rather than committed.
// Free tier: 5,000,000 tile requests per calendar month across CARTO's raster + vector services.
// CARTO + OpenStreetMap attribution must stay visible in exchange (pinned by
// tests/compliance.test.js). CARTO is retiring raster; the same key covers vector, which is the
// eventual migration.

export const CARTO_DARK_TILE_TEMPLATE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

/**
 * Build the Leaflet tile URL template for CARTO's dark basemap.
 *
 * @param {string | undefined | null} key  CARTO Basemaps API key. Empty/blank → the bare template,
 *   which still draws (watermarked) rather than breaking the map.
 * @param {string} [template]  Tile template; defaults to the dark raster basemap.
 * @returns {string}
 */
export function cartoBasemapUrl(key, template = CARTO_DARK_TILE_TEMPLATE) {
  const trimmed = typeof key === 'string' ? key.trim() : '';
  if (!trimmed) return template;
  return `${template}?key=${encodeURIComponent(trimmed)}`;
}
