import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/fr24-feed.js';

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

describe('fr24-feed API', () => {
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

  it('rejects invalid airline codes', async () => {
    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { airline: 'DROP TABLE' },
    }, res);
    expect(res.statusCode).toBe(400);
  });

  // Error tests run before success to avoid module-level cache interference.
  // The fr24-feed handler uses a persistent in-memory cache that survives across tests.

  it('returns 502 on upstream failure (cold cache)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    });

    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: {},
    }, res);

    expect(res.statusCode).toBe(502);
  });

  it('returns 504 on timeout (cold cache)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      Object.assign(new Error('timeout'), { name: 'AbortError' })
    );

    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: {},
    }, res);

    expect(res.statusCode).toBe(504);
  });

  it('returns flight data on success', async () => {
    const mockData = { full_count: 500, version: 4, '2d5c8a': ['data'] };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: {},
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockData);
    expect(res.headers['Cache-Control']).toContain('s-maxage=15');
  });

  it('returns cached data on subsequent requests', async () => {
    // Previous test populated the cache — this request should hit it
    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: {},
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.full_count).toBe(500);
  });
});
