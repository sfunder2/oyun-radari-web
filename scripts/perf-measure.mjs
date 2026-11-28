// Repeatable lab measurement of the static shell: page weight, request counts and
// Core Web Vitals (FCP/LCP/CLS/TBT) under a throttled "mid-range phone" profile.
// Serves the repository the way GitHub Pages does (gzip, /oyun-radari-web/ base path).
// External services (fonts, Supabase, Neon) are answered instantly with empty replies so the numbers
// describe OUR shell, not third-party latency. They are lab numbers, not field data.
// Usage: node scripts/perf-measure.mjs [--json out.json] [--runs 3] [--route /]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = '/oyun-radari-web/';
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png' };
export function startServer(root = repoRoot){
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!p.startsWith(BASE)) { res.writeHead(404); return res.end(); }
    p = p.slice(BASE.length) || 'index.html';
    let file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    const ext = path.extname(file);
    const body = fs.readFileSync(file);
    const h = { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'max-age=600' };
    const text = ['.html','.js','.css','.json','.webmanifest','.svg'].includes(ext);
    if (text && /gzip/.test(req.headers['accept-encoding'] || '')) { const z = zlib.gzipSync(body); h['content-encoding'] = 'gzip'; h['content-length'] = z.length; res.writeHead(200, h); return res.end(z); }
    h['content-length'] = body.length; res.writeHead(200, h); res.end(body);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}
const DEALS = Array.from({ length: 6 }, (_, i) => ({ name: 'Örnek Oyun ' + (i + 1), price: 300 + i * 10, original_price: 900, discount_percent: 66 - i, image: 'https://img.example/c' + i + '.jpg', hero_url: 'https://img.example/h' + i + '.jpg', platform: 'playstation', id: 'x' + i, score: 85 }));
const median = a => { const s = [...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
async function once(browser, url, profile) {
  const ctx = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1, userAgent: profile.ua, isMobile: profile.mobile, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const reqs = [];
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    reqs.push({ url: u, external: true });
    if (/\.css|fonts\.googleapis/.test(u)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    // Realistic "Günün fırsatı" payload so the showcase replaces its skeleton like it does in production
    // (an empty reply would make the section vanish and shift the page - not what real visitors see).
    if (/rpc\/search_market/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: DEALS }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  page.on('response', async r => { if (r.url().startsWith('http://127.0.0.1')) { const h = r.headers(); reqs.push({ url: r.url(), type: r.request().resourceType(), enc: Number(h['content-length'] || 0), raw: null }); } });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: profile.rtt, downloadThroughput: profile.down, uploadThroughput: profile.up });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  await page.addInitScript(() => {
    window.__m = { cls: 0, lcp: 0, fcp: 0, tbt: 0 };
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__m.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(l => l.getEntries().forEach(e => { window.__m.lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.name === 'first-contentful-paint') window.__m.fcp = e.startTime; })).observe({ type: 'paint', buffered: true });
    new PerformanceObserver(l => l.getEntries().forEach(e => { window.__m.tbt += Math.max(0, e.duration - 50); })).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource').filter(r => r.name.startsWith(location.origin));
    const sum = k => res.reduce((a, r) => a + (r[k] || 0), 0);
    const blockingCss = res.filter(r => r.initiatorType === 'link' && r.name.endsWith('.css') && r.renderBlockingStatus === 'blocking').length;
    return { ...window.__m, load: nav.loadEventEnd, dcl: nav.domContentLoadedEventEnd, requests: res.length + 1, js: res.filter(r => /\.js(\?|$)/.test(r.name)).length, css: res.filter(r => /\.css(\?|$)/.test(r.name)).length, blockingCss, transferKB: Math.round((sum('encodedBodySize') + nav.encodedBodySize) / 1024), decodedKB: Math.round((sum('decodedBodySize') + nav.decodedBodySize) / 1024) };
  });
  await ctx.close();
  return m;
}
// optimized=true measures what GitHub Pages actually serves: a copy of the repo after the deploy-time build.
export async function measure({ runs = 3, route = '', optimized = false } = {}) {
  const { chromium } = require('playwright');
  let dir = repoRoot;
  if (optimized) {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-dist-'));
    fs.cpSync(repoRoot, dir, { recursive: true, filter: s => !/[\\/](\.git|node_modules|android)([\\/]|$)/.test(s) });
    const { build } = await import('./build-perf.mjs');
    build({ root: dir });
  }
  const server = await startServer(dir);
  const port = server.address().port;
  const browser = await chromium.launch();
  const profiles = {
    'mobil (Slow-4G, CPU 4x)': { viewport: { width: 390, height: 844 }, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36', rtt: 150, down: 1.6 * 1024 * 1024 / 8, up: 750 * 1024 / 8, cpu: 4 },
    'masaustu (Cable, CPU 1x)': { viewport: { width: 1440, height: 900 }, mobile: false, ua: undefined, rtt: 20, down: 10 * 1024 * 1024 / 8, up: 5 * 1024 * 1024 / 8, cpu: 1 },
  };
  const out = {};
  for (const [name, prof] of Object.entries(profiles)) {
    const rs = [];
    for (let i = 0; i < runs; i++) rs.push(await once(browser, `http://127.0.0.1:${port}${BASE}${route}`, prof));
    const keys = Object.keys(rs[0]);
    out[name] = Object.fromEntries(keys.map(k => [k, Math.round(median(rs.map(r => r[k])) * 1000) / 1000]));
  }
  await browser.close(); server.close();
  return out;
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const a = process.argv.slice(2);
  const arg = n => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  const res = await measure({ runs: Number(arg('--runs') || 3), route: arg('--route') || '', optimized: a.includes('--optimized') });
  console.log(JSON.stringify(res, null, 2));
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(res, null, 2));
}
