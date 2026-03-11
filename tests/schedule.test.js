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

  it('treats missing schedule block on page 1 as empty data instead of upstream failure', async () => {
    // FR24 returns a valid airport payload but with no schedule block (future dates)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
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

    expect(res.statusCode).toBe(200);
    expect(res.body.partial).toBe(false);
    expect(res.body.total).toBe(0);
    expect(res.body.meta.partialReason).toBe(null);
  });

  it('returns valid empty result when official API returns 0 flights', async () => {
    process.env.FR24_API_TOKEN = 'test-token-12345678';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    // Use a distinct timestamp to avoid hitting cache from previous test
    const ts = Math.floor(Date.now() / 1000) - 3600;
    const req = {
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { hub: 'DEN', dir: 'arrivals', timestamp: String(ts) }
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.partial).toBe(false);
    expect(res.body.total).toBe(0);
    expect(res.body.meta.source).toBe('official-api');
    expect(res.body.meta.partialReason).toBe(null);
  });

  it('parses numeric-string timestamps from official API so schedule times are populated', async () => {
    process.env.FR24_API_TOKEN = 'test-token-12345678';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          flight_icao: 'UAL2118',
          flight_iata: 'UA2118',
          status: 'scheduled',
          orig_iata: 'ORD',
          dest_iata: 'DEN',
          scheduled_departure: '1741653600',
          scheduled_arrival: '1741660800',
          estimated_departure: '1741654200'
        }]
      }),
    });

    const ts = Math.floor(Date.now() / 1000) - 7200;
    const req = {
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { hub: 'ORD', dir: 'departures', timestamp: String(ts) }
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1);
    const flight = res.body.flights[0];
    expect(flight.time.scheduled.departure).toBe(1741653600);
    expect(flight.time.scheduled.arrival).toBe(1741660800);
    expect(flight.time.estimated.departure).toBe(1741654200);
  });
});
