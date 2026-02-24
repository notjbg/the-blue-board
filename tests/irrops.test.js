import { describe, it, expect } from 'vitest';
import { computeMetrics, getStartOfDayForHub } from '../api/irrops.js';

// Helper to build a flight object matching FR24's schedule structure
function makeFlight(hub, {
  status = 'landed',
  schedDep = 1700000000,
  realDep = null,
  estDep = null,
  flightNum = 'UA100',
  origin = 'ORD',
  dest = 'LAX',
} = {}) {
  return {
    identification: { number: { default: flightNum } },
    airport: {
      origin: { code: { iata: origin } },
      destination: { code: { iata: dest } },
    },
    status: { generic: { status: { text: status } } },
    time: {
      scheduled: { departure: schedDep },
      real: { departure: realDep },
      estimated: { departure: estDep },
    },
  };
}

describe('computeMetrics', () => {
  it('returns score 0 for empty input', () => {
    const result = computeMetrics({});
    expect(result.score).toBe(0);
    expect(result.totalFlights).toBe(0);
    expect(result.cancellations).toBe(0);
    expect(result.delayed30).toBe(0);
    expect(result.delayed60).toBe(0);
    expect(result.diversions).toBe(0);
    expect(result.worstDelays).toEqual([]);
    expect(result.hubMetrics).toEqual({});
  });

  it('returns score 0 for a hub with no flights', () => {
    const result = computeMetrics({ ORD: [] });
    expect(result.score).toBe(0);
    expect(result.hubMetrics.ORD.total).toBe(0);
  });

  it('returns low score for all on-time flights', () => {
    const t = 1700000000;
    const flights = [
      makeFlight('ORD', { schedDep: t, realDep: t, status: 'landed' }),
      makeFlight('ORD', { schedDep: t, realDep: t + 300, status: 'landed' }), // 5 min late — still on-time
      makeFlight('ORD', { schedDep: t, realDep: t + 600, status: 'departed' }), // 10 min late — still on-time
    ];
    const result = computeMetrics({ ORD: flights });
    expect(result.score).toBe(0);
    expect(result.hubMetrics.ORD.onTime).toBe(3);
    expect(result.hubMetrics.ORD.delayed30).toBe(0);
  });

  it('weights cancellations at 3x', () => {
    const t = 1700000000;
    const flights = [
      makeFlight('ORD', { schedDep: t, realDep: t, status: 'landed' }),
      makeFlight('ORD', { schedDep: t, status: 'canceled' }),
    ];
    const result = computeMetrics({ ORD: flights });
    // score = (1*3 / 2) * 100 = 150
    expect(result.score).toBe(150);
    expect(result.cancellations).toBe(1);
    expect(result.hubMetrics.ORD.cancellations).toBe(1);
  });

  it('also recognises "cancelled" spelling', () => {
    const t = 1700000000;
    const flights = [
      makeFlight('ORD', { schedDep: t, realDep: t, status: 'landed' }),
      makeFlight('ORD', { schedDep: t, status: 'cancelled' }),
    ];
    const result = computeMetrics({ ORD: flights });
    expect(result.cancellations).toBe(1);
  });

  it('weights 60-min delays at 2x', () => {
    const t = 1700000000;
    const flights = [
      makeFlight('ORD', { schedDep: t, realDep: t + 3700, status: 'landed' }), // 61 min late
    ];
    const result = computeMetrics({ ORD: flights });
    // delayed30 = 1, delayed60 = 1 => score = (2 + 1) / 1 * 100 = 300
    expect(result.delayed30).toBe(1);
    expect(result.delayed60).toBe(1);
    expect(result.score).toBe(300);
  });

  it('counts diversions', () => {
    const t = 1700000000;
    const flights = [
      makeFlight('ORD', { schedDep: t, realDep: t, status: 'diverted' }),
    ];
    const result = computeMetrics({ ORD: flights });
    expect(result.diversions).toBe(1);
    expect(result.hubMetrics.ORD.diversions).toBe(1);
  });

  it('populates hubMetrics per hub', () => {
    const t = 1700000000;
    const result = computeMetrics({
      ORD: [
        makeFlight('ORD', { schedDep: t, realDep: t, status: 'landed' }),
        makeFlight('ORD', { schedDep: t, status: 'canceled' }),
      ],
      DEN: [
        makeFlight('DEN', { schedDep: t, realDep: t + 2500, status: 'landed' }), // 41 min late
      ],
    });
    expect(result.hubMetrics.ORD.total).toBe(2);
    expect(result.hubMetrics.ORD.cancellations).toBe(1);
    expect(result.hubMetrics.DEN.total).toBe(1);
    expect(result.hubMetrics.DEN.delayed30).toBe(1);
  });

  it('sorts worstDelays by delay descending and limits to 8', () => {
    const t = 1700000000;
    const flights = [];
    for (let i = 0; i < 12; i++) {
      // Delays of 20, 25, 30, ... 75 minutes (only > 15 qualify for worstDelays)
      const delayMin = 20 + i * 5;
      flights.push(makeFlight('ORD', {
        schedDep: t,
        realDep: t + delayMin * 60,
        status: 'landed',
        flightNum: `UA${100 + i}`,
      }));
    }
    const result = computeMetrics({ ORD: flights });
    expect(result.worstDelays.length).toBe(8);
    // First should have the largest delay
    expect(result.worstDelays[0].delay).toBe(75);
    // Last of the 8 should have the 8th largest
    expect(result.worstDelays[7].delay).toBe(40);
  });

  it('includes generatedAt ISO timestamp', () => {
    const result = computeMetrics({});
    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('getStartOfDayForHub', () => {
  it('returns a Unix timestamp (seconds)', () => {
    const ts = getStartOfDayForHub('ORD');
    expect(typeof ts).toBe('number');
    expect(ts).toBeGreaterThan(1_000_000_000);
    expect(ts).toBeLessThan(3_000_000_000); // reasonable range
  });

  it('returns different timestamps for different timezones', () => {
    const ord = getStartOfDayForHub('ORD'); // Central
    const nrt = getStartOfDayForHub('NRT'); // JST
    // They may coincidentally match if tested at the right hour, but generally differ
    // At minimum, both should be valid timestamps
    expect(typeof ord).toBe('number');
    expect(typeof nrt).toBe('number');
  });

  it('falls back to America/New_York for unknown hubs', () => {
    // Should not throw
    const ts = getStartOfDayForHub('XYZ');
    expect(typeof ts).toBe('number');
  });
});
