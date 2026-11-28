import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import vm from 'node:vm';
import { build } from '../scripts/build-perf.mjs';

const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const out = build({ write: false });
const gz = s => zlib.gzipSync(s, { level: 9 }).length;

test('deploy build merges the override stylesheets into one render-blocking file', () => {
  const sheets = [...out.html.matchAll(/<link rel="stylesheet"[^>]*href="\/oyun-radari-web\/assets\/[^"]+\.css[^"]*"/g)];
  assert.equal(sheets.length, 3 - 1, 'main css + one site bundle (fonts link is external)');
  assert.ok(out.files.length >= 30);
  assert.match(out.html, /assets\/site-[0-9a-f]{8}\.css/);
  // cascade order is preserved
  const names = out.files, css = out.css;
  let at = -1;
  for (const n of names) { const i = css.indexOf('/* ' + n + ' */'); assert.ok(i > at, n); at = i; }
});

test('critical-path budget: blocking CSS and entry JS stay small (gzip)', () => {
  assert.ok(gz(out.css) < 80 * 1024, 'site css gz ' + gz(out.css));
  const main = out.html.match(/assets\/(index-[^"?]+\.css)/)[1];
  assert.ok(gz(read('assets/' + main)) < 60 * 1024);
  const js = out.html.match(/<script type="module" crossorigin src="\/oyun-radari-web\/assets\/(index-[^"?]+\.js)/)[1];
  assert.ok(gz(read('assets/' + js)) < 200 * 1024, 'entry js gz ' + gz(read('assets/' + js)));
});

test('non-critical modules load on idle, in original order; critical ones stay as module tags', () => {
  assert.ok(out.deferred.length >= 5);
  for (const n of ['hub', 'kisisel', 'visuals', 'motion', 'catalog-tools']) assert.ok(out.deferred.some(u => u.includes('/' + n + '-')), n);
  assert.match(out.html, /requestIdleCallback\(n,\{timeout:2500\}\)/);
  for (const keep of ['neon-gateway', 'home-search', 'cards', 'design-system', 'mobile']) assert.match(out.html, new RegExp('<script type="module" src="/oyun-radari-web/assets/' + keep + '-'), keep);
  const order = out.deferred.map(u => out.deferred.indexOf(u));
  assert.deepEqual(order, order.slice().sort((a, b) => a - b));
});

test('app skeleton is painted from HTML and replaced by the app', () => {
  assert.match(out.html, /<div id="root"><div class="rb" aria-hidden="true">/);
  assert.match(out.html, /prefers-reduced-motion:reduce\)\{\.rb i\{animation:none\}/);
  assert.ok(out.html.includes('<div id="root"'), 'check-publish still finds the root');
});

test('source index.html loads the perf module and styles', () => {
  const html = read('index.html');
  assert.match(html, /perf-20261128\.js" defer/);
  assert.match(html, /perf-20261128\.css/);
});

test('service worker caches only content-hashed assets cache-first', () => {
  const sw = read('sw.js');
  assert.match(sw, /HASHED/);
  const re = new RegExp(sw.match(/const HASHED = \/(.*)\/;/)[1]);
  for (const ok of ['/assets/index-BplIVz6G.js', '/assets/Deals-DE0Juu0L.js', '/assets/index-BopKXvmJ.css']) assert.ok(re.test(ok), ok);
  for (const no of ['/assets/cards-20261122.js', '/assets/neon-gateway-20261108c.js', '/assets/pwa-20261107.js']) assert.ok(!re.test(no), no);
});

function runPerf({ conn, store = {}, search = '' }) {
  const attrs = {}, listeners = {}, body = { appendChild() {} };
  const root = { lang: 'tr', dataset: attrs };
  const ctx = {
    document: { documentElement: root, body, visibilityState: 'visible', createElement: () => ({ remove() {}, append() {}, setAttribute() {}, addEventListener() {} }) },
    navigator: { connection: conn },
    location: { search, pathname: '/' },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    sessionStorage: { setItem() {} }, performance: { getEntriesByType: () => [{ responseStart: 120 }] },
    PerformanceObserver: class { observe() {} }, MutationObserver: class { observe() {} disconnect() {} },
    addEventListener: (t, f) => { (listeners[t] ||= []).push(f); }, setInterval: () => 0, console, URLSearchParams, Object, JSON, Math, Date, Array,
  };
  ctx.window = ctx;
  vm.runInNewContext(read('assets/perf-20261128.js'), ctx);
  return { ctx, attrs, store };
}

test('data saver turns on for Save-Data / 2G / very slow links and respects the user choice', () => {
  assert.equal(runPerf({ conn: { saveData: true } }).attrs.lite, '1');
  assert.equal(runPerf({ conn: { effectiveType: '2g' } }).attrs.lite, '1');
  assert.equal(runPerf({ conn: { effectiveType: 'slow-2g' } }).attrs.lite, '1');
  assert.equal(runPerf({ conn: { effectiveType: '4g', downlink: 10 } }).attrs.lite, undefined);
  assert.equal(runPerf({ conn: undefined }).attrs.lite, undefined);
  assert.equal(runPerf({ conn: { saveData: true }, store: { 'radar-lite': '0' } }).attrs.lite, undefined);
  assert.equal(runPerf({ conn: { effectiveType: '4g' }, store: { 'radar-lite': '1' } }).attrs.lite, '1');
  assert.equal(runPerf({ conn: { effectiveType: '4g' }, search: '?lite=1' }).attrs.lite, '1');
});

test('vitals budget follows the Google thresholds and flags breaches', () => {
  const { ctx } = runPerf({ conn: undefined });
  const w = ctx.window.__radarVitals;
  assert.deepEqual({ ...w.budget }, { LCP: 2500, INP: 200, CLS: 0.1, FCP: 1800, TTFB: 800 });
  w.values.LCP = 3000; w.values.CLS = 0.05;
  assert.deepEqual(w.over(), ['LCP']);
});
