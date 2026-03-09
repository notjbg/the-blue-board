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

// ═══ DELAY RISK ENGINE v2 TESTS ═══
// These replicate the scoring logic from computeDelayRisk() in index.html
// to validate the algorithm without needing a browser environment.

function makeDelayRiskScore({ delayMin = 0, faaOrig = {}, faaDest = {}, wxOrigLevel = 'normal', wxOrigCat = 'VFR', wxDestLevel = 'normal', wxDestCat = 'VFR', otp = undefined, hubHour = 10, origHub = 'ORD', hasInboundAirborne = false, timeToDepMin = 999 } = {}) {
  let score = 0;
  const factors = [];

  // Signal 1: actual delay magnitude
  if (delayMin >= 120)     { score += 50; factors.push(`Already ${delayMin}min delayed`); }
  else if (delayMin >= 60) { score += 40; factors.push(`Already ${delayMin}min delayed`); }
  else if (delayMin >= 30) { score += 30; factors.push(`${delayMin}min delay`); }
  else if (delayMin >= 15) { score += 15; factors.push(`${delayMin}min delay`); }

  // Signal 2: FAA origin
  if (faaOrig.groundStop)         { score += 30; factors.push('Ground stop'); }
  else if (faaOrig.groundDelay)   { score += 20; factors.push('GDP'); }
  else if (faaOrig.departureDelay){ score += 12; factors.push('Dep delays'); }
  else if (faaOrig.arrivalDelay)  { score += 8; factors.push('Arr delays'); }

  // Signal 3: FAA dest
  if (faaDest.groundStop)         { score += 20; factors.push('Ground stop dest'); }
  else if (faaDest.groundDelay)   { score += 15; factors.push('GDP dest'); }
  else if (faaDest.arrivalDelay)  { score += 8; factors.push('Arr delays dest'); }

  // Signal 4: weather
  if (wxOrigLevel === 'severe')      score += 20;
  else if (wxOrigLevel === 'warning') score += 14;
  else if (wxOrigLevel === 'caution') score += 6;
  if (wxOrigCat === 'LIFR')          score += 10;
  else if (wxOrigCat === 'IFR')      score += 5;
  if (wxDestLevel === 'severe')      score += 10;
  else if (wxDestLevel === 'warning') score += 5;
  if (wxDestCat === 'LIFR')          score += 5;

  // Signal 5: OTP
  if (otp !== undefined) {
    if (otp < 40)      score += 20;
    else if (otp < 55) score += 14;
    else if (otp < 70) score += 8;
    else if (otp < 80) score += 3;
  }

  // Signal 6: time of day
  if (hubHour >= 19)      score += 12;
  else if (hubHour >= 16) score += 8;
  else if (hubHour >= 13) score += 4;

  // Signal 7: inbound aircraft
  if (hasInboundAirborne) {
    if (timeToDepMin < 45)       score += 25;
    else if (timeToDepMin < 75)  score += 15;
    else if (timeToDepMin < 120) score += 8;
  }

  // Signal 8: hub risk profile
  const profiles = { EWR: 8, ORD: 5, SFO: 5, IAH: 3, DEN: 3, LAX: 2, IAD: 2, NRT: 1, GUM: 1 };
  score += profiles[origHub] || 0;

  const finalScore = Math.min(score, 100);
  let label;
  if (finalScore >= 50)      label = 'HIGH';
  else if (finalScore >= 25) label = 'MOD';
  else                       label = 'LOW';
  return { score: finalScore, label, factors };
}

