// Mobile one-hand layer: bottom dock, bottom-sheet filters, swipe gestures.
// Works as an overlay on top of the React app (no changes to the bundle).
const mq = matchMedia('(max-width:700px)');
const reduce = matchMedia('(prefers-reduced-motion:reduce)');
const en = () => document.documentElement.lang === 'en';
const T = (tr, e) => (en() ? e : tr);
const $ = (s, r = document) => r.querySelector(s);
const ICON = {
  all: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  deals: '<path d="M20 12v9H4v-9"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H8a2.5 2.5 0 010-5c2 0 4 2 4 5zM12 7h4a2.5 2.5 0 000-5c-2 0-4 2-4 5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  fav: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  filter: '<path d="M10 5H3M12 19H3M14 3v4M16 17v4M21 12h-9M21 19h-5M21 5h-7M8 10v4M8 12H3"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>',
  refresh: '<path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
};
const svg = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
const buzz = (n = 8) => { try { navigator.vibrate && navigator.vibrate(n); } catch (e) {} };

/* ---------- dock ---------- */
// Go back inside the app; never leave it when there is no in-app history (direct link).
function goBack() {
  const st = history.state || {};
  if (st.radarModal || st.radarTab) history.back();
  else window.dispatchEvent(new CustomEvent('radar:navigate', { detail: 'home' }));
}
let dock, ctx, sheetRoot, fab, backBtn;
const section = () => new URLSearchParams(location.search).get('section') || 'home';
const canGoBack = () => !!(history.state && history.state.radarModal) || section() !== 'home';

function buildDock() {
  dock = document.createElement('nav');
  dock.className = 'mx-dock';
  dock.setAttribute('aria-label', T('Mobil gezinme', 'Mobile navigation'));
  const items = [
    ['all', 'Oyunlar', 'Games', () => $('.bottom-nav button:nth-child(1)')],
    ['deals', 'Fırsatlar', 'Deals', () => $('.bottom-nav button:nth-child(2)')],
    ['search', 'Ara', 'Search', () => $('#root header .header-search')],
    ['fav', 'İstek', 'Wishlist', () => $('.bottom-nav button:nth-child(3)')],
    ['menu', 'Menü', 'Menu', () => $('#root header .menu-button')],
  ];
  items.forEach(([id, tr, e, target], i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.id = id; b.dataset.tr = tr; b.dataset.en = e;
    b.innerHTML = svg(id) + '<span></span>';
    b.addEventListener('click', () => { buzz(6); const t = target(); if (t) t.click(); });
    dock.appendChild(b);
  });
  ctx = document.createElement('div');
  ctx.className = 'mx-ctx';
  ctx.innerHTML = `<button type="button" class="mx-back">${svg('back', 20)}<span></span></button><button type="button" class="mx-fab">${svg('filter', 18)}<span class="mx-fab-t"></span><b class="mx-badge" hidden></b></button>`;
  backBtn = $('.mx-back', ctx); fab = $('.mx-fab', ctx);
  backBtn.addEventListener('click', () => { buzz(); goBack(); });
  fab.addEventListener('click', openSheet);
  document.body.append(ctx, dock);
}

function refreshDock() {
  const on = mq.matches && !$('.radar-landing');
  document.documentElement.classList.toggle('mx-on', mq.matches);
  if (!dock) return;
  dock.hidden = ctx.hidden = !on;
  if (!on) return;
  dock.querySelectorAll('button').forEach((b) => { $('span', b).textContent = en() ? b.dataset.en : b.dataset.tr; });
  const nav = [...document.querySelectorAll('.bottom-nav button')];
  ['all', 'deals', null, 'fav'].forEach((id, i) => {
    if (!id) return;
    const d = $(`[data-id=${id}]`, dock);
    const cur = nav[i] && nav[i].getAttribute('aria-current') === 'page';
    d.setAttribute('aria-current', cur ? 'page' : 'false');
    if (cur) d.setAttribute('aria-current', 'page'); else d.removeAttribute('aria-current');
  });
  const hasFilters = !!$('.simple-home .simple-primary-filters') || !!sheetBody()?.children.length;
  const back = canGoBack();
  backBtn.hidden = !back; $('span', backBtn).textContent = T('Geri', 'Back');
  fab.hidden = !hasFilters || !!(history.state && history.state.radarModal); $('.mx-fab-t', fab).textContent = T('Filtre', 'Filters');
  ctx.hidden = !(back || !fab.hidden);
  const n = activeCount();
  const badge = $('.mx-badge', fab); badge.hidden = !n; badge.textContent = n;
}
const activeCount = () => document.querySelectorAll('.active-filters button:not(.clear-all-filters)').length;

