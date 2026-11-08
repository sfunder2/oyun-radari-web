// Canlılık katmanı: kart/satır hareketleri, tür ve indirim renkleri, favori ve başarım kutlamaları, Sade/Klasik değiştirici.
// Paketin React kodu yalnızca `vividGenre` ile tür anahtarını kartın data-genre özniteliğine yazar; gerisi DOM'u izleyen bu modüldedir.
// Hareket azaltılmışsa (sistem ayarı ya da sitenin kendi "hareketi azalt" ayarı) hiçbir animasyon başlamaz, yalnız renkler kalır.

// ---- Saf yardımcılar (Node'da sınanır) ----
const GENRES = [
  ['rpg', /\b(rpg|role.?playing|rol)\b|rol yapma/i],
  ['shooter', /nişancı|shooter|\bfps\b/i],
  ['fighting', /dövüş|fighting/i],
  ['racing', /yarış|racing/i],
  ['sports', /\bspor\b|sports?\b/i],
  ['strategy', /strateji|strategy/i],
  ['sim', /simülasyon|simulation/i],
  ['horror', /korku|horror/i],
  ['puzzle', /bulmaca|puzzle/i],
  ['platform', /platform/i],
  ['action', /aksiyon|action/i],
  ['adventure', /macera|adventure/i],
  ['indie', /bağımsız|indie/i],
  ['casual', /rahat|casual|aile|family|party|parti|müzik|music/i],
  ['mmo', /\bmmo/i],
];
export function genreKey(item) {
  const list = Array.isArray(item?.genres) ? item.genres : [];
  for (const g of list) {
    for (const [key, re] of GENRES) if (re.test(String(g))) return key;
  }
  return '';
}
export function vividGenre(item) { return genreKey(item); }
export function genreLabel(item) { const g = Array.isArray(item?.genres) ? item.genres.find(Boolean) : ''; return g ? String(g) : ''; }

// İndirim yüzdesi -> renk basamağı: 1 serin, 2 yeşil, 3 turuncu, 4 sıcak (kırmızı-pembe).
export function discountTier(pct) {
  const p = Number(pct);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return p >= 75 ? 4 : p >= 50 ? 3 : p >= 25 ? 2 : 1;
}
export function parsePct(text) {
  const m = String(text || '').match(/(\d{1,3})\s*%|%\s*(\d{1,3})/);
  const n = m ? Number(m[1] ?? m[2]) : NaN;
  return n > 0 && n <= 100 ? n : 0;
}

// "₺1.088,00" / "$12.99" / "1,299.00 TL" -> { value, decimals, dec, thou } (yoksa null)
export function parseMoney(text) {
  const m = String(text || '').match(/\d[\d.,  ]*\d|\d/);
  if (!m) return null;
  const raw = m[0].replace(/[  ]/g, '');
  const last = Math.max(raw.lastIndexOf(','), raw.lastIndexOf('.'));
  let dec = '', decimals = 0, intPart = raw;
  if (last > -1) {
    const tail = raw.slice(last + 1);
    const other = raw.slice(0, last).includes(raw[last]);
    if (!other && tail.length <= 2) { dec = raw[last]; decimals = tail.length; intPart = raw.slice(0, last); }
  }
  const thou = [',', '.'].find(c => c !== dec && intPart.includes(c)) || (dec === ',' ? '.' : dec === '.' ? ',' : '.');
  const value = Number(intPart.split(thou).join('') + (decimals ? '.' + raw.slice(last + 1) : ''));
  if (!Number.isFinite(value)) return null;
  return { value, decimals, dec, thou, token: m[0] };
}
export function formatMoney(n, f) {
  const fixed = Math.max(0, n).toFixed(f.decimals);
  const [i, d] = fixed.split('.');
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, f.thou);
  return d ? grouped + f.dec + d : grouped;
}
export const ease = t => 1 - Math.pow(1 - t, 3);

