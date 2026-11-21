import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  priceChange, parallaxProgress, arcPoint, easeInOut, flightFrames, newlyEarned, badgeKey, sweepTone,
} from '../assets/motion-20261121.js';

test('priceChange only calls a real drop a drop', () => {
  assert.deepEqual(priceChange(100, 80), { dir: 'down', delta: 20, pct: 20 });
  assert.equal(priceChange(80, 100).dir, 'up');
  assert.equal(priceChange(100, 100.001).dir, 'none');
  assert.equal(priceChange(null, 80).dir, 'none');
  assert.equal(priceChange(100, 0).dir, 'none');
  assert.equal(priceChange(NaN, 5).dir, 'none');
});

test('parallaxProgress is -1 above the view, 0 centred, 1 below, and clamps', () => {
  const vh = 800;
  assert.equal(parallaxProgress({ top: 300, height: 200 }, vh), 0);
  assert.equal(parallaxProgress({ top: -200, height: 200 }, vh), -1);
  assert.equal(parallaxProgress({ top: 800, height: 200 }, vh), 1);
  assert.equal(parallaxProgress({ top: -5000, height: 200 }, vh), -1);
  assert.equal(parallaxProgress({ top: 5000, height: 200 }, vh), 1);
  assert.equal(parallaxProgress(null, vh), 0);
  assert.equal(parallaxProgress({ top: 0, height: 10 }, 0), 0);
});

test('arcPoint starts and ends on the endpoints and bows upward', () => {
  const a = { x: 10, y: 400 }, b = { x: 300, y: 20 };
  assert.deepEqual(arcPoint(0, a, b), a);
  assert.deepEqual(arcPoint(1, a, b), b);
  assert.ok(arcPoint(0.5, a, b, 100).y < (a.y + b.y) / 2);
});

test('flightFrames shrinks monotonically from scale 1 to the end scale', () => {
  const f = flightFrames({ x: 0, y: 0 }, { x: 200, y: -300 }, { steps: 10, endScale: 0.2 });
  assert.equal(f.length, 11);
  assert.deepEqual([f[0].offset, f[10].offset], [0, 1]);
  assert.equal(f[0].scale, 1);
  assert.ok(Math.abs(f[10].scale - 0.2) < 1e-9);
  assert.deepEqual([f[10].dx, f[10].dy], [200, -300]);
  for (let i = 1; i < f.length; i++) assert.ok(f[i].scale <= f[i - 1].scale);
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
});

test('newlyEarned treats the first visit as seen and later badges as new', () => {
  assert.deepEqual(newlyEarned(null, ['a|rare']), []);
  assert.deepEqual(newlyEarned(['a|rare'], ['a|rare', 'b|epic']), ['b|epic']);
  assert.deepEqual(newlyEarned([], ['a|rare']), ['a|rare']);
  assert.equal(badgeKey(' Kaşif ', 'RARE'), 'kaşif|rare');
});

test('sweepTone follows the view mode', () => {
  assert.equal(sweepTone('sade'), 'sade');
  assert.equal(sweepTone('klasik'), 'klasik');
  assert.equal(sweepTone(undefined), 'klasik');
});

test('index.html loads the module and stylesheet, and every motion rule needs mo-par', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('assets/motion-20261121.css'));
  assert.ok(html.includes('assets/motion-20261121.js'));
  const css = readFileSync(new URL('../assets/motion-20261121.css', import.meta.url), 'utf8');
  const bad = [...css.matchAll(/([^{}]+)\{[^{}]*\banimation\s*:[^{}]*\}/g)]
    .map(m => m[1].trim())
    .filter(sel => !/^@keyframes/.test(sel) && !/mo-par/.test(sel) && !/\.mo-(bar|sweep)\b/.test(sel));
  assert.deepEqual(bad, []);
});
