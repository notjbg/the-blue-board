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

  it('marks response partial when official API fails after first page', async () => {
    process.env.FR24_API_TOKEN = 'test-token-12345678';

    const firstPageFlights = Array.from({ length: 10000 }, (_, i) => ({
      flight_icao: `UAL${2000 + i}`,
      flight_iata: `UA${2000 + i}`,
      status: 'scheduled',
      orig_iata: 'IAH',
      dest_iata: 'DEN',
      scheduled_departure: 1741653600,
      scheduled_arrival: 1741660800,
    }));

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('page=1')) {
        return {
          ok: true,
          json: async () => ({ data: firstPageFlights }),
        };
      }
      return {
        ok: false,
        status: 503,
        text: async () => 'service unavailable',
        headers: { get: () => '1' }
      };
    });

    const ts = Math.floor(Date.now() / 1000) - 10800;
    const req = {
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { hub: 'IAH', dir: 'departures', timestamp: String(ts) }
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.partial).toBe(true);
    expect(res.body.meta.partialReason).toBe('upstream_http_error');
    expect(res.body.meta.pagesFailed).toBe(1);
    expect(res.body.meta.pagesSucceeded).toBe(1);
  });

  it('rejects sparse official API data and falls back to scraping', async () => {
    process.env.FR24_API_TOKEN = 'test-token-12345678';

    // Official API returns flights with no scheduled times (sparse)
    const sparseFlights = Array.from({ length: 10 }, (_, i) => ({
      flight_icao: `UAL${3000 + i}`,
      flight_iata: `UA${3000 + i}`,
      status: 'scheduled',
      orig_iata: 'SFO',
      dest_iata: 'LAX',
      // No scheduled_departure or scheduled_arrival — sparse data
    }));

    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      callCount++;
      const urlStr = String(url);
      // First call: official API returns sparse data
      if (urlStr.includes('fr24api.flightradar24.com')) {
        return {
          ok: true,
          json: async () => ({ data: sparseFlights }),
        };
      }
      // Scraping fallback: return valid schedule data
      return {
        ok: true,
        json: async () => ({
          result: {
            response: {
              airport: {
                pluginData: {
                  schedule: {
                    departures: {
                      page: { current: 1, total: 1 },
                      data: [{
                        flight: {
                          airline: { code: { iata: 'UA' } },
                          identification: { number: { default: 'UA500' } },
                          time: { scheduled: { departure: 1741653600, arrival: 1741660800 } },
                          airport: {
                            origin: { code: { iata: 'SFO' } },
                            destination: { code: { iata: 'LAX' } }
                          }
                        }
                      }]
                    }
                  }
                }
              }
            }
          }
        }),
      };
    });

    const ts = Math.floor(Date.now() / 1000) - 14400;
    const req = {
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { hub: 'SFO', dir: 'departures', timestamp: String(ts) }
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    // Should have fallen back to scraping since official API was sparse
    expect(callCount).toBeGreaterThan(1); // official API call + scraping call(s)
  });

  it('filters individual sparse flights but keeps good ones from official API', async () => {
    process.env.FR24_API_TOKEN = 'test-token-12345678';

    const mixedFlights = [
      // Good flights with scheduled times
      ...Array.from({ length: 8 }, (_, i) => ({
        flight_icao: `UAL${4000 + i}`,
        flight_iata: `UA${4000 + i}`,
        status: 'scheduled',
        orig_iata: 'EWR',
        dest_iata: 'ORD',
        scheduled_departure: 1741653600 + i * 3600,
        scheduled_arrival: 1741660800 + i * 3600,
      })),
      // Sparse flights without scheduled times (< 50% so quality gate passes)
      ...Array.from({ length: 2 }, (_, i) => ({
        flight_icao: `UAL${4100 + i}`,
        flight_iata: `UA${4100 + i}`,
        status: 'scheduled',
        orig_iata: 'EWR',
        dest_iata: 'LAX',
        // No scheduled times
      })),
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: mixedFlights }),
    });

    const ts = Math.floor(Date.now() / 1000) - 18000;
    const req = {
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { hub: 'EWR', dir: 'departures', timestamp: String(ts) }
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.source).toBe('official-api');
    expect(res.body.total).toBe(8); // only good flights
    expect(res.body.meta.sparseFiltered).toBe(2);
  });
});
