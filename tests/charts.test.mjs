import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allTimeLow, barPct, raceRows, forecastBand, bandAt, confidenceOf } from '../assets/charts-20261121.js';

const day = n => new Date(Date.UTC(2026, 0, 1) + n * 864e5).toISOString().slice(0, 10);
const TODAY = day(200);
// 200 gün: normal 1000, 50–60. günde ve 120–130. günde indirim (700 ve 500), bugün 500.
function hist() {
  const rows = [];
  for (let i = 0; i <= 200; i++) {
    let p = 1000;
    if (i >= 50 && i <= 60) p = 700;
    if (i >= 120 && i <= 130) p = 600;
    if (i === 200) p = 500;
    rows.push([day(i), p, 1000, p]);
  }
  return rows;
}

test('allTimeLow needs a 14-day record, the lowest price and a higher price before', () => {
  const a = allTimeLow(hist(), TODAY, 500);
  assert.equal(a.offPct, 50);
  assert.equal(a.days, 200);
  assert.equal(a.repeat, false);
  assert.equal(allTimeLow(hist(), TODAY, 650), null);
  assert.equal(allTimeLow(hist().slice(-10), TODAY, 500), null);
  assert.equal(allTimeLow([[day(190), 500, 500, 500], [day(200), 500, 500, 500]], TODAY, 500), null);
  assert.equal(allTimeLow(null, TODAY, 500), null);
  assert.equal(allTimeLow(hist(), TODAY, NaN), null);
});

test('allTimeLow says so when the same price was seen before', () => {
  const h = hist();
  h[150][3] = 500; h[150][1] = 500;
  assert.equal(allTimeLow(h, TODAY, 500).repeat, true);
});

test('barPct scales to the dearest store and keeps a visible minimum', () => {
  assert.equal(barPct(100, [100, 200, 400]), 25);
  assert.equal(barPct(400, [100, 200, 400]), 100);
  assert.equal(barPct(10, [10, 400]), 14);
  assert.equal(barPct(null, [1, 2]), null);
  assert.equal(barPct(5, []), null);
  assert.equal(barPct(5, [null, NaN]), null);
});

test('raceRows puts the cheapest store at the finish line and measures the gap', () => {
  const r = raceRows([
    { key: 'steam', price: 200 }, { key: 'ps', price: 100 }, { key: 'xbox', price: 400 },
    { key: 'switch', price: 50, skip: true }, { key: 'epic', price: null },
  ]);
  assert.deepEqual(r.map(x => x.key), ['ps', 'steam', 'xbox']);
  assert.equal(r[0].pos, 1);
  assert.equal(r[0].winner, true);
  assert.equal(r[1].pos, 0.5);
  assert.equal(r[1].gap, 100);
  assert.equal(r[2].pct, 300);
  assert.deepEqual(r.map(x => x.rank), [0, 1, 2]);
  assert.deepEqual(raceRows([{ key: 'a', price: 5 }]), []);
  assert.deepEqual(raceRows(undefined), []);
});

test('forecastBand summarises past sales and is honest when data is thin', () => {
  const f = forecastBand(hist(), TODAY);
  assert.equal(f.state, 'ok');
  assert.equal(f.regular, 1000);
  assert.equal(f.episodes, 3);
  assert.equal(f.best, 500);
  assert.equal(f.typical, 600);
  assert.equal(f.level, 'mid');
  assert.equal(forecastBand(hist().slice(-10), TODAY).state, 'collecting');
  const flat = hist().map(r => [r[0], 1000, 1000, 1000]);
  assert.equal(forecastBand(flat, TODAY).state, 'nosale');
  assert.equal(forecastBand([], TODAY), null);
  assert.equal(forecastBand(hist(), 'nope'), null);
});

test('bandAt starts as a point today and widens to the best sale and the regular price', () => {
  const fc = { cur: 800, regular: 1000, best: 500 };
  assert.deepEqual(bandAt(fc, 0), { hi: 800, lo: 800 });
  assert.deepEqual(bandAt(fc, 1), { hi: 1000, lo: 500 });
  const mid = bandAt(fc, 0.25);
  assert.ok(mid.hi > 800 && mid.hi < 1000 && mid.lo < 800 && mid.lo > 500);
  assert.deepEqual(bandAt({ cur: 1200, regular: 1000, best: 500 }, 1).hi, 1200);
});

test('confidence needs both several sales and a long record', () => {
  assert.equal(confidenceOf(1, 400), 'low');
  assert.equal(confidenceOf(3, 90), 'mid');
  assert.equal(confidenceOf(3, 40), 'low');
  assert.equal(confidenceOf(5, 365), 'high');
  assert.equal(confidenceOf(5, 100), 'mid');
});

test('the bundle wires every piece and the page loads the new files', () => {
  const bundle = readFileSync(new URL('../assets/index-BplIVz6G.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const k of ['Forecast', 'AtlBadge', 'AtlChip', 'StoreBar', 'StoreRace']) assert.ok(bundle.includes('radarCharts.' + k), k);
  assert.ok(bundle.includes('pathLength:1'));
  assert.ok(bundle.includes('charts-20261121.js'));
  assert.ok(html.includes('charts-20261121.css'));
  const heat = readFileSync(new URL('../assets/heat-20261031.js', import.meta.url), 'utf8');
  assert.ok(heat.includes('hd-needle'));
});

test('every animation sits behind prefers-reduced-motion and the in-app switch', () => {
  const css = readFileSync(new URL('../assets/charts-20261121.css', import.meta.url), 'utf8');
  const animated = css.split('\n').filter(l => /animation[:-]/.test(l) && !l.includes('@keyframes'));
  assert.ok(animated.length > 8);
  assert.ok(animated.every(l => l.includes('data-reduce-motion')), 'animation outside the reduce-motion guard');
});
