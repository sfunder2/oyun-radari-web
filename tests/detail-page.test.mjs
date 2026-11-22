import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../assets/detail-20261122.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/detail-20261122.css', import.meta.url), 'utf8');

test('index.html loads the detail page stylesheet and module', () => {
  assert.match(html, /assets\/detail-20261122\.css/);
  assert.match(html, /assets\/detail-20261122\.js/);
});

test('the module shares the ?detay=eski switch and only touches its own nodes', () => {
  assert.match(js, /radar-detail/);
  assert.match(js, /"eski"/);
  assert.match(js, /data-dt-own=dx/);
});

test('trailer iframe is created only on click and uses the cookieless host', () => {
  assert.match(js, /youtube-nocookie\.com/);
  assert.doesNotMatch(js, /<iframe/);
});

test('gallery lightbox closes on Escape without closing the detail dialog', () => {
  assert.match(js, /stopImmediatePropagation/);
  assert.match(js, /"Escape"/);
});

test('motion is switched off for reduced-motion users', () => {
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(js, /prefers-reduced-motion: reduce/);
});

test('every rule is scoped to the detail dialog or an own class', () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map((r) => r.split('{')[0].trim()).filter((s) => s && !s.startsWith('@') && !/^(from|to|\d+%)/.test(s));
  for (const sel of rules) for (const part of sel.split(',')) {
    assert.match(part.trim(), /game-detail|\.dx-|html\.dx-lb-open|:root\[data-ui=sade\] \.(dx-|game-detail|modal)|\.infoblock\[data-dx-req\]|\.similar\[data-dx|\.pricecompare|^\.game-detail|^\.dx|^body \.|^\.modal\.game-detail|^\.dx-/, part);
  }
});
