// Oyun Radarı service worker.
// The site changes several times a day and every page needs live prices, so nothing is served
// from cache while the network works. The worker only makes the site installable (iPad, Android,
// desktop) and shows a friendly offline page instead of the browser's error when there is no
// connection. Asset, API and cross-origin requests are not touched at all.
const CACHE = 'radar-shell-v1';
const OFFLINE = '/oyun-radari-web/offline.html';
const PRECACHE = [OFFLINE, '/oyun-radari-web/icons/icon-192.png', '/oyun-radari-web/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('radar-') && k !== CACHE).map((k) => caches.delete(k))))
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
  // The offline page's own icons, so they show without a connection.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(url.pathname)));
  }
});
