// Oyun Radarı service worker (v2).
// Prices must stay live, so data (cross-origin REST calls) and HTML navigations always try the
// network first. What is cached: the versioned static files under /assets/ (their names or ?v=
// change on every release, so cache-first is safe) and the last good page shell, so the app opens
// offline with the offline bar instead of a browser error. Also handles Web Push notifications.
const VERSION = 'v2';
const SHELL = 'radar-shell-' + VERSION;
const STATIC = 'radar-static-' + VERSION;
const BASE = '/oyun-radari-web/';
const OFFLINE = BASE + 'offline.html';
const PRECACHE = [OFFLINE, BASE + 'icons/icon-192.png', BASE + 'icons/icon.svg', BASE + 'manifest.webmanifest'];
const STATIC_MAX = 160;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('radar-') && k !== SHELL && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.registration.navigationPreload && self.registration.navigationPreload.enable().catch(() => {}))
      .then(() => self.clients.claim())
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - STATIC_MAX; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // prices, search and auth are never cached
  if (!url.pathname.startsWith(BASE)) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = (await event.preloadResponse) || (await fetch(req));
        if (res.ok && url.pathname === BASE) { const c = await caches.open(SHELL); c.put(BASE, res.clone()); }
        return res;
      } catch {
        const c = await caches.open(SHELL);
        return (await c.match(BASE)) || (await c.match(OFFLINE)) || Response.error();
      }
    })());
    return;
  }

  if (/\.(?:js|css|woff2?|png|svg|webp|jpg|jpeg|webmanifest)$/.test(url.pathname)) {
    const versioned = url.pathname.startsWith(BASE + 'assets/') || url.pathname.startsWith(BASE + 'icons/');
    if (!versioned) return;
    event.respondWith((async () => {
      const c = await caches.open(STATIC);
      const hit = await c.match(req);
      // Files without a hash in the name (…-20261122.js) can be re-published: refresh in background.
      const net = fetch(req).then((res) => { if (res.ok) { c.put(req, res.clone()).then(() => trim(c)); } return res; }).catch(() => null);
      if (hit) { event.waitUntil(net); return hit; }
      return (await net) || (await caches.match(req)) || Response.error();
    })());
  }
});

// ---- Web Push ---------------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  const title = d.title || 'Oyun Radarı';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: BASE + 'icons/icon-192.png',
    badge: BASE + 'icons/icon-192.png',
    tag: d.tag || 'radar',
    data: { url: d.url || BASE },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || BASE, self.location.origin);
  if (target.origin !== self.location.origin || !target.pathname.startsWith(BASE)) return;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if (c.url.startsWith(self.location.origin + BASE) && 'focus' in c) { await c.focus(); if ('navigate' in c) { try { await c.navigate(target.href); } catch {} } return; } }
    await self.clients.openWindow(target.href);
  })());
});
