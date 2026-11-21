// Hareket cilası (21 Kasım 2026). Hepsi DOM'u izleyen bu modülde; paketin React koduna dokunulmaz.
//  1 Fiyat düşüşü: canlı güncellemede fiyat eskisinden yenisine sayarak iner, yeşil "▼ fark" çipi çıkar,
//    indirim rozeti zıplar, favorideki kalp canlanır (kalp atışı + minik kalp patlaması)
//  2 Kart ızgarası yüklenirken parıltılı iskelet kartlar, üstte yumuşak ilerleme çubuğu (sayfa geçişlerinde de)
//  3 Kaydırmaya duyarlı paralaks kapaklar (kapak görseli kart içinde kaydırdıkça hafifçe kayar)
//  4 Favoriye eklenen oyunun kapağı yay çizerek üst gezinmedeki "İstek Listem"e uçar
//  5 Görünüm/tema değişince ekranı geçen ışık süpürmesi
//  6 Başarım rozetleri: sıralı belirme, parıltı, yeni kazanılan rozet için açılma animasyonu
// Hareket azaltılmışsa (sistem ayarı ya da sitenin kendi "hareketi azalt" ayarı) hiçbiri başlamaz;
// <html class="mo-par"> yalnız hareket serbestken konur ve CSS'in tüm hareket kuralları buna bağlıdır.
import { parseMoney, formatMoney, ease, burst } from './vivid-20261108.js';

// ---- Saf yardımcılar (Node'da sınanır) ----

// Fiyat değişimi: yalnız gerçek bir düşüş "down" sayılır (küçük kayan nokta farkları yok sayılır).
export function priceChange(prev, next) {
  if (!Number.isFinite(prev) || !Number.isFinite(next) || prev <= 0 || next <= 0) return { dir: 'none', delta: 0, pct: 0 };
  const delta = prev - next;
  if (Math.abs(delta) < 0.005) return { dir: 'none', delta: 0, pct: 0 };
  return { dir: delta > 0 ? 'down' : 'up', delta: Math.abs(delta), pct: Math.round((Math.abs(delta) / prev) * 100) };
}

// Kartın ekrandaki konumu: -1 (görünümün üstünde) … 0 (ortada) … 1 (altında).
export function parallaxProgress(rect, vh) {
  if (!rect || !(vh > 0) || !(rect.height >= 0)) return 0;
  const p = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
  return Math.max(-1, Math.min(1, p));
}

// İkinci dereceden Bézier: uçuşun yayı. lift kontrol noktasını yukarı çeker.
export function arcPoint(t, from, to, lift = 90) {
  const cx = (from.x + to.x) / 2, cy = Math.min(from.y, to.y) - lift;
  const u = 1 - t;
  return { x: u * u * from.x + 2 * u * t * cx + t * t * to.x, y: u * u * from.y + 2 * u * t * cy + t * t * to.y };
}
export const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Uçuş kareleri: kaynak merkezine göre kayma + küçülme + hafif dönüş.
export function flightFrames(from, to, { steps = 14, endScale = 0.2, lift = 90, spin = 8 } = {}) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, e = easeInOut(t), p = arcPoint(e, from, to, lift);
    out.push({ offset: t, dx: p.x - from.x, dy: p.y - from.y, scale: 1 + (endScale - 1) * e, rot: spin * Math.sin(e * Math.PI) });
  }
  return out;
}

// Daha önce görülmemiş kazanılmış rozetler. seen === null ilk ziyarettir: hiçbiri "yeni" sayılmaz.
export function newlyEarned(seen, earnedKeys) {
  if (!Array.isArray(seen)) return [];
  const have = new Set(seen);
  return earnedKeys.filter(k => k && !have.has(k));
}
export function badgeKey(name, tier) { return String(name || '').trim().toLowerCase() + '|' + String(tier || '').trim().toLowerCase(); }

// Işık süpürmesinin rengi: Klasik koyu yüzeyde parlak, Sade açık yüzeyde mor-pembe tonlu.
export function sweepTone(ui) { return ui === 'sade' ? 'sade' : 'klasik'; }

// ---- Tarayıcı kısmı ----
const BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined';
const root = BROWSER ? document.documentElement : null;
const reduceMq = BROWSER && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const motionOk = () => BROWSER && !(reduceMq && reduceMq.matches) && root.dataset.reduceMotion !== 'true';
const timers = (fn, ms) => setTimeout(fn, ms);
const T0 = BROWSER ? performance.now() : 0;
const PRICE_SEL = '.catalogprice > strong, .deal-best-price > strong';
const PCT_SEL = '.discountbadge, .deal-discount > b';
const CARD_SEL = '.gamecard, .deal-list-row';

function centerOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function visible(el) { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < innerHeight; }
function flag(el, key, ms) { el.dataset[key] = '1'; timers(() => { delete el.dataset[key]; }, ms); }
function textNodeOf(el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (/\d/.test(n.nodeValue)) return n;
  return null;
}

// -- 1. Fiyat düşüşü --
const priceState = new WeakMap(); // fiyat öğesi -> { value, timer, busy }
const pctState = new WeakMap();   // rozet -> yüzde
const cardSeen = new WeakMap();   // kart -> ilk görüldüğü an

function readPrice(el) {
  const node = textNodeOf(el);
  const m = node && parseMoney(node.nodeValue);
  return m && m.value > 0 ? { node, m } : null;
}
function watchPrice(el) {
  if (priceState.has(el)) return;
  const r = readPrice(el);
  priceState.set(el, { value: r ? r.m.value : null, timer: 0, busy: false });
}
function touchPrice(el) {
  const st = priceState.get(el);
  if (!st || st.busy) return;
  // Sayaç animasyonu (vivid) ya da React güncellemesi sürerken bekle; metin 320 ms durulunca karşılaştır.
  clearTimeout(st.timer);
  st.timer = timers(() => settlePrice(el, st), 320);
}
function settlePrice(el, st) {
  if (!el.isConnected || st.busy) return;
  const r = readPrice(el);
  if (!r) return;
  const old = st.value;
  st.value = r.m.value;
  const ch = priceChange(old, r.m.value);
  if (ch.dir === 'down' && motionOk()) dropPrice(el, st, old, r, ch);
}
function dropPrice(el, st, old, { node, m }, ch) {
  const final = node.nodeValue;
  el.dataset.moDrop = '▼ ' + final.replace(m.token, formatMoney(ch.delta, m)) ;
  el.classList.add('mo-drop');
  timers(() => { el.classList.remove('mo-drop'); delete el.dataset.moDrop; }, 2600);
  // Eski fiyattan yenisine say.
  st.busy = true;
  const t0 = performance.now(), dur = 900;
  let last = node.nodeValue = final.replace(m.token, formatMoney(old, m));
  const step = now => {
    if (!node.isConnected || node.nodeValue !== last) { st.busy = false; return; }
    const t = Math.min(1, (now - t0) / dur);
    if (t >= 1) { node.nodeValue = final; st.busy = false; return; }
    last = node.nodeValue = final.replace(m.token, formatMoney(old + (m.value - old) * ease(t), m));
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  const card = el.closest(CARD_SEL);
  if (!card) return;
  flag(card, 'moDropped', 1500);
  const heart = card.querySelector('.heart.on, .heart[aria-pressed="true"]');
  if (heart) {
    flag(heart, 'moBeat', 2800);
    const c = centerOf(heart);
    burst(c.x, c.y, { colors: ['#ff5d8f', '#ff8fb1', '#ffffff'], count: 10, spread: 38, size: 6 });
  }
}
function touchPct(el) {
  const m = String(el.textContent).match(/(\d{1,3})\s*%|%\s*(\d{1,3})/);
  const pct = m ? Number(m[1] ?? m[2]) : 0;
  const had = pctState.get(el);
  pctState.set(el, pct);
  if (had !== undefined && pct > had && motionOk()) flag(el, 'moPop', 1100);
}
function watchPct(el) {
  if (pctState.has(el)) return touchPct(el);
  const card = el.closest(CARD_SEEN_SEL);
  const born = card && cardSeen.get(card);
  const m = String(el.textContent).match(/(\d{1,3})\s*%|%\s*(\d{1,3})/);
  pctState.set(el, m ? Number(m[1] ?? m[2]) : 0);
  // Zaten ekrandaki karta sonradan rozet eklendiyse (yeni indirim) zıplasın.
  if (born && performance.now() - born > 2500 && motionOk()) flag(el, 'moPop', 1100);
}
const CARD_SEEN_SEL = CARD_SEL;

// -- 2. İskelet kartlar ve ilerleme çubuğu --
let bar = null, barRun = false, barPoll = 0, barStart = 0;
function ensureBar() {
  if (bar) return bar;
  bar = document.createElement('div');
  bar.className = 'mo-bar';
  bar.setAttribute('aria-hidden', 'true');
  bar.dataset.s = 'idle';
  document.body.appendChild(bar);
  return bar;
}
const loadingNow = () => !!document.querySelector('.catalog-loading:not(.compact-loading), .pixel-loading');
function startBar() {
  if (!motionOk() || barRun) return;
  ensureBar();
  barRun = true; barStart = performance.now();
  bar.style.transform = '';
  bar.dataset.s = 'run';
  clearInterval(barPoll);
  barPoll = setInterval(() => {
    const age = performance.now() - barStart;
    if ((age > 520 && !loadingNow()) || age > 9000) finishBar();
  }, 120);
}
function finishBar() {
  if (!barRun) return;
  barRun = false;
  clearInterval(barPoll);
  const cur = getComputedStyle(bar).transform;
  bar.style.transform = cur === 'none' ? 'scaleX(.9)' : cur;
  bar.dataset.s = 'done';
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transform = 'scaleX(1)'; }));
  timers(() => { if (!barRun) { bar.dataset.s = 'idle'; bar.style.transform = ''; } }, 700);
}
const SK_LINES = [['w70', 'w45'], ['w55', 'w35'], ['w80', 'w40'], ['w60', 'w50']];
function paintSkeleton() {
  const p = document.querySelector('.catalog-loading:not(.compact-loading)');
  if (p) {
    if (!p.querySelector('.mo-skel-grid')) {
      const grid = document.createElement('div');
      grid.className = 'mo-skel-grid';
      grid.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 8; i++) {
        const [a, b] = SK_LINES[i % SK_LINES.length];
        const c = document.createElement('div');
        c.className = 'mo-sk-card';
        c.style.setProperty('--mo-i', i);
        c.innerHTML = `<i class="mo-sk-art"></i><b class="mo-sk-l ${a}"></b><b class="mo-sk-l ${b}"></b><span class="mo-sk-price"></span>`;
        grid.appendChild(c);
      }
      p.appendChild(grid);
      p.classList.add('mo-skel');
    }
    startBar();
  } else if (barRun && !loadingNow()) {
    // Yükleme bitti; yoklama döngüsü çubuğu kapatır.
  }
}
function hookRoutes() {
  const push = history.pushState;
  history.pushState = function () { const r = push.apply(this, arguments); startBar(); return r; };
  window.addEventListener('popstate', startBar);
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('header nav button, header nav a, .bottom-nav button, .bottom-nav a, .menu-panel button');
    if (b) startBar();
  }, true);
}

