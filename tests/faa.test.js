import { describe, it, expect } from 'vitest';
import { toArray } from '../api/faa.js';

describe('toArray', () => {
  it('returns empty array for undefined', () => {
    expect(toArray(undefined)).toEqual([]);
  });

  it('returns empty array for null', () => {
    expect(toArray(null)).toEqual([]);
  });

  it('returns empty array for 0', () => {
    expect(toArray(0)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(toArray('')).toEqual([]);
  });

  it('wraps a single object in an array', () => {
    const obj = { ARPT: 'ORD', Reason: 'Weather' };
    expect(toArray(obj)).toEqual([obj]);
  });

  it('returns an array as-is', () => {
    const arr = [{ ARPT: 'ORD' }, { ARPT: 'EWR' }];
    expect(toArray(arr)).toBe(arr); // same reference
  });

  it('wraps a string in an array', () => {
    expect(toArray('hello')).toEqual(['hello']);
  });

  it('wraps a number in an array', () => {
    expect(toArray(42)).toEqual([42]);
  });
});
