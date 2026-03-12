import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../api/fr24-usage.js';

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    end() { this.ended = true; return this; },
  };
}

describe('fr24-usage API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.FR24_API_TOKEN;
  });

  it('returns graceful error when no API token configured', async () => {
    const req = { method: 'GET', headers: { origin: 'http://localhost:3000' } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toContain('No FR24 API token');
  });

  it('sets correct CORS headers for allowed origin', async () => {
    const req = { method: 'GET', headers: { origin: 'https://theblueboard.co' } };
    const res = createRes();

    await handler(req, res);

    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://theblueboard.co');
    expect(res.headers['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
  });

  it('defaults CORS origin for disallowed origin', async () => {
    const req = { method: 'GET', headers: { origin: 'https://evil.com' } };
    const res = createRes();

    await handler(req, res);

    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://theblueboard.co');
  });

  it('returns 204 for OPTIONS preflight', async () => {
    const req = { method: 'OPTIONS', headers: { origin: 'https://theblueboard.co' } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
  });

  it('returns 405 for non-GET methods', async () => {
    const req = { method: 'POST', headers: { origin: 'http://localhost:3000' } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
  });

  it('proxies FR24 usage data with cached flag', async () => {
    process.env.FR24_API_TOKEN = 'test-token-12345678';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { endpoint: '/api/flight-summary', request_count: 50, credits: 150 },
          { endpoint: '/api/live/flight-positions', request_count: 30, credits: 90 },
        ]
      }),
    });

    const req = { method: 'GET', headers: { origin: 'http://localhost:3000' } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.cached).toBe(false);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].credits).toBe(150);
  });

  it('returns cached data on second call', async () => {
    process.env.FR24_API_TOKEN = 'test-token-12345678';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ endpoint: '/test', request_count: 1, credits: 5 }] }),
    });

    const req = { method: 'GET', headers: { origin: 'http://localhost:3000' } };

    // First call — fetches from API (may be cached from prior test due to module-level cache)
    const res1 = createRes();
    await handler(req, res1);
    const firstCallFetches = fetchSpy.mock.calls.length;

    // Second call — should be cached (no new fetch)
    const res2 = createRes();
    await handler(req, res2);
    expect(res2.body.cached).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(firstCallFetches); // no additional fetch
  });
});
