import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parsePath, stepY, saleIntervals, parseNum, axisScale, parseShortDate, monthGrid, heatCellDay, sameMonth, placeTip, offPct, enterSpan,
} from '../assets/polish-20261122.js';

// 3 günlük basamaklı yol: fiyat 100, sonra 60'a düşüyor, sonra yine 100.
const LINE = 'M56 50 L200 50 L200 120 L300 120 L300 50 L588 50';
const BASE = 'M56 50 L200 50 L200 50 L300 50 L300 50 L588 50';

test('parsePath reads M and L points and ignores junk', () => {
  assert.deepEqual(parsePath('M1 2 L3.5 4'), [{ x: 1, y: 2 }, { x: 3.5, y: 4 }]);
  assert.deepEqual(parsePath(null), []);
  assert.equal(parsePath(LINE).length, 6);
});

test('stepY follows the horizontal step that covers x', () => {
  const p = parsePath(LINE);
  assert.equal(stepY(p, 100), 50);
  assert.equal(stepY(p, 250), 120);
  assert.equal(stepY(p, 400), 50);
  assert.equal(stepY(p, 0), 50);
  assert.equal(stepY([], 5), null);
});

test('saleIntervals finds only the stretch where the price is below the regular price', () => {
  const iv = saleIntervals(parsePath(LINE), parsePath(BASE));
  assert.deepEqual(iv, [{ x0: 200, x1: 300 }]);
  assert.deepEqual(saleIntervals(parsePath(BASE), parsePath(BASE)), []);
  assert.deepEqual(saleIntervals(parsePath(LINE), parsePath('M0 0 L1 1')), []);
  assert.deepEqual(saleIntervals(null, null), []);
});

test('saleIntervals merges touching stretches', () => {
  const line = parsePath('M0 10 L10 10 L10 30 L20 30 L20 40 L30 40');
  const base = parsePath('M0 10 L10 10 L10 10 L20 10 L20 10 L30 10');
  assert.deepEqual(saleIntervals(line, base), [{ x0: 10, x1: 30 }]);
});

test('parseNum reads tr-TR axis labels', () => {
  assert.equal(parseNum('1.234'), 1234);
  assert.equal(parseNum('12,5'), 12.5);
  assert.equal(parseNum('849'), 849);
  assert.ok(Number.isNaN(parseNum('')));
  assert.ok(Number.isNaN(parseNum(null)));
});

test('axisScale maps y back to a value and needs two ticks', () => {
  const f = axisScale([{ y: 200, v: 0 }, { y: 100, v: 500 }, { y: 0, v: 1000 }]);
  assert.equal(f(100), 500);
  assert.equal(f(150), 250);
  assert.equal(axisScale([{ y: 1, v: 1 }]), null);
  assert.equal(axisScale([{ y: 1, v: 1 }, { y: 1, v: 2 }]), null);
});

test('parseShortDate reads Turkish and English short dates', () => {
  const nov = Date.UTC(2026, 10, 12);
  assert.equal(parseShortDate('12 Kas 2026'), nov);
  assert.equal(parseShortDate('12 Nov 2026'), nov);
  assert.equal(parseShortDate('Nov 12, 2026'), nov);
  assert.equal(parseShortDate('3 Şub 2026'), Date.UTC(2026, 1, 3));
  assert.equal(parseShortDate('3 Ağu 2026'), Date.UTC(2026, 7, 3));
  assert.ok(Number.isNaN(parseShortDate('yarın')));
  assert.ok(Number.isNaN(parseShortDate(null)));
});

test('monthGrid starts on Monday, marks today, the past and the sale days', () => {
  const today = Date.UTC(2026, 10, 22);
  const g = monthGrid(2026, 10, today);
  assert.equal(g.size, 30);
  assert.equal(g.lead, 6); // 1 Kasım 2026 Pazar
  assert.equal(g.cells.filter(c => c.today).length, 1);
  assert.equal(g.cells[21].today, true);
  assert.equal(g.cells[0].past, true);
  assert.equal(g.cells[29].past, false);
  assert.equal(g.cells[18].season, null);
  assert.equal(g.cells[19].season, 'autumn'); // 20 Kasım
  assert.equal(g.cells[29].season, 'autumn');
  assert.equal(g.seasons.length, 1);
  assert.equal(monthGrid(2026, 8, today).seasons.length, 0);
});

test('heatCellDay counts weeks and weekdays from today’s cell', () => {
  const t = Date.UTC(2026, 10, 22);
  assert.equal(heatCellDay(3, 6, 3, 6, t), t);
  assert.equal(heatCellDay(3, 5, 3, 6, t), t - 864e5);
  assert.equal(heatCellDay(4, 6, 3, 6, t), t + 7 * 864e5);
  assert.equal(heatCellDay(0, 0, 3, 6, t), t - (3 * 7 + 6) * 864e5);
  assert.ok(sameMonth(heatCellDay(3, 5, 3, 6, t), t));
  assert.ok(!sameMonth(heatCellDay(5, 6, 3, 6, t), t));
});

test('placeTip keeps the balloon on screen', () => {
  const view = { w: 400, h: 600 };
  const size = { w: 120, h: 50 };
  assert.deepEqual(placeTip({ x: 100, y: 300 }, size, view), { x: 114, y: 236 });
  assert.equal(placeTip({ x: 390, y: 300 }, size, view).x, 390 - 120 - 14);
  assert.ok(placeTip({ x: 100, y: 5 }, size, view).y >= 8);
  const low = placeTip({ x: 100, y: 590 }, size, view);
  assert.ok(low.y + 50 <= 592);
});

test('offPct only reports a real discount', () => {
  assert.equal(offPct(60, 100), 40);
  assert.equal(offPct(100, 100), 0);
  assert.equal(offPct(99.8, 100), 0);
  assert.equal(offPct(NaN, 100), 0);
  assert.equal(offPct(50, 0), 0);
});

test('enterSpan caps at ten staggered cards', () => {
  assert.equal(enterSpan(0), 900);
  assert.equal(enterSpan(10), enterSpan(500));
});

const css = readFileSync(new URL('../assets/polish-20261122.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const offline = readFileSync(new URL('../offline.html', import.meta.url), 'utf8');

test('every motion rule needs html.mo-par, so reduced motion switches them all off', () => {
  const rules = css.split('}').map(r => r.trim()).filter(r => /animation\s*:/.test(r.split('{')[1] || '') && !/animation\s*:\s*none/.test(r) && !/@keyframes/.test(r.split('{')[0]));
  assert.ok(rules.length > 10);
  for (const r of rules) assert.match(r.split('{')[0], /mo-par/, r.slice(0, 90));
});

test('the page loads the polish files and both themes have chart tokens', () => {
  assert.match(html, /polish-20261122\.css/);
  assert.match(html, /polish-20261122\.js/);
  assert.match(css, /:root\[data-ui=sade\]\{[^}]*--pc-line/);
  assert.match(css, /--pc-grid/);
});

test('offline page has a drawing and respects reduced motion', () => {
  assert.match(offline, /<svg/);
  assert.match(offline, /prefers-reduced-motion/);
});
