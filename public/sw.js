const CACHE_NAME = 'blueboard-v4';
const MAX_CACHE_ENTRIES = 100;
const PRECACHE = [
  '/',
  '/index.html'
];

// Trim cache to MAX_CACHE_ENTRIES, evicting oldest entries first
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]);
    return trimCache(cacheName, maxEntries);
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only cache GET requests
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // HTML navigations: network-first (bypass browser HTTP cache to get fresh deploys)
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(async cache => {
            await cache.put(e.request, clone);
            await trimCache(CACHE_NAME, MAX_CACHE_ENTRIES);
          });
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // API/data calls: network-first (bypass HTTP cache for fresh data)
  if (url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/data/')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(async cache => {
            await cache.put(e.request, clone);
            await trimCache(CACHE_NAME, MAX_CACHE_ENTRIES);
          });
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets (JS, CSS, images): cache-first
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(async cache => {
          await cache.put(e.request, clone);
          await trimCache(CACHE_NAME, MAX_CACHE_ENTRIES);
        });
        return res;
      }))
  );
});
