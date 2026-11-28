import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pushPoint, sparkGeometry, chipHue } from '../assets/kart-yazi-20261128.js';
import { contrast } from '../assets/ui-kit-20261128.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('pushPoint: aynı fiyat eklenmez, sınır korunur', () => {
  const s = [];
  assert.equal(pushPoint(s, 100, 1), true);
  assert.equal(pushPoint(s, 100, 2), false);
  assert.equal(pushPoint(s, NaN, 3), false);
  for (let i = 0; i < 30; i++) pushPoint(s, i, 10 + i, 14);
  assert.equal(s.length, 14);
  assert.equal(s[s.length - 1][1], 29);
});

test('sparkGeometry: 3 farklı fiyattan az ise çizilmez; eğilim ve en düşük doğru', () => {
  assert.equal(sparkGeometry([[1, 10], [2, 10], [3, 20]]), null);
  const g = sparkGeometry([[1, 100], [2, 80], [3, 60]]);
  assert.equal(g.trend, 'down');
  assert.equal(g.lowest, true);
  assert.match(g.d, /^M[\d. ]+L[\d. ]+L[\d. ]+$/);
  assert.equal(sparkGeometry([[1, 60], [2, 80], [3, 100]]).trend, 'up');
  assert.equal(sparkGeometry([[1, 60], [2, 100], [3, 80]]).lowest, false);
});

test('chipHue: yıl ve sayı nötr, ad kararlı', () => {
  assert.equal(chipHue('2020'), null);
  assert.equal(chipHue(''), null);
  assert.equal(chipHue('Aksiyon'), chipHue('Aksiyon'));
  assert.notEqual(chipHue('Aksiyon'), chipHue('Macera'));
});

// hsl(h 70% 66%) koyu zeminde, hsl(h 68% 24%) açık zeminde: her ton AA
const hsl = (h, s, l) => {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
};
test('renkli çipler her tonda AA kontrast', () => {
  for (let h = 0; h < 360; h += 15) {
    const dark = hsl(h, 70, 74), onDark = contrast(dark, '#10161e');
    assert.ok(onDark >= 4.5, `koyu ${h} ${onDark.toFixed(2)}`);
    const light = hsl(h, 68, 24), onLight = contrast(light, '#f4f2fb');
    assert.ok(onLight >= 4.5, `açık ${h} ${onLight.toFixed(2)}`);
  }
});

test('index.html modülü yükler', () => {
  assert.ok(html.includes('assets/kart-yazi-20261128.css') && html.includes('assets/kart-yazi-20261128.js'));
});
