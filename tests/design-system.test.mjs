import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/design-system-20261122.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../assets/design-system-20261122.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Kullanılan renk çiftleri: tema, zemin, ana metin, ikincil metin, vurgu (metin olarak), vurgu üstü metin.
const themes = {
  'klasik koyu': { bg: '#11161e', panel: '#151c26', ink: '#f1f5f8', muted: '#96a2b3', accent: '#b5f482', onAccent: '#0b1118' },
  'gerçek siyah': { bg: '#000000', panel: '#07090c', ink: '#f4f7fb', muted: '#a3afbf', accent: '#b5f482', onAccent: '#0b1118' },
  'sade açık': { bg: '#f8f6ff', panel: '#f1eff8', ink: '#081018', muted: '#3a4657', accent: '#6b30c5', onAccent: '#ffffff' },
  'klasik yüksek kontrast': { bg: '#05070a', panel: '#0b0f14', ink: '#ffffff', muted: '#d6deea', accent: '#d6ff6a', onAccent: '#0b1118' },
  'sade yüksek kontrast': { bg: '#ffffff', panel: '#ffffff', ink: '#000000', muted: '#1d2633', accent: '#4b1d9c', onAccent: '#ffffff' },
};

for (const [name, t] of Object.entries(themes)) {
  test(`${name}: metin kontrastı WCAG AA`, () => {
    assert.ok(ratio(t.ink, t.bg) >= 7, `ink/bg ${ratio(t.ink, t.bg).toFixed(2)}`);
    assert.ok(ratio(t.muted, t.bg) >= 4.5, `muted/bg ${ratio(t.muted, t.bg).toFixed(2)}`);
    assert.ok(ratio(t.muted, t.panel) >= 4.5, `muted/panel ${ratio(t.muted, t.panel).toFixed(2)}`);
    assert.ok(ratio(t.accent, t.bg) >= 4.5, `accent/bg ${ratio(t.accent, t.bg).toFixed(2)}`);
    assert.ok(ratio(t.onAccent, t.accent) >= 4.5, `onAccent/accent ${ratio(t.onAccent, t.accent).toFixed(2)}`);
  });
}

test('yüksek kontrast değerleri CSS ile aynı', () => {
  assert.match(css, /:root\[data-contrast=high\]\[data-ui=sade\]\{[^}]*--lime:#4b1d9c/);
  assert.match(css, /:root\[data-contrast=high\]:not\(\[data-ui=sade\]\)\{[^}]*--lime:#d6ff6a/);
  assert.match(css, /--muted:#d6deea/);
});

test('jeton ölçekleri tanımlı ve tek vurgu rengi mevcut --lime', () => {
  for (const v of ['--ds-r-sm', '--ds-r-md', '--ds-r-lg', '--ds-r-pill', '--ds-sp-1', '--ds-sp-6', '--ds-shadow-1', '--ds-shadow-3', '--ds-fs-price', '--ds-fs-card-title'])
    assert.ok(css.includes(v + ':'), v);
  assert.match(css, /--ds-accent:var\(--lime\)/);
});

test('Sade artık açık zemin kullanır ve logo/menü okunur', () => {
  assert.match(css, /:root\[data-ui=sade\] body[^{]*\{background:var\(--bg\)!important/);
  assert.match(css, /:root\[data-ui=sade\] \.brand/);
  assert.match(css, /#root>header \.menu-button/);
});

test('OLED saf siyah', () => {
  assert.match(css, /:root\[data-theme=oled\][^{]*\{background:#000!important/);
});

test('azaltılmış hareket hem sistem ayarında hem uygulama ayarında geçişi kapatır', () => {
  assert.match(css, /prefers-reduced-motion:reduce\)\{[^@]*html\.ds-fading[^}]*transition:none/);
  assert.match(css, /html\[data-reduce-motion=true\]\.ds-fading/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /reduceMotion === "true"/);
});

test('altbilgi denetimleri TR ve EN etiket taşır, çeviriciden korunur', () => {
  assert.match(js, /contrast: "Yüksek kontrast"/);
  assert.match(js, /contrast: "High contrast"/);
  assert.match(js, /"translate", "no"/);
});

test('index.html dosyaları yükler ve kontrast/yazı tercihini ilk boyamadan önce uygular', () => {
  assert.ok(html.includes('assets/design-system-20261122.css'));
  assert.ok(html.includes('assets/design-system-20261122.js'));
  assert.ok(html.indexOf('radar-ds') < html.indexOf('design-system-20261122.css'));
  assert.ok(html.indexOf('design-system-20261122.css') > html.indexOf('firsatlar-20261122.css'), 'son yüklenen dosya olmalı');
});
