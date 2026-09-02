import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { cartoBasemapUrl, CARTO_DARK_TILE_TEMPLATE } from '../src/lib/basemap.js';

// CARTO started requiring an API key on its raster basemaps (Sep 2026). Without `?key=` on the
// request every tile is served with a diagonal "API KEY REQUIRED" watermark. These pins make sure
// both Leaflet maps go through the one keyed template and that the key is wired in at build time.

const mainJs = readFileSync(new URL('../src/dashboard/main.js', import.meta.url), 'utf8');
const envExample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

describe('cartoBasemapUrl', () => {
  it('appends the key as a query parameter', () => {
    expect(cartoBasemapUrl('abc123')).toBe(`${CARTO_DARK_TILE_TEMPLATE}?key=abc123`);
  });

  it('keeps every Leaflet placeholder intact and puts the query after the extension', () => {
    const url = cartoBasemapUrl('abc123');
    for (const placeholder of ['{s}', '{z}', '{x}', '{y}', '{r}']) expect(url).toContain(placeholder);
    expect(url).toMatch(/\{r\}\.png\?key=abc123$/);
  });

  it('falls back to the bare template when the key is missing (watermarked, but the map still draws)', () => {
    expect(cartoBasemapUrl('')).toBe(CARTO_DARK_TILE_TEMPLATE);
    expect(cartoBasemapUrl(undefined)).toBe(CARTO_DARK_TILE_TEMPLATE);
    expect(cartoBasemapUrl(null)).toBe(CARTO_DARK_TILE_TEMPLATE);
    expect(cartoBasemapUrl('   ')).toBe(CARTO_DARK_TILE_TEMPLATE);
    expect(cartoBasemapUrl('')).not.toContain('?');
  });

  it('URL-encodes the key so a stray character cannot break the tile URL', () => {
    expect(cartoBasemapUrl('a b&c')).toBe(`${CARTO_DARK_TILE_TEMPLATE}?key=a%20b%26c`);
  });

  it('template is the CARTO dark raster basemap with subdomain + retina placeholders', () => {
    expect(CARTO_DARK_TILE_TEMPLATE).toBe('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
  });
});

describe('dashboard wires the key into every CARTO tile layer', () => {
  it('no L.tileLayer call carries a bare basemaps.cartocdn.com literal', () => {
    const bare = mainJs.match(/L\.tileLayer\(\s*['"`]https?:\/\/[^'"`]*basemaps\.cartocdn\.com[^)]*/g) || [];
    expect(bare).toEqual([]);
  });

  it('both maps (Live Ops + NEXRAD radar) use the keyed template', () => {
    const uses = mainJs.match(/L\.tileLayer\(CARTO_DARK_TILES,/g) || [];
    expect(uses).toHaveLength(2);
  });

  it('the key is read from VITE_CARTO_BASEMAP_KEY at build time', () => {
    expect(mainJs).toContain('cartoBasemapUrl(import.meta.env.VITE_CARTO_BASEMAP_KEY)');
  });

  it('.env.example documents VITE_CARTO_BASEMAP_KEY', () => {
    expect(envExample).toMatch(/^VITE_CARTO_BASEMAP_KEY=/m);
  });
});
