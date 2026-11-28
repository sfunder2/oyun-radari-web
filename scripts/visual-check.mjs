// Görsel tarama: sayfayı TR/EN × Klasik/Sade × masaüstü/mobil matrisinde açar, ekran görüntüsü alır ve yerleşim kurallarını denetler.
// Kullanım:  node scripts/visual-check.mjs [--out tests/visual/out] [--base tests/visual/baseline] [--update]
//  - Playwright kurulu olmalı (`npm i -D playwright` ya da küresel kurulum). Depoya bağımlılık eklemez.
//  - Yerleşim denetimi: mobilde yatay kaydırma yok, konsolda yakalanmamış hata yok, sayfa boş değil.
//  - --update mevcut görüntüleri baseline klasörüne yazar. --base verilirse ImageMagick `compare` ile fark oranı raporlanır (eşik 2%).
//    Canlı mağaza verisi değiştiği için fark yalnız bilgi amaçlıdır; çıkış kodunu yalnız yerleşim ihlalleri belirler.
import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.env.RADAR_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const out = path.resolve(root, arg('out', 'tests/visual/out'));
const base = arg('base', null);
const update = process.argv.includes('--update');
const baseDir = path.resolve(root, base && base !== true ? base : 'tests/visual/baseline');
mkdirSync(out, { recursive: true });

let playwright;
try { playwright = await import('playwright'); } catch { console.error('Playwright bulunamadı: npm i -D playwright'); process.exit(2); }
const { chromium, devices } = playwright;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/oyun-radari-web\//, '/');
  const file = path.join(root, p === '/' ? 'index.html' : p);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, r));
const origin = `http://localhost:${server.address().port}/oyun-radari-web/`;

const pages = [['ana', ''], ['oyunlar', '?section=all'], ['firsatlar', '?section=deals']];
const profiles = [['masaustu', { viewport: { width: 1280, height: 900 } }], ['mobil', { ...devices['iPhone 13'] }]];
const browser = await chromium.launch();
const problems = [];
let shots = 0;
for (const [pname, pctx] of profiles) {
  for (const lang of ['tr', 'en']) {
    for (const ui of ['klasik', 'sade']) {
      const ctx = await browser.newContext({ ...pctx, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      for (const [name, q] of pages) {
        const sep = q ? '&' : '?';
        await page.goto(`${origin}${q}${sep}lang=${lang}&gorunum=${ui}`, { waitUntil: 'load' }).catch(() => {});
        await page.waitForTimeout(2200);
        const tag = `${name}-${lang}-${ui}-${pname}`;
        const file = path.join(out, tag + '.png');
        await page.screenshot({ path: file });
        shots++;
        const m = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, len: (document.getElementById('root') || {}).innerHTML?.length || 0 }));
        if (pname === 'mobil' && m.overflow > 2) problems.push(`${tag}: yatay taşma ${m.overflow}px`);
        if (m.len < 500) problems.push(`${tag}: sayfa boş görünüyor`);
        if (update) { mkdirSync(baseDir, { recursive: true }); copyFileSync(file, path.join(baseDir, tag + '.png')); }
        else if (base && existsSync(path.join(baseDir, tag + '.png'))) {
          try {
            const pct = execFileSync('compare', ['-metric', 'AE', '-fuzz', '5%', path.join(baseDir, tag + '.png'), file, 'null:'], { stdio: ['ignore', 'pipe', 'pipe'] });
            void pct;
          } catch (e) {
            const diff = Number(String(e.stderr || '').trim().split(/\s/)[0]);
            if (Number.isFinite(diff)) console.log(`bilgi: ${tag} fark ${diff} piksel`);
          }
        }
      }
      if (errors.length) problems.push(`${pname}-${lang}-${ui}: yakalanmamış hata: ${errors[0].slice(0, 120)}`);
      await ctx.close();
    }
  }
}
await browser.close();
server.close();
console.log(`${shots} ekran görüntüsü → ${path.relative(root, out)}`);
if (problems.length) { console.error('Yerleşim sorunları:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('Yerleşim denetimi temiz.');