/* ---------- filter bottom sheet ---------- */
const sheetBody = () => (sheetRoot && sheetRoot.isConnected ? $('.mx-body', sheetRoot) : null);
const moved = []; // {node, marker, wasOpen}
let sheetOpen = false, lastFocus = null;

function buildSheet() {
  sheetRoot = document.createElement('div');
  sheetRoot.className = 'mx-sheet-root'; sheetRoot.hidden = true;
  sheetRoot.innerHTML = `<div class="mx-backdrop"></div><section class="mx-sheet" role="dialog" aria-modal="true" aria-labelledby="mx-st" tabindex="-1">
<div class="mx-grab"><i></i></div>
<div class="mx-sh"><h2 id="mx-st"></h2><button type="button" class="mx-clear"></button><button type="button" class="mx-x" aria-label="">${svg('close', 20)}</button></div>
<div class="mx-chips" aria-label=""></div><div class="mx-body"></div>
<div class="mx-sf"><button type="button" class="mx-apply"></button></div></section>`;
  (document.getElementById('root') || document.body).appendChild(sheetRoot); // inside #root so React's delegated events reach moved controls
  $('.mx-backdrop', sheetRoot).addEventListener('click', requestClose);
  $('.mx-x', sheetRoot).addEventListener('click', requestClose);
  $('.mx-apply', sheetRoot).addEventListener('click', requestClose);
  $('.mx-clear', sheetRoot).addEventListener('click', () => { const b = $('.clear-all-filters'); if (b) b.click(); setTimeout(syncChips, 60); });
  // drag to close
  const sheet = $('.mx-sheet', sheetRoot);
  let sy = null, dy = 0, st = 0;
  const grab = [$('.mx-grab', sheetRoot), $('.mx-sh', sheetRoot)];
  grab.forEach((g) => {
    g.addEventListener('touchstart', (e) => { sy = e.touches[0].clientY; dy = 0; st = Date.now(); sheet.style.transition = 'none'; }, { passive: true });
    g.addEventListener('touchmove', (e) => { if (sy == null) return; dy = Math.max(0, e.touches[0].clientY - sy); sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
    g.addEventListener('touchend', () => {
      if (sy == null) return; sheet.style.transition = ''; sheet.style.transform = '';
      const fast = dy > 40 && Date.now() - st < 250;
      sy = null; if (dy > 110 || fast) requestClose();
    });
  });
  sheetRoot.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); requestClose(); return; }
    if (e.key !== 'Tab') return;
    const f = [...sheet.querySelectorAll('button,select,input,summary,[tabindex="0"]')].filter((x) => x.offsetParent !== null && !x.disabled);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
}

function syncChips() {
  if (!sheetOpen) return;
  const box = $('.mx-chips', sheetRoot);
  const src = [...document.querySelectorAll('.active-filters button:not(.clear-all-filters)')];
  box.replaceChildren(...src.map((b) => {
    const c = document.createElement('button');
    c.type = 'button'; c.className = 'mx-chip';
    c.innerHTML = `<span>${b.firstChild ? b.firstChild.textContent : ''}</span>${svg('close', 12)}`;
    c.setAttribute('aria-label', b.getAttribute('aria-label') || '');
    c.addEventListener('click', () => { b.click(); setTimeout(syncChips, 60); });
    return c;
  }));
  box.hidden = !src.length;
  $('.mx-clear', sheetRoot).hidden = !src.length;
  const meta = $('.resultmeta'); const m = meta && meta.textContent.match(/(?:toplam|total)\s*([\d.,]+)/i);
  $('.mx-apply', sheetRoot).textContent = m ? T(`${m[1]} oyunu göster`, `Show ${m[1]} games`) : T('Sonuçları göster', 'Show results');
}

