// Mobile regression checks in a real browser. Run: npm run test:mobile (needs `playwright`).
// Everything is served locally and every REST call is stubbed (see mock-api.mjs).
import { createRequire } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { serve, mockNetwork, BASE } from './mock-api.mjs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const VIEWS = {
  'telefon-360': { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  'iphone-390': devices['iPhone 13'],
  'tablet-768': { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};
const SECTIONS = ['home', 'all', 'deals', 'fav', 'calendar', 'community', 'profile', 'changelog'];
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

let srv, origin, browser;
test.before(async () => { ({ srv, origin } = await serve()); browser = await chromium.launch(); });
test.after(async () => { await browser.close(); srv.close(); });

async function open(view, qs, opts = {}) {
  const ctx = await browser.newContext({ ...VIEWS[view], serviceWorkers: opts.sw ? 'allow' : 'block' });
  await ctx.addInitScript(() => { try { localStorage.setItem('radar-install-hint', '1'); } catch {} });
  const page = await ctx.newPage();
  await mockNetwork(page, origin);
  await page.goto(`${origin}${BASE}index.html?${qs}`);
  await page.waitForTimeout(1500);
  return { ctx, page };
}

for (const view of Object.keys(VIEWS)) for (const ui of ['klasik', 'sade']) for (const lang of ['tr', 'en']) {
  if (lang === 'en' && view !== 'iphone-390') continue;
  test(`no page-level horizontal scroll: ${view} ${ui} ${lang}`, async () => {
    for (const s of SECTIONS) {
      const { ctx, page } = await open(view, `section=${s}&gorunum=${ui}&lang=${lang}`);
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${view}-${ui}-${lang}-${s}.png` });
      await ctx.close();
      assert.ok(extra <= 0, `${s}: ${extra}px of horizontal overflow`);
    }
  });
}

test('touch targets and fields: brand, account, inputs meet 44px / 16px', async () => {
  for (const view of Object.keys(VIEWS)) {
    const { ctx, page } = await open(view, 'section=all');
    const bad = await page.evaluate(() => {
      const out = [];
      for (const e of document.querySelectorAll('header .brand, .account-button, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select')) {
        const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
        if (r.height < 43.5 || r.width < 43.5) out.push(`${e.tagName}.${e.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
        if (/INPUT|SELECT/.test(e.tagName) && parseFloat(getComputedStyle(e).fontSize) < 15.99) out.push(`${e.tagName} font ${getComputedStyle(e).fontSize}`);
      }
      return out;
    });
    await ctx.close();
    assert.deepEqual(bad, [], view);
  }
});

test('viewport, safe-area and dvh basics', async () => {
  const { ctx, page } = await open('iphone-390', 'section=all');
  assert.match(await page.locator('meta[name=viewport]').getAttribute('content'), /viewport-fit=cover/);
  assert.ok(await page.locator('.mx-dock').isVisible(), 'bottom dock visible on phones');
  await ctx.close();
});

test('theme-color follows Sade', async () => {
  const { ctx, page } = await open('iphone-390', 'section=all&gorunum=sade');
  const c = await page.locator('meta[name=theme-color]').first().getAttribute('content');
  await ctx.close();
  assert.notEqual(c.toLowerCase(), '#090d12');
});

test('service worker caches the shell and the app opens offline', async () => {
  const { ctx, page } = await open('iphone-390', 'section=all', { sw: true });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.goto(`${origin}${BASE}`, { waitUntil: 'domcontentloaded' });
  const text = await page.evaluate(() => document.body.innerText);
  await ctx.close();
  assert.ok(text.length > 20, 'offline shell rendered something');
});

test('every manifest icon exists', async () => {
  const { ctx, page } = await open('iphone-390', 'section=home');
  const m = await (await ctx.request.get(`${origin}${BASE}manifest.webmanifest`)).json();
  for (const i of m.icons) assert.equal((await ctx.request.get(`${origin}${BASE}${i.src}`)).status(), 200, i.src);
  await ctx.close();
});
