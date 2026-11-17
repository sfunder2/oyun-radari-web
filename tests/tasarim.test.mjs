import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  seasonsBetween, nextSeason, atLowest, rangePos, versusAxes, radarPoint,
  cleanDensity, cleanScale, cleanLayout, wrapLines, money,
} from '../assets/tasarim-20261117.js';

const D = s => Date.parse(s + 'T00:00:00Z');

test('seasonsBetween clips sale weeks to the chart range and spans the new year', () => {
  const s = seasonsBetween(D('2026-06-01'), D('2026-07-01'));
  assert.deepEqual(s.map(x => x.key), ['dop', 'summer']);
  assert.equal(s[0].from, D('2026-06-01'));
  assert.equal(s[1].to, D('2026-07-01'));
  const w = seasonsBetween(D('2026-12-25'), D('2027-01-10'));
  assert.deepEqual(w.map(x => x.key), ['winter']);
  assert.equal(w[0].to, D('2027-01-03'));
  assert.deepEqual(seasonsBetween(D('2026-10-23'), D('2026-11-18')), []);
  assert.deepEqual(seasonsBetween(5, 5), []);
});

test('nextSeason names the coming sale and says so when one is on', () => {
  const n = nextSeason(D('2026-11-17'));
  assert.equal(n.key, 'autumn');
  assert.equal(n.days, 3);
  const on = nextSeason(D('2026-11-25'));
  assert.equal(on.key, 'autumn');
  assert.equal(on.days, 0);
  assert.equal(nextSeason(D('2026-12-27')).key, 'winter');
  assert.equal(nextSeason(D('2027-01-05')).key, 'spring');
  assert.equal(nextSeason(NaN), null);
});

test('atLowest allows half a percent', () => {
  assert.equal(atLowest(100.4, 100), true);
  assert.equal(atLowest(101, 100), false);
  assert.equal(atLowest(5, 0), false);
});

test('rangePos needs 14 days of PlayStation history and a real gap', () => {
  const base = { platform: 'playstation', price: 50, lowestEver: 25, originalPrice: 100, historyDays: 30 };
  assert.deepEqual(rangePos(base), { pos: 1 / 3, low: 25, base: 100, price: 50 });
  assert.equal(rangePos({ ...base, historyDays: 10 }), null);
  assert.equal(rangePos({ ...base, platform: 'steam' }), null);
  assert.equal(rangePos({ ...base, lowestEver: 100, price: 100 }), null);
  assert.equal(rangePos({ ...base, price: 20 }).pos, 0);
});

test('versusAxes keeps only known axes and compares prices in one currency', () => {
  const a = { name: 'A', price: 50, originalPrice: 100, currency: 'TRY', scores: { metacritic: 90 }, releaseDate: String(new Date().getFullYear()) };
  const b = { name: 'B', price: 100, originalPrice: 100, currency: 'TRY', scores: { metacritic: 70 } };
  const ax = versusAxes(a, b);
  assert.deepEqual(ax.map(x => x.key), ['mc', 'price', 'sale', 'new']);
  assert.deepEqual(ax.find(x => x.key === 'price'), { key: 'price', tr: 'Fiyat avantajı', en: 'Price edge', a: 100, b: 50 });
  assert.deepEqual(ax.find(x => x.key === 'sale'), { key: 'sale', tr: 'İndirim', en: 'Discount', a: 50, b: 0 });
  assert.equal(ax.find(x => x.key === 'new').b, null);
  const usd = versusAxes(a, { ...b, currency: 'USD' });
  assert.ok(!usd.some(x => x.key === 'price'));
});

test('radarPoint starts at the top and scales by value', () => {
  assert.deepEqual(radarPoint(0, 4, 100, 10, 0, 0).map(Math.round), [0, -10]);
  assert.deepEqual(radarPoint(1, 4, 50, 10, 0, 0).map(Math.round), [5, 0]);
});

test('preferences are cleaned', () => {
  assert.equal(cleanDensity('compact'), 'compact');
  assert.equal(cleanDensity('x'), 'comfy');
  assert.equal(cleanScale(200), 130);
  assert.equal(cleanScale(83), 90);
  assert.equal(cleanScale(112), 110);
  assert.equal(cleanScale('abc'), 100);
  assert.deepEqual(cleanLayout({ quiz: { size: 'half' }, 'Bad Key': { size: 'half' }, community: { size: 'huge', hidden: true } }),
    { quiz: { size: 'half', hidden: false }, community: { size: 'full', hidden: true } });
  assert.deepEqual(cleanLayout(null), {});
});

test('wrapLines breaks words and ends with an ellipsis when cut', () => {
  const m = t => t.length;
  assert.deepEqual(wrapLines('one two three', 7, m), ['one two', 'three']);
  const cut = wrapLines('aaaa bbbb cccc dddd', 4, m, 2);
  assert.equal(cut.length, 2);
  assert.ok(cut[1].endsWith('…'));
});

test('money formats like the rest of the site', () => {
  assert.equal(money(2399.2, 'TRY'), '₺2.399');
  assert.equal(money(69.8, 'TRY'), '₺69,80');
  assert.equal(money(NaN), '');
});

test('the bundle loads the design module and the page loads its styles', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /assets\/tasarim-20261117\.css/);
  const bundle = readFileSync(new URL('../assets/index-BplIVz6G.js', import.meta.url), 'utf8');
  assert.match(bundle, /from"\.\/tasarim-20261117\.js"/);
  for (const part of ['ChartMarks', 'ChartNote', 'VersusRadar', 'ShareButton', 'RangeStrip']) assert.ok(bundle.includes('radarDesign.' + part), part);
});
