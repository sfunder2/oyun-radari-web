import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ICONS, iconSvg, contrast, onColor, parseHex, toastIcon } from '../assets/ui-kit-20261128.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/ui-kit-20261128.css', import.meta.url), 'utf8');

test('ikon seti: hepsi geçerli yol içerir, bilinmeyen ad info olur', () => {
  assert.ok(Object.keys(ICONS).length >= 30);
  for (const [k, v] of Object.entries(ICONS)) assert.match(v, /<(path|circle|rect)\b/, k);
  assert.match(iconSvg('heart', { fill: true, size: 18 }), /class="ui-ico fill" .*width:18px/);
  assert.equal(iconSvg('yok'), iconSvg('info'));
  assert.match(iconSvg('check'), /aria-hidden="true"/);
});

test('kontrast yardımcıları', () => {
  assert.deepEqual(parseHex('#fff'), [255, 255, 255]);
  assert.equal(parseHex('zzz'), null);
  assert.ok(contrast('#000', '#fff') > 20.9);
  assert.equal(onColor('#b5f482'), '#0b1118');
  assert.equal(onColor('#6b30c5'), '#ffffff');
});

test('toast türleri ikon eşler', () => {
  assert.equal(toastIcon('good'), 'check');
  assert.equal(toastIcon('bad'), 'error');
  assert.equal(toastIcon('x'), 'info');
});

test('jetonlar: 4/8 ritmi, hareket, katman, hareketi azaltma', () => {
  for (const t of ['--ui-1:4px', '--ui-2:8px', '--ui-4:16px', '--ui-8:64px', '--ui-dur-2', '--ui-ease', '--ui-surface-3', '--ui-z-toast']) assert.ok(css.includes(t), t);
  assert.match(css, /prefers-reduced-motion:reduce\)\{:root\{--ui-dur-1:\.01ms/);
  assert.match(css, /data-reduce-motion=true\]\{--ui-dur-1/);
});

test('index.html kiti yükler', () => {
  assert.ok(html.includes('assets/ui-kit-20261128.css'));
  assert.ok(html.includes('assets/ui-kit-20261128.js'));
});
