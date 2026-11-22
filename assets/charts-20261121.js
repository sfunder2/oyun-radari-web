// Fiyat grafikleri ve karşılaştırmalar (21 Kasım 2026):
//  1 Fiyat geçmişi çizgisi soldan sağa çizilir, en düşük nokta parlar (CSS, bkz. charts-20261121.css)
//  2 "Tüm zamanların en düşüğü" rozeti (ayrıntıda ve kartta)
//  3 Mağaza fiyat çubukları: satırın altında büyüyerek açılır
//  4 Mağazalar arası fiyat yarışı: en ucuz mağaza bitişe varır, diğerleri ne kadar geride kaldığını gösterir
//  5 Fiyat tahmini: ne zaman (indirim penceresi), ne kadar (beklenen fiyat), güven puanı (0–100), neden ve grafik; veri azsa "yeterli veri yok"
// (Sıcaklık göstergesinin ibreli kadranı heat-20261031.js içindedir.)
// Hareketler azaltılmış harekette kapanır; metinler TR/EN; renkler klasik ve sade temada CSS değişkenlerinden gelir.
import { seasonsBetween, nextSeason, atLowest, money, SALE_SEASONS } from './tasarim-20261117.js';

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

// ---- Fiyat tahmini (22 Kasım 2026) ----
// Geçmiş fiyat satırlarından: ne kadar ucuzlar, ne zaman ucuzlar, ne kadar güveniyoruz. Tahmin istatistikseldir;
// yeterli indirim yoksa pencere de fiyat da üretilmez.
const pct = (a, b) => Math.round((1 - a / b) * 100);
const cvOf = list => {
  if (list.length < 2) return null;
  const mean = list.reduce((a, b) => a + b, 0) / list.length;
  if (!mean) return null;
  return Math.sqrt(list.reduce((a, b) => a + (b - mean) ** 2, 0) / list.length) / mean;
};

// Son 365 günlük indirim dönemleri: { start, end, low, open }.
export function saleEpisodes(rows, todayMs, regular) {
  const win = rows.filter(r => r.t >= todayMs - 365 * DAY);
  const out = [];
  let cur = null;
  for (const r of win) {
    if (r.low < regular * 0.95) {
      if (!cur) cur = { start: r.t, end: r.t, low: r.low, open: false };
      cur.end = r.t; cur.low = Math.min(cur.low, r.low);
    } else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) { cur.open = true; out.push(cur); }
  return out;
}