// ---- Tarayıcı kısmı ----
const BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined';
const root = BROWSER ? document.documentElement : null;
const reduceMq = BROWSER && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const motionOk = () => BROWSER && !(reduceMq && reduceMq.matches) && root.dataset.reduceMotion !== 'true';
const isEn = () => BROWSER && root.lang === 'en';

const CONFETTI = ['#ff5d8f', '#ffc94d', '#6fb6ff', '#c4f85b', '#c38bff', '#ff8a4c'];

export function burst(x, y, { colors = CONFETTI, count = 16, spread = 54, size = 7, life = 850 } = {}) {
  if (!BROWSER || !motionOk()) return;
  const wrap = document.createElement('div');
  wrap.className = 'vv-burst';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.left = x + 'px';
  wrap.style.top = y + 'px';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const d = spread * (0.55 + Math.random() * 0.75);
    p.style.setProperty('--tx', Math.cos(a) * d + 'px');
    p.style.setProperty('--ty', Math.sin(a) * d - 14 + 'px');
    p.style.setProperty('--rot', Math.round(Math.random() * 540 - 270) + 'deg');
    p.style.setProperty('--c', colors[i % colors.length]);
    p.style.setProperty('--s', size * (0.7 + Math.random() * 0.7) + 'px');
    if (i % 3 === 0) p.className = 'vv-dot';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), life + 200);
}

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

// -- Sade / Klasik değiştirici --
const MODE_LABEL = {
  tr: { sade: 'Sade', klasik: 'Klasik', group: 'Görünüm' },
  en: { sade: 'Simple', klasik: 'Classic', group: 'View' },
};
let switchEl = null;
function currentUi() { return root.dataset.ui === 'sade' ? 'sade' : 'klasik'; }
function buildSwitch() {
  const el = document.createElement('div');
  el.className = 'vv-modeswitch';
  el.setAttribute('role', 'group');
  el.setAttribute('translate', 'no');
  for (const m of ['klasik', 'sade']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.mode = m;
    b.addEventListener('click', () => setUi(m));
    el.appendChild(b);
  }
  return el;
}
function paintSwitch() {
  if (!switchEl) return;
  const L = MODE_LABEL[isEn() ? 'en' : 'tr'], ui = currentUi();
  switchEl.setAttribute('aria-label', L.group);
  switchEl.dataset.ui = ui;
  for (const b of switchEl.children) {
    const on = b.dataset.mode === ui;
    b.setAttribute('aria-pressed', String(on));
    b.textContent = L[b.dataset.mode];
    b.title = isEn() ? (b.dataset.mode === 'sade' ? 'Switch to the simple view' : 'Switch to the classic view') : (b.dataset.mode === 'sade' ? 'Sade görünüme geç' : 'Klasik görünüme geç');
  }
}
function setUi(mode) {
  if (mode === currentUi()) return;
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('gorunum')) { url.searchParams.delete('gorunum'); history.replaceState(history.state, '', url); }
  } catch {}
  if (motionOk()) { root.classList.add('vv-modeswap'); setTimeout(() => root.classList.remove('vv-modeswap'), 520); }
  window.dispatchEvent(new CustomEvent('radar:ui-set', { detail: mode }));
}
const wideMq = BROWSER && window.matchMedia ? window.matchMedia('(min-width: 701px)') : null;
function placeSwitch() {
  if (!BROWSER || !document.body) return;
  if (!switchEl) { switchEl = buildSwitch(); paintSwitch(); }
  const bar = wideMq && wideMq.matches ? document.querySelector('header .topbar') : null;
  if (bar) {
    if (switchEl.parentNode !== bar) {
      const before = bar.querySelector('.header-search') || bar.querySelector('.account-button') || null;
      bar.insertBefore(switchEl, before);
    }
    switchEl.classList.remove('is-float');
  } else {
    if (switchEl.parentNode !== document.body) document.body.appendChild(switchEl);
    switchEl.classList.add('is-float');
  }
}

