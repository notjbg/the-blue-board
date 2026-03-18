import { describe, expect, it } from 'vitest';
import { computeDelayRiskModel } from '../src/lib/delay-risk.js';

describe('computeDelayRiskModel', () => {
  it('treats an existing large delay as the dominant signal', () => {
    const result = computeDelayRiskModel({
      nowMs: Date.parse('2026-03-18T17:00:00Z'),
      scheduledTime: '2026-03-18T18:00:00Z',
      comparisonTime: '2026-03-18T20:05:00Z',
      originHub: 'EWR',
      destinationHub: 'SFO',
      timeZone: 'America/New_York',
    });

    expect(result.label).toBe('HIGH');
    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.factors[0]).toContain('Already 125min delayed');
    expect(result.components[0].id).toBe('actual-delay');
  });

  it('caps stacked severe operational signals at very high risk', () => {
    const result = computeDelayRiskModel({
      nowMs: Date.parse('2026-03-18T22:15:00Z'),
      scheduledTime: '2026-03-18T23:00:00Z',
      originHub: 'EWR',
      destinationHub: 'SFO',
      timeZone: 'America/New_York',
      originFaa: { groundStop: true },
      originWeather: {
        level: 'severe',
        reasons: ['thunderstorms', 'low visibility'],
        fltCat: 'LIFR',
        hasThunderstorms: true,
        hasFreezingPrecip: false,
        hasSnow: false,
        hasFog: true,
        gustKt: 42,
        tempC: 18,
      },
      originIrops: { cancellationRate: 20, delayed60Rate: 24 },
      inboundFlight: {
        origin: 'ORD',
        lat: 41.97,
        lon: -87.9,
        spd: 230,
        alt: 10000,
        vr: 0,
        acType: 'B739',
        originWeatherLevel: 'warning',
        originFaaGroundStop: false,
        originFaaGroundDelay: true,
      },
    });

    expect(result.score).toBe(100);
    expect(result.label).toBe('V.HIGH');
    expect(result.factors).toContain('Ground stop at EWR');
    expect(result.factors).toContain('Multiple severe disruptions compounding');
  });

  it('uses aircraft journey propagation as a real scored feature', () => {
    const result = computeDelayRiskModel({
      nowMs: Date.parse('2026-03-18T18:00:00Z'),
      scheduledTime: '2026-03-18T20:30:00Z',
      originHub: 'ORD',
      destinationHub: 'MCI',
      timeZone: 'America/Chicago',
      originOtp: 52,
      originIrops: { cancellationRate: 2, delayed60Rate: 23 },
      aircraftJourney: {
        segments: [
          { flightNumber: 'UA101', delayMin: 62 },
          { flightNumber: 'UA202', delayMin: 48 },
          { flightNumber: 'UA303', delayMin: 0 },
        ],
      },
      currentFlightNumber: 'UA303',
    });

    expect(result.label).toBe('MOD');
    expect(result.factors).toContain('Aircraft running late all day (avg +55m across 2 segments)');
    expect(result.components.some((component) => component.id === 'journey-propagation')).toBe(true);
  });

  it('uses the scheduled hub-local hour for cascade scoring', () => {
    const result = computeDelayRiskModel({
      nowMs: Date.parse('2026-03-18T15:00:00Z'),
      scheduledTime: '2026-03-19T04:30:00Z',
      originHub: 'LAX',
      destinationHub: 'ORD',
      timeZone: 'America/Los_Angeles',
    });

    expect(result.factors).toContain('Late evening - high cascade risk');
  });
});
