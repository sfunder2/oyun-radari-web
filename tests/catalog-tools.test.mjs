import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cleanTerm, editionKind, classifyRow, cheapest, seriesSummary, splitFamily, bundleSaving, cleanTrack, trackChange,
  seasonTimeline, cleanPrep, wishItems, gpuScore, cpuScore, parseGB, parseWin, compareList, checkGame, cleanSys,
  CPU_SUGGEST, GPU_SUGGEST, inList,
} from '../assets/catalog-tools-20261121.js';

const D = (s) => Date.parse(s + 'T00:00:00Z');

test('search terms lose PostgREST control characters', () => {
  assert.equal(cleanTerm('  Witcher*3, (GOTY) '), 'witcher 3 goty');
  assert.equal(inList(['a b', 'c']), 'in.(%22a%20b%22%2C%22c%22)');
});

test('PlayStation edition text decides add-on vs bundle, names are the fallback', () => {
  assert.equal(editionKind('PS5 · Oyun Paketi'), 'Oyun Paketi');
  assert.equal(classifyRow({ edition: 'PS5 · Eklenti' }), 'addon');
  assert.equal(classifyRow({ edition: 'PS4/PS5 · Tam Sürüm Oyun', name: 'Cyberpunk 2077' }), 'game');
  assert.equal(classifyRow({ edition: 'PS5 · Oyun Paketi' }), 'bundle');
  assert.equal(classifyRow({ name: 'Game Complete Edition' }), 'bundle');
  assert.equal(classifyRow({ name: 'Game Season Pass' }), 'addon');
  assert.equal(classifyRow({ name: 'Plain game' }), 'game');
});

test('cheapest prefers TRY offers and ignores empty prices', () => {
  assert.equal(cheapest([{ price: 0 }, { price: null }]), null);
  const c = cheapest([{ price: 10, currency: 'USD' }, { price: 500, currency: 'TRY' }, { price: '300', currency: 'TRY' }]);
  assert.equal(c.price, 300);
  assert.equal(cheapest([{ price: 10, currency: 'USD' }]).currency, 'USD');
});

test('series total counts TRY games only and reports the rest', () => {
  const series = [{ k: 'a' }, { k: 'b' }, { k: 'c' }, { k: 'd' }];
  const map = new Map([['a', [{ price: 100, currency: 'TRY' }]], ['b', [{ price: 20, currency: 'USD' }]], ['c', [{ price: 50.5, currency: 'TRY' }, { price: 80, currency: 'TRY' }]]]);
  const s = seriesSummary(series, map);
  assert.deepEqual([s.total, s.priced, s.foreign, s.missing], [150.5, 2, 1, 1]);
});

test('splitFamily dedupes, drops the base game and sorts by price', () => {
  const rows = [
    { title_key: 'g', edition: 'PS5 · Tam Sürüm Oyun' },
    { title_key: 'g dlc2', edition: 'PS5 · Eklenti', price: 200 },
    { title_key: 'g dlc1', edition: 'PS5 · Eklenti', price: 100 },
    { title_key: 'g dlc1', edition: 'PS5 · Eklenti', price: 100 },
    { title_key: 'g ultimate', edition: 'PS5 · Oyun Paketi', price: 900 },
  ];
  const { addons, bundles } = splitFamily('g', rows);
  assert.deepEqual(addons.map((a) => a.title_key), ['g dlc1', 'g dlc2']);
  assert.deepEqual(bundles.map((a) => a.title_key), ['g ultimate']);
});

test('bundle saving compares with base plus priced add-ons, TRY only', () => {
  const base = { price: 1000, currency: 'TRY' }, addons = [{ price: 300 }, { price: 200 }, { price: null }];
  assert.deepEqual(bundleSaving(base, addons, { price: 1200 }), { separate: 1500, bundle: 1200, diff: 300, cheaper: true, count: 2 });
  assert.equal(bundleSaving(base, addons, { price: 1600 }).cheaper, false);
  assert.equal(bundleSaving(base, [], { price: 1200 }), null);
  assert.equal(bundleSaving({ price: 10, currency: 'USD' }, addons, { price: 1 }), null);
});

