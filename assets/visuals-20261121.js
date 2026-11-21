// Görsel panolar ve zaman çizgileri (21 Kasım 2026). visuals-20261121.css ile birlikte.
// Mevcut sayfalara DOM üzerinden eklenir; React düğümleri silinmez, yalnız yeni kardeş düğümler konur.
// Veri: kişisel kayıtlar (radar-lifestyle-v1) cihazdan, katalog verisi yalnız herkese açık okuma tablolarından
// (ps_products, ps_price_history, store_offers, upcoming_games) ve yalnız ilgili panel açılınca okunur.
// Hareketler prefers-reduced-motion ve html[data-reduce-motion=true] altında kapanır. TR/EN, Klasik/Sade renkleri CSS değişkenlerinden gelir.
import { savingOf } from './wallet-coach-20261030.js';

// ---------------------------------------------------------------------------------------------
// Saf hesaplar (tests/visuals.test.mjs)
// ---------------------------------------------------------------------------------------------
const DAY = 864e5;
const HOUR = 36e5;
export const PALETTE = ['#7cd992', '#5ec2ff', '#c38bff', '#ffb454', '#ff7a90', '#4fd1c5', '#f6e05e', '#9fb4ff'];
const r2 = v => Math.round(v * 100) / 100;
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Türkiye (UTC+3) takvim günü, "YYYY-MM-DD". */
export function istDay(ms = Date.now()) { return new Date(ms + 3 * HOUR).toISOString().slice(0, 10); }
export const dayMs = day => Date.parse(day + 'T00:00:00Z');
export const addDays = (day, n) => new Date(dayMs(day) + n * DAY).toISOString().slice(0, 10);

/* 1. Cüzdan koçu halkası ------------------------------------------------------------------- */
export function walletDonut(purchases, month, limit, maxSegments = 5) {
  const list = (purchases || [])
    .filter(p => p && num(p.amount) > 0 && typeof p.date === 'string' && p.date.slice(0, 7) === month)
    .sort((a, b) => b.amount - a.amount);
  const spent = r2(list.reduce((a, p) => a + p.amount, 0));
  const budget = num(limit) > 0 ? limit : null;
  const total = Math.max(spent, budget || 0);
  const top = list.slice(0, maxSegments);
  const rest = list.slice(maxSegments);
  const segs = top.map((p, i) => ({ id: String(p.id ?? i), name: String(p.name || ''), amount: p.amount, saved: savingOf(p), frac: total ? p.amount / total : 0 }));
  if (rest.length) {
    const amount = r2(rest.reduce((a, p) => a + p.amount, 0));
    segs.push({ id: 'rest', name: '', amount, saved: r2(rest.reduce((a, p) => a + savingOf(p), 0)), frac: total ? amount / total : 0, count: rest.length });
  }
  const remaining = budget === null ? null : r2(Math.max(0, budget - spent));
  return {
    month, spent, budget, total, count: list.length,
    remaining, over: budget === null ? 0 : r2(Math.max(0, spent - budget)),
    used: budget ? spent / budget : null,
    remainingFrac: budget && total ? remaining / total : 0,
    segments: segs,
  };
}

/** Halka dilimleri: her dilim stroke-dasharray için {len, off}. Dilimler arası 1.5 birimlik boşluk. */
export function ringDashes(fracs, circumference, gap = 1.5) {
  let at = 0;
  return fracs.map(f => {
    const raw = Math.max(0, f) * circumference;
    const len = raw > gap * 2 ? raw - gap : raw;
    const out = { len: Math.max(0, len), off: -at };
    at += raw;
    return out;
  });
}

/* 5. Tasarruf sayacı ----------------------------------------------------------------------- */
export const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
export function totalSaved(purchases) { return r2((purchases || []).reduce((a, p) => a + savingOf(p), 0)); }
export function milestone(total) {
  const t = Math.max(0, num(total) || 0);
  const next = MILESTONES.find(m => m > t) ?? null;
  const prevs = MILESTONES.filter(m => m <= t);
  const prev = prevs.length ? prevs[prevs.length - 1] : 0;
  return { prev, next, frac: next ? (t - prev) / (next - prev) : 1, left: next ? r2(next - t) : 0, reached: prevs.length };
}
export function countAt(from, to, t) {
  const k = Math.min(1, Math.max(0, t));
  return from + (to - from) * (1 - Math.pow(1 - k, 3));
}

/* 2. Oyun DNA'sı radarı -------------------------------------------------------------------- */
export const RADAR_GENRES = ['Aksiyon', 'Macera', 'RPG', 'Strateji', 'Simülasyon', 'Spor', 'Yarış', 'Bağımsız'];
const OTHER = /^(diğer|other)$/i;
/** Balon haritasındaki türlerden radar eksenleri: en çok 8, en az 5 eksen; boşlar 0 değeriyle bilinen türlerden tamamlanır. */
export function radarAxes(genres) {
  const known = (genres || [])
    .filter(g => g && g.name && !OTHER.test(g.name) && num(g.percent) !== null && g.percent >= 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 8);
  if (known.length < 3) return null;
  const axes = known.map(g => ({ name: g.name, percent: g.percent, color: g.color || null }));
  for (const name of RADAR_GENRES) {
    if (axes.length >= 5) break;
    if (!axes.some(a => a.name === name)) axes.push({ name, percent: 0, color: null });
  }
  const order = n => { const i = RADAR_GENRES.indexOf(n); return i < 0 ? 99 : i; };
  axes.sort((a, b) => order(a.name) - order(b.name) || b.percent - a.percent);
  const peak = Math.max(...axes.map(a => a.percent));
  const max = Math.max(20, Math.ceil(peak / 10) * 10);
  return { axes, max };
}
export function polar(i, n, frac, radius, cx, cy) {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return [r2(cx + Math.cos(a) * radius * frac), r2(cy + Math.sin(a) * radius * frac)];
}

/* 7. İndirim geri sayım halkası ------------------------------------------------------------ */
const UNIT = [
  [/^(gün|gun|day|days|d)$/i, DAY],
  [/^(saat|hour|hours|hr|hrs|h)$/i, HOUR],
  [/^(dk|dakika|min|mins|minute|minutes|m)$/i, 6e4],
];
/** "1 gün 5 saat kaldı", "3 saat 59 dk kaldı", "5 days 2 hours left", "Last 20 minutes" → ms. Tanınmazsa null. */
export function parseRemainingMs(text) {
  const s = String(text || '');
  if (/dakikadan az|less than a minute|under a minute/i.test(s)) return 30e3;
  const re = /(\d+)\s*(gün|gun|days?|saat|hours?|hrs?|dakika|dk|minutes?|mins?|[dhm])(?![a-zçğıöşü])/gi;
  let ms = 0, found = false, m;
  while ((m = re.exec(s))) {
    const u = UNIT.find(([rx]) => rx.test(m[2]));
    if (!u) continue;
    ms += Number(m[1]) * u[1];
    found = true;
  }
  return found ? ms : null;
}
export const RING_HORIZON = 7 * DAY;
export function ringState(ms) {
  if (!(ms >= 0)) return null;
  return {
    frac: Math.min(1, ms / RING_HORIZON),
    tone: ms <= HOUR ? 'crit' : ms <= 6 * HOUR ? 'hot' : ms <= 2 * DAY ? 'warn' : 'ok',
  };
}

