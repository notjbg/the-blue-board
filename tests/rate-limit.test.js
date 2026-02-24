import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRateLimiter } from '../api/_rate-limit.js';

describe('createRateLimiter', () => {
  it('returns a function', () => {
    const limiter = createRateLimiter('test-returns-fn', 10);
    expect(typeof limiter).toBe('function');
  });

  it('allows requests under the limit', () => {
    const limiter = createRateLimiter('test-under-limit', 5);
    const req = { headers: { 'x-real-ip': '1.2.3.4' } };

    for (let i = 0; i < 5; i++) {
      expect(limiter(req)).toBe(false);
    }
  });

  it('blocks requests over the limit', () => {
    const limiter = createRateLimiter('test-over-limit', 3);
    const req = { headers: { 'x-real-ip': '5.6.7.8' } };

    expect(limiter(req)).toBe(false);
    expect(limiter(req)).toBe(false);
    expect(limiter(req)).toBe(false);
    // 4th request should be blocked
    expect(limiter(req)).toBe(true);
  });

  it('tracks separate IPs independently', () => {
    const limiter = createRateLimiter('test-separate-ips', 2);
    const req1 = { headers: { 'x-real-ip': '10.0.0.1' } };
    const req2 = { headers: { 'x-real-ip': '10.0.0.2' } };

    expect(limiter(req1)).toBe(false);
    expect(limiter(req1)).toBe(false);
    expect(limiter(req1)).toBe(true); // blocked

    // Different IP should still be allowed
    expect(limiter(req2)).toBe(false);
  });

  it('prefers x-real-ip over x-forwarded-for', () => {
    const limiter = createRateLimiter('test-ip-priority', 1);
    const req = {
      headers: {
        'x-real-ip': '100.0.0.1',
        'x-forwarded-for': '200.0.0.1',
      },
    };

    expect(limiter(req)).toBe(false);
    expect(limiter(req)).toBe(true); // blocked for 100.0.0.1

    // A request from the x-forwarded-for IP should still be allowed
    const req2 = { headers: { 'x-real-ip': '200.0.0.1' } };
    expect(limiter(req2)).toBe(false);
  });

  it('falls back to x-forwarded-for when x-real-ip is missing', () => {
    const limiter = createRateLimiter('test-xff-fallback', 1);
    const req = { headers: { 'x-forwarded-for': '50.0.0.1, 60.0.0.1' } };

    expect(limiter(req)).toBe(false);
    expect(limiter(req)).toBe(true);
  });

  it('handles missing headers gracefully', () => {
    const limiter = createRateLimiter('test-no-headers', 2);
    const req = { headers: {} };

    expect(limiter(req)).toBe(false);
    expect(limiter(req)).toBe(false);
    expect(limiter(req)).toBe(true);
  });

  it('uses separate stores for different endpoint names', () => {
    const limiterA = createRateLimiter('endpoint-a', 1);
    const limiterB = createRateLimiter('endpoint-b', 1);
    const req = { headers: { 'x-real-ip': '99.0.0.1' } };

    expect(limiterA(req)).toBe(false);
    expect(limiterA(req)).toBe(true); // blocked on A

    // Same IP, different endpoint — should still be allowed
    expect(limiterB(req)).toBe(false);
  });
});
