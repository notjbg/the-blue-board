import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing handler
vi.mock('../api/_supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

import handler from '../api/waitlist.js';
import { supabase } from '../api/_supabase.js';

// Use unique IPs per test to avoid rate limiter collisions
let ipCounter = 100;
function uniqueIp() { return '10.0.0.' + (ipCounter++); }

function makeReq(overrides = {}) {
  return {
    method: 'POST',
    headers: { origin: 'https://theblueboard.co', 'x-real-ip': uniqueIp() },
    body: { email: 'test@example.com' },
    ...overrides,
  };
}

function makeRes() {
  const res = {
    _status: 0,
    _json: null,
    _headers: {},
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    end() { return res; },
    setHeader(k, v) { res._headers[k] = v; return res; },
  };
  return res;
}

describe('waitlist API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue({
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    });
  });

  it('rejects non-POST methods', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(res._status).toBe(405);
  });

  it('returns 400 for missing email', async () => {
    const res = makeRes();
    await handler(makeReq({ body: {} }), res);
    expect(res._status).toBe(400);
  });

  it('returns 400 for invalid email', async () => {
    const res = makeRes();
    await handler(makeReq({ body: { email: 'not-an-email' } }), res);
    expect(res._status).toBe(400);
  });

  it('returns 400 for empty email', async () => {
    const res = makeRes();
    await handler(makeReq({ body: { email: '' } }), res);
    expect(res._status).toBe(400);
  });

  it('returns success for valid email', async () => {
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ success: true });
  });

  it('upserts with correct data', async () => {
    const mockUpsert = vi.fn(() => Promise.resolve({ error: null }));
    supabase.from.mockReturnValue({ upsert: mockUpsert });

    const res = makeRes();
    await handler(makeReq({ body: { email: 'Test@Example.com', source: 'footer', featureRequest: 'Dark mode' } }), res);

    expect(supabase.from).toHaveBeenCalledWith('waitlist');
    expect(mockUpsert).toHaveBeenCalledWith(
      { email: 'test@example.com', source: 'footer', feature_request: 'Dark mode' },
      { onConflict: 'email' }
    );
    expect(res._status).toBe(200);
  });

  it('returns 500 on Supabase error', async () => {
    supabase.from.mockReturnValue({
      upsert: vi.fn(() => Promise.resolve({ error: { message: 'db error' } })),
    });

    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(500);
  });

  it('handles OPTIONS preflight', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'OPTIONS' }), res);
    expect(res._status).toBe(204);
  });

  it('rejects forbidden origins', async () => {
    const res = makeRes();
    await handler(makeReq({ headers: { origin: 'https://evil.com', 'x-real-ip': uniqueIp() } }), res);
    expect(res._status).toBe(403);
  });

  it('truncates long source and feature_request', async () => {
    const mockUpsert = vi.fn(() => Promise.resolve({ error: null }));
    supabase.from.mockReturnValue({ upsert: mockUpsert });

    const res = makeRes();
    await handler(makeReq({
      body: {
        email: 'a@b.com',
        source: 'x'.repeat(100),
        featureRequest: 'y'.repeat(1000),
      },
    }), res);

    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.source.length).toBe(50);
    expect(upsertArg.feature_request.length).toBe(500);
  });
});