/* 3. İndirim takvimi ısı haritası ----------------------------------------------------------- */
/** discount_ends_at satırlarından Türkiye günü başına bitiş sayısı. */
export function endDayCounts(rows) {
  const out = {};
  for (const r of rows || []) {
    const t = Date.parse(r && r.discount_ends_at);
    if (!Number.isFinite(t)) continue;
    const d = istDay(t);
    out[d] = (out[d] || 0) + 1;
  }
  return out;
}
export function heatLevel(count, max) {
  if (!(count > 0) || !(max > 0)) return 0;
  // Günler arası fark çok büyük olabilir (bir gün binlerce, öteki bir); logaritmik ölçek küçük günleri de görünür tutar.
  return Math.min(4, Math.max(1, Math.ceil(4 * Math.log1p(count) / Math.log1p(max))));
}
/** Pazartesiden başlayan haftalık ızgara: weeks × 7 hücre. */
export function heatGrid(counts, today, weeks = 10) {
  const dow = (new Date(dayMs(today)).getUTCDay() + 6) % 7; // 0 = Pazartesi
  const start = addDays(today, -dow);
  const days = [];
  for (let i = 0; i < weeks * 7; i++) days.push(addDays(start, i));
  const max = Math.max(0, ...days.map(d => counts[d] || 0));
  return {
    max,
    weeks: Array.from({ length: weeks }, (_, w) => days.slice(w * 7, w * 7 + 7).map(d => ({
      day: d, count: counts[d] || 0, level: heatLevel(counts[d] || 0, max), past: d < today, today: d === today,
    }))),
  };
}

/* 4. Fiyat düşüşü şelalesi ------------------------------------------------------------------ */
/** Fiyat geçmişi satırlarından (product_id, day, price, base_price) gerçek düşüşler: son fiyat öncekinden düşükse. */
export function priceDrops(rows, limit = 12) {
  const by = new Map();
  for (const r of rows || []) {
    if (!r || !r.product_id || !r.day || !(Number(r.price) >= 0)) continue;
    (by.get(r.product_id) || by.set(r.product_id, []).get(r.product_id)).push({ day: r.day, price: Number(r.price), base: Number(r.base_price) });
  }
  const out = [];
  for (const [id, list] of by) {
    list.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
    const last = list[list.length - 1];
    let prev = null;
    for (let i = list.length - 2; i >= 0; i--) if (list[i].price !== last.price) { prev = list[i]; break; }
    if (!prev || !(last.price > 0) || !(last.price < prev.price)) continue;
    out.push({ id, day: last.day, from: prev.price, to: last.price, pct: Math.round((1 - last.price / prev.price) * 100) });
  }
  out.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : b.pct - a.pct));
  return out.slice(0, limit);
}
export function dropAge(day, today) {
  const n = Math.round((dayMs(today) - dayMs(day)) / DAY);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

/* 6. Çıkış tarihi zaman çizgisi ------------------------------------------------------------- */
export function timelineDays(games, today, horizon = 60, perDay = 4) {
  const seen = new Set();
  const by = new Map();
  const end = addDays(today, horizon);
  for (const g of games || []) {
    if (!g || !g.name || !/^\d{4}-\d{2}-\d{2}$/.test(g.release_date || '')) continue;
    if (g.release_date < today || g.release_date > end) continue;
    const key = (g.title_key || g.name.toLowerCase()) + '|' + g.release_date;
    if (seen.has(key)) continue;
    seen.add(key);
    (by.get(g.release_date) || by.set(g.release_date, []).get(g.release_date)).push(g);
  }
  const rank = g => (Number.isFinite(g.wishlist_rank) ? g.wishlist_rank : 1e9);
  return [...by.keys()].sort().map(date => {
    const all = by.get(date).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    return { date, total: all.length, games: all.slice(0, perDay), more: Math.max(0, all.length - perDay), gap: Math.round((dayMs(date) - dayMs(today)) / DAY) };
  });
}

/* 8. Kategori balon haritası ---------------------------------------------------------------- */
/** Dairelerin çakışmadan yerleştirilmesi: büyükten küçüğe, merkezden spiral. */
export function packCircles(items, width, height, pad = 6, rMin = 24, rMax = 74) {
  const sorted = items.filter(i => i.count > 0).sort((a, b) => b.count - a.count);
  const max = sorted.length ? sorted[0].count : 1;
  const placed = [];
  const cx = width / 2, cy = height / 2;
  for (const it of sorted) {
    const r = rMin + (rMax - rMin) * Math.sqrt(it.count / max);
    let spot = null;
    for (let d = 0; d < Math.max(width, height) && !spot; d += 3) {
      const steps = Math.max(1, Math.round((d * Math.PI * 2) / 14));
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * Math.PI * 2 + d * 0.35;
        const x = cx + Math.cos(a) * d * 1.45; // ellipse: wide boxes
        const y = cy + Math.sin(a) * d;
        if (x - r < 0 || x + r > width || y - r < 0 || y + r > height) continue;
        if (placed.every(p => Math.hypot(p.x - x, p.y - y) >= p.r + r + pad)) { spot = { x, y }; break; }
      }
    }
    if (spot) placed.push({ ...it, r: r2(r), x: r2(spot.x), y: r2(spot.y) });
  }
  return placed;
}