function openSheet() {
  if (sheetOpen) return;
  if (!sheetRoot || !sheetRoot.isConnected) buildSheet();
  const targets = [$('.simple-home .simple-primary-filters'), $('.simple-home>.libtools .filterpanel')].filter(Boolean);
  if (!targets.length) return;
  lastFocus = document.activeElement;
  const body = sheetBody();
  targets.forEach((node) => {
    const marker = document.createComment('mx'); node.parentNode.insertBefore(marker, node);
    moved.push({ node, marker, wasOpen: node.open });
    if (node.tagName === 'DETAILS') node.open = true;
    body.appendChild(node);
  });
  $('#mx-st', sheetRoot).textContent = T('Filtreler', 'Filters');
  $('.mx-clear', sheetRoot).textContent = T('Temizle', 'Clear');
  $('.mx-x', sheetRoot).setAttribute('aria-label', T('Kapat', 'Close'));
  $('.mx-chips', sheetRoot).setAttribute('aria-label', T('Seçili filtreler', 'Selected filters'));
  sheetRoot.hidden = false; sheetOpen = true;
  document.documentElement.classList.add('mx-lock');
  syncChips();
  history.pushState({ ...history.state, mxSheet: true }, '');
  requestAnimationFrame(() => { sheetRoot.classList.add('mx-in'); $('.mx-sheet', sheetRoot).focus({ preventScroll: true }); });
}
function closeNow() {
  if (!sheetOpen) return;
  sheetOpen = false;
  while (moved.length) {
    const { node, marker, wasOpen } = moved.pop();
    if (marker.parentNode) marker.parentNode.insertBefore(node, marker); else node.remove();
    marker.remove(); if (node.tagName === 'DETAILS') node.open = wasOpen;
  }
  sheetRoot.classList.remove('mx-in');
  const done = () => { if (!sheetOpen) sheetRoot.hidden = true; };
  reduce.matches ? done() : setTimeout(done, 280);
  document.documentElement.classList.remove('mx-lock');
  try { lastFocus && lastFocus.isConnected ? lastFocus.focus({ preventScroll: true }) : fab.focus({ preventScroll: true }); } catch (e) {}
  refreshDock();
}
function requestClose() { if (history.state && history.state.mxSheet) history.back(); else closeNow(); }
addEventListener('popstate', () => { if (sheetOpen && !(history.state && history.state.mxSheet)) closeNow(); });

