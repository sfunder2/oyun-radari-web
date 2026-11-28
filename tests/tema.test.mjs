import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACCENTS, BG, accentFor, uiForScheme } from '../assets/tema-20261128.js';
import { contrast, onColor } from '../assets/ui-kit-20261128.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/tema-20261128.css', import.meta.url), 'utf8');

test('her vurgu rengi koyu ve açık zeminde AA metin kontrastını geçer', () => {
  for (const [k, a] of Object.entries(ACCENTS)) {
    for (const bg of [BG.dark, BG.oled]) assert.ok(contrast(a.dark, bg) >= 4.5, `${k} koyu ${contrast(a.dark, bg).toFixed(2)}`);
    assert.ok(contrast(a.light, BG.light) >= 4.5, `${k} açık ${contrast(a.light, BG.light).toFixed(2)}`);
  }
});

test('vurgu üstü yazı rengi de AA', () => {
  for (const a of Object.values(ACCENTS)) for (const c of [a.dark, a.light]) assert.ok(contrast(c, onColor(c)) >= 4.5, c);
});

test('vurgu seçimi ve sistem tercihi eşlemesi', () => {
  assert.equal(accentFor('sky', 'light'), '#0b66b8');
  assert.equal(accentFor('yok', 'dark'), ACCENTS.lime.dark);
  assert.equal(uiForScheme(true), 'klasik');
  assert.equal(uiForScheme(false), 'sade');
});

test('katmanlı yüzey ve tema dosyaları yüklenir', () => {
  assert.match(css, /--ui-surface-2/);
  assert.ok(html.includes('assets/tema-20261128.css') && html.includes('assets/tema-20261128.js'));
});
