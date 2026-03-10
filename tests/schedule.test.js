import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../api/schedule.js';

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

describe('schedule API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.FR24_API_TOKEN;
  });

  it('treats missing schedule block as empty data instead of upstream failure', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          response: {
            airport: {
              pluginData: {}
            }
          }
        }
      })
    });

    const ts = Math.floor(Date.now() / 1000);
    const req = {
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { hub: 'LAX', dir: 'departures', timestamp: String(ts) }
    };
    const res = createRes();

    await handler(req, res);

    expect(fetchMock).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.partial).toBe(false);
    expect(res.body.total).toBe(0);
    expect(res.body.meta.partialReason).toBe(null);
  });
});
