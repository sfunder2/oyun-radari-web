// Tasarım yenilikleri (17 Kasım 2026):
//  1 Fiyat grafiğinde tipik indirim dönemleri ve "en düşük" bandı (ChartMarks, grafiğin içinde çizilir)
//  2 Kart yoğunluğu: kompakt / rahat / büyük (html[data-density])
//  3 Oyun ayrıntısının kapak rengine boyanması (yalnız CSS, --lime zaten kapak rengidir)
//  4 Mobilde filtrelerin alttan açılan çekmecede açılması
//  5 İki oyun kıyasında radar grafiği (VersusRadar)
//  6 Fırsat paylaşım görseli (ShareButton, tarayıcıda canvas ile üretilir, sunucuya gitmez)
//  7 Kartta "dip ile normal fiyat arasında neredesin" şeridi (RangeStrip, yalnız ≥14 gün geçmişi olan PlayStation fiyatı)
//  8 Mikro etkileşimler: kayan sekme göstergesi, basma tepkisi
//  9 Keşfet modüllerine boyut (geniş / yarım / daralt) ve gizle / göster
// 10 Menüde yazı boyutu kaydırıcısı (%90–%130)
// Tercihler yalnız bu cihazda (localStorage) tutulur. Hareketler azaltılmış harekette kapanır.

// ---- Saf yardımcılar (Node'da sınanır) ----
const DAY = 864e5;

// Mağazaların her yıl aşağı yukarı aynı haftalarda yaptığı büyük indirimler. Kesin tarih değildir; grafikte "yaklaşık" diye anılır.
export const SALE_SEASONS = [
  { key: 'spring', tr: 'Bahar indirimi', en: 'Spring sale', from: [3, 13], to: [3, 20] },
  { key: 'dop', tr: 'Days of Play', en: 'Days of Play', from: [5, 28], to: [6, 11] },
  { key: 'summer', tr: 'Yaz indirimi', en: 'Summer sale', from: [6, 25], to: [7, 9] },
  { key: 'autumn', tr: 'Kara Cuma', en: 'Black Friday', from: [11, 20], to: [12, 2] },
  { key: 'winter', tr: 'Yılbaşı indirimi', en: 'Holiday sale', from: [12, 18], to: [1, 2] },
];

// [t0, t1] aralığına düşen dönemleri, aralığa kırpılmış başlangıç/bitişleriyle döndürür.
export function seasonsBetween(t0, t1, seasons = SALE_SEASONS) {
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return [];
  const out = [];
  const y0 = new Date(t0).getUTCFullYear() - 1, y1 = new Date(t1).getUTCFullYear();
  for (let y = y0; y <= y1; y++) {
    for (const s of seasons) {
      const from = Date.UTC(y, s.from[0] - 1, s.from[1]);
      const toYear = s.to[0] < s.from[0] ? y + 1 : y;
      const to = Date.UTC(toYear, s.to[0] - 1, s.to[1]) + DAY;
      if (to <= t0 || from >= t1) continue;
      out.push({ key: s.key, tr: s.tr, en: s.en, from: Math.max(from, t0), to: Math.min(to, t1), clipped: from < t0 || to > t1 });
    }
  }
  return out.sort((a, b) => a.from - b.from);
}

