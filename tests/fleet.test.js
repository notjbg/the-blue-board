import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/fleet.js';

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    send(payload) { this.body = payload; return this; },
  };
}

describe('fleet API', () => {
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

  it('rejects invalid gid', async () => {
    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { gid: '99' },
    }, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns CSV on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'tail,type,engine\nN12345,737-900,CFM56',
    });

    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { gid: '0' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/csv; charset=utf-8');
    expect(res.body).toContain('N12345');
  });

  it('returns 502 on upstream failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 });

    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { gid: '0' },
    }, res);

    expect(res.statusCode).toBe(502);
  });

  it('returns 504 on timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(Object.assign(new Error('timeout'), { name: 'AbortError' }));

    const res = createRes();
    await handler({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { gid: '0' },
    }, res);

    expect(res.statusCode).toBe(504);
  });
});
