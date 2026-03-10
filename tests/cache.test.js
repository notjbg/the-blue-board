import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheStore } from '../api/_cache.js';

describe('CacheStore', () => {
  it('returns null for missing keys', () => {
    const cache = new CacheStore('test');
    expect(cache.get('missing')).toBeNull();
  });

  it('stores and retrieves values', () => {
    const cache = new CacheStore('test');
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('respects TTL — expires after defaultTTL', () => {
    const cache = new CacheStore('test', { defaultTTL: 100 });
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');

    vi.useFakeTimers();
    vi.advanceTimersByTime(101);
    expect(cache.get('key')).toBeNull();
    vi.useRealTimers();
  });

  it('supports per-entry TTL override', () => {
    vi.useFakeTimers();
    const cache = new CacheStore('test', { defaultTTL: 10_000 });
    cache.set('short', 'val', 50);
    cache.set('long', 'val', 5_000);

    vi.advanceTimersByTime(100);
    expect(cache.get('short')).toBeNull();
    expect(cache.get('long')).toBe('val');
    vi.useRealTimers();
  });

  it('evicts oldest entry when at maxSize', () => {
    const cache = new CacheStore('test', { maxSize: 2, defaultTTL: 60_000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // should evict 'a'
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('does not evict when updating existing key', () => {
    const cache = new CacheStore('test', { maxSize: 2, defaultTTL: 60_000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10); // update, not insert
    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBe(2);
    expect(cache.size).toBe(2);
  });

  it('getStale returns expired value within grace window', () => {
    vi.useFakeTimers();
    const cache = new CacheStore('test', { defaultTTL: 100 });
    cache.set('key', 'stale-value');

    vi.advanceTimersByTime(150); // expired by 50ms
    expect(cache.get('key')).toBeNull();
    expect(cache.getStale('key', 100)).toBe('stale-value'); // within 100ms grace

    vi.advanceTimersByTime(100); // now 250ms total, 150ms past expiry
    expect(cache.getStale('key', 100)).toBeNull(); // beyond grace
    vi.useRealTimers();
  });

  it('getStale returns null for missing keys', () => {
    const cache = new CacheStore('test');
    expect(cache.getStale('missing', 10_000)).toBeNull();
  });

  it('delete removes an entry', () => {
    const cache = new CacheStore('test');
    cache.set('key', 'value');
    cache.delete('key');
    expect(cache.get('key')).toBeNull();
    expect(cache.size).toBe(0);
  });

  it('clear removes all entries', () => {
    const cache = new CacheStore('test');
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('prune removes only expired entries', () => {
    vi.useFakeTimers();
    const cache = new CacheStore('test', { defaultTTL: 100 });
    cache.set('old', 'val');

    vi.advanceTimersByTime(50);
    cache.set('new', 'val');

    vi.advanceTimersByTime(60); // old expired (110ms), new still fresh (60ms)
    cache.prune();
    expect(cache.get('old')).toBeNull();
    expect(cache.get('new')).toBe('val');
    expect(cache.size).toBe(1);
    vi.useRealTimers();
  });

  it('stores objects and arrays by reference', () => {
    const cache = new CacheStore('test');
    const obj = { a: 1, b: [2, 3] };
    cache.set('key', obj);
    expect(cache.get('key')).toBe(obj);
  });
});