// -- 3. Paralaks kapaklar --
const arts = new Set();
let parIo = null, parQueued = false;
function paintParallax() {
  parQueued = false;
  const vh = innerHeight;
  for (const art of arts) {
    if (!art.isConnected) { arts.delete(art); continue; }
    art.style.setProperty('--mo-py', parallaxProgress(art.getBoundingClientRect(), vh).toFixed(3));
  }
}
function queueParallax() { if (parQueued || !arts.size) return; parQueued = true; requestAnimationFrame(paintParallax); }
function watchArt(art) {
  if (art.dataset.moPar) return;
  art.dataset.moPar = '1';
  if (!('IntersectionObserver' in window)) return;
  parIo = parIo || new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting && e.target.isConnected) arts.add(e.target);
      else { arts.delete(e.target); if (!e.target.isConnected) parIo.unobserve(e.target); }
    }
    queueParallax();
  }, { rootMargin: '120px 0px' });
  parIo.observe(art);
}

// -- 4. Favoriye uçan kart --
function navTarget() {
  const re = /[i\u0130]stek|wish|favor|favour/i;
  const list = [...document.querySelectorAll('header nav button, header nav a, .bottom-nav button, .bottom-nav a')];
  const find = el => { const r = el.getBoundingClientRect(); return r.width > 8 && r.height > 8; };
  return list.find(e => re.test((e.textContent || '') + ' ' + (e.getAttribute('aria-label') || '')) && find(e))
    || [...document.querySelectorAll('header .menu-button')].find(find) || null;
}
function fly(src, srcImg) {
  const target = navTarget();
  const header = document.querySelector('body > #root > header, header');
  let dy = 0;
  if (header && header.classList.contains('radar-hidden')) { header.classList.remove('radar-hidden'); dy = header.offsetHeight * 1.1; }
  const tr = target ? target.getBoundingClientRect() : { left: innerWidth - 60, top: 20, width: 40, height: 40 };
  const to = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 + dy };
  const sr = (srcImg && visible(srcImg) ? srcImg : src).getBoundingClientRect();
  const k = Math.min(1, 150 / Math.max(sr.width, 1));
  const w = Math.max(36, sr.width * k), h = Math.max(36, sr.height * k);
  const from = { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2 };
  const el = document.createElement('div');
  el.className = 'mo-fly';
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `left:${from.x - w / 2}px;top:${from.y - h / 2}px;width:${w}px;height:${h}px`;
  const url = srcImg && (srcImg.currentSrc || srcImg.src);
  if (url) el.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`; else { el.classList.add('is-dot'); el.textContent = '♥'; }
  document.body.appendChild(el);
  const frames = flightFrames(from, to, { endScale: Math.max(0.12, 30 / w), lift: 70 + Math.min(120, Math.abs(to.x - from.x) * 0.12) })
    .map(f => ({ offset: f.offset, opacity: f.offset > 0.88 ? 1 - (f.offset - 0.88) / 0.12 * 0.85 : 1, transform: `translate(${f.dx}px,${f.dy}px) scale(${f.scale}) rotate(${f.rot}deg)` }));
  const done = () => {
    el.remove();
    if (target) { flag(target, 'moBump', 650); burst(to.x, to.y, { colors: ['#ff5d8f', '#ff8fb1', '#ffffff', '#ffc94d'], count: 10, spread: 34, size: 6 }); }
  };
  if (el.animate) el.animate(frames, { duration: 680, easing: 'linear', fill: 'forwards' }).onfinish = done; else done();
}
function onFavClick(e) {
  const btn = e.target.closest && e.target.closest('.heart, .card-hover-actions button[title="Favori"], .card-hover-actions button[aria-label$="favori durumunu değiştir"]');
  if (!btn || !motionOk()) return;
  const card = btn.closest(CARD_SEL) || btn.closest('.game-detail, .modal');
  const heart = btn.matches('.heart') ? btn : card && card.querySelector('.heart');
  if (!heart) return;
  const on = () => heart.getAttribute('aria-pressed') === 'true' || heart.classList.contains('on');
  const was = on();
  timers(() => {
    if (was || !on()) return;
    const img = card && card.querySelector('.art img, .cr-title img, .deal-game img, img');
    fly(heart, img);
  }, 110);
}

// -- 5. Işık süpürmesi --
let sweepOk = false;
function sweep() {
  if (!sweepOk || !motionOk()) return;
  document.querySelectorAll('.mo-sweep').forEach(n => n.remove());
  const el = document.createElement('div');
  el.className = 'mo-sweep';
  el.dataset.tone = sweepTone(root.dataset.ui);
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  const rm = () => el.remove();
  el.addEventListener('animationend', rm, { once: true });
  timers(rm, 1500);
}

// -- 6. Başarım rozetleri --
const BADGE_KEY = 'radar-mo-badges';
const SPARKS = [[-6, 14], [102, 24], [96, 92], [2, 86]];
const SPARK_N = { rare: 2, epic: 3, legendary: 4 };
const TIER_COLORS = {
  legendary: ['#ffc94d', '#fff3b0', '#ff8a4c', '#ffffff'], epic: ['#c38bff', '#e6ccff', '#6fb6ff', '#ffffff'],
  rare: ['#6fb6ff', '#bfe0ff', '#c4f85b', '#ffffff'], common: ['#c9a46a', '#ffe2a8', '#ffffff'],
};
const tierOf = card => (/tier-(legendary|epic|rare)/.exec(card.className) || [, 'common'])[1];
function loadSeen() { try { const v = JSON.parse(localStorage.getItem(BADGE_KEY)); return Array.isArray(v) ? v : null; } catch { return null; } }
function saveSeen(list) { try { localStorage.setItem(BADGE_KEY, JSON.stringify([...new Set(list)].slice(-400))); } catch { /* depolama kapalı */ } }
function badgeKeyOf(card) { return badgeKey(card.querySelector('b')?.textContent, tierOf(card)); }
function decorateBadge(card) {
  const medal = card.querySelector('.badge-medal');
  if (!medal) return;
  const earned = card.classList.contains('earned');
  const want = earned ? SPARK_N[tierOf(card)] || 0 : 0;
  const have = medal.querySelectorAll(':scope > .mo-spark').length;
  for (let i = have; i < want; i++) {
    const s = document.createElement('i');
    s.className = 'mo-spark';
    s.style.cssText = `left:${SPARKS[i][0]}%;top:${SPARKS[i][1]}%;--d:${i * 0.7 + (card.style.getPropertyValue('--i') || 0) * 0.13}s`;
    medal.appendChild(s);
  }
  for (const s of [...medal.querySelectorAll(':scope > .mo-spark')].slice(want)) s.remove();
}
const badgeSeen = new WeakSet();
function scanBadges() {
  const cards = [...document.querySelectorAll('.badge-card')];
  if (!cards.length) return;
  const ok = motionOk();
  const earned = cards.filter(c => c.classList.contains('earned'));
  const seen = loadSeen();
  const fresh = new Set(newlyEarned(seen, earned.map(badgeKeyOf)));
  cards.forEach(card => {
    decorateBadge(card);
    if (!badgeSeen.has(card)) {
      badgeSeen.add(card);
      if (ok) {
        card.dataset.mo = 'in';
        card.addEventListener('animationend', () => { if (card.dataset.mo === 'in') delete card.dataset.mo; }, { once: true });
        timers(() => { if (card.dataset.mo === 'in') delete card.dataset.mo; }, 1800);
      }
    }
    if (ok && fresh.has(badgeKeyOf(card)) && !card.dataset.moUnlock) unlock(card);
  });
  if (!seen || fresh.size) saveSeen([...(seen || []), ...earned.map(badgeKeyOf)]);
}
function unlock(card) {
  card.dataset.moUnlock = '1';
  const medal = card.querySelector('.badge-medal') || card;
  const halo = document.createElement('i');
  halo.className = 'mo-halo';
  medal.appendChild(halo);
  const tier = tierOf(card);
  timers(() => { const c = centerOf(medal); burst(c.x, c.y, { colors: TIER_COLORS[tier], count: tier === 'legendary' ? 30 : 20, spread: tier === 'legendary' ? 110 : 80, size: 7, life: 1100 }); }, 380);
  if (tier === 'legendary' || tier === 'epic') timers(() => { const c = centerOf(medal); burst(c.x, c.y, { colors: TIER_COLORS[tier], count: 16, spread: 130, size: 6, life: 1100 }); }, 760);
  timers(() => { halo.remove(); delete card.dataset.moUnlock; }, 2200);
}

// -- Gözlemci --
function scan(node) {
  if (node.nodeType !== 1) return;
  const hit = (sel, fn) => { if (node.matches && node.matches(sel)) fn(node); node.querySelectorAll && node.querySelectorAll(sel).forEach(fn); };
  hit(CARD_SEL, c => { if (!cardSeen.has(c)) cardSeen.set(c, performance.now()); });
  hit(PRICE_SEL, watchPrice);
  hit(PCT_SEL, watchPct);
  hit('.gamecard .art', watchArt);
  if ((node.matches && node.matches('.badge-card, .badge-grid')) || (node.querySelector && node.querySelector('.badge-card'))) badgesDirty = true;
}
let badgesDirty = false, passQueued = false;
function schedulePass() {
  if (passQueued) return;
  passQueued = true;
  requestAnimationFrame(() => {
    passQueued = false;
    paintSkeleton();
    if (badgesDirty) { badgesDirty = false; scanBadges(); }
  });
}
function onMutations(list) {
  for (const m of list) {
    if (m.type === 'attributes') { if (m.target.matches && m.target.matches('.badge-card')) badgesDirty = true; continue; }
    const base = m.type === 'characterData' ? m.target.parentElement : m.target;
    const el = base && base.nodeType === 1 ? base : null;
    if (el && el.closest) {
      const p = el.closest(PRICE_SEL); if (p) touchPrice(p);
      const q = el.closest(PCT_SEL); if (q && pctState.has(q)) touchPct(q);
    }
    m.addedNodes.forEach(scan);
  }
  schedulePass();
}

function syncMode() { root.classList.toggle('mo-par', motionOk()); if (motionOk()) queueParallax(); }

export function start() {
  if (!BROWSER || start.done) return;
  start.done = true;
  const boot = () => {
    syncMode();
    document.body.querySelectorAll(CARD_SEL).forEach(c => cardSeen.set(c, performance.now()));
    document.body.querySelectorAll(PRICE_SEL).forEach(watchPrice);
    document.body.querySelectorAll(PCT_SEL).forEach(watchPct);
    document.body.querySelectorAll('.gamecard .art').forEach(watchArt);
    badgesDirty = true;
    schedulePass();
    new MutationObserver(onMutations).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    new MutationObserver(syncMode).observe(root, { attributes: true, attributeFilter: ['data-reduce-motion'] });
    new MutationObserver(() => { if (performance.now() - T0 > 1800) sweep(); }).observe(root, { attributes: true, attributeFilter: ['data-ui', 'data-theme', 'data-site-theme', 'data-color-mode'] });
    timers(() => { sweepOk = true; }, 1800);
    if (reduceMq) (reduceMq.addEventListener ? reduceMq.addEventListener('change', syncMode) : reduceMq.addListener(syncMode));
    window.addEventListener('scroll', queueParallax, { passive: true });
    window.addEventListener('resize', queueParallax, { passive: true });
    document.addEventListener('click', onFavClick, true);
    hookRoutes();
  };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot, { once: true });
}
start();
