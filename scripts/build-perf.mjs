// Collapses the many small dated override stylesheets referenced by index.html into ONE file,
// keeping their cascade order, so the page makes 2 render-blocking CSS requests instead of 41.
// Runs ONLY on the deploy copy (see .github/workflows/pages.yml): the committed index.html and the
// individual stylesheets stay exactly as they are, so nobody's edits or tests conflict and the bundle can
// never be stale. Usage: node scripts/build-perf.mjs [dir]  (default: repository root)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = '/oyun-radari-web/assets/';
const LINK = /<link rel="stylesheet" href="\/oyun-radari-web\/assets\/([a-z0-9-]+-2026[0-9a-z]*\.css)(?:\?[^"]*)?">/g;
// Enhancement modules that are not needed for the first paint load after the page is interactive
// (sequentially, same order as before). Everything else keeps its normal <script type=module> tag.
const DEFER = /^(catalog-tools|hub|detail-tidy|detail|kisisel|visuals|motion)-[0-9a-z]+\.js$/;
const SCRIPT = /<script type="module" src="(\/oyun-radari-web\/assets\/([a-z-]+-2026[0-9a-z]*\.js))(\?[^"]*)?"><\/script>/g;
// App-shell skeleton painted from HTML+CSS alone (no JS); React replaces #root's children on mount.
export const SKELETON_CSS = '.rb{max-width:620px;margin:0 auto;padding:clamp(20px,7vh,72px) 16px 0;display:grid;gap:18px;justify-items:center}.rb i{display:block;border-radius:14px;background:color-mix(in srgb,currentColor 9%,transparent);animation:rb 1.4s ease-in-out infinite}.rb .t{width:210px;height:44px}.rb .s{width:100%;height:52px;border-radius:16px}.rb .n{width:100%;height:50px;border-radius:999px}.rb .g{width:100%;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}.rb .g i{height:120px}@keyframes rb{50%{opacity:.45}}@media(prefers-reduced-motion:reduce){.rb i{animation:none}}@media(min-width:700px){.rb .g{grid-template-columns:repeat(3,1fr)}}';
export const SKELETON_HTML = '<div class="rb" aria-hidden="true"><i class="t"></i><i class="s"></i><i class="n"></i><div class="g"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>';
const BUNDLE_LINK = /<link rel="stylesheet" href="\/oyun-radari-web\/assets\/site-[0-9a-f]{8}\.css">/;
export function build({ root = repoRoot, write = true } = {}) {
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const found = [...html.matchAll(LINK)].map(m => m[1]);
  const files = [...new Set(found)].filter(f => fs.existsSync(path.join(root, 'assets', f)));
  const css = files.map(f => {
    const src = fs.readFileSync(path.join(root, 'assets', f), 'utf8');
    if (/@import/.test(src)) throw new Error(f + ' uses @import');
    return `/* ${f} */\n${src.trim()}\n`;
  }).join('\n');
  const name = `site-${crypto.createHash('sha1').update(css).digest('hex').slice(0, 8)}.css`;
  const tag = `<link rel="stylesheet" href="${BASE}${name}">`;
  const stale = fs.readdirSync(path.join(root, 'assets')).filter(f => /^site-[0-9a-f]{8}\.css$/.test(f) && f !== name);
  html = html.replace(LINK, () => '');
  // Bundle goes where the first override link used to be (right after the main stylesheet).
  const old = html.match(BUNDLE_LINK);
  if (old) html = html.replace(BUNDLE_LINK, tag);
  else html = html.replace(/(<link rel="stylesheet" crossorigin href="\/oyun-radari-web\/assets\/index-[^"]+\.css">)/, `$1${tag}`);
  // 1) defer non-critical enhancement modules
  const deferred = [];
  html = html.replace(SCRIPT, (tag, url, name, q) => { if (!DEFER.test(name)) return tag; deferred.push(url + (q || '')); return ''; });
  if (deferred.length) {
    const loader = `<script>addEventListener("load",function(){var l=${JSON.stringify(deferred)},i=0;function n(){if(i<l.length)import(l[i++]).catch(function(){}).then(n)}("requestIdleCallback"in window?requestIdleCallback(n,{timeout:2500}):setTimeout(n,1200))})</script>`;
    html = html.replace('</body>', loader + '</body>');
  }
  // 2) critical CSS + skeleton inside #root
  html = html.replace('</head>', `<style id="rb-css">${SKELETON_CSS}</style></head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${SKELETON_HTML}</div>`);
  if (write) {
    fs.writeFileSync(path.join(root, 'assets', name), css);
    fs.writeFileSync(path.join(root, 'index.html'), html);
    for (const s of stale) fs.unlinkSync(path.join(root, 'assets', s));
  }
  return { name, files, html, css, deferred };
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const r = build({ root: path.resolve(process.argv[2] || repoRoot) });
  console.log(`${r.name}: ${r.files.length} stylesheets, ${(r.css.length / 1024).toFixed(0)} KB, ${r.deferred.length} deferred modules`);
}
