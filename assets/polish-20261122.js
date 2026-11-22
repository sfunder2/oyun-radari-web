// Grafik birliği ve mikro cila (22 Kasım 2026). polish-20261122.css ile birlikte.
//  1 Fiyat grafiğinde imleçle ayrıntı balonu (tarih, fiyat, indirim) ve indirim dönemleri için gölgeli bant
//  2 Isı haritası, tür haritası ve takvim günlerinde aynı balon
//  3 İndirim takviminde bu ayın günleri (ısı haritasında ay vurgusu, Sezon aracında ay takvimi)
//  4 Boş, hata ve çevrimdışı durumlar için küçük SVG çizimleri
//  5 Yükleniyor yazılarını ortak iskelete çevirme, bildirim çubuklarının çıkışı, sayfa açılışında kart sırası
// Hepsi mevcut sayfalara DOM üzerinden eklenir; React düğümleri silinmez. Veri uydurulmaz: balon yalnız grafiğin çizdiği
// çizgiden ve eksen yazılarından okunur. Hareketler azaltılmış harekette kapanır; metinler TR/EN.
import { SALE_SEASONS, seasonsBetween } from './tasarim-20261117.js';

const DAY = 864e5;

// ---------------------------------------------------------------------------------------------
// Saf yardımcılar (tests/polish.test.mjs)
// ---------------------------------------------------------------------------------------------

/** "M10 20 L30 20 L30 5" → [{x,y}, …]. Yalnız M ve L içeren basamaklı yollar. */
export function parsePath(d) {
  if (typeof d !== 'string') return [];
  const out = [];
  const re = /[ML]\s*(-?\d+(?:\.\d+)?)[ ,]\s*(-?\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(d))) out.push({ x: Number(m[1]), y: Number(m[2]) });
  return out;
}

/** Basamaklı çizgide x'te geçerli y (yatay parça). x aralığın dışındaysa en yakın uçtaki değer. */
export function stepY(points, x) {
  if (!Array.isArray(points) || !points.length || !Number.isFinite(x)) return null;
  if (x <= points[0].x) return points[0].y;
  for (let j = 0; j < points.length - 1; j++) {
    const a = points[j], b = points[j + 1];
    if (a.y === b.y && b.x > a.x && x >= a.x && x <= b.x) return a.y;
  }
  return points[points.length - 1].y;
}

/** Fiyat çizgisi ile indirimsiz çizgi aynı sayıda noktadan çizilir. Fiyatın indirimsizden düşük (y büyük) olduğu yatay parçalar. */
export function saleIntervals(line, base, eps = 0.5) {
  if (!Array.isArray(line) || !Array.isArray(base) || line.length < 2 || line.length !== base.length) return [];
  const out = [];
  for (let j = 0; j < line.length - 1; j++) {
    const a = line[j], b = line[j + 1];
    if (!(a.y === b.y && b.x > a.x)) continue;
    if (!(base[j].y < a.y - eps)) continue;
    const last = out[out.length - 1];
    if (last && a.x - last.x1 < 0.6) last.x1 = b.x;
    else out.push({ x0: a.x, x1: b.x });
  }
  return out;
}

/** "1.234" ya da "12,5" (tr-TR) → sayı. */
export function parseNum(s) {
  if (typeof s !== 'string') return NaN;
  const t = s.replace(/[^\d.,-]/g, '');
  if (!t) return NaN;
  return Number(t.replace(/\./g, '').replace(',', '.'));
}

/** Eksen çizgilerinden (y, değer) y → değer doğrusu. En az iki farklı çizgi gerekir. */
export function axisScale(ticks) {
  const t = (ticks || []).filter(k => k && Number.isFinite(k.y) && Number.isFinite(k.v));
  if (t.length < 2) return null;
  const a = t[0], b = t[t.length - 1];
  if (a.y === b.y) return null;
  return y => a.v + ((y - a.y) / (b.y - a.y)) * (b.v - a.v);
}

const MONTHS = {
  oca: 0, şub: 1, sub: 1, mar: 2, nis: 3, may: 4, haz: 5, tem: 6, ağu: 7, agu: 7, eyl: 8, eki: 9, kas: 10, ara: 11,
  jan: 0, feb: 1, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};
