// Shared IP-based rate limiter for API endpoints
// In-memory Map with periodic TTL cleanup

const stores = new Map(); // keyed by endpoint name
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 300_000; // 5 minutes

function getClientIp(req) {
  // Prefer x-real-ip (set by Vercel edge, not spoofable) over x-forwarded-for
  const realIp = req.headers?.['x-real-ip'];
  if (realIp) return realIp;
  const xff = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : (typeof xff === 'string' ? xff : '');
  return raw.split(',')[0]?.trim() || 'unknown';
}

/**
 * Create a rate limiter for an endpoint.
 * @param {string} name - Endpoint name (for separate stores)
 * @param {number} maxPerMinute - Max requests per IP per 60s window
 * @returns {function(req): boolean} - Returns true if rate limited
 */
export function createRateLimiter(name, maxPerMinute = 60) {
  if (!stores.has(name)) stores.set(name, new Map());

  return function isRateLimited(req) {
    const now = Date.now();
    const store = stores.get(name);
    const ip = getClientIp(req);

    if (!store.has(ip)) store.set(ip, []);
    const log = store.get(ip);

    // Evict entries older than 60s
    while (log.length && log[0] < now - 60_000) log.shift();

    if (log.length >= maxPerMinute) return true;
    log.push(now);

    // Periodic cleanup: remove stale IPs across all stores
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      lastCleanup = now;
      for (const [, s] of stores) {
        for (const [k, v] of s) {
          while (v.length && v[0] < now - 60_000) v.shift();
          if (!v.length) s.delete(k);
        }
      }
    }

    return false;
  };
}
