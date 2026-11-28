// Tipografi, kart ve liste cilası (28 Kasım 2026). kart-yazi-20261128.css ile birlikte.
//  - Akıllı kırpma: uzun başlıklar 2 satırda biter, tamamı title ipucunda (yalnız gerçekten kırpılanlara)
//  - Fiyat kıvrımı: son fiyat gözlemlerinden minik çizgi grafik (sparkline). Yalnız bu cihazda, bu oyunu en az 3 farklı fiyatla
//    gördüysek çizilir; uydurma veri yok.
//  - Renkli çipler: tür/etiket çipleri addan türeyen sabit tonla (yıl ve sayı çipleri nötr kalır)
// React düğümleri silinmez ya da değiştirilmez; yalnız öznitelik ve kendi data-ky düğümlerimiz eklenir.
import { parseMoney, hueAccent } from './cards-20261122.js';

// ---- Saf yardımcılar (Node'da sınanır) ----
// Fiyat serisine nokta ekler: aynı fiyat tekrarlanmaz, en çok `cap` nokta kalır. Değişiklik olduysa true döner.
export function pushPoint(series, price, t, cap = 14) {
  if (!Number.isFinite(price) || price < 0) return false;
  const last = series[series.length - 1];
  if (last && last[1] === price) return false;
  series.push([t, price]);
  while (series.length > cap) series.shift();
  return true;
}
// Sparkline için SVG yol ve uç nokta. En az 3 farklı fiyat yoksa null.
export function sparkGeometry(series, w = 56, h = 18, pad = 2) {
  const pts = (series || []).filter((p) => Array.isArray(p) && Number.isFinite(p[1]));
  if (new Set(pts.map((p) => p[1])).size < 3) return null;
  const vals = pts.map((p) => p[1]);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const xy = pts.map((p, i) => [pad + (i / (pts.length - 1)) * (w - 2 * pad), pad + (1 - (p[1] - lo) / span) * (h - 2 * pad)]);
  const d = xy.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
  const last = vals[vals.length - 1], first = vals[0];
  return { d, end: xy[xy.length - 1], trend: last < first ? 'down' : last > first ? 'up' : 'flat', lowest: last === lo, w, h };
}
// Çip tonu: yıl, sayı ve çok kısa metinler nötr; diğerleri addan 0-359 ton.
export function chipHue(text) {
  const s = String(text || '').trim();
  if (!s || /^[\d\s.,+%-]+$/.test(s)) return null;
  let h = 0;
  for (const ch of s.toLowerCase()) h = (h * 33 + ch.codePointAt(0)) % 360;
  return h;
}

// ---- Tarayıcı ----
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const KEY = 'radar-spark-v1';
  const ROW = '.deal-list-row';
  const CARD = '.gamecard';
  const en = () => document.documentElement.lang === 'en';
  let store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { store = {}; }
  let dirty = false;
  const save = () => {
    if (!dirty) return;
    dirty = false;
    const keys = Object.keys(store);
    if (keys.length > 400) keys.sort((a, b) => (store[a].at[store[a].at.length - 1] || 0) - (store[b].at[store[b].at.length - 1] || 0)).slice(0, keys.length - 400).forEach((k) => delete store[k]);
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* özel pencere */ }
  };
  setInterval(save, 5000);
  addEventListener('pagehide', save);

  const nameOf = (n) => (n.querySelector('h3, .deal-game b')?.textContent || '').trim();
  const priceOf = (n) => { const s = n.querySelector('.deal-best-price strong, .catalogprice strong, .catalogprice b'); return s ? parseMoney(s.textContent) : null; };
  const symbolOf = (n) => (n.querySelector('.deal-best-price strong, .catalogprice strong, .catalogprice b')?.textContent.match(/[^\d\s.,]+/) || [''])[0];

  function trim(node) {
    const t = node.querySelector('h3, .deal-game b');
    if (!t || t.dataset.kyT === t.textContent) return;
    t.dataset.kyT = t.textContent;
    if (t.scrollHeight > t.clientHeight + 2 || t.scrollWidth > t.clientWidth + 2) t.title = t.textContent.trim();
  }

  function spark(node) {
    const name = nameOf(node), price = priceOf(node);
    if (!name || price == null) return;
    const key = name.toLowerCase().slice(0, 80) + '|' + symbolOf(node);
    const s = store[key] || (store[key] = { p: [], at: [] });
    const series = s.p.map((v, i) => [s.at[i], v]);
    if (pushPoint(series, price, Date.now())) { store[key] = { p: series.map((x) => x[1]), at: series.map((x) => x[0]) }; dirty = true; }
    const host = node.querySelector('.deal-best-price, .catalogprice');
    if (!host) return;
    const old = host.querySelector(':scope > .ky-spark');
    const g = sparkGeometry(series);
    if (!g) { if (old) old.remove(); return; }
    const sig = g.d + price;
    if (old && old.dataset.sig === sig) return;
    const el = old || document.createElement('span');
    el.className = 'ky-spark ' + g.trend + (g.lowest ? ' low' : '');
    el.dataset.sig = sig;
    el.dataset.ky = '';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', en() ? `Prices you have seen: ${series.length} readings, ${g.trend === 'down' ? 'falling' : g.trend === 'up' ? 'rising' : 'flat'}` : `Gördüğün fiyatlar: ${series.length} kayıt, ${g.trend === 'down' ? 'düşüyor' : g.trend === 'up' ? 'yükseliyor' : 'sabit'}`);
    el.innerHTML = `<svg viewBox="0 0 ${g.w} ${g.h}" width="${g.w}" height="${g.h}" aria-hidden="true"><path d="${g.d}" pathLength="1"/><circle cx="${g.end[0].toFixed(1)}" cy="${g.end[1].toFixed(1)}" r="2.2"/></svg>`;
    if (!old) host.appendChild(el);
  }

  function chips(root) {
    root.querySelectorAll('.metachip:not([data-ky-c])').forEach((c) => {
      c.dataset.kyC = '1';
      const h = chipHue(c.textContent);
      if (h != null) { c.style.setProperty('--ky-h', String(h)); c.classList.add('ky-chip'); }
    });
  }

  let raf = 0;
  const run = () => {
    raf = 0;
    document.querySelectorAll(ROW + ',' + CARD).forEach((n) => { trim(n); spark(n); });
    chips(document);
  };
  new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(run); }).observe(document.body, { childList: true, subtree: true });
  run();
}