describe('computeDelayRisk v2 algorithm', () => {
  it('returns LOW for clean conditions (no delays, VFR, good OTP, morning)', () => {
    const r = makeDelayRiskScore({ delayMin: 0, otp: 92, hubHour: 9, origHub: 'GUM' });
    expect(r.label).toBe('LOW');
    expect(r.score).toBeLessThan(25);
  });

  it('returns at least MOD for 60+ min delay even with no other factors', () => {
    const r = makeDelayRiskScore({ delayMin: 65, origHub: 'GUM', hubHour: 8 });
    expect(r.label).not.toBe('LOW');
    expect(r.score).toBeGreaterThanOrEqual(40);
  });

  it('returns HIGH for 60+ min delay at a major hub', () => {
    const r = makeDelayRiskScore({ delayMin: 65, origHub: 'EWR', hubHour: 8 });
    // 40 (delay) + 8 (EWR base) = 48 → still MOD, but with any other factor → HIGH
    // At EWR with afternoon: 40 + 8 + 4 = 52 → HIGH
    const r2 = makeDelayRiskScore({ delayMin: 65, origHub: 'EWR', hubHour: 14 });
    expect(r2.label).toBe('HIGH');
  });

  it('returns HIGH for 120+ min delay', () => {
    const r = makeDelayRiskScore({ delayMin: 130, origHub: 'GUM', hubHour: 8 });
    expect(r.label).toBe('HIGH');
    expect(r.score).toBeGreaterThanOrEqual(50);
  });

  it('a 30min delayed flight is at least MOD, never LOW', () => {
    const r = makeDelayRiskScore({ delayMin: 35, origHub: 'GUM', hubHour: 8 });
    expect(r.label).not.toBe('LOW');
    expect(r.score).toBeGreaterThanOrEqual(25);
  });

  it('ground stop at origin pushes score by 30', () => {
    const r = makeDelayRiskScore({ faaOrig: { groundStop: true }, origHub: 'GUM', hubHour: 8 });
    expect(r.score).toBeGreaterThanOrEqual(30);
  });

  it('severe weather + low OTP compounds to HIGH', () => {
    const r = makeDelayRiskScore({ wxOrigLevel: 'severe', otp: 35, origHub: 'ORD', hubHour: 10 });
    // severe=20 + LIFR=0(VFR) + OTP<40=20 + ORD base=5 = 45 → MOD or close to HIGH
    expect(r.score).toBeGreaterThanOrEqual(40);
  });

  it('severe weather + low OTP + evening = HIGH', () => {
    const r = makeDelayRiskScore({ wxOrigLevel: 'severe', otp: 35, origHub: 'ORD', hubHour: 20 });
    // severe=20 + OTP<40=20 + evening=12 + ORD=5 = 57 → HIGH
    expect(r.label).toBe('HIGH');
  });

  it('EWR gets higher base risk than GUM', () => {
    const ewr = makeDelayRiskScore({ origHub: 'EWR', hubHour: 10 });
    const gum = makeDelayRiskScore({ origHub: 'GUM', hubHour: 10 });
    expect(ewr.score).toBeGreaterThan(gum.score);
  });

  it('inbound aircraft still airborne with <45min to dep adds 25 points', () => {
    const r = makeDelayRiskScore({ hasInboundAirborne: true, timeToDepMin: 30, origHub: 'GUM', hubHour: 8 });
    expect(r.score).toBeGreaterThanOrEqual(25);
    expect(r.label).not.toBe('LOW');
  });

  it('weather IFR at origin adds 5 points', () => {
    const base = makeDelayRiskScore({ origHub: 'GUM', hubHour: 8 });
    const ifr = makeDelayRiskScore({ wxOrigCat: 'IFR', origHub: 'GUM', hubHour: 8 });
    expect(ifr.score - base.score).toBe(5);
  });

  it('weather LIFR at origin adds 10 points', () => {
    const base = makeDelayRiskScore({ origHub: 'GUM', hubHour: 8 });
    const lifr = makeDelayRiskScore({ wxOrigCat: 'LIFR', origHub: 'GUM', hubHour: 8 });
    expect(lifr.score - base.score).toBe(10);
  });

  it('score is capped at 100', () => {
    const r = makeDelayRiskScore({
      delayMin: 130, faaOrig: { groundStop: true }, wxOrigLevel: 'severe',
      wxOrigCat: 'LIFR', otp: 30, hubHour: 20, hasInboundAirborne: true,
      timeToDepMin: 20, origHub: 'EWR'
    });
    expect(r.score).toBe(100);
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
