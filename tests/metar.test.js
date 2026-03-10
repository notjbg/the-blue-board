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
    const mockData = [{ icaoId: 'KORD', temp: 15, wspd: 10 }];
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
    expect(res.body).toEqual(mockData);
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