// Bugünden sonraki (ya da şu an süren) ilk tipik indirim dönemi.
export function nextSeason(today, seasons = SALE_SEASONS) {
  if (!Number.isFinite(today)) return null;
  const d0 = Math.floor(today / DAY) * DAY;
  const list = seasonsBetween(d0 - 40 * DAY, d0 + 400 * DAY, seasons).filter(s => s.to > d0);
  const s = list[0];
  if (!s) return null;
  const days = Math.max(0, Math.round((s.from - d0) / DAY));
  const en = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  const label = new Date(s.from).toLocaleDateString(en ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return { key: s.key, tr: s.tr, en: s.en, days, label };
}

// Şimdiki fiyat kayıtlı en düşüğün %0,5 yakınında mı?
export function atLowest(now, low) {
  return Number.isFinite(now) && Number.isFinite(low) && low > 0 && now <= low * 1.005;
}

// Fiyatın dip (0) ile normal fiyat (1) arasındaki yeri. Yeterli geçmiş yoksa null.
export function rangePos(item) {
  if (!item || item.platform !== 'playstation') return null;
  const price = Number(item.price), low = Number(item.lowestEver), base = Number(item.originalPrice);
  const days = Number(item.historyDays) || 0;
  if (days < 14 || !(price > 0) || !(low > 0)) return null;
  const top = Math.max(base > 0 ? base : 0, price);
  const bottom = Math.min(low, price);
  if (top <= bottom * 1.005) return null;
  return { pos: Math.min(1, Math.max(0, (price - bottom) / (top - bottom))), low: bottom, base: top, price };
}

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pctOff = g => {
  const p = num(g?.price), o = num(g?.originalPrice);
  return p !== null && o !== null && o > p && p >= 0 ? Math.round((1 - p / o) * 100) : p !== null ? 0 : null;
};

// İki oyunun radar eksenleri. Değer 0–100; iki oyunda da bilinmeyen eksen atılır.
export function versusAxes(a, b) {
  const axes = [];
  const add = (key, tr, en, va, vb) => {
    if (va === null && vb === null) return;
    axes.push({ key, tr, en, a: va, b: vb });
  };
  add('mc', 'Metacritic', 'Metacritic', num(a?.scores?.metacritic), num(b?.scores?.metacritic));
  add('oc', 'OpenCritic', 'OpenCritic', num(a?.scores?.opencritic), num(b?.scores?.opencritic));
  const pa = num(a?.price), pb = num(b?.price);
  if (pa !== null && pb !== null && (a.currency || 'TRY') === (b.currency || 'TRY')) {
    const min = Math.min(pa, pb);
    const v = p => (p <= 0 ? 100 : Math.round((Math.max(min, 0.01) / p) * 100));
    add('price', 'Fiyat avantajı', 'Price edge', v(pa), v(pb));
  }
  add('sale', 'İndirim', 'Discount', pctOff(a), pctOff(b));
  const ya = Number(String(a?.releaseDate || '').slice(0, 4)), yb = Number(String(b?.releaseDate || '').slice(0, 4));
  const fresh = y => (y > 1970 ? Math.max(0, Math.min(100, 100 - (new Date().getFullYear() - y) * 8)) : null);
  add('new', 'Yenilik', 'Freshness', fresh(ya), fresh(yb));
  return axes;
}

export function radarPoint(i, n, value, r, cx, cy) {
  const ang = -Math.PI / 2 + (Math.PI * 2 * i) / n;
  const d = (Math.max(0, Math.min(100, value || 0)) / 100) * r;
  return [cx + Math.cos(ang) * d, cy + Math.sin(ang) * d];
}

export const DENSITIES = ['compact', 'comfy', 'large'];
export function cleanDensity(v) { return DENSITIES.includes(v) ? v : 'comfy'; }
export function cleanScale(v) {
  const n = Math.round(Number(v) / 5) * 5;
  return Number.isFinite(n) ? Math.min(130, Math.max(90, n)) : 100;
}
export const WIDGET_SIZES = ['full', 'half', 'mini'];
export function cleanLayout(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!/^[a-z]{2,20}$/.test(k) || !v || typeof v !== 'object') continue;
    out[k] = { size: WIDGET_SIZES.includes(v.size) ? v.size : 'full', hidden: v.hidden === true };
  }
  return out;
}

// Paylaşım görselinde uzun adı satırlara böler (ölçüm fonksiyonu dışarıdan gelir).
export function wrapLines(text, maxWidth, measure, maxLines = 3) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (measure(next) <= maxWidth || !line) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && measure(last + '…') > maxWidth) last = last.slice(0, -1);
    kept[maxLines - 1] = last.replace(/\s+$/, '') + '…';
    return kept;
  }
  return lines;
}

export function money(value, currency = 'TRY', en = false) {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(en ? 'en-US' : 'tr-TR', { style: 'currency', currency: ['TRY', 'USD', 'EUR'].includes(currency) ? currency : 'TRY', maximumFractionDigits: value >= 100 ? 0 : 2 }).format(value);
}

// ---- Tarayıcı ortak ----
const BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined';
const root = BROWSER ? document.documentElement : null;
const reduceMq = BROWSER && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const motionOk = () => BROWSER && !(reduceMq && reduceMq.matches) && root.dataset.reduceMotion !== 'true';
const isEn = () => BROWSER && root.lang === 'en';
const T = (tr, en) => (isEn() ? en : tr);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