/* ---------- gestures ---------- */
const standalone = () => matchMedia('(display-mode:standalone)').matches || navigator.standalone === true || (() => { try { return localStorage.getItem('radar-gestures') === '1'; } catch (e) { return false; } })();
function setupGestures() {
  const edge = document.createElement('div'); edge.className = 'mx-edge'; edge.innerHTML = svg('back', 22); edge.setAttribute('aria-hidden', 'true');
  const ptr = document.createElement('div'); ptr.className = 'mx-ptr'; ptr.innerHTML = svg('refresh', 20); ptr.setAttribute('aria-hidden', 'true');
  document.body.append(edge, ptr);
  let mode = null, sx = 0, sy = 0, row = null, dx = 0, dyy = 0;
  const FAVSEL = '.deal-list-row, .ux-grid>*, .cataloggrid>*';
  const blocked = () => sheetOpen || $('.menu-overlay') || document.documentElement.classList.contains('mx-lock');
  const favOf = (r) => r.querySelector('button.heart, .favbtn, button[aria-label^="Favorilere"], button[aria-label^="Favorilerden"], button[aria-label^="Add to"], button[aria-label^="Remove"]');
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || !mq.matches || blocked()) { mode = null; return; }
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; dx = dyy = 0; mode = 'pending'; row = null;
    if (standalone() && sx < 24 && canGoBack()) { mode = 'back-p'; return; }
    const r = e.target.closest(FAVSEL);
    if (r && favOf(r)) { row = r; mode = 'fav-p'; return; }
    if (standalone() && window.scrollY <= 0 && !e.target.closest('input,select,textarea,.kh-rail,.tw-rail,.release-tabs')) mode = 'ptr-p';
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!mode || mode === 'pending') return;
    const t = e.touches[0]; dx = t.clientX - sx; dyy = t.clientY - sy;
    if (mode.endsWith('-p')) {
      if (Math.abs(dx) < 10 && Math.abs(dyy) < 10) return;
      const horiz = Math.abs(dx) > Math.abs(dyy) * 1.3;
      if (mode === 'back-p') mode = horiz && dx > 0 ? 'back' : null;
      else if (mode === 'fav-p') mode = horiz && dx > 0 ? 'fav' : null;
      else if (mode === 'ptr-p') mode = !horiz && dyy > 0 && window.scrollY <= 0 ? 'ptr' : null;
      if (!mode) return;
    }
    if (mode === 'back') {
      edge.style.opacity = Math.min(1, dx / 80); edge.style.transform = `translate(${Math.min(dx * 0.6, 70) - 40}px,-50%)`;
      edge.classList.toggle('mx-hit', dx > 90);
    } else if (mode === 'fav') {
      const x = Math.min(dx, 160) * (dx > 120 ? 0.8 : 1);
      row.style.transition = 'none'; row.style.transform = `translateX(${x}px)`; row.classList.add('mx-swiping');
      row.style.setProperty('--mx-p', Math.min(1, dx / 90));
      if (dx > 90 && !row.classList.contains('mx-ready')) { row.classList.add('mx-ready'); buzz(6); }
      if (dx <= 90) row.classList.remove('mx-ready');
    } else if (mode === 'ptr') {
      if (e.cancelable) e.preventDefault();
      const d = Math.min(dyy * 0.5, 110);
      ptr.style.opacity = Math.min(1, d / 60); ptr.style.transform = `translate(-50%,${d - 10}px) rotate(${d * 3}deg)`;
      ptr.classList.toggle('mx-hit', d > 70);
    }
  }, { passive: false });
  const end = () => {
    if (mode === 'back') { if (dx > 90) { buzz(); goBack(); } edge.style.opacity = 0; edge.style.transform = ''; edge.classList.remove('mx-hit'); }
    else if (mode === 'fav' && row) {
      const hit = dx > 90; row.style.transition = ''; row.style.transform = ''; row.classList.remove('mx-swiping', 'mx-ready');
      if (hit) { const b = favOf(row); if (b) { b.click(); buzz(14); const r = row; r.classList.add('mx-pop'); setTimeout(() => r.classList.remove('mx-pop'), 600); } }
    } else if (mode === 'ptr') {
      if (dyy * 0.5 > 70) { ptr.classList.add('mx-spin'); buzz(10); setTimeout(() => location.reload(), reduce.matches ? 50 : 350); }
      else { ptr.style.opacity = 0; ptr.style.transform = ''; ptr.classList.remove('mx-hit'); }
    }
    mode = null; row = null;
  };
  document.addEventListener('touchend', end); document.addEventListener('touchcancel', end);
  if (standalone()) document.documentElement.classList.add('mx-gest');
}

/* ---------- boot ---------- */
function boot() {
  buildDock(); setupGestures();
  let q = 0; const tick = () => { q = 0; refreshDock(); if (sheetOpen) syncChips(); };
  new MutationObserver(() => { q || (q = requestAnimationFrame(tick)); }).observe(document.getElementById('root'), { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current', 'class'] });
  mq.addEventListener('change', () => { if (!mq.matches) closeNow(); refreshDock(); });
  addEventListener('popstate', () => setTimeout(refreshDock, 0));
  refreshDock();
}
document.body ? boot() : addEventListener('DOMContentLoaded', boot);
