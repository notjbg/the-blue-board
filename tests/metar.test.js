import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/metar.js';

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('metar API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-GET requests', async () => {
    const res = createRes();
    await handler({ method: 'POST', headers: {}, query: {} }, res);
    expect(res.statusCode).toBe(405);
  });

  it('rejects forbidden origins', async () => {
    const res = createRes();
    await handler({ method: 'GET', headers: { origin: 'https://evil.com' }, query: {} }, res);
    expect(res.statusCode).toBe(403);
  });

  it('rejects invalid airport IDs', async () => {
    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { ids: 'DROP TABLE' },
    }, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns weather data on success', async () => {
    const mockData = {
      data: [{
        station_id: 'kord',
        raw_text: 'METAR KORD 182351Z 28005KT 10SM BKN250 06/M01 A3001',
        flight_category: 'vfr',
        visibility: '10+',
        wind_dir_degrees: '280',
        wind_speed_kt: '5',
        temperature_c: '6.1',
        sky_condition: [{ sky_cover: 'BKN', altitude_ft_agl: 25000 }],
      }],
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { ids: 'KORD' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject([{
      icaoId: 'KORD',
      stationId: 'KORD',
      id: 'KORD',
      rawOb: 'METAR KORD 182351Z 28005KT 10SM BKN250 06/M01 A3001',
      fltCat: 'VFR',
      visib: '10+',
      wdir: 280,
      wspd: 5,
      temp: 6.1,
      clouds: [{ cover: 'BKN', base: 25000 }],
    }]);
    expect(res.headers['Cache-Control']).toContain('s-maxage=300');
  });

  it('returns 502 on upstream failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 });

    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { ids: 'KORD' },
    }, res);

    expect(res.statusCode).toBe(502);
  });

  it('returns 504 on timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(Object.assign(new Error('timeout'), { name: 'AbortError' }));

    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { ids: 'KORD' },
    }, res);

    expect(res.statusCode).toBe(504);
  });

  it('accepts comma-separated airport IDs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { ids: 'KORD,KDEN,KEWR' },
    }, res);

    expect(res.statusCode).toBe(200);
  });
});