// ---- React bileşenleri ----
export function createDesign(React) {
  const h = React.createElement;

  // 1 — Grafik işaretleri: grafiğin <svg> içinde, çizgilerin arkasında çizilir.
  function ChartMarks({ x, y, t0, t1, low, now }) {
    const en = isEn();
    const seasons = seasonsBetween(t0, t1);
    const yLow = Number.isFinite(low) ? y(low) : null;
    const hot = atLowest(now, low);
    return h('g', { className: 'tz-marks' + (hot ? ' is-low' : ''), 'aria-hidden': 'true' },
      seasons.map((s, i) => {
        const x0 = x(s.from), x1 = x(s.to), w = Math.max(3, x1 - x0);
        return h('g', { key: s.key + i, className: 'tz-season tz-s-' + s.key },
          h('rect', { x: x0, y: 14, width: w, height: 188, rx: 3 }),
          w >= 30 ? h('text', { x: x0 + w / 2, y: 26, textAnchor: 'middle' }, en ? s.en : s.tr) : null);
      }),
      yLow !== null && h('g', { className: 'tz-lowband' },
        h('rect', { x: 56, y: yLow - 5, width: 532, height: 10, rx: 5 }),
        h('line', { x1: 56, x2: 588, y1: yLow, y2: yLow }),
        h('text', { x: 584, y: yLow - 9, textAnchor: 'end' }, hot ? (en ? 'Now at the lowest we have seen' : 'Şu an gördüğümüz en düşükte') : (en ? 'Lowest seen' : 'En düşük'))));
  }

  // 7 — Dip ile normal fiyat arasındaki yer.
  function RangeStrip({ item }) {
    const r = rangePos(item);
    if (!r) return null;
    const en = isEn(), cur = item.currency || 'TRY';
    const pct = Math.round(r.pos * 100);
    const tip = en
      ? `Lowest seen ${money(r.low, cur, true)} · normal ${money(r.base, cur, true)}. Now ${pct === 0 ? 'at the lowest' : pct + '% of the way up'}.`
      : `Gördüğümüz en düşük ${money(r.low, cur)} · normal ${money(r.base, cur)}. Şu an ${pct === 0 ? 'en düşükte' : 'aralığın %' + pct + ' yukarısında'}.`;
    const tone = r.pos <= 0.1 ? 'low' : r.pos <= 0.55 ? 'mid' : 'high';
    return h('span', { className: 'tz-range ' + tone, title: tip, role: 'img', 'aria-label': tip },
      h('small', null, en ? 'low' : 'dip'),
      h('i', null, h('u', { style: { left: `${Math.min(96, Math.max(4, pct))}%` } })),
      h('small', null, en ? 'normal' : 'normal'));
  }

  // 5 — İki oyun radarı.
  function VersusRadar({ a, b }) {
    if (!a || !b) return null;
    const axes = versusAxes(a, b);
    if (axes.length < 3) return null;
    const en = isEn(), n = axes.length, cx = 160, cy = 150, r = 104;
    const poly = side => axes.map((ax, i) => radarPoint(i, n, ax[side], r, cx, cy).map(v => v.toFixed(1)).join(',')).join(' ');
    const wins = side => axes.filter(ax => ax[side] !== null && (ax[side === 'a' ? 'b' : 'a'] === null || ax[side] > ax[side === 'a' ? 'b' : 'a']));
    const label = ax => (en ? ax.en : ax.tr);
    const cell = v => (v === null ? '—' : v);
    return h('div', { className: 'tz-versus' },
      h('svg', { viewBox: '-46 0 412 300', role: 'img', 'aria-label': en ? 'Radar comparison' : 'Radar karşılaştırması' },
        [0.25, 0.5, 0.75, 1].map(f => h('polygon', { key: f, className: 'tz-vgrid', points: axes.map((_, i) => radarPoint(i, n, f * 100, r, cx, cy).join(',')).join(' ') })),
        axes.map((ax, i) => {
          const [ex, ey] = radarPoint(i, n, 100, r, cx, cy);
          const [lx, ly] = radarPoint(i, n, 122, r, cx, cy);
          return h('g', { key: ax.key },
            h('line', { className: 'tz-vaxis', x1: cx, y1: cy, x2: ex, y2: ey }),
            h('text', { className: 'tz-vlabel', x: lx, y: ly + 4, textAnchor: Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end' }, label(ax)));
        }),
        h('polygon', { className: 'tz-vpoly a', points: poly('a') }),
        h('polygon', { className: 'tz-vpoly b', points: poly('b') })),
      h('div', { className: 'tz-vside' },
        [['a', a], ['b', b]].map(([side, g]) => h('div', { key: side, className: 'tz-vgame ' + side },
          h('b', null, g.name),
          h('ul', null, axes.map(ax => h('li', { key: ax.key, className: wins(side).includes(ax) ? 'win' : '' }, h('span', null, label(ax)), h('em', null, cell(ax[side]))))))),
        h('p', { className: 'phnote' }, en
          ? 'Every axis is 0–100. Price edge: the cheaper game is 100. Freshness drops 8 points a year. Unknown values count as 0 and show as —.'
          : 'Her eksen 0–100 arasıdır. Fiyat avantajında ucuz olan 100 sayılır. Yenilik her yıl 8 puan düşer. Bilinmeyen değer 0 çizilir ve — görünür.')));
  }

  // 6 — Paylaşım görseli.
  function ShareButton({ item }) {
    if (!item || !item.name) return null;
    const en = isEn();
    return h('button', {
      type: 'button', className: 'tz-sharebtn',
      onClick: e => openShare(item, e.currentTarget),
      title: en ? 'Make a share image for this deal' : 'Bu fırsat için paylaşım görseli hazırla',
    },
    h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
      h('circle', { cx: 18, cy: 5, r: 3 }), h('circle', { cx: 6, cy: 12, r: 3 }), h('circle', { cx: 18, cy: 19, r: 3 }),
      h('path', { d: 'm8.6 13.5 6.8 4M15.4 6.5l-6.8 4' })),
    en ? 'Share card' : 'Paylaşım kartı');
  }

  function ChartNote({ from, today }) {
    const en = isEn();
    const t0 = Date.parse(from), t1 = Date.parse(today) + DAY;
    const shown = seasonsBetween(t0, t1).length > 0;
    const next = nextSeason(Date.parse(today));
    const parts = [];
    if (shown) parts.push(en
      ? 'Shaded weeks are when stores usually hold their big sales each year (approximate, not this year’s exact dates).'
      : 'Gölgeli haftalar mağazaların her yıl genelde büyük indirim yaptığı dönemlerdir (yaklaşık; o yılın kesin tarihleri değildir).');
    parts.push(en ? 'The green dashed line is the lowest price in the chosen period.' : 'Yeşil kesikli çizgi seçili dönemin en düşük fiyatıdır.');
    return h('p', { className: 'phnote tz-chartnote' },
      next && h('span', { className: 'tz-next' + (next.days === 0 ? ' now' : '') },
        h('b', null, next.days === 0
          ? (en ? `Usually on now: ${next.en}` : `Genelde şu an: ${next.tr}`)
          : (en ? `Next big sale: ${next.en}` : `Sıradaki büyük indirim: ${next.tr}`)),
        next.days === 0 ? null : ' · ' + (en ? `usually around ${next.label}, in ${next.days} day${next.days === 1 ? '' : 's'}` : `genelde ${next.label} civarı, ${next.days} gün sonra`)),
      ' ', parts.join(' '));
  }

  return { ChartMarks, ChartNote, RangeStrip, VersusRadar, ShareButton };
}

// ---- 6: paylaşım görseli (canvas) ----
function loadImage(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    const done = v => { clearTimeout(timer); resolve(v); };
    const timer = setTimeout(() => done(null), 4000);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });
}
function accentOf(el) {
  const v = el && getComputedStyle(el.closest('.game-detail') || root).getPropertyValue('--lime').trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v : '#a7e25a';
}
async function drawShare(item, accent) {
  const en = isEn(), W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, '#0b1018'); grd.addColorStop(1, '#141b25');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.8, H * 0.15, 40, W * 0.8, H * 0.15, 900);
  glow.addColorStop(0, accent + '88'); glow.addColorStop(1, accent + '00');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const img = await loadImage(item.image);
  let tainted = false;
  if (img) {
    const bw = W - 160, bh = 560, ratio = Math.max(bw / img.width, bh / img.height);
    g.save();
    g.beginPath(); g.roundRect(80, 120, bw, bh, 36); g.clip();
    g.drawImage(img, 80 + (bw - img.width * ratio) / 2, 120 + (bh - img.height * ratio) / 2, img.width * ratio, img.height * ratio);
    g.restore();
    try { g.getImageData(0, 0, 1, 1); } catch { tainted = true; }
  }
  if (!img || tainted) {
    if (tainted) { g.fillStyle = '#0b1018'; g.fillRect(0, 0, W, H); g.fillStyle = glow; g.fillRect(0, 0, W, H); }
    g.fillStyle = accent + '33'; g.beginPath(); g.roundRect(80, 120, W - 160, 560, 36); g.fill();
    g.fillStyle = accent; g.font = '800 260px Manrope, system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText(String(item.name).trim().charAt(0).toUpperCase(), W / 2, 500); g.textAlign = 'left';
  }
  g.fillStyle = accent; g.fillRect(80, 740, 120, 10);
  g.fillStyle = '#f3f6fa'; g.font = '800 72px Manrope, system-ui, sans-serif';
  const lines = wrapLines(item.name, W - 160, t => g.measureText(t).width, 2);
  lines.forEach((l, i) => g.fillText(l, 80, 840 + i * 84));
  const y0 = 840 + lines.length * 84 + 40;
  const cur = item.currency || 'TRY', price = Number(item.price), orig = Number(item.originalPrice);
  if (Number.isFinite(price)) {
    g.font = '800 120px Manrope, system-ui, sans-serif'; g.fillStyle = accent;
    const ptxt = price === 0 ? (en ? 'Free' : 'Ücretsiz') : money(price, cur, en);
    g.fillText(ptxt, 80, y0 + 100);
    const pw = g.measureText(ptxt).width;
    if (orig > price) {
      g.font = '600 52px Manrope, system-ui, sans-serif'; g.fillStyle = '#93a0b2';
      const otxt = money(orig, cur, en), ox = 80 + pw + 36;
      g.fillText(otxt, ox, y0 + 96);
      g.fillRect(ox, y0 + 78, g.measureText(otxt).width, 5);
      const pct = Math.round((1 - price / orig) * 100);
      g.fillStyle = '#ff5d8f'; g.beginPath(); g.roundRect(W - 80 - 200, y0 + 10, 200, 100, 50); g.fill();
      g.fillStyle = '#fff'; g.font = '800 56px Manrope, system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText('-%' + pct, W - 80 - 100, y0 + 80); g.textAlign = 'left';
    }
  }
  const storeName = { playstation: 'PlayStation Store', steam: 'Steam', xbox: 'Xbox', switch: 'Nintendo eShop', epic: 'Epic Games', gog: 'GOG' }[item.platform] || '';
  g.font = '600 40px Manrope, system-ui, sans-serif'; g.fillStyle = '#c4cdd9';
  const date = new Date().toLocaleDateString(en ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  g.fillText([storeName, date].filter(Boolean).join(' · '), 80, y0 + 180);
  g.fillStyle = accent; g.beginPath(); g.arc(104, H - 92, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0b1018'; g.beginPath(); g.arc(104, H - 92, 10, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f3f6fa'; g.font = '800 44px Manrope, system-ui, sans-serif'; g.fillText('oyun radarı', 144, H - 76);
  g.fillStyle = '#93a0b2'; g.font = '500 32px Manrope, system-ui, sans-serif'; g.textAlign = 'right';
  g.fillText('sfunder2.github.io/oyun-radari-web', W - 80, H - 78); g.textAlign = 'left';
  return new Promise(res => c.toBlob(b => res({ blob: b, url: c.toDataURL('image/png') }), 'image/png'));
}
let shareOpen = null;
async function openShare(item, from) {
  if (shareOpen) shareOpen.remove();
  const en = isEn();
  const wrap = document.createElement('div');
  wrap.className = 'tz-share';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', en ? 'Share card' : 'Paylaşım kartı');
  wrap.innerHTML = `<div class="tz-share-card"><p class="tz-share-wait">${en ? 'Preparing the image…' : 'Görsel hazırlanıyor…'}</p></div>`;
  shareOpen = wrap;
  const close = () => { wrap.remove(); if (shareOpen === wrap) shareOpen = null; document.removeEventListener('keydown', onKey, true); from && from.focus && from.focus(); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
  document.body.appendChild(wrap);
  const { blob, url } = await drawShare(item, accentOf(from));
  if (!wrap.isConnected) return;
  const file = blob ? new File([blob], 'oyun-radari-' + String(item.name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '.png', { type: 'image/png' }) : null;
  const canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
  const card = wrap.firstChild;
  card.innerHTML = '';
  const img = document.createElement('img');
  img.src = url; img.alt = (en ? 'Share image: ' : 'Paylaşım görseli: ') + item.name;
  const row = document.createElement('div');
  row.className = 'tz-share-actions';
  const mk = (label, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; b.addEventListener('click', fn); row.appendChild(b); return b; };
  if (canShare) mk(en ? 'Share' : 'Paylaş', 'primary', () => navigator.share({ files: [file], title: item.name }).catch(() => {}));
  const dl = mk(en ? 'Download' : 'İndir', canShare ? '' : 'primary', () => {
    const a = document.createElement('a'); a.href = url; a.download = file ? file.name : 'oyun-radari.png'; document.body.appendChild(a); a.click(); a.remove();
  });
  mk(en ? 'Close' : 'Kapat', 'ghost', close);
  const note = document.createElement('p');
  note.className = 'tz-share-note';
  note.textContent = en ? 'Made on your device from the price shown now. Nothing is uploaded.' : 'Görsel cihazında, şu an görünen fiyattan üretildi. Hiçbir yere yüklenmez.';
  card.append(img, row, note);
  (canShare ? row.firstChild : dl).focus();
}

// ---- DOM katmanı ----
// 2 + 10: yoğunluk ve yazı boyutu
function applyPrefs() {
  root.dataset.density = cleanDensity(store.get('radar-density'));
  const s = cleanScale(store.get('radar-text-scale') ?? 100);
  if (s === 100) { delete root.dataset.textScale; root.style.removeProperty('--tz-scale'); }
  else { root.dataset.textScale = String(s); root.style.setProperty('--tz-scale', String(s / 100)); }
}
const DENS_LABEL = { compact: ['Kompakt', 'Compact'], comfy: ['Rahat', 'Comfy'], large: ['Büyük', 'Large'] };
const DENS_ICON = {
  compact: '<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="10" y="3" width="5" height="5" rx="1"/><rect x="17" y="3" width="4" height="5" rx="1"/><rect x="3" y="10" width="5" height="5" rx="1"/><rect x="10" y="10" width="5" height="5" rx="1"/><rect x="17" y="10" width="4" height="5" rx="1"/><rect x="3" y="17" width="5" height="4" rx="1"/><rect x="10" y="17" width="5" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/>',
  comfy: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  large: '<rect x="3" y="3" width="18" height="11" rx="2"/><rect x="3" y="16" width="18" height="5" rx="1.5"/>',
};
function setDensity(v) {
  store.set('radar-density', cleanDensity(v));
  applyPrefs();
  paintDensity();
}
function densityGroup(withText) {
  const el = document.createElement('div');
  el.className = 'tz-density' + (withText ? ' with-text' : '');
  el.setAttribute('role', 'group');
  el.setAttribute('translate', 'no');
  for (const d of DENSITIES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.d = d;
    b.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${DENS_ICON[d]}</svg><span></span>`;
    b.addEventListener('click', () => setDensity(d));
    el.appendChild(b);
  }
  return el;
}
function paintDensity() {
  const cur = root.dataset.density || 'comfy', en = isEn();
  document.querySelectorAll('.tz-density').forEach(g => {
    g.setAttribute('aria-label', en ? 'Card density' : 'Kart yoğunluğu');
    for (const b of g.querySelectorAll(':scope > button[data-d]')) {
      const [tr, e] = DENS_LABEL[b.dataset.d];
      b.setAttribute('aria-pressed', String(b.dataset.d === cur));
      b.title = (en ? 'Density: ' : 'Yoğunluk: ') + (en ? e : tr);
      b.querySelector('span').textContent = en ? e : tr;
    }
  });
}
function placeDensity() {
  document.querySelectorAll('.libtools').forEach(lt => {
    if (lt.querySelector(':scope > .tz-density')) return;
    const g = densityGroup(false);
    const actions = lt.querySelector(':scope > .libactions');
    lt.insertBefore(g, actions || null);
    paintDensity();
  });
}

// 10 + 2: menüde "Görünüm" bölümü
function placeMenu() {
  const panel = document.querySelector('.menu-panel');
  if (!panel || panel.querySelector('.tz-menu-view')) return;
  const en = isEn();
  const sec = document.createElement('section');
  sec.className = 'tz-menu-view';
  const s = cleanScale(store.get('radar-text-scale') ?? 100);
  sec.innerHTML = `<h3>${en ? 'Display' : 'Görünüm'}</h3>
<label class="tz-scale"><span>${en ? 'Text size' : 'Yazı boyutu'} <output>%${s}</output></span>
<span class="tz-scale-row"><small aria-hidden="true">A</small><input type="range" min="90" max="130" step="5" value="${s}"><b aria-hidden="true">A</b><button type="button" class="tz-scale-reset">${en ? 'Reset' : 'Sıfırla'}</button></span></label>
<div class="tz-menu-dens"><span>${en ? 'Card density' : 'Kart yoğunluğu'}</span></div>`;
  const input = sec.querySelector('input'), out = sec.querySelector('output');
  input.setAttribute('aria-label', en ? 'Text size' : 'Yazı boyutu');
  const set = v => { const c = cleanScale(v); store.set('radar-text-scale', String(c)); out.textContent = '%' + c; input.value = c; applyPrefs(); };
  input.addEventListener('input', () => set(input.value));
  sec.querySelector('.tz-scale-reset').addEventListener('click', () => set(100));
  sec.querySelector('.tz-menu-dens').appendChild(densityGroup(true));
  const extra = panel.querySelector(':scope > .menu-extra');
  panel.insertBefore(sec, extra || null);
  paintDensity();
}

// 4: mobil filtre çekmecesi
const narrowMq = BROWSER && window.matchMedia ? window.matchMedia('(max-width: 700px)') : null;
let sheetBackdrop = null;
function sheetHead(details) {
  const grid = details.querySelector(':scope > .filtergrid');
  if (!grid || grid.querySelector(':scope > .tz-sheet-head')) return;
  const en = isEn();
  const head = document.createElement('div');
  head.className = 'tz-sheet-head';
  head.innerHTML = `<i class="tz-grip" aria-hidden="true"></i><b>${en ? 'Filters' : 'Filtreler'}</b><button type="button">${en ? 'Done' : 'Bitti'}</button>`;
  head.querySelector('button').addEventListener('click', () => { details.open = false; });
  grid.prepend(head);
  // Tutamaçtan aşağı sürükleyince kapanır.
  let y0 = null, dy = 0;
  head.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; dy = 0; grid.classList.add('tz-dragging'); }, { passive: true });
  head.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    grid.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  const end = () => {
    if (y0 === null) return;
    grid.classList.remove('tz-dragging');
    grid.style.transform = '';
    if (dy > 90) details.open = false;
    y0 = null;
  };
  head.addEventListener('touchend', end);
  head.addEventListener('touchcancel', end);
}
function syncSheet() {
  const open = narrowMq && narrowMq.matches ? document.querySelector('.libtools .filterpanel[open]') : null;
  root.classList.toggle('tz-sheet-open', !!open);
  if (open) {
    sheetHead(open);
    if (!sheetBackdrop) {
      sheetBackdrop = document.createElement('div');
      sheetBackdrop.className = 'tz-sheet-backdrop';
      sheetBackdrop.addEventListener('click', () => document.querySelectorAll('.libtools .filterpanel[open]').forEach(d => { d.open = false; }));
    }
    if (!sheetBackdrop.isConnected) document.body.appendChild(sheetBackdrop);
  } else if (sheetBackdrop) sheetBackdrop.remove();
}
function onToggle(e) {
  const d = e.target;
  if (d && d.matches && d.matches('.libtools .filterpanel')) syncSheet();
}
function onSheetKey(e) {
  if (e.key === 'Escape' && root.classList.contains('tz-sheet-open')) {
    const d = document.querySelector('.libtools .filterpanel[open]');
    if (d) { d.open = false; d.querySelector('summary')?.focus(); }
  }
}

// 8: kayan sekme göstergesi
const INK_SEL = 'header .topbar > nav, .bottom-nav, .release-tabs, .phrange, .tz-density';
const ACTIVE_SEL = ':scope > .active, :scope > [aria-pressed="true"], :scope > .on, :scope > [aria-current="page"]';
function paintInk(nav) {
  let ink = nav.querySelector(':scope > .tz-ink');
  const act = nav.querySelector(ACTIVE_SEL);
  if (!act || act.offsetParent === null) { if (ink) ink.style.opacity = '0'; return; }
  if (!ink) {
    ink = document.createElement('i');
    ink.className = 'tz-ink';
    ink.setAttribute('aria-hidden', 'true');
    nav.appendChild(ink);
    nav.classList.add('tz-has-ink');
    ink.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => { ink.style.transition = ''; }));
  }
  ink.style.opacity = '1';
  ink.style.width = act.offsetWidth + 'px';
  ink.style.height = act.offsetHeight + 'px';
  ink.style.transform = `translate(${act.offsetLeft}px, ${act.offsetTop}px)`;
}
function paintInks() {
  if (!motionOk()) { document.querySelectorAll('.tz-ink').forEach(i => i.remove()); document.querySelectorAll('.tz-has-ink').forEach(n => n.classList.remove('tz-has-ink')); return; }
  document.querySelectorAll(INK_SEL).forEach(paintInk);
}

// 9: Keşfet modül düzeni
const WIDGET_NAME = { spotlight: ['Günün oyunu', 'Game of the day'], quiz: ['Ne oynasam?', 'What to play?'], collections: ['Koleksiyonlar', 'Collections'], community: ['Topluluk', 'Community'] };
const SIZE_LABEL = { full: ['Geniş', 'Wide'], half: ['Yarım', 'Half'], mini: ['Daraltılmış', 'Collapsed'] };
// Yarım genişlik yalnız geniş ekranda anlamlıdır; dar ekranda geniş sayılır ve döngüden çıkar.
const halfMq = BROWSER && window.matchMedia ? window.matchMedia('(min-width: 901px)') : null;
const effSize = s => (s === 'half' && halfMq && !halfMq.matches ? 'full' : s);
const nextSize = s => {
  const list = halfMq && !halfMq.matches ? ['full', 'mini'] : WIDGET_SIZES;
  return list[(list.indexOf(s) + 1) % list.length];
};
function layout() { try { return cleanLayout(JSON.parse(store.get('radar-widget-layout') || '{}')); } catch { return {}; } }
function saveLayout(l) { store.set('radar-widget-layout', JSON.stringify(cleanLayout(l))); }
function widgetKey(sec) { const m = /\bwidget-([a-z]+)\b/.exec(sec.className); return m ? m[1] : ''; }
function paintWidgets() {
  const dash = document.querySelector('.discovery-dashboard');
  if (!dash) return;
  const l = layout(), en = isEn();
  const hidden = [];
  dash.querySelectorAll(':scope > .dashboard-widget').forEach(sec => {
    const k = widgetKey(sec);
    if (!k) return;
    const st = l[k] || { size: 'full', hidden: false };
    sec.dataset.tzSize = st.size;
    sec.toggleAttribute('data-tz-hidden', st.hidden);
    if (st.hidden) hidden.push(k);
    const name = (WIDGET_NAME[k] || [k, k])[en ? 1 : 0];
    sec.dataset.tzName = name;
    const ctl = sec.querySelector(':scope > .widget-controls');
    if (!ctl) return;
    let sizeBtn = ctl.querySelector('.tz-wsize'), hideBtn = ctl.querySelector('.tz-whide');
    if (!sizeBtn) {
      sizeBtn = document.createElement('button');
      sizeBtn.type = 'button'; sizeBtn.className = 'tz-wsize';
      sizeBtn.addEventListener('click', () => {
        const all = layout();
        all[k] = { ...(all[k] || {}), size: nextSize(effSize((all[k] && all[k].size) || 'full')), hidden: false };
        saveLayout(all); paintWidgets();
      });
      hideBtn = document.createElement('button');
      hideBtn.type = 'button'; hideBtn.className = 'tz-whide';
      hideBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2.5 12 2.5 12S6 19 12 19a9.7 9.7 0 0 0 5.4-1.6"/></svg>';
      hideBtn.addEventListener('click', () => {
        const all = layout();
        all[k] = { ...(all[k] || { size: 'full' }), hidden: true };
        saveLayout(all); paintWidgets();
      });
      ctl.append(sizeBtn, hideBtn);
    }
    const size = effSize(st.size), next = nextSize(size);
    sizeBtn.textContent = SIZE_LABEL[size][en ? 1 : 0];
    sizeBtn.setAttribute('aria-label', `${name}: ${en ? 'size' : 'boyut'} ${SIZE_LABEL[size][en ? 1 : 0]}. ${en ? 'Switch to' : 'Değiştir:'} ${SIZE_LABEL[next][en ? 1 : 0]}`);
    hideBtn.setAttribute('aria-label', en ? `Hide ${name}` : `${name} modülünü gizle`);
    hideBtn.title = en ? 'Hide' : 'Gizle';
  });
  let bar = dash.querySelector(':scope > .tz-hiddenbar');
  if (!hidden.length) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'tz-hiddenbar';
    const head = dash.querySelector(':scope > .dashboard-heading');
    dash.insertBefore(bar, head ? head.nextSibling : dash.firstChild);
  }
  const sig = hidden.join(',') + (en ? ':en' : ':tr');
  if (bar.dataset.sig === sig) return;
  bar.dataset.sig = sig;
  bar.innerHTML = '';
  const lab = document.createElement('span');
  lab.textContent = en ? 'Hidden:' : 'Gizli modüller:';
  bar.appendChild(lab);
  for (const k of hidden) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = (WIDGET_NAME[k] || [k, k])[en ? 1 : 0] + ' · ' + (en ? 'show' : 'göster');
    b.addEventListener('click', () => { const all = layout(); all[k] = { ...(all[k] || { size: 'full' }), hidden: false }; saveLayout(all); paintWidgets(); });
    bar.appendChild(b);
  }
}

// Gözlemci
let queued = false;
function tick() {
  queued = false;
  placeDensity();
  placeMenu();
  paintWidgets();
  syncSheet();
  paintInks();
}
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(tick);
}

export function start() {
  if (!BROWSER || start.done) return;
  start.done = true;
  applyPrefs();
  const boot = () => {
    tick();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed', 'aria-current', 'open'] });
    new MutationObserver(() => { paintDensity(); document.querySelectorAll('.tz-menu-view').forEach(s => s.remove()); document.querySelectorAll('.tz-sheet-head').forEach(s => s.remove()); document.querySelectorAll('.tz-hiddenbar').forEach(s => { delete s.dataset.sig; }); schedule(); })
      .observe(root, { attributes: true, attributeFilter: ['lang'] });
    document.addEventListener('toggle', onToggle, true);
    document.addEventListener('keydown', onSheetKey);
    window.addEventListener('resize', schedule, { passive: true });
    if (narrowMq) (narrowMq.addEventListener ? narrowMq.addEventListener('change', schedule) : narrowMq.addListener(schedule));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot, { once: true });
}
start();
