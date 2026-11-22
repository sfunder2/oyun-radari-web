import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/firsatlar-20261122.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SCOPE = '.simple-home:has(>.vz-dealtools)';

test('Fırsatlar düzeni index.html içinde, görsel katmanlardan sonra yüklenir', () => {
  const a = html.indexOf('visuals-20261121.css');
  const b = html.indexOf('firsatlar-20261122.css');
  assert.ok(a > -1 && b > a);
});

test('her seçici yalnız Fırsatlar bölümüne kapsanır; Keşfet etkilenmez', () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{/g, '').split('}').map(r => r.trim()).filter(Boolean);
  for (const r of rules) {
    const sel = r.split('{')[0].trim();
    if (!sel) continue;
    for (const one of sel.split(',')) assert.ok(one.includes(SCOPE), one.trim());
  }
});

test('ikincil araçlar kaldırılmaz, yalnız küçültülür (takvim, tür haritası, diğer filtreler)', () => {
  assert.ok(!/\.vz-panel(\[open\])?\{[^}]*display:none/.test(css));
  assert.ok(!/\.filterpanel[^{]*\{[^}]*display:none/.test(css));
});

test('yeni hareket eklenmez (azaltılmış hareket için güvenli)', () => {
  assert.ok(!/@keyframes|animation:/.test(css));
});