test('tracking list is sanitised and change is computed in the same currency only', () => {
  const t = cleanTrack([{ k: 'ok key', n: 'N', p: 100 }, { k: 'ok key' }, { k: 'BAD KEY!' }, null, { k: 'x', p: -3, c: 'GBP' }]);
  assert.deepEqual(t.map((e) => [e.k, e.p, e.c]), [['ok key', 100, 'TRY'], ['x', null, 'TRY']]);
  assert.deepEqual(trackChange({ p: 100, c: 'TRY' }, { price: 75, currency: 'TRY' }), { from: 100, to: 75, pct: -25 });
  assert.equal(trackChange({ p: 100, c: 'TRY' }, { price: 5, currency: 'USD' }), null);
  assert.equal(trackChange({ p: null, c: 'TRY' }, { price: 5 }), null);
});

test('season timeline shows the running sale first, then the next ones in order', () => {
  const t = seasonTimeline(D('2026-11-21'));
  assert.equal(t[0].key, 'autumn');
  assert.equal(t[0].on, true);
  assert.equal(t[0].left, 12); // 21 Kasım–2 Aralık, bugün dahil
  assert.deepEqual(t.map((s) => s.key), ['autumn', 'winter', 'spring', 'dop', 'summer']);
  const spring = t.find((s) => s.key === 'spring');
  assert.equal(spring.on, false);
  assert.equal(spring.days, Math.round((D('2027-03-13') - D('2026-11-21')) / 864e5));
  assert.equal(seasonTimeline(D('2026-07-01'))[0].key, 'summer');
});

test('prep state keeps only known seasons and tasks', () => {
  const p = cleanPrep({ autumn: { done: { wish: true, nope: true, budget: 'x' }, budget: '1500.4' }, bogus: { done: {} }, winter: { budget: -4 } });
  assert.deepEqual(p, { autumn: { done: { wish: true }, budget: 1500 }, winter: { done: {}, budget: null } });
  assert.deepEqual(cleanPrep('x'), {});
});

test('wishlist reads only "wish" entries from radar-fav-v3', () => {
  const raw = JSON.stringify([{ id: 'a', name: 'A', status: 'wish', price: 100, url: 'https://x.y' }, { id: 'b', name: 'B', status: 'done' }, { id: 'c', name: 'C', status: 'wish', url: 'javascript:1' }]);
  assert.deepEqual(wishItems(raw).map((w) => [w.id, w.url]), [['a', 'https://x.y'], ['c', null]]);
  assert.deepEqual(wishItems('not json'), []);
});

test('GPU and CPU scores follow generation order and take the weaker of "A or B"', () => {
  assert.ok(gpuScore('GeForce GTX 1060') < gpuScore('GeForce RTX 3060'));
  assert.ok(gpuScore('Radeon RX 580') < gpuScore('Radeon RX 6700 XT'));
  assert.equal(gpuScore('NVIDIA GTX 1660 Super or AMD Radeon RX 590'), Math.min(gpuScore('GTX 1660 Super'), gpuScore('RX 590')));
  assert.equal(gpuScore('GeForce GTX 760 / Radeon 7950 or better'), Math.min(gpuScore('GTX 760'), gpuScore('Radeon HD 7950')));
  assert.equal(gpuScore('Intel HD 4600 or equivalent (1 GB VRAM)'), 800);
  assert.equal(gpuScore('some unknown card'), null);
  assert.ok(cpuScore('Intel Core i5-6600K') < cpuScore('Intel Core i5-12400F'));
  assert.ok(cpuScore('Ryzen 5 3600') < cpuScore('Ryzen 5 5600X'));
  assert.equal(cpuScore('Intel Core i5-12400F or AMD Ryzen 5 5600X'), Math.min(cpuScore('i5-12400F'), cpuScore('Ryzen 5 5600X')));
  assert.equal(cpuScore('2 GHz dual-core'), null);
});

