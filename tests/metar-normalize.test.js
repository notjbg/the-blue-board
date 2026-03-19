import { describe, it, expect } from 'vitest';
import { normalizeMetarPayload } from '../src/lib/metar.js';

describe('normalizeMetarPayload', () => {
  it('accepts wrapped payloads and alternate field names', () => {
    const [record] = normalizeMetarPayload({
      metars: [{
        station: 'pgum',
        raw: 'METAR PGUM 182354Z 04013KT 10SM FEW065 28/19 A2992',
        category: 'vfr',
        vis: '10',
        wind_direction: 40,
        wind_speed: 13,
        temperature: 28,
        skyConditions: [{ skyCover: 'FEW', altitudeFt: 6500 }],
      }],
    });

    expect(record).toMatchObject({
      icaoId: 'PGUM',
      stationId: 'PGUM',
      id: 'PGUM',
      rawOb: 'METAR PGUM 182354Z 04013KT 10SM FEW065 28/19 A2992',
      fltCat: 'VFR',
      visib: '10',
      wdir: 40,
      wspd: 13,
      temp: 28,
      clouds: [{ cover: 'FEW', base: 6500 }],
    });
  });

  it('returns an empty list for non-array error payloads', () => {
    expect(normalizeMetarPayload({ error: 'rate limited' })).toEqual([]);
  });
});
