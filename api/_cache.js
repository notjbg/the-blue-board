// Shared in-memory cache for API endpoints
// TTL-based with optional max-size eviction and stale-while-revalidate support

export class CacheStore {
  /**
   * @param {string} name - Cache name (for logging)
   * @param {{ maxSize?: number, defaultTTL?: number }} options
   */
  constructor(name, { maxSize = 100, defaultTTL = 60_000 } = {}) {
    this.name = name;
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this._store = new Map(); // key → { value, expires }
  }

  /** Get a cached value, or null if expired/missing. */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) return null;
    return entry.value;
  }

  /** Get a cached value even if expired, within a grace window (ms). Returns null if beyond grace. */
  getStale(key, graceMs) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires + graceMs) return null;
    return entry.value;
  }

  /** Store a value with optional TTL override (ms). */
  set(key, value, ttl) {
    // Evict oldest entries if at capacity
    if (this._store.size >= this.maxSize && !this._store.has(key)) {
      const oldest = this._store.keys().next().value;
      this._store.delete(oldest);
    }
    this._store.set(key, {
      value,
      expires: Date.now() + (ttl ?? this.defaultTTL),
    });
  }

  delete(key) {
    this._store.delete(key);
  }

  clear() {
    this._store.clear();
  }

  /** Remove all expired entries. */
  prune() {
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (now > entry.expires) this._store.delete(key);
    }
  }

  get size() {
    return this._store.size;
  }
}
