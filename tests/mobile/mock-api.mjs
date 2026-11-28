// Offline fixtures for the mobile regression tests: a static file server for the site and a
// stub for every Supabase / Mac mini REST call, so layouts render the same on any machine.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const BASE = '/oyun-radari-web/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

export function serve(port = 0) {
  const srv = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (!p.startsWith(BASE)) { res.writeHead(404); return res.end(); }
      p = p.slice(BASE.length) || 'index.html';
      const file = normalize(join(ROOT, p));
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      const s = await stat(file);
      const f = s.isDirectory() ? join(file, 'index.html') : file;
      res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(await readFile(f));
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok({ srv, origin: `http://127.0.0.1:${srv.address().port}` })));
}

const NAMES = ['Aurora Drift', 'Kuzey Yolu', 'Neon Sokaklar', 'Taş Devri Şefi', 'Gölge Avcısı', 'Yıldız Çiftliği', 'Demir Kale', 'Son Ada', 'Lav Koşucusu', 'Sessiz Orman', 'Kızıl Çöl', 'Bulut Şehri'];
const GENRES = ['Aksiyon', 'Macera', 'RPG', 'Strateji', 'Simülasyon', 'Spor', 'Yarış', 'Bağımsız'];
const PLAT = ['playstation', 'steam', 'xbox', 'switch'];
const svg = (t, c) => `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215"><rect width="460" height="215" fill="${c}"/><text x="230" y="115" font-family="sans-serif" font-size="26" fill="#fff" text-anchor="middle">${t}</text></svg>`;
export const imageSvg = svg;

export function items(n = 48, offset = 0) {
  return Array.from({ length: n }, (_, i) => {
    const k = i + offset, price = 80 + ((k * 37) % 900), pct = [15, 30, 40, 50, 65, 75][k % 6];
    const orig = Math.round(price / (1 - pct / 100));
    const platform = PLAT[k % 4];
    return {
      id: `${platform}:${1000 + k}`, platform, store_id: String(1000 + k), title_key: `oyun-${k}`, name: `${NAMES[k % NAMES.length]} ${Math.floor(k / NAMES.length) + 1}`,
      image: `https://img.test/${k}.svg`, price, original_price: orig, discount_percent: pct, currency: 'TRY', url: 'https://store.test/x', edition: null,
      checked_at: '2026-11-27T10:00:00Z', first_seen: '2026-10-01T00:00:00Z', mc_score: 70 + (k % 25), oc_score: 68 + (k % 25), opencritic_reviews: 12, best_score: 70 + (k % 25),
      genres: [GENRES[k % 8], GENRES[(k + 3) % 8]], release_date: `20${20 + (k % 6)}-0${1 + (k % 9)}-15`, developers: ['Stüdyo ' + (k % 5)], turkish: k % 3 === 0, turkish_audio: false, age: 16, offers: [],
    };
  });
}

export async function mockNetwork(page, origin) {
  await page.route('**/*', (route) => {
    const req = route.request(), u = req.url();
    if (u.startsWith(origin)) return route.continue();
    if (/img\.test\//.test(u)) return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg(u.match(/(\d+)\.svg/)?.[1] || '', ['#244', '#424', '#442', '#234'][Number(u.match(/(\d+)\.svg/)?.[1] || 0) % 4]) });
    if (/\/rest\/v1\/rpc\/search_(market|games)/.test(u)) {
      let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch {}
      const pg = Number(body.page_number || 0), size = Number(body.page_size || 40);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: items(size, pg * size), total: 600, query: body.query_text || '' }) });
    }
    if (/store_offers\?/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items(60).map((x) => ({ name: x.name, image: x.image, genres: x.genres, discount_percent: x.discount_percent }))) });
    if (/\/rest\/v1\//.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    return route.abort();
  });
}