/** "12 Kas 2026", "12 Nov 2026" ya da "Nov 12, 2026" → UTC gün başı (ms). */
export function parseShortDate(s) {
  if (typeof s !== 'string') return NaN;
  const day = s.match(/\b(\d{1,2})\b/);
  const year = s.match(/\b(20\d{2}|19\d{2})\b/);
  const mon = s.toLowerCase().match(/[a-zçğıöşü]{3,}/);
  if (!day || !year || !mon) return NaN;
  const mi = MONTHS[mon[0].slice(0, 3)];
  if (mi === undefined) return NaN;
  return Date.UTC(Number(year[1]), mi, Number(day[1]));
}

/** Ay takvimi: ayın günleri Pazartesi'den başlar. seasons: [{key,from,to}] (ms, to kapsayıcı değil). */
export function monthGrid(year, month0, todayMs, seasons = SALE_SEASONS) {
  const first = Date.UTC(year, month0, 1);
  const next = Date.UTC(year, month0 + 1, 1);
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const list = seasonsBetween(first, next, seasons);
  const t0 = Math.floor(todayMs / DAY) * DAY;
  const cells = [];
  for (let t = first; t < next; t += DAY) {
    const s = list.find(x => t >= x.from && t < x.to);
    cells.push({ day: new Date(t).getUTCDate(), ms: t, today: t === t0, past: t < t0, season: s ? s.key : null, seasonTr: s ? s.tr : null, seasonEn: s ? s.en : null });
  }
  return { lead, cells, seasons: list, size: cells.length };
}

/** Isı haritasında (sütun, satır) hücresinin günü; bugünün hücresi çapa. Sütunlar hafta, satırlar Pzt…Paz. */
export function heatCellDay(col, row, todayCol, todayRow, todayMs) {
  return todayMs + ((col - todayCol) * 7 + (row - todayRow)) * DAY;
}

/** Aynı ayın günü mü (UTC)? */
export function sameMonth(a, b) {
  const x = new Date(a), y = new Date(b);
  return x.getUTCFullYear() === y.getUTCFullYear() && x.getUTCMonth() === y.getUTCMonth();
}

/** Balonu imlecin yanına koyar, pencereden taşırmaz. */
export function placeTip(at, size, view, gap = 14) {
  let x = at.x + gap, y = at.y - size.h - gap;
  if (x + size.w > view.w - 8) x = at.x - size.w - gap;
  if (x < 8) x = Math.max(8, Math.min(view.w - size.w - 8, at.x - size.w / 2));
  if (y < 8) y = at.y + gap + 8;
  if (y + size.h > view.h - 8) y = Math.max(8, view.h - size.h - 8);
  return { x: Math.round(x), y: Math.round(y) };
}

/** İndirimi yüzde olarak; yalnız gerçek bir düşüşte. */
export function offPct(price, base) {
  if (!Number.isFinite(price) || !Number.isFinite(base) || base <= 0 || price >= base * 0.995) return 0;
  return Math.round((1 - price / base) * 100);
}

/** Sayfa açılışında kart girişinin süresi (ms): en çok 10 kart gecikir. */
export function enterSpan(count) { return 600 + Math.min(Math.max(0, count), 10) * 45 + 300; }

// ---------------------------------------------------------------------------------------------
// Tarayıcı
// ---------------------------------------------------------------------------------------------
const BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined';
const root = BROWSER ? document.documentElement : null;
const isEn = () => BROWSER && root.lang === 'en';
const T = (tr, en) => (isEn() ? en : tr);
const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
  for (const k of kids) if (k != null) n.append(k);
  return n;
}
function sv(tag, attrs, ...kids) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
  for (const k of kids) if (k != null) n.append(k);
  return n;
}

/* ---- Balon ---- */
let tip = null, tipHide = 0;
function tipEl() {
  if (tip && tip.isConnected) return tip;
  tip = el('div', { class: 'pl-tip', role: 'tooltip', 'aria-hidden': 'true' });
  document.body.append(tip);
  return tip;
}
function showTip(nodes, x, y) {
  clearTimeout(tipHide);
  const t = tipEl();
  t.replaceChildren(...nodes);
  t.dataset.on = '1';
  const r = t.getBoundingClientRect();
  const p = placeTip({ x, y }, { w: r.width, h: r.height }, { w: window.innerWidth, h: window.innerHeight });
  t.style.setProperty('--pl-x', p.x + 'px');
  t.style.setProperty('--pl-y', p.y + 'px');
}
function hideTip(delay = 0) {
  clearTimeout(tipHide);
  tipHide = setTimeout(() => { if (tip) tip.dataset.on = '0'; }, delay);
}
const textTip = text => text.split('|').map((line, i) => (i === 0 ? el('b', null, line) : el('span', null, line)));