test('every suggested CPU and GPU can be scored', () => {
  for (const c of CPU_SUGGEST) assert.notEqual(cpuScore(c), null, c);
  for (const g of GPU_SUGGEST) assert.notEqual(gpuScore(g), null, g);
});

test('size and Windows parsing', () => {
  assert.equal(parseGB('8 GB RAM'), 8);
  assert.equal(parseGB('500 MB available space'), 500 / 1024);
  assert.equal(parseGB('1,5 TB'), 1536);
  assert.equal(parseGB('lots'), null);
  assert.equal(parseWin('Windows 7 and above'), 7);
  assert.equal(parseWin('Windows 10 64-bit'), 10);
  assert.equal(parseWin('Windows 7/8/10'), 7);
  assert.equal(parseWin('SteamOS'), null);
});

const REQ = {
  min: [['İşletim sistemi', 'Windows 10 64-bit'], ['İşlemci', 'Intel Core i5-6600K or AMD Ryzen 5 1600'], ['Bellek', '8 GB RAM'], ['Ekran kartı', 'NVIDIA GTX 970 or AMD RX 480'], ['Depolama', '60 GB available space']],
  rec: [['İşletim sistemi', 'Windows 11'], ['İşlemci', 'Intel Core i7-8700K'], ['Bellek', '16 GB RAM'], ['Ekran kartı', 'NVIDIA RTX 2070'], ['Depolama', '60 GB available space']],
};
const SYS = (o = {}) => cleanSys({ os: 'win11', ram: 32, disk: 200, cpu: 'Ryzen 7 5800X3D', gpu: 'GeForce RTX 4070', ...o });

test('a strong PC passes recommended, a weak one fails minimum', () => {
  assert.equal(checkGame(SYS(), REQ).verdict, 'rec-ok');
  const weak = checkGame(SYS({ ram: 4, gpu: 'GeForce GTX 750 Ti' }), REQ);
  assert.equal(weak.verdict, 'no');
  assert.equal(weak.min.find((r) => r.key === 'ram').status, 'no');
  assert.equal(weak.min.find((r) => r.key === 'gpu').status, 'no');
});

test('exact parts are exact and unknown parts never raise the verdict', () => {
  const disk = compareList(SYS({ disk: 59 }), REQ.min).find((r) => r.key === 'disk');
  assert.equal(disk.status, 'no');
  const win = compareList(SYS({ os: 'win10' }), REQ.rec).find((r) => r.key === 'os');
  assert.equal(win.status, 'no');
  const noGpu = checkGame(SYS({ gpu: '' }), REQ);
  assert.equal(noGpu.min.find((r) => r.key === 'gpu').status, 'unknown');
  assert.equal(noGpu.verdict, 'min-ok');
  assert.equal(checkGame(SYS({ cpu: '', gpu: '', os: 'other', ram: 8 }), { min: [['İşlemci', '2 GHz']] }).verdict, 'unknown');
  assert.equal(checkGame(SYS({ os: 'other' }), REQ).verdict, 'no');
});

test('borderline CPU is flagged instead of passed', () => {
  const r = checkGame(SYS({ cpu: 'Intel Core i5-7500' }), { min: [['İşlemci', 'Intel Core i5-8400']] });
  assert.equal(r.verdict, 'edge');
});

test('module is wired into the page and stays user-data free', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /catalog-tools-20261121\.js/);
  assert.match(html, /catalog-tools-20261121\.css/);
  const js = readFileSync(new URL('../assets/catalog-tools-20261121.js', import.meta.url), 'utf8');
  assert.doesNotMatch(js, /innerHTML/);
});
