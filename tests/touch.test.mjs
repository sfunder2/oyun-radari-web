import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickThemeColor, clampPan } from '../assets/touch-20261128.js';

test('pickThemeColor turns a computed colour into hex', () => {
  assert.equal(pickThemeColor('rgb(9, 13, 18)'), '#090d12');
  assert.equal(pickThemeColor('rgba(247, 245, 253, 1)'), '#f7f5fd');
  assert.equal(pickThemeColor('transparent'), '#090d12');
});

test('clampPan keeps a zoomed image inside the stage', () => {
  assert.equal(clampPan(500, 300, 300, 1), 0);
  assert.equal(clampPan(500, 300, 300, 2), 150);
  assert.equal(clampPan(-500, 300, 300, 2), -150);
  assert.equal(clampPan(40, 300, 300, 2), 40);
});

test('index.html loads the touch layer, OG tags and manifest', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /touch-20261128\.css/);
  assert.match(html, /touch-20261128\.js/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /viewport-fit=cover/);
});

test('manifest is installable and has shortcuts', () => {
  const m = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(m.display, 'standalone');
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  assert.ok(m.shortcuts.length >= 3);
  for (const s of m.shortcuts) assert.ok(s.url.startsWith(m.scope));
});

test('service worker never caches cross-origin data and handles push', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /url\.origin !== self\.location\.origin\) return/);
  assert.match(sw, /addEventListener\('push'/);
  assert.match(sw, /notificationclick/);
});
