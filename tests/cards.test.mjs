import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  discountTier, parsePct, parseMoney, priceDelta, ribbonKind, accentFromPixels, hueAccent, platformGroups, lowestOffer, rememberPrice,
} from '../assets/cards-20261122.js';

test('discountTier uses the 20 / 50 / 75 steps', () => {
  assert.deepEqual([0, 10, 19, 20, 49, 50, 74, 75, 100].map(discountTier), [0, 0, 0, 1, 1, 2, 2, 3, 3]);
  assert.equal(discountTier(null), 0);
  assert.equal(discountTier('abc'), 0);
});

test('parsePct reads the number from badge text', () => {
  assert.equal(parsePct('%75 indirim'), 75);
  assert.equal(parsePct('−%20'), 20);
  assert.equal(parsePct('Ücretsiz'), null);
  assert.equal(parsePct('%0'), null);
});

test('parseMoney handles TR and US formats', () => {
  assert.equal(parseMoney('₺1.299,00'), 1299);
  assert.equal(parseMoney('₺344,50'), 344.5);
  assert.equal(parseMoney('$9.99'), 9.99);
  assert.equal(parseMoney('1,299.00 TL'), 1299);
  assert.equal(parseMoney('1.299'), 1299);
  assert.equal(parseMoney('—'), null);
  assert.equal(parseMoney('…'), null);
});

test('priceDelta only reports real changes', () => {
  assert.deepEqual(priceDelta(100, 80), { dir: 'down', pct: 20 });
  assert.deepEqual(priceDelta(80, 100), { dir: 'up', pct: 25 });
  assert.equal(priceDelta(100, 100.2).dir, 'none');
  assert.equal(priceDelta(null, 5).dir, 'none');
  assert.equal(priceDelta(100, 99.4).pct, 1);
});

test('ribbonKind prefers the all-time low and limits "new" to 72 hours and a real drop', () => {
  const H = 3600 * 1000;
  assert.equal(ribbonKind({ atl: true, delta: { dir: 'none', pct: 0 }, ageMs: 0 }), 'atl');
  assert.equal(ribbonKind({ atl: false, delta: { dir: 'down', pct: 10 }, ageMs: 5 * H }), 'new');
  assert.equal(ribbonKind({ atl: false, delta: { dir: 'down', pct: 10 }, ageMs: 80 * H }), null);
  assert.equal(ribbonKind({ atl: false, delta: { dir: 'down', pct: 1 }, ageMs: H }), null);
  assert.equal(ribbonKind({ atl: false, delta: { dir: 'up', pct: 30 }, ageMs: H }), null);
});

test('accentFromPixels favours saturated pixels and skips near-black / near-white', () => {
  const px = [];
  for (let i = 0; i < 20; i++) px.push(10, 10, 10, 255); // koyu
  for (let i = 0; i < 20; i++) px.push(250, 250, 250, 255); // beyaz
  for (let i = 0; i < 10; i++) px.push(200, 40, 40, 255); // kırmızı
  const c = accentFromPixels(px);
  assert.match(c, /^#[0-9a-f]{6}$/);
  assert.ok(parseInt(c.slice(1, 3), 16) > 150);
  assert.equal(accentFromPixels([0, 0, 0, 255, 255, 255, 255, 255]), null);
  assert.equal(accentFromPixels([]), null);
});

test('hueAccent is stable per title', () => {
  assert.equal(hueAccent('Elden Ring'), hueAccent('Elden Ring'));
  assert.notEqual(hueAccent('Elden Ring'), hueAccent('Hades II'));
  assert.match(hueAccent(''), /^hsl\(/);
});

test('platformGroups collapses PC stores and orders PC, PS, Xbox, Switch', () => {
  assert.deepEqual(platformGroups(['xbox', 'steam', 'playstation', 'epic', 'switch']), ['pc', 'ps', 'xbox', 'switch']);
  assert.deepEqual(platformGroups(['gog', 'steam']), ['pc']);
  assert.deepEqual(platformGroups([undefined, 'unknown']), []);
});

test('lowestOffer picks the cheapest valid offer', () => {
  const l = lowestOffer([{ value: 300, text: 'a' }, { value: 120, text: 'b' }, { value: NaN }, null]);
  assert.equal(l.text, 'b');
  assert.equal(lowestOffer([]), null);
});

test('rememberPrice reports the previous price after a change and stays quiet otherwise', () => {
  const s = {};
  assert.equal(rememberPrice(s, 'g', 100, 1000), null);
  assert.equal(rememberPrice(s, 'g', 100, 2000), null);
  assert.deepEqual(rememberPrice(s, 'g', 80, 3000), { prev: 100, at: 3000 });
  assert.deepEqual(rememberPrice(s, 'g', 80, 4000), { prev: 100, at: 3000 });
  assert.deepEqual(rememberPrice(s, 'g', 90, 5000), { prev: 80, at: 5000 });
});

test('rememberPrice trims to the cap, dropping the oldest', () => {
  const s = {};
  for (let i = 0; i < 12; i++) rememberPrice(s, 'k' + i, 10, i, 10);
  assert.equal(Object.keys(s).length, 10);
  assert.ok(!('k0' in s) && !('k1' in s) && 'k11' in s);
});

test('index.html loads the card files and the css respects reduced motion', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /assets\/cards-20261122\.css/);
  assert.match(html, /assets\/cards-20261122\.js/);
  const css = readFileSync(new URL('../assets/cards-20261122.css', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /data-reduce-motion=true/);
  for (const t of ['0', '1', '2', '3']) assert.ok(css.includes(`data-cd-tier="${t}"`));
});