/* ---- 1. Fiyat grafiği ---- */
function currencyOf(svg) {
  const t = (svg.closest('.pricehistory') || svg.parentElement || document.body).textContent || '';
  if (/\$/.test(t)) return 'USD';
  if (/€/.test(t)) return 'EUR';
  return 'TRY';
}
function readChart(svg) {
  const line = parsePath(svg.querySelector('.phline')?.getAttribute('d'));
  if (line.length < 2) return null;
  const baseNode = svg.querySelector('.phbase');
  const base = baseNode ? parsePath(baseNode.getAttribute('d')) : null;
  const ticks = [...svg.querySelectorAll('g')].map(g => {
    const l = g.querySelector(':scope > line.phgrid'), t = g.querySelector(':scope > text.phaxis');
    return l && t ? { y: Number(l.getAttribute('y1')), v: parseNum(t.textContent) } : null;
  }).filter(Boolean);
  const scale = axisScale(ticks);
  const dates = [...svg.querySelectorAll(':scope > text.phaxis')].map(t => parseShortDate(t.textContent)).filter(Number.isFinite);
  const t0 = dates[0], t1 = dates[dates.length - 1];
  const x0 = 56, x1 = 588;
  return { line, base, scale, t0, t1, x0, x1, cur: currencyOf(svg), sig: svg.querySelector('.phline').getAttribute('d') + '|' + (baseNode?.getAttribute('d') || '') };
}
function money(v, cur) {
  try { return new Intl.NumberFormat(isEn() ? 'en-GB' : 'tr-TR', { style: 'currency', currency: cur, maximumFractionDigits: v < 50 ? 2 : 0 }).format(v); } catch { return String(Math.round(v)); }
}
function dateText(ms) {
  return new Date(ms).toLocaleDateString(isEn() ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function enhanceChart(svg) {
  const data = readChart(svg);
  if (!data) return;
  if (svg.__pl && svg.__pl.sig === data.sig && svg.__pl.lang === root.lang) return;
  svg.querySelectorAll('[data-pl]').forEach(n => n.remove());
  svg.__pl?.legend?.remove();
  const state = { sig: data.sig, lang: root.lang, legend: null, data };
  svg.__pl = state;

  // İndirim dönemleri: fiyat çizgisinin arkasında gölgeli bant.
  const iv = data.base ? saleIntervals(data.line, data.base) : [];
  if (iv.length) {
    const g = sv('g', { class: 'pl-sale', 'data-pl': '', 'aria-hidden': 'true' });
    for (const s of iv) {
      const w = Math.max(2, s.x1 - s.x0);
      g.append(sv('rect', { x: s.x0, y: 14, width: w, height: 188, rx: 2 }), sv('line', { x1: s.x0, x2: s.x0 + w, y1: 14, y2: 14 }));
    }
    const anchor = svg.querySelector('.phbase') || svg.querySelector('.phline');
    svg.insertBefore(g, anchor);
    state.legend = el('p', { class: 'phnote pl-legend', 'data-pl': '' }, el('span', null, el('i'), T('Gölgeli bant: indirimli dönem', 'Shaded band: on sale')));
    svg.after(state.legend);
  }

  // İmleç: dikey çizgi, nokta ve balon.
  const hover = sv('g', { class: 'pl-hover', 'data-pl': '', 'aria-hidden': 'true' },
    sv('line', { class: 'pl-cross', y1: 14, y2: 202 }), sv('circle', { class: 'pl-dot', r: 5 }));
  const hit = sv('rect', { class: 'pl-hit', 'data-pl': '', x: data.x0, y: 10, width: data.x1 - data.x0, height: 196 });
  svg.append(hover, hit);
  svg.classList.add('pl-live');
  svg.setAttribute('tabindex', '0');
  const cross = hover.firstChild, dot = hover.lastChild;

  const at = (x, cx, cy) => {
    x = Math.max(data.x0, Math.min(data.x1, x));
    const y = stepY(data.line, x);
    if (y === null) return;
    const price = data.scale ? data.scale(y) : NaN;
    const byBase = data.base ? stepY(data.base, x) : null;
    const base = byBase !== null && data.scale ? data.scale(byBase) : NaN;
    const pct = offPct(price, base);
    cross.setAttribute('x1', x); cross.setAttribute('x2', x);
    dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    dot.classList.toggle('is-sale', pct > 0);
    hover.dataset.on = '1';
    const nodes = [];
    if (Number.isFinite(data.t0) && Number.isFinite(data.t1) && data.t1 > data.t0) {
      const ms = data.t0 + ((x - data.x0) / (data.x1 - data.x0)) * (data.t1 - data.t0);
      nodes.push(el('span', null, dateText(Math.round(ms / DAY) * DAY)));
    }
    if (Number.isFinite(price)) nodes.push(el('strong', null, money(Math.max(0, price), data.cur)));
    if (pct > 0) {
      nodes.push(el('span', { class: 'pl-tip-sale' }, T(`İndirimde −%${pct}`, `On sale −${pct}%`)));
      nodes.push(el('span', null, T('Normal fiyat ', 'Regular price ') + money(base, data.cur)));
    } else if (Number.isFinite(price)) nodes.push(el('span', null, T('İndirimsiz fiyat', 'Regular price')));
    if (!nodes.length) return;
    if (cx == null) { const r = dot.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top; }
    showTip(nodes, cx, cy);
  };
  const pt = e => {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(m.inverse()).x;
  };
  const move = e => { const x = pt(e); if (x !== null) at(x, e.clientX, e.clientY); };
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move);
  const off = () => { hover.dataset.on = '0'; hideTip(0); };
  hit.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') off(); });
  hit.addEventListener('pointercancel', off);
  let key = (data.x0 + data.x1) / 2;
  svg.addEventListener('keydown', e => {
    const step = (data.x1 - data.x0) / 40;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { key += e.key === 'ArrowRight' ? step : -step; key = Math.max(data.x0, Math.min(data.x1, key)); at(key); e.preventDefault(); }
    else if (e.key === 'Home' || e.key === 'End') { key = e.key === 'Home' ? data.x0 : data.x1; at(key); e.preventDefault(); }
    else if (e.key === 'Escape') off();
  });
  svg.addEventListener('blur', off);
}

/* ---- 2. Isı haritası ve tür haritasında balon ---- */
function enhanceTips(scope) {
  for (const c of scope.querySelectorAll('.vz-heat-cols .vz-cell[title]')) {
    c.dataset.plTip = c.getAttribute('title').replace(' · ', '|') + T(' indirim biter', ' sales end');
    c.removeAttribute('title');
  }
  for (const b of scope.querySelectorAll('.vz-bubble')) {
    const t = b.querySelector(':scope > title');
    if (t) { b.dataset.plTip = t.textContent.replace(' · ', '|') + T(' indirimli teklif', ' discounted offers'); t.remove(); }
  }
}
function tipTarget(e) { return e.target instanceof Element ? e.target.closest('[data-pl-tip]') : null; }

/* ---- 3. Bu ayın günleri ---- */
function istNow() { return Date.now() + 3 * 36e5; }
function enhanceHeat(heat) {
  const cols = [...heat.querySelectorAll('.vz-heat-col')];
  const todayCell = heat.querySelector('.vz-cell.today');
  if (!cols.length || !todayCell) return;
  const sig = String(cols.length) + root.lang;
  if (heat.dataset.plM === sig) return;
  heat.dataset.plM = sig;
  const tc = cols.indexOf(todayCell.parentElement);
  const tr = [...todayCell.parentElement.children].indexOf(todayCell);
  const today = Math.floor(istNow() / DAY) * DAY;
  cols.forEach((col, ci) => [...col.children].forEach((cell, ri) => {
    const ms = heatCellDay(ci, ri, tc, tr, today);
    const inMonth = sameMonth(ms, today);
    cell.classList.toggle('pl-month', inMonth);
    cell.classList.toggle('pl-mstart', inMonth && new Date(ms).getUTCDate() === 1);
  }));
  const labels = [...heat.querySelectorAll('.vz-heat-months > .vz-heat-month')];
  labels.forEach((lab, i) => {
    const cell0 = cols[i]?.children[0];
    lab.classList.toggle('pl-cur', !!lab.textContent.trim() && !!cell0 && cell0.classList.contains('pl-month'));
  });
}

function enhanceSeasonCalendar(list) {
  if (list.previousElementSibling?.classList.contains('pl-cal')) return;
  const now = new Date(istNow());
  const g = monthGrid(now.getUTCFullYear(), now.getUTCMonth(), istNow());
  const en = isEn();
  const heads = en ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'];
  const name = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toLocaleDateString(en ? 'en-GB' : 'tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const grid = el('div', { class: 'pl-cal-grid' }, ...heads.map(h => el('i', { 'aria-hidden': 'true' }, h)));
  for (let i = 0; i < g.lead; i++) grid.append(el('em', { 'aria-hidden': 'true' }));
  g.cells.forEach((c, i) => {
    const cls = ['', c.today ? 'today' : '', c.past && !c.today ? 'past' : '', c.season ? 'sale s-' + c.season : ''].join(' ').trim();
    const cell = el('span', { class: cls, style: `--pl-i:${i}` }, String(c.day));
    if (c.season) cell.dataset.plTip = (en ? c.seasonEn : c.seasonTr) + '|' + T('Genelde indirim dönemi (yaklaşık)', 'Usually a sale period (approximate)');
    if (c.today) cell.setAttribute('aria-current', 'date');
    grid.append(cell);
  });
  const sum = g.seasons.length
    ? g.seasons.map(s => (en ? s.en : s.tr)).join(', ')
    : T('Bu ay büyük bir indirim dönemi yok', 'No big sale period this month');
  const box = el('section', { class: 'pl-cal', 'aria-label': T('Bu ayın takvimi', 'This month’s calendar') },
    el('div', { class: 'pl-cal-head' }, el('b', null, name), el('small', null, sum)), grid);
  list.before(box);
}

/* ---- 4. Çizimler ---- */
const ART = {
  empty: '<circle class="b" cx="46" cy="40" r="26"/><circle class="d" cx="46" cy="40" r="36"/><path class="sweep a" d="M46 40V14"/><circle class="a" cx="46" cy="40" r="26"/><circle class="c blink" cx="62" cy="30" r="3"/><g class="float"><circle class="a" cx="78" cy="54" r="11"/><path class="a" d="m86 62 9 9"/></g>',
  error: '<path class="b" d="M26 56a14 14 0 0 1 3-27 20 20 0 0 1 38-3 16 16 0 0 1 6 30Z"/><path class="a" d="M26 56a14 14 0 0 1 3-27 20 20 0 0 1 38-3 16 16 0 0 1 6 30Z"/><path class="a float" d="M48 34v11"/><circle class="c blink" cx="48" cy="52" r="2.4"/><path class="d" d="M20 70h56"/>',
  offline: '<path class="d" d="M18 38a42 42 0 0 1 60 0"/><path class="a" d="M28 48a28 28 0 0 1 40 0"/><path class="a" d="M38 58a14 14 0 0 1 20 0"/><circle class="c blink" cx="48" cy="68" r="3"/><path class="a float" d="M24 24l48 48"/>',
};
export function artSvg(kind, small) {
  const s = sv('svg', { class: 'pl-art' + (small ? ' is-small' : ''), viewBox: '0 0 96 84', role: 'img', 'aria-hidden': 'true', 'data-kind': kind, 'data-pl': '' });
  s.innerHTML = ART[kind] || ART.empty;
  return s;
}
const FAIL_RE = /alınamadı|okunamadı|could not (load|read)|couldn.t (load|read)|failed to load/i;
const NONE_RE = /kayd[ıi] henüz yok|kayıt henüz yok|yeterince veri yok|sonuç yok|bulunamadı|no results|not found|no price record/i;
function addArt(node, kind, small, place) {
  if (!node || node.dataset.plArt || node.closest('[data-pl]')) return;
  node.dataset.plArt = kind;
  const a = artSvg(kind, small);
  if (place === 'before') node.before(a); else node.prepend(a);
}
function enhanceArt(scope) {
  for (const n of scope.querySelectorAll('.empty, .ct-empty, .hub-empty, .gmap-empty')) addArt(n, 'empty', n.matches('.gmap-empty'), n.matches('.gmap-empty') ? 'before' : 'in');
  for (const n of scope.querySelectorAll('.vz-note, p.phnote')) {
    if (n.dataset.plArt || n.querySelector('svg')) continue;
    const t = n.textContent || '';
    if (t.length > 160) continue;
    if (FAIL_RE.test(t)) addArt(n, 'error', true, 'before');
    else if (NONE_RE.test(t)) addArt(n, 'empty', true, 'before');
  }
}

/* ---- Çevrimdışı çubuğu ---- */
let bar = null, barTimer = 0;
function offlineBar(state) {
  if (!bar) {
    bar = el('div', { class: 'pl-offline', role: 'status', 'aria-live': 'polite' });
    document.body.append(bar);
  }
  clearTimeout(barTimer);
  bar.dataset.state = state;
  const kind = state === 'back' ? 'empty' : 'offline';
  bar.replaceChildren(artSvg(kind, true), el('span', null, state === 'back'
    ? T('Bağlantı geri geldi', 'You are back online')
    : T('Çevrimdışısın, fiyatlar güncellenmeyebilir', 'You are offline, prices may be out of date')));
  void bar.offsetWidth;
  bar.dataset.on = '1';
  if (state === 'back') barTimer = setTimeout(() => { bar.dataset.on = '0'; }, 2600);
}

/* ---- 5. İskelet, bildirim çubukları, kart girişi ---- */
const LOADING_RE = /yükleniyor|loading/i;
function enhanceLoading(scope) {
  for (const n of scope.querySelectorAll('p.phnote, .ct-load, .ct-loading, .hub-loading')) {
    const t = (n.textContent || '').trim();
    if (!n.hasAttribute('data-pl-loading') && t.length < 70 && LOADING_RE.test(t)) { n.setAttribute('data-pl-loading', ''); n.setAttribute('role', 'status'); }
    else if (n.hasAttribute('data-pl-loading') && !LOADING_RE.test(t)) n.removeAttribute('data-pl-loading');
  }
}
function watchToasts(scope) {
  for (const t of scope.querySelectorAll('.kh-toast:not([data-pl-t])')) {
    t.dataset.plT = '1';
    setTimeout(() => { t.classList.add('pl-out'); }, 4200);
  }
}
let enterTimer = 0;
function armEnter() {
  if (!root) return;
  root.dataset.plEnter = '1';
  clearTimeout(enterTimer);
  enterTimer = setTimeout(() => { delete root.dataset.plEnter; }, enterSpan(10));
}

/* ---- Başlat ---- */
let queued = false;
function scan() {
  queued = false;
  for (const svg of document.querySelectorAll('svg.phchart')) enhanceChart(svg);
  enhanceTips(document);
  for (const h of document.querySelectorAll('.vz-heat')) enhanceHeat(h);
  for (const l of document.querySelectorAll('.ct-body > ol.ct-season')) enhanceSeasonCalendar(l);
  enhanceArt(document);
  enhanceLoading(document);
  watchToasts(document);
}
function queue() { if (!queued) { queued = true; requestAnimationFrame(scan); } }

export function start() {
  if (!BROWSER || window.__plStarted) return;
  window.__plStarted = true;
  const mo = new MutationObserver(queue);
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['d'] });
  document.addEventListener('pointerover', e => {
    const t = tipTarget(e);
    if (t && e.pointerType !== 'touch') { const r = e.target.getBoundingClientRect?.(); showTip(textTip(t.dataset.plTip), e.clientX || (r.left + r.width / 2), e.clientY || r.top); }
  });
  document.addEventListener('pointermove', e => { const t = tipTarget(e); if (t && e.pointerType !== 'touch') showTip(textTip(t.dataset.plTip), e.clientX, e.clientY); });
  document.addEventListener('pointerout', e => { if (tipTarget(e) && !(e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-pl-tip]'))) hideTip(40); });
  document.addEventListener('focusin', e => { const t = tipTarget(e); if (t) { const r = t.getBoundingClientRect(); showTip(textTip(t.dataset.plTip), r.left + r.width / 2, r.top); } });
  document.addEventListener('focusout', () => hideTip(40));
  // Dokunmada balon bir sonraki dokunuşa ya da 2,5 sn'ye kadar kalır.
  document.addEventListener('pointerdown', e => {
    const t = tipTarget(e);
    if (t && e.pointerType === 'touch') { showTip(textTip(t.dataset.plTip), e.clientX, e.clientY); hideTip(2500); }
    else if (!t && !(e.target instanceof Element && e.target.closest('.pl-live'))) hideTip(0);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(0); });
  addEventListener('scroll', () => hideTip(0), { passive: true });
  addEventListener('offline', () => offlineBar('off'));
  addEventListener('online', () => { if (bar && bar.dataset.on === '1') offlineBar('back'); });
  if (navigator.onLine === false) offlineBar('off');
  // Sayfa açılışı ve sayfa değişimi: kartlar sırayla belirir.
  armEnter();
  addEventListener('popstate', armEnter);
  const push = history.pushState;
  history.pushState = function (...a) { const r = push.apply(this, a); armEnter(); return r; };
  scan();
}
if (BROWSER) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