/* 9. Kütüphane değeri ----------------------------------------------------------------------- */
export function titleKey(name) {
  return String(name || '').replace(/[™®©]/g, '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/ı/g, 'i').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}
/** "42 sa", "1,5 sa", "1.234 sa", "30 dk", "Hiç oynanmadı", "12 h" → dakika. */
export function parseMinutes(text) {
  const s = String(text || '').trim().toLowerCase();
  const m = /^([\d.,]+)\s*(sa|h|hr|hrs|hour|hours|dk|min|mins|minute|minutes)\b/.exec(s);
  if (!m) return 0;
  let v = m[1];
  if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, '');
  else v = v.replace(',', '.');
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return /^(dk|min)/.test(m[2]) ? Math.round(n) : Math.round(n * 60);
}
export function appIdFromIcon(src) { const m = /\/apps\/(\d+)\//.exec(String(src || '')); return m ? m[1] : null; }
/** rows: [{appid,name,minutes}], offers: {byAppid:{id:{price,currency}}, byKey:{key:{price,currency}}} */
export function libraryValue(rows, offers) {
  const priced = [];
  let unpriced = 0;
  for (const r of rows || []) {
    const o = (r.appid && offers.byAppid[r.appid]) || offers.byKey[titleKey(r.name)] || null;
    if (!o || !(o.price > 0)) { unpriced++; continue; }
    priced.push({ name: r.name, minutes: r.minutes || 0, price: o.price, currency: o.currency });
  }
  const cur = {};
  for (const p of priced) cur[p.currency] = (cur[p.currency] || 0) + p.price;
  const currency = Object.keys(cur).sort((a, b) => cur[b] - cur[a])[0] || null;
  const list = priced.filter(p => p.currency === currency).sort((a, b) => b.price - a.price);
  const total = r2(list.reduce((a, p) => a + p.price, 0));
  const unplayed = list.filter(p => !(p.minutes > 0));
  const withTime = list.filter(p => p.minutes >= 30).map(p => ({ ...p, perHour: p.price / (p.minutes / 60) }));
  return {
    currency, total, count: list.length, unpriced: unpriced + (priced.length - list.length),
    unplayedValue: r2(unplayed.reduce((a, p) => a + p.price, 0)), unplayedCount: unplayed.length,
    best: withTime.slice().sort((a, b) => a.perHour - b.perHour)[0] || null,
    top: list.slice(0, 8),
  };
}

// ---------------------------------------------------------------------------------------------
// Tarayıcı tarafı
// ---------------------------------------------------------------------------------------------
const BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined';
const root = BROWSER ? document.documentElement : null;
const reduceMq = BROWSER && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const motionOk = () => BROWSER && !(reduceMq && reduceMq.matches) && root.dataset.reduceMotion !== 'true';
const isEn = () => BROWSER && root.lang === 'en';
const T = (tr, en) => (isEn() ? en : tr);
const lang = () => (isEn() ? 'en' : 'tr');
const money = (v, cur = 'TRY') => {
  try { return new Intl.NumberFormat(isEn() ? 'en-US' : 'tr-TR', { style: 'currency', currency: cur, maximumFractionDigits: v >= 100 ? 0 : 2 }).format(v); }
  catch { return String(v); }
};
const intl = v => new Intl.NumberFormat(isEn() ? 'en-US' : 'tr-TR').format(v);
const dateLabel = (day, opts) => new Date(dayMs(day)).toLocaleDateString(isEn() ? 'en-US' : 'tr-TR', { timeZone: 'UTC', ...opts });
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const cache = {
  get(k, ttl) { try { const o = JSON.parse(sessionStorage.getItem(k) || 'null'); return o && Date.now() - o.t < ttl ? o.v : null; } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify({ t: Date.now(), v })); } catch {} },
};

