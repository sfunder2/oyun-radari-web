import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CVD_PALETTE, CVD_RAMP, stackWidths } from '../assets/genel-20261128.js';
import { luminance, contrast } from '../assets/ui-kit-20261128.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/genel-20261128.css', import.meta.url), 'utf8');

test('stackWidths: oranlar halka çevresine göre, toplam %100 aşmaz', () => {
  const C = 2 * Math.PI * 52;
  assert.deepEqual(stackWidths([C / 2, C / 4], C), [50, 25]);
  const w = stackWidths([C * 0.7, C * 0.7], C);
  assert.equal(w[0] + w[1], 100);
  assert.deepEqual(stackWidths([NaN, -5], C), [0, 0]);
});

test('renk körü ısı dizisi: açıklık tek yönde artar ve komşu düzeyler ayırt edilir', () => {
  for (let i = 1; i < CVD_RAMP.length; i++) {
    assert.ok(luminance(CVD_RAMP[i]) > luminance(CVD_RAMP[i - 1]), `düzey ${i}`);
    assert.ok(contrast(CVD_RAMP[i], CVD_RAMP[i - 1]) >= 1.3, `komşu ${i}`);
  }
});

test('Okabe-Ito dizisi 8 ayrı renk', () => {
  assert.equal(new Set(CVD_PALETTE).size, 8);
});

test('CSS ve index bağları', () => {
  for (const c of CVD_RAMP.slice(0, 5)) assert.ok(css.includes(c), c);
  assert.match(css, /view-transition-name:site-header/);
  assert.match(css, /prefers-reduced-motion:no-preference\)\{\s*::view-transition-old\(root\)/);
  assert.ok(html.includes('assets/genel-20261128.css') && html.includes('assets/genel-20261128.js'));
});

test('OG etiketleri, 404 sayfası ve paylaşım görseli', () => {
  assert.match(html, /property="og:image" content="https:\/\/[^"]+\/icons\/og-image\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  const png = readFileSync(new URL('../icons/og-image.png', import.meta.url));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  const nf = readFileSync(new URL('../404.html', import.meta.url), 'utf8');
  assert.match(nf, /<title>Oyun Radarı — Sayfa bulunamadı<\/title>/);
  assert.match(nf, /prefers-reduced-motion:no-preference/);
});
