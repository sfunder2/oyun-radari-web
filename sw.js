// Oyun Radarı service worker.
// The site changes several times a day and every page needs live prices, so nothing is served
// from cache while the network works. The worker only makes the site installable (iPad, Android,
// desktop) and shows a friendly offline page instead of the browser's error when there is no
// connection. API and cross-origin requests are not touched at all. The one exception: files whose NAME is a
// content hash (Vite output such as index-BplIVz6G.js) can never change, so they are served cache-first
// (repeat visits skip the network for ~1 MB of JS). Dated names like cards-20261122.js are NOT cached.
const CACHE = 'radar-shell-v1';
const ASSETS = 'radar-assets-v1';
const MAX_ASSETS = 160;
// <name>-<8 hash chars>.js|css with at least one letter in the hash (8 digits = a date, not a hash).
const HASHED = /\/assets\/[A-Za-z0-9_.-]+-(?=[A-Za-z0-9_-]*[A-Za-z_])[A-Za-z0-9_-]{8}\.(?:js|css)$/;
const OFFLINE = '/oyun-radari-web/offline.html';
const PRECACHE = [OFFLINE, '/oyun-radari-web/icons/icon-192.png', '/oyun-radari-web/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('radar-') && k !== CACHE && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (HASHED.test(url.pathname)) {
    event.respondWith(caches.open(ASSETS).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') {
        await cache.put(req, res.clone());
        const keys = await cache.keys();
        if (keys.length > MAX_ASSETS) await Promise.all(keys.slice(0, keys.length - MAX_ASSETS).map((k) => cache.delete(k)));
      }
      return res;
    }));
    return;
  }
  // The offline page's own icons, so they show without a connection.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(url.pathname)));
  }
});
