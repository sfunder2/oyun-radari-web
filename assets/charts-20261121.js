// Fiyat grafikleri ve karşılaştırmalar (21 Kasım 2026):
//  1 Fiyat geçmişi çizgisi soldan sağa çizilir, en düşük nokta parlar (CSS, bkz. charts-20261121.css)
//  2 "Tüm zamanların en düşüğü" rozeti (ayrıntıda ve kartta)
//  3 Mağaza fiyat çubukları: satırın altında büyüyerek açılır
//  4 Mağazalar arası fiyat yarışı: en ucuz mağaza bitişe varır, diğerleri ne kadar geride kaldığını gösterir
//  5 Fiyat tahmini güven bandı: geçmiş indirimlere dayanan gölgeli aralık (söz değil, geçmişin özeti)
// (Sıcaklık göstergesinin ibreli kadranı heat-20261031.js içindedir.)
// Hareketler azaltılmış harekette kapanır; metinler TR/EN; renkler klasik ve sade temada CSS değişkenlerinden gelir.
import { seasonsBetween, nextSeason, atLowest, money } from './tasarim-20261117.js';

const DAY = 864e5;

// ---- Saf yardımcılar (Node'da sınanır) ----
const median = list => {
  const s = [...list].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Geçmiş satırı: [tarih, fiyat, indirimsiz fiyat, günün en düşüğü?]
function cleanRows(hist, todayMs) {
  if (!Array.isArray(hist)) return [];
  return hist
    .map(r => ({ t: Date.parse(r && r[0]), p: Number(r && r[1]), base: Number(r && r[2]), low: Number(r && r[3]) }))
    .filter(r => Number.isFinite(r.t) && Number.isFinite(r.p) && r.p >= 0 && r.t <= todayMs + DAY)
    .map(r => ({ t: r.t, p: r.p, base: Number.isFinite(r.base) && r.base > 0 ? r.base : r.p, low: Number.isFinite(r.low) && r.low >= 0 ? r.low : r.p }))
    .sort((a, b) => a.t - b.t);
}

// "Tüm zamanların en düşüğü": şimdiki fiyat kayıtlı en düşüğe eşit, kayıt en az 14 günlük ve fiyat daha önce bundan yüksekti.
export function allTimeLow(hist, todayStr, now) {
  const today = Date.parse(todayStr);
  const rows = cleanRows(hist, today);
  if (!Number.isFinite(today) || !Number.isFinite(now) || now <= 0 || rows.length < 2) return null;
  const days = Math.round((today - rows[0].t) / DAY);
  if (days < 14) return null;
  const low = Math.min(now, ...rows.map(r => r.low));
  if (!atLowest(now, low)) return null;
  const high = Math.max(...rows.map(r => Math.max(r.p, r.base)));
  if (high < now * 1.02) return null;
  // Aynı fiyatı daha önce de gördüysek "ilk kez" demeyiz.
  const before = rows.filter(r => r.t < today - DAY && r.low <= now * 1.005).length;
  return { days, high, low, offPct: Math.round((1 - now / high) * 100), repeat: before > 0 };
}

// Çubuk uzunluğu: en pahalı mağaza %100; en ucuz bile en az %14 görünür.
export function barPct(v, all) {
  const vals = (all || []).filter(x => Number.isFinite(x) && x > 0);
  if (!Number.isFinite(v) || v <= 0 || !vals.length) return null;
  return Math.max(14, Math.round((v / Math.max(...vals)) * 100));
}

// Yarış: en ucuz mağaza bitişte (1), diğerleri en ucuz / kendi fiyatı oranında geride.
export function raceRows(rows) {
  const ok = (rows || []).filter(r => r && !r.skip && Number.isFinite(r.price) && r.price > 0);
  if (ok.length < 2) return [];
  const min = Math.min(...ok.map(r => r.price));
  return ok
    .map(r => ({ ...r, pos: min / r.price, gap: r.price - min, pct: Math.round((r.price / min - 1) * 100) }))
    .sort((a, b) => a.price - b.price)
    .map((r, rank) => ({ ...r, rank, winner: r.price === min }));
}

export function confidenceOf(episodes, spanDays) {
  if (episodes >= 4 && spanDays >= 180) return 'high';
  if (episodes >= 2 && spanDays >= 60) return 'mid';
  return 'low';
}

// Geçmiş indirimlerden gölgeli aralık. Tahmin değildir; "bu oyun geçmişte bu aralıkta dolaştı" özetidir.
export function forecastBand(hist, todayStr, horizon = 90) {
  const today = Date.parse(todayStr);
  const rows = cleanRows(hist, today);
  if (!Number.isFinite(today) || rows.length < 2) return null;
  const spanDays = Math.round((today - rows[0].t) / DAY);
  if (spanDays < 30) return { state: 'collecting', spanDays };
  const win = rows.filter(r => r.t >= today - 365 * DAY);
  const cur = rows[rows.length - 1].p;
  const regular = Math.max(median(win.map(r => r.base)), cur);
  const episodes = [];
  let open = null;
  for (const r of win) {
    if (r.low < regular * 0.95) open = open === null ? r.low : Math.min(open, r.low);
    else if (open !== null) { episodes.push(open); open = null; }
  }
  if (open !== null) episodes.push(open);
  if (!episodes.length) return { state: 'nosale', spanDays, cur, regular };
  const typical = median(episodes);
  const best = Math.min(...episodes, cur);
  const winDays = Math.max(30, Math.min(365, spanDays));
  return {
    state: 'ok', spanDays, cur, regular, typical, best, horizon,
    episodes: episodes.length,
    perYear: Math.round((episodes.length * 365 / winDays) * 10) / 10,
    level: confidenceOf(episodes.length, spanDays),
  };
}

// f (0–1) uzaklıktaki aralık: bugün tek nokta, uzaklaştıkça [en iyi indirim, normal fiyat] aralığına açılır.
export function bandAt(fc, f) {
  const w = Math.sqrt(Math.max(0, Math.min(1, f)));
  return {
    hi: fc.cur + (Math.max(fc.regular, fc.cur) - fc.cur) * w,
    lo: fc.cur - (fc.cur - Math.min(fc.best, fc.cur)) * w,
  };
}

// ---- Tarayıcı ortak ----
const BROWSER = typeof document !== 'undefined';
const root = BROWSER ? document.documentElement : null;
const isEn = () => BROWSER && root.lang === 'en';
const T = (tr, en) => (isEn() ? en : tr);
const LEVEL = { low: ['düşük', 'low'], mid: ['orta', 'medium'], high: ['yüksek', 'high'] };

// ---- React bileşenleri ----
export function createCharts(React) {
  const h = React.createElement;

  const Trophy = () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
    h('path', { d: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z' }), h('path', { d: 'M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3' }));

  // 2 — Kartta kısa rozet
  function AtlChip() {
    return h('span', { className: 'pbadge tz-atl', title: T('Radarın kayıtlarındaki en düşük fiyat', 'Lowest price in the radar’s records') },
      h(Trophy), T('Tüm zamanların en düşüğü', 'All-time low'));
  }

  // 2 — Ayrıntıda büyük rozet
  function AtlBadge({ hist, today, now, currency }) {
    const a = allTimeLow(hist, today, now);
    if (!a) return null;
    const en = isEn(), cur = currency || 'TRY';
    return h('div', { className: 'tz-atlbadge', role: 'status' },
      h('span', { className: 'tz-atl-ico' }, h(Trophy)),
      h('div', null,
        h('strong', null, T('Tüm zamanların en düşüğü', 'All-time low')),
        h('p', null, en
          ? `${money(now, cur, true)} is the lowest we have recorded in ${a.days} days${a.offPct >= 5 ? `, ${a.offPct}% below the highest price seen` : ''}.${a.repeat ? ' We saw this price before too.' : ''} Based only on prices this radar saw.`
          : `${money(now, cur)}, ${a.days} günlük kaydımızdaki en düşük fiyat${a.offPct >= 5 ? `; görülen en yüksek fiyatın %${a.offPct} altında` : ''}.${a.repeat ? ' Bu fiyatı daha önce de görmüştük.' : ''} Yalnızca bu radarın gördüğü fiyatlara göre.`)));
  }

  // 3 — Mağaza satırının altında büyüyen çubuk
  function StoreBar({ v, all, i, best }) {
    const pct = barPct(v, all);
    if (pct === null) return null;
    return h('i', {
      className: 'tz-bar' + (best ? ' best' : ''), 'aria-hidden': 'true',
      style: { '--w': (pct / 100).toFixed(2), '--i': Math.min(i || 0, 12) },
    });
  }

  // 4 — Fiyat yarışı
  function StoreRace({ rows }) {
    const [run, setRun] = React.useState(0);
    const list = raceRows(rows);
    if (list.length < 2) return null;
    const en = isEn();
    const cheapest = list[0];
    const label = r => r.label || r.key;
    const summary = en
      ? `Price race: ${label(cheapest)} is cheapest. ${list.slice(1).map(r => `${label(r)} costs ${money(r.gap, 'TRY', true)} more`).join(', ')}.`
      : `Fiyat yarışı: en ucuz ${label(cheapest)}. ${list.slice(1).map(r => `${label(r)} ${money(r.gap)} daha pahalı`).join(', ')}.`;
    return h('section', { className: 'tz-race', 'aria-label': T('Mağazalar arası fiyat yarışı', 'Price race between stores') },
      h('div', { className: 'tz-race-head' },
        h('h4', null, T('Fiyat yarışı', 'Price race')),
        h('button', { type: 'button', onClick: () => setRun(n => n + 1), 'aria-label': T('Yarışı yeniden oynat', 'Replay the race') }, T('Tekrar oynat', 'Replay'))),
      h('p', { className: 'sr-only tz-sr', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, summary),
      h('ol', { className: 'tz-lanes', key: run, 'aria-hidden': 'true' },
        list.map(r => h('li', { key: r.key, className: 'tz-lane' + (r.winner ? ' win' : ''), style: { '--p': r.pos.toFixed(3), '--r': r.rank } },
          h('span', { className: 'tz-lane-name' }, h('i', { className: 'dot ' + r.key }), label(r)),
          h('span', { className: 'tz-track' },
            h('b', { className: 'tz-runner' }, r.winner ? h(Trophy) : null)),
          h('span', { className: 'tz-lane-end' }, r.winner
            ? T('En ucuz', 'Cheapest')
            : `+${money(r.gap, 'TRY', en)}`)))),
      h('p', { className: 'phnote' }, T(
        'Bitişe ne kadar yakınsa o kadar ucuz: en ucuz mağaza bitişte, diğerleri fiyat farkı oranında geride. Çubuk uzunluğu fiyatla orantılıdır; kısa çubuk ucuz demektir. Dolar fiyatları güncel kurla TL’ye çevrilir.',
        'The closer to the finish line, the cheaper: the cheapest store reaches it and the others fall behind in proportion to the price gap. Bar length follows the price, so a short bar is cheap. Dollar prices are converted to TRY at the current rate.')));
  }

  // 5 — Güven bandı
  function Forecast({ hist, today, currency }) {
    const fc = forecastBand(hist, today);
    if (!fc) return null;
    const en = isEn(), cur = currency || 'TRY';
    const title = h('h4', null, T('Önümüzdeki 90 gün', 'The next 90 days'));
    if (fc.state === 'collecting') {
      return h('div', { className: 'tz-forecast tz-fc-empty' }, title,
        h('p', { className: 'phnote' }, T(
          `Fiyatı ${fc.spanDays} gündür izliyoruz. Gölgeli aralık için en az 30 günlük kayıt gerekiyor.`,
          `We have tracked this price for ${fc.spanDays} days. The shaded range needs at least 30 days of records.`)));
    }
    if (fc.state === 'nosale') {
      return h('div', { className: 'tz-forecast tz-fc-empty' }, title,
        h('p', { className: 'phnote' }, T(
          `Kayıtlı ${fc.spanDays} günde bu oyun indirime girmedi; bir aralık çizecek kadar veri yok.`,
          `This game has not gone on sale in the ${fc.spanDays} days we recorded, so there is not enough to draw a range.`)));
    }
    const X0 = 56, XT = 236, X1 = 588, Y0 = 16, Y1 = 142;
    const pastDays = 45, H = fc.horizon;
    const todayMs = Date.parse(today);
    const rows = cleanRows(hist, todayMs).filter(r => r.t >= todayMs - pastDays * DAY);
    const lowV = Math.min(fc.best, fc.cur, ...rows.map(r => r.p)) * 0.97;
    const highV = Math.max(fc.regular, fc.cur, ...rows.map(r => r.p)) * 1.04;
    const y = v => Y0 + (1 - (v - lowV) / (highV - lowV || 1)) * (Y1 - Y0);
    const xPast = t => X0 + ((t - (todayMs - pastDays * DAY)) / (pastDays * DAY)) * (XT - X0);
    const xFut = f => XT + f * (X1 - XT);
    const steps = Array.from({ length: 19 }, (_, i) => i / 18);
    const up = steps.map(f => `${xFut(f).toFixed(1)},${y(bandAt(fc, f).hi).toFixed(1)}`);
    const dn = steps.slice().reverse().map(f => `${xFut(f).toFixed(1)},${y(bandAt(fc, f).lo).toFixed(1)}`);
    const pastD = rows.length
      ? rows.map((r, i) => (i ? `L${xPast(r.t).toFixed(1)} ${y(rows[i - 1].p).toFixed(1)} L${xPast(r.t).toFixed(1)} ${y(r.p).toFixed(1)}` : `M${xPast(Math.max(r.t, todayMs - pastDays * DAY)).toFixed(1)} ${y(r.p).toFixed(1)}`)).join(' ') + ` L${XT} ${y(rows[rows.length - 1].p).toFixed(1)}`
      : `M${X0} ${y(fc.cur).toFixed(1)} L${XT} ${y(fc.cur).toFixed(1)}`;
    const seasons = seasonsBetween(todayMs, todayMs + H * DAY);
    const fx = t => XT + ((t - todayMs) / (H * DAY)) * (X1 - XT);
    const next = nextSeason(todayMs);
    const lvl = LEVEL[fc.level][en ? 1 : 0];
    const mid = (a, b) => (a + b) / 2;
    const label = (v, cls, dy = 4) => h('text', { x: 50, y: y(v) + dy, textAnchor: 'end', className: 'phaxis ' + (cls || '') }, money(v, cur, en));
    const alt = en
      ? `Shaded range for the next ${H} days: from about ${money(fc.best, cur, true)} up to ${money(fc.regular, cur, true)}. Confidence ${lvl}.`
      : `Önümüzdeki ${H} gün için gölgeli aralık: yaklaşık ${money(fc.best, cur)} ile ${money(fc.regular, cur)} arası. Güven ${lvl}.`;
    return h('div', { className: 'tz-forecast tz-conf-' + fc.level },
      h('div', { className: 'tz-fc-head' }, title,
        h('span', { className: 'tz-conf', title: T('Güven; geçmişteki indirim sayısına ve kayıt süresine bağlıdır', 'Confidence depends on the number of past sales and the length of the record') },
          h('i', { className: 'tz-conf-dots', 'aria-hidden': 'true' }, [0, 1, 2].map(i => h('u', { key: i, className: i <= ['low', 'mid', 'high'].indexOf(fc.level) ? 'on' : '' }))),
          T('Güven: ', 'Confidence: '), h('b', null, lvl))),
      h('svg', { className: 'phchart tz-fc', viewBox: '0 0 600 172', role: 'img', 'aria-label': alt },
        [fc.regular, mid(fc.regular, fc.best), fc.best].map((v, i) => h('line', { key: i, className: 'phgrid', x1: X0, x2: X1, y1: y(v), y2: y(v) })),
        label(fc.regular), label(fc.best),
        seasons.map((s, i) => h('rect', { key: s.key + i, className: 'tz-fc-season', x: fx(s.from), y: Y0, width: Math.max(3, fx(s.to) - fx(s.from)), height: Y1 - Y0, rx: 3 })),
        h('line', { className: 'tz-fc-reg', x1: XT, x2: X1, y1: y(fc.regular), y2: y(fc.regular) }),
        h('line', { className: 'tz-fc-typ', x1: XT, x2: X1, y1: y(fc.typical), y2: y(fc.typical) }),
        h('text', { className: 'tz-fc-tag', x: X1, y: y(fc.typical) - 5, textAnchor: 'end' }, T('Tipik indirim fiyatı ', 'Typical sale price ') + money(fc.typical, cur, en)),
        h('polygon', { className: 'tz-fc-band', points: up.concat(dn).join(' ') }),
        h('path', { className: 'tz-fc-now-line', d: `M${XT} ${y(fc.cur).toFixed(1)} L${X1} ${y(fc.cur).toFixed(1)}` }),
        h('path', { className: 'tz-fc-past', d: pastD }),
        h('line', { className: 'tz-fc-today', x1: XT, x2: XT, y1: Y0 - 4, y2: Y1 + 4 }),
        h('circle', { className: 'phnow', cx: XT, cy: y(fc.cur), r: 5 }),
        h('text', { className: 'phaxis', x: XT, y: Y1 + 22, textAnchor: 'middle' }, T('bugün', 'today')),
        h('text', { className: 'phaxis', x: X0, y: Y1 + 22 }, T(`${pastDays} gün önce`, `${pastDays} days ago`)),
        h('text', { className: 'phaxis', x: X1, y: Y1 + 22, textAnchor: 'end' }, T(`${H} gün sonra`, `in ${H} days`))),
      h('p', { className: 'phnote tz-fc-note' },
        next && h('b', null, next.days === 0
          ? T(`Genelde indirim dönemi: ${next.tr}. `, `Usually a sale period: ${next.en}. `)
          : T(`Sıradaki büyük indirim: ${next.tr} (genelde ${next.label} civarı). `, `Next big sale: ${next.en} (usually around ${next.label}). `)),
        T(
          `Gölgeli alan bu oyunun son ${Math.min(365, fc.spanDays)} günde ${fc.episodes} kez girdiği indirimlerden çıkar: alt sınır en iyi indirim, üst sınır normal fiyat. Yılda yaklaşık ${String(fc.perYear).replace('.', ',')} indirim görüyoruz. Bu bir söz ya da kesin tahmin değildir; güven aralık genişledikçe ve kayıt kısaldıkça düşer.`,
          `The shaded area comes from the ${fc.episodes} sale${fc.episodes === 1 ? '' : 's'} this game had in the last ${Math.min(365, fc.spanDays)} days: the floor is the best sale, the ceiling the regular price. We see about ${fc.perYear} sales a year. It is not a promise or an exact forecast; confidence drops as the range widens and the record is short.`)));
  }

  return { AtlChip, AtlBadge, StoreBar, StoreRace, Forecast };
}
