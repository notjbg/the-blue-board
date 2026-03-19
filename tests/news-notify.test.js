import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockBroadcastCreate = vi.fn();
const mockBroadcastSend = vi.fn();

vi.mock('../api/_supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    broadcasts: {
      create: mockBroadcastCreate,
      send: mockBroadcastSend,
    },
  })),
}));

import handler from '../api/news-notify.js';
import { supabase } from '../api/_supabase.js';

let selectResult;
let upsertResult;

function makeReq(overrides = {}) {
  return {
    method: 'POST',
    headers: { authorization: 'Bearer test-secret' },
    ...overrides,
  };
}

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'test-secret');
  vi.stubEnv('RESEND_API_KEY', 'test-key');
  vi.stubEnv('RESEND_AUDIENCE_ID', 'aud-123');
  mockBroadcastCreate.mockReset();
  mockBroadcastSend.mockReset();

  // Default: broadcast create/send succeed
  mockBroadcastCreate.mockResolvedValue({ data: { id: 'bcast-123' }, error: null });
  mockBroadcastSend.mockResolvedValue({ error: null });

  selectResult = { data: null, error: null };
  upsertResult = { error: null };

  const mockSingle = vi.fn(() => selectResult);
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockUpsert = vi.fn(() => upsertResult);

  supabase.from.mockImplementation((table) => {
    return { select: mockSelect, upsert: mockUpsert };
  });

  // Mock global fetch for news-latest.json
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve([
          { slug: 'test-article', title: 'Test Article', date: '2026-03-19', category: 'Fleet' },
        ]),
    })
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('news-notify API', () => {
  it('rejects non-POST requests', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });

  it('rejects unauthorized requests', async () => {
    const res = makeRes();
    await handler(makeReq({ headers: { authorization: 'Bearer wrong' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('rejects requests with no auth header', async () => {
    const res = makeRes();
    await handler(makeReq({ headers: {} }), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 500 if RESEND_API_KEY is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/RESEND_API_KEY/);
  });

  it('skips if already sent for the same slug', async () => {
    selectResult = { data: { slug: 'test-article' }, error: null };
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('already_sent');
    expect(mockBroadcastCreate).not.toHaveBeenCalled();
  });

  it('creates and sends broadcast for new articles', async () => {
    selectResult = { data: null, error: null };
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('sent');
    expect(res.body.slug).toBe('test-article');
    expect(mockBroadcastCreate).toHaveBeenCalledOnce();
    expect(mockBroadcastSend).toHaveBeenCalledWith('bcast-123');
  });

  it('sends broadcast when last slug differs', async () => {
    selectResult = { data: { slug: 'old-article' }, error: null };
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('sent');
    expect(mockBroadcastCreate).toHaveBeenCalledOnce();
    expect(mockBroadcastSend).toHaveBeenCalledOnce();
  });

  it('returns no_articles when news-latest.json is empty', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('no_articles');
  });

  it('returns 500 when broadcast create fails', async () => {
    selectResult = { data: null, error: null };
    mockBroadcastCreate.mockResolvedValue({ data: null, error: { message: 'Invalid audience' } });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/Failed to send/);
  });
});