const SVGNS = 'http://www.w3.org/2000/svg';
function build(ns, tag, props, kids) {
  const el = ns ? document.createElementNS(SVGNS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const h = (tag, props, ...kids) => build(false, tag, props, kids);
const s = (tag, props, ...kids) => build(true, tag, props, kids);

/* Açık okuma: uygulamanın kendi geçidi Supabase adresini Mac mini'ye yönlendirir. */
const DB = 'https://dsosckshigzijnsxmlwh.supabase.co/rest/v1/';
const KEY = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
const REST_HEADERS = { apikey: KEY, Authorization: 'Bearer ' + KEY };
async function rest(path, extra) {
  const res = await fetch(DB + path, { headers: { ...REST_HEADERS, ...(extra || {}) }, credentials: 'omit', signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res;
}
async function rows(path) { return (await rest(path)).json(); }
async function count(path) {
  const res = await rest(path, { Prefer: 'count=exact', Range: '0-0' });
  const m = /\/(\d+)$/.exec(res.headers.get('content-range') || '');
  return m ? Number(m[1]) : 0;
}
const q = v => encodeURIComponent(v);

/* ---- Konfeti ---- */
export function confetti(x, y) {
  if (!BROWSER || !motionOk()) return;
  const cv = h('canvas', { class: 'vz-confetti', 'aria-hidden': 'true', 'data-vz': '' });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  document.body.append(cv);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const ox = Number.isFinite(x) ? x : W / 2, oy = Number.isFinite(y) ? y : H / 3;
  const parts = Array.from({ length: 90 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const sp = 5 + Math.random() * 8;
    return { x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 5 + Math.random() * 6, hgt: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: PALETTE[i % PALETTE.length] };
  });
  const t0 = performance.now();
  (function frame(now) {
    const t = now - t0;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.28; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 2100);
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.hgt / 2, p.w, p.hgt);
      ctx.restore();
    }
    if (t < 2100) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

/* ---- 1 + 5. Cüzdan koçu: halka ve tasarruf sayacı ---- */
function readLife() {
  try { const o = JSON.parse(store.get('radar-lifestyle-v1') || '{}'); return { purchases: Array.isArray(o.purchases) ? o.purchases : [], limits: o.limits && typeof o.limits === 'object' ? o.limits : {} }; }
  catch { return { purchases: [], limits: {} }; }
}
function donutNode(d) {
  const R = 52, C = 2 * Math.PI * R;
  const slices = d.segments.map(x => x.frac);
  if (d.remainingFrac > 0) slices.push(d.remainingFrac);
  const dashes = ringDashes(slices, C);
  const circles = dashes.map((dash, i) => {
    const seg = d.segments[i];
    const isRemain = i >= d.segments.length;
    const title = isRemain ? `${T('Kalan', 'Left')} ${money(d.remaining)}` : `${seg.name || T('Diğer alımlar', 'Other purchases')} · ${money(seg.amount)}`;
    return s('circle', {
      class: 'vz-seg' + (isRemain ? ' remain' : ''), cx: 70, cy: 70, r: R, fill: 'none', 'stroke-width': 16,
      stroke: isRemain ? null : PALETTE[i % PALETTE.length],
      'stroke-dasharray': `${dash.len.toFixed(2)} ${(C - dash.len).toFixed(2)}`, 'stroke-dashoffset': dash.off.toFixed(2),
      style: { '--i': i },
    }, s('title', null, title));
  });
  const over = d.over > 0;
  const pct = d.used === null ? null : Math.round(d.used * 100);
  const svg = s('svg', { class: 'vz-donut', viewBox: '0 0 140 140', role: 'img', 'aria-label': pct === null ? `${T('Bu ay harcama', 'Spent this month')} ${money(d.spent)}` : `${T('Bütçenin', 'Budget used:')} %${pct}` },
    s('circle', { class: 'vz-track', cx: 70, cy: 70, r: R, fill: 'none', 'stroke-width': 16 }),
    s('g', { transform: 'rotate(-90 70 70)' }, ...circles),
    over ? s('circle', { class: 'vz-over-ring', cx: 70, cy: 70, r: 63, fill: 'none', 'stroke-width': 2 }) : null,
  );
  const center = h('div', { class: 'vz-donut-center' },
    h('strong', null, pct === null ? money(d.spent) : `%${pct}`),
    h('small', null, pct === null ? T('bu ay harcama', 'spent this month') : (over ? `${money(d.over)} ${T('aşım', 'over')}` : `${money(d.remaining)} ${T('kaldı', 'left')}`)),
  );
  const legend = h('ul', { class: 'vz-legend' },
    ...d.segments.map((x, i) => h('li', null, h('i', { style: { background: PALETTE[i % PALETTE.length] }, 'aria-hidden': 'true' }),
      h('span', null, x.id === 'rest' ? `${x.count} ${T('alım daha', 'more')}` : x.name || '—'), h('b', null, money(x.amount)))),
    d.remainingFrac > 0 ? h('li', { class: 'remain' }, h('i', { 'aria-hidden': 'true' }), h('span', null, T('Kalan bütçe', 'Budget left')), h('b', null, money(d.remaining))) : null,
  );
  return h('div', { class: 'vz-wallet', 'data-vz': '' }, h('div', { class: 'vz-donut-wrap' }, svg, center), legend);
}

let savedAnim = null;
function savedNode(total, seen) {
  const ms = milestone(total);
  const num = h('strong', { class: 'vz-saved-num' }, money(total));
  const left = ms.next ? `${money(ms.left)} ${T('sonra', 'to go:')} ${money(ms.next)}` : T('Bütün hedefleri geçtin', 'You passed every milestone');
  const node = h('button', { type: 'button', class: 'vz-saved', 'data-vz': '', 'aria-label': `${T('Toplam tasarruf', 'Total saved')} ${money(total)}. ${T('Kutlamak için bas', 'Press to celebrate')}` },
    h('span', { class: 'vz-saved-eyebrow' }, T('TOPLAM TASARRUF', 'TOTAL SAVED')),
    num,
    h('span', { class: 'vz-saved-bar', role: 'presentation' }, h('i', { style: { width: Math.round(ms.frac * 100) + '%' } })),
    h('small', null, left),
  );
  node.addEventListener('click', e => { const r = node.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + 10); });
  if (seen !== null && total > seen) {
    if (motionOk()) {
      const t0 = performance.now(), dur = 1300;
      cancelAnimationFrame(savedAnim);
      num.textContent = money(seen);
      (function tick(now) {
        const t = (now - t0) / dur;
        num.textContent = money(r2(countAt(seen, total, t)));
        if (t < 1) savedAnim = requestAnimationFrame(tick);
        else num.textContent = money(total);
      })(t0);
      setTimeout(() => { const r = node.getBoundingClientRect(); confetti(r.left + r.width / 2, Math.max(60, r.top)); }, 120);
    }
    node.classList.add('is-new');
    node.append(h('span', { class: 'vz-saved-new', role: 'status' }, `+${money(r2(total - seen))}`));
  }
  return node;
}
function mountWallet() {
  const sec = document.querySelector('.life-budget');
  if (!sec) return;
  const mi = sec.querySelector('input[type=month]');
  const month = mi && /^\d{4}-\d{2}$/.test(mi.value) ? mi.value : istDay().slice(0, 7);
  const life = readLife();
  const d = walletDonut(life.purchases, month, life.limits[month]);
  const sig = JSON.stringify([d, lang()]);
  let box = sec.querySelector(':scope > .vz-wallet');
  if (!d.count && !d.budget) { box && box.remove(); }
  else if (!box || box.dataset.sig !== sig) {
    const next = donutNode(d);
    next.dataset.sig = sig;
    if (box) box.replaceWith(next);
    else (sec.querySelector(':scope > dl.life-budget-totals') || sec.lastElementChild).before(next);
  }
  const hero = sec.querySelector('.wallet-hero');
  if (!hero) return;
  const total = totalSaved(life.purchases);
  const seenRaw = store.get('radar-vz-saved');
  const seen = seenRaw === null || !Number.isFinite(Number(seenRaw)) ? null : Number(seenRaw);
  const old = hero.querySelector(':scope > .vz-saved');
  const ssig = total + '|' + lang();
  if (total <= 0) { old && old.remove(); if (seen !== 0) store.set('radar-vz-saved', '0'); return; }
  if (old && old.dataset.sig === ssig) return;
  const next = savedNode(total, seen);
  next.dataset.sig = ssig;
  old ? old.replaceWith(next) : hero.append(next);
  store.set('radar-vz-saved', String(total));
}

/* ---- 2. Oyun DNA radarı ---- */
function readDnaGenres(dna) {
  return [...dna.querySelectorAll('.dna-bubble')].map(g => {
    const label = g.getAttribute('aria-label') || '';
    const m = /%\s*(\d+)|(\d+)\s*%/.exec(label);
    const percent = m ? Number(m[1] ?? m[2]) : NaN;
    const raw = label.replace(/%\s*\d+|\d+\s*%/, '').trim();
    const name = GENRE_TR[raw] || raw;
    const circle = g.querySelector('circle');
    return { name, percent, color: circle ? circle.getAttribute('fill') : null };
  }).filter(g => g.name && Number.isFinite(g.percent));
}
function radarNode(r) {
  const N = r.axes.length, CX = 180, CY = 150, R = 96;
  const ring = f => s('polygon', { class: 'vz-grid', points: r.axes.map((_, i) => polar(i, N, f, R, CX, CY).join(',')).join(' ') });
  const pts = r.axes.map((a, i) => polar(i, N, a.percent / r.max, R, CX, CY));
  const labels = r.axes.map((a, i) => {
    const [x, y] = polar(i, N, 1.2, R, CX, CY);
    const anchor = Math.abs(x - CX) < 8 ? 'middle' : x < CX ? 'end' : 'start';
    return s('text', { class: 'vz-axis', x, y: y + 4, 'text-anchor': anchor }, `${genreName(a.name)} %${a.percent}`);
  });
  const svg = s('svg', { class: 'vz-radar-svg', viewBox: '0 0 360 300', role: 'img', 'aria-label': r.axes.map(a => `${genreName(a.name)} %${a.percent}`).join(', ') },
    ring(0.25), ring(0.5), ring(0.75), ring(1),
    ...r.axes.map((_, i) => { const [x, y] = polar(i, N, 1, R, CX, CY); return s('line', { class: 'vz-spoke', x1: CX, y1: CY, x2: x, y2: y }); }),
    s('g', { class: 'vz-shape' },
      s('polygon', { class: 'vz-area', points: pts.map(p => p.join(',')).join(' ') }),
      ...pts.map((p, i) => s('circle', { class: 'vz-dot', cx: p[0], cy: p[1], r: 4.5, fill: r.axes[i].color || null }, s('title', null, `${genreName(r.axes[i].name)} %${r.axes[i].percent}`))),
    ),
    ...labels,
  );
  return h('article', { class: 'dna-card vz-radar', 'data-vz': '' },
    h('h4', null, T('Tür radarın', 'Your genre radar')),
    h('p', { class: 'dna-hint' }, T(`Dış halka %${r.max}. Eksen ne kadar uzunsa o türü o kadar çok seviyorsun.`, `Outer ring is ${r.max}%. The longer the axis, the more you play that genre.`)),
    svg);
}
function mountDna() {
  for (const dna of document.querySelectorAll('.game-dna')) {
    const side = dna.querySelector('.dna-side');
    if (!side) continue;
    const r = radarAxes(readDnaGenres(dna));
    const old = side.querySelector(':scope > .vz-radar');
    if (!r) { old && old.remove(); continue; }
    const sig = JSON.stringify([r, lang()]);
    if (old && old.dataset.sig === sig) continue;
    const next = radarNode(r);
    next.dataset.sig = sig;
    old ? old.replaceWith(next) : side.prepend(next);
  }
}

/* ---- 7. Geri sayım halkası ---- */
const RING_C = 2 * Math.PI * 9;
function mountRings() {
  for (const el of document.querySelectorAll('.dealexpires:not(.unknown):not(.ended)')) {
    const ms = parseRemainingMs(el.textContent);
    const st = ms === null ? null : ringState(ms);
    let ring = el.querySelector(':scope > .vz-ring');
    if (!st) { ring && ring.remove(); continue; }
    if (!ring) {
      ring = s('svg', { class: 'vz-ring', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false', 'data-vz': '' },
        s('circle', { class: 'vz-ring-track', cx: 12, cy: 12, r: 9, fill: 'none', 'stroke-width': 3 }),
        s('circle', { class: 'vz-ring-prog', cx: 12, cy: 12, r: 9, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', transform: 'rotate(-90 12 12)', 'stroke-dasharray': `0 ${RING_C}` }));
      el.prepend(ring);
    }
    const dash = `${(st.frac * RING_C).toFixed(2)} ${RING_C.toFixed(2)}`;
    const prog = ring.lastElementChild;
    if (prog.getAttribute('stroke-dasharray') !== dash) prog.setAttribute('stroke-dasharray', dash);
    if (ring.dataset.tone !== st.tone) ring.dataset.tone = st.tone;
  }
}

/* ---- panel kabuğu (lazy) ---- */
function panel(cls, title, hint, onFirstOpen) {
  const body = h('div', { class: 'vz-panel-body' });
  const d = h('details', { class: 'vz-panel ' + cls, 'data-vz': '' },
    h('summary', null, h('span', { class: 'vz-panel-title' }, title), h('small', null, hint)), body);
  let loaded = false;
  d.addEventListener('toggle', () => { if (d.open && !loaded) { loaded = true; onFirstOpen(body); } });
  return d;
}
const skeleton = () => h('div', { class: 'vz-skel', role: 'status', 'aria-live': 'polite' }, h('span', null, T('Yükleniyor…', 'Loading…')));
const failure = (body, retry) => { body.replaceChildren(h('p', { class: 'vz-note' }, T('Veri şu an alınamadı.', 'Could not load the data right now.'), ' ', h('button', { type: 'button', class: 'vz-link', onclick: retry }, T('Tekrar dene', 'Try again')))); };

/* ---- 3. İndirim takvimi ısı haritası ---- */
async function loadEnds() {
  const hit = cache.get('vz-ends', 15 * 60e3);
  if (hit) return hit;
  const today = istDay();
  const base = `ps_products?select=discount_ends_at&discount_ends_at=gte.${today}T00:00:00Z&discount_ends_at=lt.${addDays(today, 71)}T00:00:00Z&order=discount_ends_at.asc`;
  const total = await count(base);
  const pages = Math.min(10, Math.ceil(total / 1000));
  const parts = await Promise.all(Array.from({ length: pages }, (_, i) => rows(`${base}&limit=1000&offset=${i * 1000}`)));
  const counts = endDayCounts(parts.flat());
  cache.set('vz-ends', counts);
  return counts;
}
function heatNode(counts) {
  const today = istDay();
  const grid = heatGrid(counts, today, 10);
  const head = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const headEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const info = h('p', { class: 'vz-heat-info', role: 'status', 'aria-live': 'polite' }, T('Bir güne dokun: o gün biten indirim sayısı görünür.', 'Tap a day to see how many sales end then.'));
  const show = c => {
    info.textContent = c.count
      ? `${dateLabel(c.day, { weekday: 'long', day: 'numeric', month: 'long' })}: ${intl(c.count)} ${T('PlayStation indirimi bitiyor', 'PlayStation sales end')}`
      : `${dateLabel(c.day, { weekday: 'long', day: 'numeric', month: 'long' })}: ${T('bitiş kaydı yok', 'no endings recorded')}`;
  };
  const cols = grid.weeks.map((wk, wi) => h('div', { class: 'vz-heat-col' },
    ...wk.map(c => h('button', {
      type: 'button', class: `vz-cell l${c.level}` + (c.past ? ' past' : '') + (c.today ? ' today' : ''),
      title: `${dateLabel(c.day, { day: 'numeric', month: 'short' })} · ${intl(c.count)}`,
      'aria-label': `${dateLabel(c.day, { day: 'numeric', month: 'long' })}: ${intl(c.count)} ${T('indirim bitiyor', 'sales end')}`,
      style: { '--d': (wi * 18) + 'ms' }, onclick: () => show(c),
    }))));
  const lbl = (isEn() ? headEn : head).map(x => h('span', null, x));
  const months = grid.weeks.map((wk, i) => {
    const first = wk[0].day;
    const prev = i ? grid.weeks[i - 1][0].day : '';
    return h('span', { class: 'vz-heat-month' }, !prev || first.slice(5, 7) !== prev.slice(5, 7) ? dateLabel(first, { month: 'short' }) : '');
  });
  return h('div', { class: 'vz-heat' },
    h('div', { class: 'vz-heat-scroll' },
      h('div', { class: 'vz-heat-rows' }, h('span', { class: 'vz-heat-month' }), ...lbl),
      h('div', { class: 'vz-heat-main' }, h('div', { class: 'vz-heat-months' }, ...months), h('div', { class: 'vz-heat-cols' }, ...cols))),
    h('div', { class: 'vz-heat-legend', 'aria-hidden': 'true' }, h('span', null, T('az', 'few')), ...[0, 1, 2, 3, 4].map(l => h('i', { class: 'vz-cell l' + l })), h('span', null, T('çok', 'many'))),
    info,
    h('p', { class: 'vz-note' }, T('PlayStation Store TR indirimlerinin mağazanın bildirdiği bitiş günleri. Başka mağazalar bitiş günü vermiyorsa burada yoktur.', 'End days reported by PlayStation Store TR. Stores that do not publish an end day are not shown.')));
}
function heatPanel() {
  const run = async body => {
    body.replaceChildren(skeleton());
    try { body.replaceChildren(heatNode(await loadEnds())); } catch { failure(body, () => run(body)); }
  };
  return panel('vz-heat-panel', T('İndirim takvimi', 'Sale calendar'), T('Hangi gün kaç indirim bitiyor', 'How many sales end each day'), run);
}

/* ---- 8. Kategori balon haritası ---- */
const GENRES = ['Aksiyon', 'Macera', 'RPG', 'Strateji', 'Simülasyon', 'Spor', 'Yarış', 'Bağımsız', 'Rahat', 'MMO'];
const GENRE_EN = { Aksiyon: 'Action', Macera: 'Adventure', Strateji: 'Strategy', 'Simülasyon': 'Simulation', Spor: 'Sports', 'Yarış': 'Racing', 'Bağımsız': 'Indie', Rahat: 'Casual', 'Diğer': 'Other' };
const genreName = g => (isEn() && GENRE_EN[g]) || g;
const GENRE_TR = Object.fromEntries(Object.entries(GENRE_EN).map(([tr, en]) => [en, tr]));
async function loadGenreCounts() {
  const hit = cache.get('vz-genres', 15 * 60e3);
  if (hit) return hit;
  const out = await Promise.all(GENRES.map(async g => {
    const [a, b] = await Promise.all([
      count(`store_offers?select=store_id&discount_percent=gt.0&genres=cs.${q('{' + g + '}')}`),
      count(`ps_products?select=id&discount_percent=gt.0&ps_genres=cs.${q('{' + g + '}')}`).catch(() => 0),
    ]);
    return { name: g, count: a + b };
  }));
  cache.set('vz-genres', out);
  return out;
}
function pickGenre(name) {
  const sel = [...document.querySelectorAll('.simple-home select, .storebrowser select')].find(el => [...el.options].some(o => o.value === name || o.textContent.trim() === name || o.textContent.trim() === genreName(name)));
  if (!sel) return false;
  const opt = [...sel.options].find(o => o.value === name || o.textContent.trim() === name || o.textContent.trim() === genreName(name));
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, opt.value);
  sel.dispatchEvent(new Event('input', { bubbles: true }));
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  sel.closest('.simple-home, .storebrowser')?.querySelector('.deal-list, .resultmeta')?.scrollIntoView({ behavior: motionOk() ? 'smooth' : 'auto', block: 'start' });
  return true;
}
function bubbleNode(list) {
  const W = 620, H = 340;
  const placed = packCircles(list, W, H);
  const total = list.reduce((a, g) => a + g.count, 0) || 1;
  const bubbles = placed.map((b, i) => {
    const big = b.r >= 44;
    const name = genreName(b.name);
    const g = s('g', {
      class: 'vz-bubble', role: 'button', tabindex: 0, style: { '--i': i, 'transform-origin': `${b.x}px ${b.y}px` },
      'aria-label': `${name}: ${intl(b.count)} ${T('indirimli teklif', 'discounted offers')}`,
    },
      s('circle', { cx: b.x, cy: b.y, r: b.r, fill: PALETTE[GENRES.indexOf(b.name) % PALETTE.length] }),
      s('text', { class: 'vz-bubble-name', x: b.x, y: b.y - (big ? 1 : -4), 'text-anchor': 'middle' }, name),
      big ? s('text', { class: 'vz-bubble-pct', x: b.x, y: b.y + 15, 'text-anchor': 'middle' }, '%' + Math.round(b.count / total * 100)) : null,
      s('title', null, `${name} · ${intl(b.count)}`));
    const act = () => { pickGenre(b.name); };
    g.addEventListener('click', act);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    return g;
  });
  return h('div', { class: 'vz-bubbles' },
    s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': T('Türlere göre indirimli teklifler', 'Discounted offers by genre') }, ...bubbles),
    h('p', { class: 'vz-note' }, T('Baloncuk ne kadar büyükse o türde o kadar çok indirimli teklif var (PlayStation ve diğer mağazalar, türü bilinenler). Bir baloncuğa bas, listeyi o türe daralt.', 'Bigger bubbles mean more discounted offers in that genre (PlayStation and other stores, genre known only). Tap a bubble to filter the list.')));
}
function bubblePanel() {
  const run = async body => {
    body.replaceChildren(skeleton());
    try { body.replaceChildren(bubbleNode(await loadGenreCounts())); } catch { failure(body, () => run(body)); }
  };
  return panel('vz-bubble-panel', T('Tür haritası', 'Genre map'), T('Hangi türde kaç indirim var', 'Sales per genre'), run);
}

function mountDeals() {
  const onDeals = new URLSearchParams(location.search).get('section') === 'deals';
  const sec = document.querySelector('.storebrowser.simple-home');
  const have = document.querySelector('.vz-dealtools');
  if (!onDeals || !sec) { have && have.remove(); return; }
  const anchor = sec.querySelector(':scope > .libtools') || sec.querySelector(':scope > .genre-strip');
  if (have && have.dataset.lang === lang() && sec.contains(have)) {
    if (anchor && have.nextElementSibling !== anchor) anchor.before(have); // React bölümleri sonradan gelebilir
    return;
  }
  have && have.remove();
  const box = h('div', { class: 'vz-dealtools', 'data-vz': '', 'data-lang': lang() }, heatPanel(), bubblePanel());
  anchor ? anchor.before(box) : sec.append(box);
}

/* ---- 4. Fiyat düşüşü şelalesi (ana sayfa) ---- */
async function loadDrops() {
  const hit = cache.get('vz-drops', 15 * 60e3);
  if (hit) return hit;
  const today = istDay();
  const days = Array.from({ length: 9 }, (_, i) => addDays(today, -i));
  const counts = await Promise.all(days.map(d => count(`ps_price_history?select=product_id&day=eq.${d}`).catch(() => 1e9)));
  // Çok satırlı günler tam katalog dökümüdür; gerçek değişim günü sayılmaz.
  const small = days.filter((_, i) => counts[i] > 0 && counts[i] <= 800);
  if (!small.length) return [];
  const recent = await rows(`ps_price_history?select=product_id,day,price,base_price&day=in.(${small.join(',')})&order=day.desc&limit=800`);
  const ids = [...new Set(recent.filter(r => Number(r.price) < Number(r.base_price)).map(r => r.product_id))].slice(0, 60);
  if (!ids.length) return [];
  const hist = await rows(`ps_price_history?select=product_id,day,price,base_price&product_id=in.(${ids.map(q).join(',')})&day=gte.${addDays(today, -60)}&order=day.desc&limit=1500`);
  const drops = priceDrops(hist, 8);
  if (!drops.length) return [];
  const prods = await rows(`ps_products?select=id,name,image,price,original_price,currency,url,title_key&id=in.(${drops.map(d => q(d.id)).join(',')})`);
  const byId = new Map(prods.map(p => [p.id, p]));
  const out = drops.map(d => ({ ...d, name: byId.get(d.id)?.name, image: byId.get(d.id)?.image, currency: byId.get(d.id)?.currency || 'TRY', url: byId.get(d.id)?.url })).filter(d => d.name);
  cache.set('vz-drops', out);
  return out;
}
function dropCard(d, i, today) {
  const age = dropAge(d.day, today);
  const when = age === 0 ? T('bugün', 'today') : age === 1 ? T('dün', 'yesterday') : T(`${age} gün önce`, `${age} days ago`);
  const body = [
    d.image ? h('img', { src: d.image.replace(/\?.*$/, '') + '?w=120', alt: '', loading: 'lazy', width: 44, height: 44 }) : h('span', { class: 'vz-drop-ph', 'aria-hidden': 'true' }),
    h('span', { class: 'vz-drop-text' }, h('b', null, d.name), h('small', null, when)),
    h('span', { class: 'vz-drop-price' }, h('del', null, money(d.from, d.currency)), h('strong', null, money(d.to, d.currency))),
    h('span', { class: 'vz-drop-pct' }, '−%' + d.pct),
  ];
  const style = { '--i': i };
  return d.url ? h('a', { class: 'vz-drop', href: d.url, target: '_blank', rel: 'noreferrer', style }, ...body) : h('div', { class: 'vz-drop', style }, ...body);
}
function mountFall() {
  const inner = document.querySelector('main.radar-landing .radar-landing-inner');
  const have = document.querySelector('.vz-fall');
  if (!inner) { have && have.remove(); return; }
  if (have && have.dataset.lang === lang() && inner.contains(have)) return;
  have && have.remove();
  const list = h('div', { class: 'vz-fall-list', 'aria-live': 'polite' }, skeleton());
  const sec = h('section', { class: 'vz-fall', 'data-vz': '', 'data-lang': lang(), 'aria-label': T('Son fiyat düşüşleri', 'Latest price drops') },
    h('h2', null, h('span', { class: 'vz-live', 'aria-hidden': 'true' }), T('Son fiyat düşüşleri', 'Latest price drops')),
    h('p', { class: 'vz-fall-sub' }, T('PlayStation Store TR fiyat geçmişinden, fiyatı gerçekten düşenler', 'Real drops from PlayStation Store TR price history')),
    list);
  inner.append(sec);
  loadDrops().then(drops => {
    if (!sec.isConnected) return;
    if (!drops.length) { sec.remove(); return; }
    const today = istDay();
    list.replaceChildren(...drops.map((d, i) => dropCard(d, i, today)));
  }).catch(() => sec.remove());
}

/* ---- 6. Çıkış tarihi zaman çizgisi ---- */
async function loadUpcoming() {
  const hit = cache.get('vz-upcoming', 30 * 60e3);
  if (hit) return hit;
  const today = istDay();
  const data = await rows(`upcoming_games?select=id,name,image,release_date,platform,title_key,wishlist_rank&release_date=gte.${today}&release_date=lte.${addDays(today, 60)}&order=release_date.asc&limit=900`);
  cache.set('vz-upcoming', data);
  return data;
}
const PLAT = { steam: 'Steam', playstation: 'PlayStation', xbox: 'Xbox', switch: 'Switch', epic: 'Epic', gog: 'GOG' };
function timelineNode(days, today) {
  if (!days.length) return h('p', { class: 'vz-note' }, T('Önümüzdeki 60 günde tarihi belli çıkış bulunamadı.', 'No dated releases found in the next 60 days.'));
  const items = [];
  let prevMonth = today.slice(0, 7);
  days.forEach((d, i) => {
    const month = d.date.slice(0, 7);
    if (month !== prevMonth || i === 0) {
      items.push(h('li', { class: 'vz-tl-month', 'aria-hidden': 'true' }, dateLabel(d.date, { month: 'long' })));
      prevMonth = month;
    }
    const rel = d.gap === 0 ? T('Bugün', 'Today') : d.gap === 1 ? T('Yarın', 'Tomorrow') : T(`${d.gap} gün`, `${d.gap} days`);
    items.push(h('li', { class: 'vz-tl-day' + (d.gap === 0 ? ' now' : ''), style: { '--i': i } },
      h('span', { class: 'vz-tl-dot', 'aria-hidden': 'true' }),
      h('time', { datetime: d.date }, h('b', null, dateLabel(d.date, { day: 'numeric', month: 'short' })), h('small', null, rel)),
      h('ul', { class: 'vz-tl-games' },
        ...d.games.map(g => h('li', { title: g.name },
          g.image ? h('img', { src: g.image, alt: '', loading: 'lazy', width: 56, height: 28 }) : h('span', { class: 'vz-tl-ph', 'aria-hidden': 'true' }),
          h('span', null, h('b', null, g.name), h('small', null, PLAT[g.platform] || g.platform || '')))),
        d.more ? h('li', { class: 'vz-tl-more' }, `+${intl(d.more)} ${T('oyun daha', 'more')}`) : null)));
  });
  return h('ol', { class: 'vz-tl-track' }, ...items);
}
function mountTimeline() {
  const sec = document.querySelector('section.relcal');
  const have = document.querySelector('.vz-timeline');
  if (!sec) { have && have.remove(); return; }
  const head = sec.querySelector(':scope > .relcal-head');
  if (have && have.dataset.lang === lang() && sec.contains(have)) {
    if (head && head.nextElementSibling !== have) head.after(have);
    return;
  }
  have && have.remove();
  const body = h('div', { class: 'vz-tl-body' }, skeleton());
  const box = h('section', { class: 'vz-timeline', 'data-vz': '', 'data-lang': lang(), 'aria-label': T('Önümüzdeki çıkışlar', 'Upcoming releases') },
    h('div', { class: 'vz-tl-head' }, h('h2', null, T('Önümüzdeki 60 gün', 'Next 60 days')), h('small', null, T('Çıkış günlerine göre yatay zaman çizgisi', 'Horizontal timeline of release days'))),
    body);
  head ? head.after(box) : sec.prepend(box);
  const run = () => loadUpcoming().then(data => {
    if (!box.isConnected) return;
    const today = istDay();
    body.replaceChildren(timelineNode(timelineDays(data, today, 60), today));
  }).catch(() => failure(body, () => { body.replaceChildren(skeleton()); run(); }));
  run();
}

/* ---- 9. Kütüphane değeri ---- */
const offerMem = new Map();
async function loadOffers(items) {
  const byAppid = {}, byKey = {};
  const ids = [...new Set(items.map(i => i.appid).filter(Boolean))];
  const keys = [...new Set(items.filter(i => !i.appid).map(i => titleKey(i.name)).filter(Boolean))];
  const get = async (field, vals, into, keyOf) => {
    for (let i = 0; i < vals.length; i += 60) {
      const part = vals.slice(i, i + 60);
      const memKey = field + ':' + part.join('|');
      let data = offerMem.get(memKey);
      if (!data) { data = await rows(`store_offers?select=store_id,title_key,price,original_price,currency&platform=eq.steam&${field}=in.(${part.map(q).join(',')})`); offerMem.set(memKey, data); }
      for (const o of data) if (num(Number(o.price)) !== null && !into[keyOf(o)]) into[keyOf(o)] = { price: Math.max(Number(o.price), Number(o.original_price) || 0), currency: o.currency }; // indirimsiz liste fiyatı
    }
  };
  await Promise.all([ids.length ? get('store_id', ids, byAppid, o => o.store_id) : null, keys.length ? get('title_key', keys, byKey, o => o.title_key) : null]);
  return { byAppid, byKey };
}
function readLibrary(sec) {
  return [...sec.querySelectorAll('.steam-games .steam-row')].map(r => ({
    name: r.querySelector('strong')?.textContent.trim() || '',
    minutes: parseMinutes(r.querySelector(':scope > b')?.textContent),
    appid: appIdFromIcon(r.querySelector('img')?.getAttribute('src')),
  })).filter(r => r.name);
}
function libNode(v) {
  const max = v.top.length ? v.top[0].price : 1;
  const bars = v.top.map((g, i) => h('li', { style: { '--i': i } },
    h('span', { class: 'vz-lib-name' }, g.name),
    h('span', { class: 'vz-lib-bar', role: 'presentation' }, h('i', { style: { width: Math.max(4, Math.round(g.price / max * 100)) + '%', background: PALETTE[i % PALETTE.length] } })),
    h('b', null, money(g.price, v.currency)),
    h('small', null, g.minutes >= 30 ? `${money(g.price / (g.minutes / 60), v.currency)}/${T('sa', 'h')}` : g.minutes > 0 ? T('az oynandı', 'barely played') : T('oynanmadı', 'unplayed'))));
  return h('div', { class: 'vz-lib', 'data-vz': '' },
    h('div', { class: 'vz-lib-head' },
      h('div', null, h('span', { class: 'vz-saved-eyebrow' }, T('KÜTÜPHANE DEĞERİ', 'LIBRARY VALUE')), h('strong', null, money(v.total, v.currency)),
        h('small', null, T(`${v.count} oyunun normal Steam fiyatı`, `Regular Steam price of ${v.count} games`))),
      v.unplayedCount ? h('div', { class: 'vz-lib-unplayed' }, h('b', null, money(v.unplayedValue, v.currency)), h('small', null, T(`${v.unplayedCount} oynanmamış oyunda bekliyor`, `waiting in ${v.unplayedCount} unplayed ${v.unplayedCount === 1 ? 'game' : 'games'}`))) : null,
      v.best ? h('div', { class: 'vz-lib-best' }, h('b', null, `${money(v.best.perHour, v.currency)}/${T('sa', 'h')}`), h('small', null, T(`En iyi değer: ${v.best.name}`, `Best value: ${v.best.name}`))) : null),
    h('ul', { class: 'vz-lib-list' }, ...bars),
    h('p', { class: 'vz-note' },
      T('Listede görünen oyunlar üzerinden hesaplanır.', 'Based on the games shown in the list.'), ' ',
      v.unpriced ? T(`Fiyatı bulunamayan ${v.unpriced} oyun dahil değil. `, `${v.unpriced} ${v.unpriced === 1 ? 'game' : 'games'} without a price ${v.unpriced === 1 ? 'is' : 'are'} left out. `) : '',
      T(`Fiyatlar Steam'in normal (indirimsiz) mağaza fiyatıdır (${v.currency}); ödediğin tutarı göstermez.`, `Prices are regular (non-sale) Steam store prices (${v.currency}), not what you paid.`)));
}
let libSeq = 0;
function mountLibrary() {
  const sec = document.querySelector('.steam-library');
  const have = document.querySelector('.vz-lib, .vz-lib-wait');
  if (!sec || !sec.querySelector('.steam-games')) { have && have.remove(); return; }
  const items = readLibrary(sec);
  const sig = lang() + '|' + items.map(i => i.name + ':' + i.minutes).join(',');
  if (have && have.dataset.sig === sig) return;
  if (!items.length) { have && have.remove(); return; }
  const anchor = sec.querySelector('.steam-stats');
  if (!anchor) return;
  const wait = h('div', { class: 'vz-lib-wait', 'data-vz': '', 'data-sig': sig }, skeleton());
  have ? have.replaceWith(wait) : anchor.after(wait);
  const my = ++libSeq;
  loadOffers(items).then(off => {
    if (my !== libSeq || !wait.isConnected) return;
    const v = libraryValue(items, off);
    if (!v.count) { wait.remove(); return; }
    const node = libNode(v);
    node.dataset.sig = sig;
    wait.replaceWith(node);
  }).catch(() => { if (my === libSeq) wait.remove(); });
}

/* ---- yürütme ---- */
const MOUNTS = [mountWallet, mountDna, mountRings, mountDeals, mountFall, mountTimeline, mountLibrary];
let queued = false;
function tick() { queued = false; for (const fn of MOUNTS) { try { fn(); } catch (e) { console.warn('[visuals]', fn.name, e); } } }
function schedule() { if (!queued) { queued = true; requestAnimationFrame(tick); } }
const inside = n => { const el = n && (n.nodeType === 1 ? n : n.parentElement); return !!(el && el.closest && el.closest('[data-vz]')); };

export function start() {
  if (!BROWSER || window.__vz) return;
  window.__vz = true;
  new MutationObserver(list => { if (list.some(m => !inside(m.target))) schedule(); })
    .observe(document.body, { childList: true, subtree: true, characterData: true });
  new MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ['lang', 'data-ui'] });
  window.addEventListener('popstate', schedule);
  window.addEventListener('radar:lang', schedule);
  schedule();
}
if (BROWSER) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start(); }