export function priceForecast(hist, todayStr, horizon = 120) {
  const todayMs = Date.parse(todayStr);
  const rows = cleanRows(hist, todayMs);
  if (!Number.isFinite(todayMs) || rows.length < 2) return null;
  const spanDays = Math.round((todayMs - rows[0].t) / DAY);
  if (spanDays < 30) return { state: 'collecting', spanDays };
  const win = rows.filter(r => r.t >= todayMs - 365 * DAY);
  const cur = rows[rows.length - 1].p;
  const regular = Math.max(median(win.map(r => r.base)), cur);
  const eps = saleEpisodes(rows, todayMs, regular);
  if (!eps.length) return { state: 'nosale', spanDays, cur, regular };
  if (eps.length < 2) return { state: 'thin', spanDays, cur, regular, episodes: eps.length };

  const depths = eps.map(e => 1 - e.low / regular).sort((a, b) => a - b);
  const depth = median(depths);
  const expPrice = Math.round(regular * (1 - depth) * 100) / 100;
  const priceLo = Math.round(regular * (1 - depths[depths.length - 1]) * 100) / 100;
  const priceHi = Math.round(regular * (1 - depths[0]) * 100) / 100;
  const starts = eps.map(e => e.start);
  const gaps = starts.slice(1).map((s, i) => Math.round((s - starts[i]) / DAY));
  const medGap = Math.max(14, median(gaps));
  const half = Math.round(Math.min(medGap * 0.5, Math.max(7, ...gaps.map(g => Math.abs(g - medGap)))));
  const onSale = cur < regular * 0.95;
  const last = eps[eps.length - 1];
  const sinceLast = Math.round((todayMs - last.start) / DAY);
  const center = last.start + medGap * DAY;
  let overdue = false;
  let from = center - half * DAY, to = center + half * DAY;
  if (to < todayMs) { overdue = true; from = todayMs; to = todayMs + Math.max(14, half) * DAY; }
  else if (from < todayMs) from = todayMs;

  // Dönemsel indirimler: indirimlerin çoğu büyük mağaza haftalarına denk geliyorsa pencere o haftaya oturur.
  const inSeason = eps.filter(e => seasonsBetween(e.start - DAY, e.end + 2 * DAY).length > 0).length;
  const seasonShare = inSeason / eps.length;
  let season = null;
  if (seasonShare >= 0.5 && eps.length >= 3) {
    const want = overdue ? todayMs + 30 * DAY : center;
    const cands = seasonsBetween(todayMs, todayMs + 420 * DAY, SALE_SEASONS).filter(x => !x.clipped || x.to > todayMs);
    const near = cands.sort((a, b) => Math.abs((a.from + a.to) / 2 - want) - Math.abs((b.from + b.to) / 2 - want))[0];
    if (near && Math.abs((near.from + near.to) / 2 - want) <= Math.max(30, medGap * 0.5) * DAY) {
      season = near; from = Math.max(todayMs, near.from); to = near.to;
    }
  }
  const daysTo = Math.max(0, Math.round((from - todayMs) / DAY));
  const beyond = daysTo > horizon;

  const cv = cvOf(gaps);
  const parts = {
    count: Math.min(40, eps.length * 10),
    span: Math.round(Math.min(25, (spanDays / 365) * 25)),
    regular: cv === null ? 0 : Math.round(25 * Math.max(0, 1 - cv)),
    season: season ? Math.round(10 * seasonShare) : 0,
  };
  if (gaps.length === 1) parts.regular = 10;
  const score = Math.min(95, parts.count + parts.span + parts.regular + parts.season);
  const level = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
  const worth = cur <= expPrice * 1.03; // şimdiki fiyat zaten tipik indirim seviyesinde ya da altında
  return {
    state: 'ok', spanDays, cur, regular, horizon, onSale, worth,
    episodes: eps.length, perYear: Math.round((eps.length * 365 / Math.max(30, Math.min(365, spanDays))) * 10) / 10,
    depthPct: Math.round(depth * 100), depthMinPct: Math.round(depths[0] * 100), depthMaxPct: Math.round(depths[depths.length - 1] * 100),
    expPrice, priceLo, priceHi, best: Math.min(cur, ...eps.map(e => e.low)), typical: expPrice,
    medGap, sinceLast, overdue, from, to, daysTo, beyond, season, inSeason,
    seasonShare, score, level, parts,
    pastEpisodes: eps,
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

  // 5 — Fiyat tahmini: ne zaman, ne kadar, ne kadar güveniyoruz, neden
  const dfmt = (ms, en) => new Date(ms).toLocaleDateString(en ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  function Forecast({ hist, today, currency }) {
    const fc = priceForecast(hist, today);
    if (!fc) return null;
    const en = isEn(), cur = currency || 'TRY';
    const m = v => money(v, cur, en);
    const title = h('h4', null, T('Fiyat tahmini', 'Price forecast'));
    const empty = (tr, enText) => h('section', { className: 'tz-forecast tz-fc-empty', 'aria-label': T('Fiyat tahmini', 'Price forecast') }, title,
      h('p', { className: 'phnote' }, T(tr, enText)));
    if (fc.state === 'collecting') {
      return empty(
        `Yeterli veri yok: fiyatı ${fc.spanDays} gündür izliyoruz. Tahmin için en az 30 günlük kayıt ve 2 indirim gerekiyor.`,
        `Not enough data: we have tracked this price for ${fc.spanDays} days. A forecast needs at least 30 days of records and 2 sales.`);
    }
    if (fc.state === 'nosale') {
      return empty(
        `Yeterli veri yok: kayıtlı ${fc.spanDays} günde bu oyun indirime girmedi, bu yüzden ne zaman ve ne kadar ucuzlayacağını söyleyemeyiz.`,
        `Not enough data: this game has not gone on sale in the ${fc.spanDays} days we recorded, so we cannot say when or how much it will drop.`);
    }
    if (fc.state === 'thin') {
      return empty(
        `Yeterli veri yok: kayıtlı ${fc.spanDays} günde yalnızca 1 indirim gördük. Zamanlama ve fiyat tahmini için en az 2 indirim gerekiyor.`,
        `Not enough data: we saw only 1 sale in the ${fc.spanDays} days we recorded. A timing and price forecast needs at least 2 sales.`);
    }
    // --- metinler ---
    const lvl = LEVEL[fc.level][en ? 1 : 0];
    const range = `${dfmt(fc.from, en)} – ${dfmt(fc.to, en)}`;
    let when, whenSub;
    if (fc.overdue) {
      when = T('Her an olabilir', 'Could happen any time');
      whenSub = T(`Genelde ${fc.medGap} günde bir indirim görüyoruz; sonuncusunun üzerinden ${fc.sinceLast} gün geçti.`, `Sales usually come every ${fc.medGap} days; the last one began ${fc.sinceLast} days ago.`);
    } else if (fc.season) {
      when = `${en ? fc.season.en : fc.season.tr}`;
      whenSub = T(`Yaklaşık ${range}${fc.daysTo ? ` (${fc.daysTo} gün sonra)` : ' (bu günlerde)'}`, `About ${range}${fc.daysTo ? ` (in ${fc.daysTo} days)` : ' (right about now)'}`);
    } else {
      when = range;
      whenSub = fc.daysTo ? T(`Yaklaşık ${fc.daysTo} gün sonra başlayabilir`, `Could start in about ${fc.daysTo} days`) : T('Bu günlerde başlayabilir', 'Could start any day now');
    }
    if (fc.beyond && !fc.overdue) whenSub += T(' · grafiğin dışında', ' · beyond the chart');
    const bullets = [
      T(`Son ${Math.min(365, fc.spanDays)} günde ${fc.episodes} indirim gördük (yılda yaklaşık ${String(fc.perYear).replace('.', ',')}); ortalama ${fc.medGap} günde bir.`,
        `In the last ${Math.min(365, fc.spanDays)} days we saw ${fc.episodes} sales (about ${fc.perYear} a year), roughly one every ${fc.medGap} days.`),
      T(`İndirimler normal fiyatı (${m(fc.regular)}) ortalama %${fc.depthPct} düşürdü; en az %${fc.depthMinPct}, en çok %${fc.depthMaxPct}.`,
        `Sales cut the regular price (${m(fc.regular)}) by ${fc.depthPct}% on average, from ${fc.depthMinPct}% to ${fc.depthMaxPct}%.`),
      fc.onSale
        ? T(`Şu an indirimdesin (${m(fc.cur)}); son indirim ${fc.sinceLast} gün önce başladı.`, `It is on sale now (${m(fc.cur)}); the current sale began ${fc.sinceLast} days ago.`)
        : T(`Son indirim ${fc.sinceLast} gün önce başladı${fc.overdue ? ' ve olağan aralığı aştık' : ''}.`, `The last sale began ${fc.sinceLast} days ago${fc.overdue ? ', longer than the usual gap' : ''}.`),
    ];
    if (fc.season) bullets.push(T(
      `İndirimlerin ${fc.inSeason}/${fc.episodes} tanesi büyük mağaza dönemlerine denk geldi; bu yüzden pencere ${fc.season.tr} haftasına oturtuldu.`,
      `${fc.inSeason} of ${fc.episodes} sales fell in big store sale weeks, so the window is set to ${fc.season.en}.`));
    bullets.push(T(
      `Güven ${lvl} (${fc.score}/100): ${fc.episodes} indirim ve ${fc.spanDays} günlük kayıt${fc.parts.regular >= 15 ? '; indirimler düzenli aralıklarla geldi' : '; indirimler düzensiz aralıklarla geldi'}.`,
      `Confidence is ${lvl} (${fc.score}/100): ${fc.episodes} sales and ${fc.spanDays} days of records${fc.parts.regular >= 15 ? '; sales came at regular intervals' : '; sales came at irregular intervals'}.`));
    const verdict = fc.worth
      ? T('Şu anki fiyat tipik indirim seviyesinde ya da altında; beklemek çoğu zaman fazla kazandırmaz.', 'The current price is at or below the typical sale price; waiting usually saves little.')
      : fc.onSale
        ? T(`Şu anki indirim tipik indirimden sığ; geçmişte ${m(fc.expPrice)} civarına indi.`, `The current sale is shallower than typical; it has gone down to about ${m(fc.expPrice)} before.`)
        : T(`Beklersen geçmişteki gibi ${m(fc.expPrice)} civarına inebilir (şimdikinden ${m(fc.cur - fc.expPrice)} ucuz).`, `If you wait it could drop to about ${m(fc.expPrice)} as before (${m(fc.cur - fc.expPrice)} less than now).`);

    // --- grafik ---
    const X0 = 58, XT = 262, X1 = 588, Y0 = 18, Y1 = 150;
    const pastDays = 90, H = fc.horizon;
    const todayMs = Date.parse(today);
    const rows = cleanRows(hist, todayMs).filter(r => r.t >= todayMs - pastDays * DAY);
    const lowV = Math.min(fc.priceLo, fc.cur, ...rows.map(r => r.p)) * 0.96;
    const highV = Math.max(fc.regular, fc.cur, ...rows.map(r => r.p)) * 1.04;
    const y = v => Y0 + (1 - (v - lowV) / (highV - lowV || 1)) * (Y1 - Y0);
    const xPast = t => X0 + ((t - (todayMs - pastDays * DAY)) / (pastDays * DAY)) * (XT - X0);
    const fx = t => XT + ((t - todayMs) / (H * DAY)) * (X1 - XT);
    const steps = Array.from({ length: 19 }, (_, i) => i / 18);
    const bfc = { cur: fc.cur, regular: fc.regular, best: fc.priceLo };
    const up = steps.map(f => `${(XT + f * (X1 - XT)).toFixed(1)},${y(bandAt(bfc, f).hi).toFixed(1)}`);
    const dn = steps.slice().reverse().map(f => `${(XT + f * (X1 - XT)).toFixed(1)},${y(bandAt(bfc, f).lo).toFixed(1)}`);
    const pastD = rows.length
      ? rows.map((r, i) => (i ? `L${xPast(r.t).toFixed(1)} ${y(rows[i - 1].p).toFixed(1)} L${xPast(r.t).toFixed(1)} ${y(r.p).toFixed(1)}` : `M${xPast(Math.max(r.t, todayMs - pastDays * DAY)).toFixed(1)} ${y(r.p).toFixed(1)}`)).join(' ') + ` L${XT} ${y(rows[rows.length - 1].p).toFixed(1)}`
      : `M${X0} ${y(fc.cur).toFixed(1)} L${XT} ${y(fc.cur).toFixed(1)}`;
    const seasons = seasonsBetween(todayMs, todayMs + H * DAY);
    const winOn = !fc.beyond;
    const wx0 = fx(fc.from), wx1 = Math.min(X1, fx(fc.to));
    const mid = (a, b) => (a + b) / 2;
    const label = (v, dy = 4) => h('text', { x: 52, y: y(v) + dy, textAnchor: 'end', className: 'phaxis' }, money(v, cur, en));
    const alt = en
      ? `Forecast chart: ${winOn ? `expected sale window ${range}, price about ${m(fc.expPrice)}` : 'expected sale window is beyond the chart'}. Confidence ${lvl}, ${fc.score} out of 100.`
      : `Tahmin grafiği: ${winOn ? `beklenen indirim penceresi ${range}, fiyat yaklaşık ${m(fc.expPrice)}` : 'beklenen indirim penceresi grafiğin dışında'}. Güven ${lvl}, 100 üzerinden ${fc.score}.`;
    return h('section', { className: 'tz-forecast tz-conf-' + fc.level, 'aria-label': T('Fiyat tahmini', 'Price forecast') },
      h('div', { className: 'tz-fc-head' }, title,
        h('span', { className: 'tz-fc-kind' }, T('İstatistiksel tahmin', 'Statistical estimate'))),
      h('div', { className: 'tz-fc-tiles' },
        h('div', { className: 'tz-fc-tile' }, h('small', null, T('Ne zaman ucuzlar?', 'When might it drop?')), h('strong', null, when), h('span', null, whenSub)),
        h('div', { className: 'tz-fc-tile' }, h('small', null, T('Ne kadar ucuzlar?', 'How much might it drop?')),
          h('strong', null, `≈ ${m(fc.expPrice)}`, h('em', null, ` −%${fc.depthPct}`)),
          h('span', null, T(`Aralık ${m(fc.priceLo)} – ${m(fc.priceHi)}`, `Range ${m(fc.priceLo)} – ${m(fc.priceHi)}`))),
        h('div', { className: 'tz-fc-tile tz-fc-score' }, h('small', null, T('Güven', 'Confidence')),
          h('strong', null, fc.score, h('em', null, '/100 · ' + lvl)),
          h('i', { className: 'tz-fc-meter', 'aria-hidden': 'true' }, h('b', { style: { width: fc.score + '%' } })))),
      h('p', { className: 'tz-fc-verdict' }, verdict),
      h('svg', { className: 'phchart tz-fc', viewBox: '0 0 600 182', role: 'img', 'aria-label': alt },
        [fc.regular, mid(fc.regular, fc.priceLo), fc.priceLo].map((v, i) => h('line', { key: i, className: 'phgrid', x1: X0, x2: X1, y1: y(v), y2: y(v) })),
        label(fc.regular), label(fc.priceLo),
        seasons.map((s, i) => h('rect', { key: s.key + i, className: 'tz-fc-season', x: fx(s.from), y: Y0, width: Math.max(3, fx(s.to) - fx(s.from)), height: Y1 - Y0, rx: 3 })),
        h('line', { className: 'tz-fc-reg', x1: XT, x2: X1, y1: y(fc.regular), y2: y(fc.regular) }),
        h('polygon', { className: 'tz-fc-band', points: up.concat(dn).join(' ') }),
        winOn && h('rect', { className: 'tz-fc-win', x: wx0, y: Y0, width: Math.max(6, wx1 - wx0), height: Y1 - Y0, rx: 4 }),
        winOn && h('line', { className: 'tz-fc-exp', x1: wx0, x2: Math.max(wx0 + 6, wx1), y1: y(fc.expPrice), y2: y(fc.expPrice) }),
        winOn && h('text', { className: 'tz-fc-tag', x: Math.min(X1, Math.max(X0 + 60, mid(wx0, wx1))), y: Y0 - 5, textAnchor: wx1 > X1 - 70 ? 'end' : 'middle' }, `≈ ${m(fc.expPrice)}`),
        h('path', { className: 'tz-fc-now-line', d: `M${XT} ${y(fc.cur).toFixed(1)} L${X1} ${y(fc.cur).toFixed(1)}` }),
        h('path', { className: 'tz-fc-past', d: pastD }),
        h('line', { className: 'tz-fc-today', x1: XT, x2: XT, y1: Y0 - 4, y2: Y1 + 4 }),
        h('circle', { className: 'phnow', cx: XT, cy: y(fc.cur), r: 5 }),
        h('text', { className: 'phaxis', x: XT, y: Y1 + 24, textAnchor: 'middle' }, T('bugün', 'today')),
        h('text', { className: 'phaxis', x: X0, y: Y1 + 24 }, T(`${pastDays} gün önce`, `${pastDays} days ago`)),
        h('text', { className: 'phaxis', x: X1, y: Y1 + 24, textAnchor: 'end' }, T(`${H} gün sonra`, `in ${H} days`))),
      h('ul', { className: 'tz-fc-legend', 'aria-hidden': 'true' },
        h('li', { className: 'k-past' }, T('Geçmiş fiyat', 'Past price')),
        h('li', { className: 'k-win' }, T('Beklenen indirim penceresi', 'Expected sale window')),
        h('li', { className: 'k-band' }, T('Olası fiyat aralığı', 'Possible price range')),
        h('li', { className: 'k-season' }, T('Büyük mağaza dönemi', 'Big store sale'))),
      h('details', { className: 'tz-fc-why' },
        h('summary', null, T('Neden böyle?', 'Why this estimate?')),
        h('ul', null, bullets.map((b, i) => h('li', { key: i }, b)))),
      h('p', { className: 'phnote tz-fc-note' },
        T('Bu, radarın gördüğü fiyat geçmişine dayanan istatistiksel bir tahmindir; söz ya da kesin tarih değildir. Mağaza indirim yapmayabilir ya da başka zamanda yapabilir. Güven, indirim sayısı, kayıt süresi ve indirimlerin ne kadar düzenli geldiğiyle artar.',
          'This is a statistical estimate from the price history this radar recorded, not a promise or an exact date. A store may skip a sale or run it at a different time. Confidence rises with the number of sales, the length of the record and how regularly the sales came.')));
  }

  return { AtlChip, AtlBadge, StoreBar, StoreRace, Forecast };
}