// -- Kart / satır işaretleme --
const REVEAL_SEL = '.gamecard, .deal-list-row, .catalog-card, .dealcard';
const PRICE_SEL = '.catalogprice > strong, .deal-best-price > strong';
const PCT_SEL = '.discountbadge, .deal-discount > b';
const seen = new WeakSet();
let io = null;
const pending = new Set();
let flushTimer = 0;

function ensureIo() {
  if (io || !('IntersectionObserver' in window)) return;
  io = new IntersectionObserver(entries => {
    const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
    vis.forEach((e, i) => reveal(e.target, i));
    for (const e of vis) io.unobserve(e.target);
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
}
function reveal(el, index) {
  if (el.dataset.vv !== 'pre') return;
  el.style.setProperty('--vv-d', Math.min(index, 9) * 55 + 'ms');
  el.dataset.vv = 'in';
  countPrice(el, Math.min(index, 9) * 55 + 120);
  const done = () => { if (el.dataset.vv === 'in') { delete el.dataset.vv; el.style.removeProperty('--vv-d'); } };
  el.addEventListener('animationend', done, { once: true });
  setTimeout(done, 1400 + index * 55);
}
function tagCard(el) {
  if (seen.has(el)) return;
  seen.add(el);
  if (!motionOk()) return;
  ensureIo();
  if (!io) return;
  el.dataset.vv = 'pre';
  io.observe(el);
  // Gözlemci tetiklenmezse (ör. arka sekme) ekrandaki öğe görünmez kalmasın; ekran dışındakiler kaydırınca belirir.
  setTimeout(() => {
    if (el.dataset.vv !== 'pre' || document.hidden) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) reveal(el, 0);
  }, 3200);
}
function tagPct(el) {
  const pct = parsePct(el.textContent);
  const tier = discountTier(pct);
  if (tier) { el.dataset.dc = String(tier); el.dataset.pct = String(pct); } else { delete el.dataset.dc; delete el.dataset.pct; }
}

// -- Fiyat sayacı: indirimli fiyatta eski fiyattan yeniye, diğerlerinde hafif yukarıdan iner --
const counted = new WeakSet();
function textNodeOf(el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (/\d/.test(n.nodeValue)) return n;
  return null;
}
function countPrice(card, delay) {
  if (!motionOk()) return;
  for (const strong of card.querySelectorAll(PRICE_SEL)) {
    if (counted.has(strong)) continue;
    const node = textNodeOf(strong);
    if (!node) continue;
    const to = parseMoney(node.nodeValue);
    if (!to || to.value <= 0) continue;
    counted.add(strong);
    const del = strong.parentElement && strong.parentElement.querySelector(':scope > del');
    const from = del ? parseMoney(del.textContent) : null;
    const start = from && from.value > to.value ? from.value : to.value * 1.18;
    const original = node.nodeValue, t0 = performance.now() + delay, dur = 650;
    let last = original;
    node.nodeValue = original.replace(to.token, formatMoney(start, to));
    last = node.nodeValue;
    const step = now => {
      if (node.nodeValue !== last) return; // React metni değiştirdi; dokunma
      const t = Math.min(1, Math.max(0, (now - t0) / dur));
      if (t >= 1) { node.nodeValue = original; return; }
      last = original.replace(to.token, formatMoney(start + (to.value - start) * ease(t), to));
      node.nodeValue = last;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

// -- Gözlemci --
function scan(node) {
  if (node.nodeType !== 1) return;
  const hit = (sel, fn) => { if (node.matches && node.matches(sel)) fn(node); node.querySelectorAll && node.querySelectorAll(sel).forEach(fn); };
  hit(REVEAL_SEL, tagCard);
  hit(PCT_SEL, tagPct);
}
function onMutations(list) {
  for (const m of list) {
    if (m.type === 'characterData') {
      const p = m.target.parentElement && m.target.parentElement.closest(PCT_SEL);
      if (p) tagPct(p);
    } else m.addedNodes.forEach(scan);
  }
  schedulePlace();
  celebrateScan(list);
}
let placeQueued = false;
function schedulePlace() {
  if (placeQueued) return;
  placeQueued = true;
  requestAnimationFrame(() => { placeQueued = false; placeSwitch(); });
}

// -- Favori patlaması --
function onFavClick(e) {
  const btn = e.target.closest && e.target.closest('.heart, .card-hover-actions button[title="Favori"], .card-hover-actions button[aria-label$="favori durumunu değiştir"]');
  if (!btn || !motionOk()) return;
  const card = btn.closest('.gamecard, .deal-list-row');
  const heart = btn.matches('.heart') ? btn : card && card.querySelector('.heart');
  if (!heart) return;
  const was = heart.getAttribute('aria-pressed') === 'true' || heart.classList.contains('on');
  setTimeout(() => {
    const now = heart.getAttribute('aria-pressed') === 'true' || heart.classList.contains('on');
    if (was || !now) return;
    const [x, y] = centerOf(heart);
    const accent = card && getComputedStyle(card).getPropertyValue('--gc').trim();
    burst(x, y, { colors: ['#ff5d8f', '#ff8fb1', '#ffc94d', accent || '#c4f85b', '#ffffff'], count: 18, spread: 58, size: 7 });
    heart.dataset.vvLove = '1';
    setTimeout(() => delete heart.dataset.vvLove, 700);
  }, 90);
}

// -- Başarım / seviye kutlaması (sfx modülünün bildirimi gelince) --
const celebrated = new WeakSet();
function celebrateScan(list) {
  if (!motionOk()) return;
  for (const m of list) m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    const toast = n.matches && n.matches('.sfx-toast') ? n : n.querySelector && n.querySelector('.sfx-toast');
    if (toast && !celebrated.has(toast)) { celebrated.add(toast); celebrate(toast); }
  });
}
function celebrate(toast) {
  toast.classList.add('vv-celebrate');
  const tier = /sfx-t-(legendary|epic|rare)/.exec(toast.className)?.[1] || (toast.classList.contains('sfx-level') ? 'level' : 'common');
  const colors = { legendary: ['#ffc94d', '#fff3b0', '#ff8a4c', '#ffffff'], epic: ['#c38bff', '#e6ccff', '#6fb6ff', '#ffffff'], rare: ['#6fb6ff', '#bfe0ff', '#c4f85b', '#ffffff'], level: ['#c4f85b', '#ffc94d', '#6fb6ff', '#ff5d8f'], common: ['#c9a46a', '#ffc94d', '#ffffff'] }[tier];
  const icon = toast.querySelector('.sfx-toast-icon') || toast;
  const go = (n, s) => { const [x, y] = centerOf(icon); burst(x, y, { colors, count: n, spread: s, size: 8, life: 1100 }); };
  setTimeout(() => go(tier === 'legendary' ? 34 : 22, tier === 'legendary' ? 120 : 84), 220);
  if (tier === 'legendary' || tier === 'epic') setTimeout(() => go(20, 150), 620);
}

export function start() {
  if (!BROWSER || start.done) return;
  start.done = true;
  const boot = () => {
    document.body.querySelectorAll(REVEAL_SEL).forEach(tagCard);
    document.body.querySelectorAll(PCT_SEL).forEach(tagPct);
    placeSwitch();
    new MutationObserver(onMutations).observe(document.body, { childList: true, subtree: true, characterData: true });
    new MutationObserver(paintSwitch).observe(root, { attributes: true, attributeFilter: ['data-ui', 'lang'] });
    window.addEventListener('radar:ui', paintSwitch);
    window.addEventListener('radar:lang', paintSwitch);
    document.addEventListener('click', onFavClick, true);
    if (wideMq) (wideMq.addEventListener ? wideMq.addEventListener('change', placeSwitch) : wideMq.addListener(placeSwitch));
  };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot, { once: true });
}
start();
