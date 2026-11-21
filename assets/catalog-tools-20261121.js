// Katalog araçları (21 Kasım 2026): tek pencerede dört araç, menüden ya da ?arac=dlc|sezon|gereksinim|seri ile açılır.
//  1 Ek paket ve DLC takibi: oyunun ek paketleri ve tam sürüm paketleri fiyatıyla; takip listesi (yalnız bu cihazda)
//  2 İndirim sezonu takvimi ve hazırlık listesi (tarihler yaklaşıktır; istek listesi radar-fav-v3'ten okunur)
//  3 Sistem gereksinimi kontrolü: bilgisayarın Steam'in gereksinim listesine karşı (RAM, depolama, işletim sistemi kesin; CPU/GPU yaklaşık)
//  4 Oyun serisi sayfası: IGDB serisi + katalogdaki en ucuz fiyatlarla toplam
// Veri: game_family (IGDB seri/DLC), game_meta/library.requirements (Steam), library + store_offers (fiyat), edition ("Eklenti", "Oyun Paketi"...).
// Yeni tablo ya da SQL gerekmez. Eksik veri uydurulmaz: bulunamayan fiyat "Fiyat yok" diye gösterilir.
import { SALE_SEASONS, seasonsBetween } from './tasarim-20261117.js';

const SB = 'https://dsosckshigzijnsxmlwh.supabase.co/rest/v1/';
const KEY = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
const KEY_RE = /^[a-z0-9 ]{1,160}$/;
const DAY = 864e5;
export const isEn = () => typeof document !== 'undefined' && document.documentElement.lang === 'en';
const L = (tr, en) => (isEn() ? en : tr);

// ======================= Saf yardımcılar (Node'da sınanır) =======================

/** PostgREST ilike/in değerlerini bozan karakterleri atar. */
export function cleanTerm(s) {
  return String(s || '').toLowerCase().replace(/[*%,()"\\:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}
export const inList = (keys) => 'in.(' + encodeURIComponent(keys.map((k) => '"' + k + '"').join(',')) + ')';

/** PlayStation `edition` metni "PS5 · Eklenti" biçimindedir; ikinci parça içerik türüdür. */
export function editionKind(edition) {
  const parts = String(edition || '').split('·').map((x) => x.trim());
  return parts.length > 1 ? parts[parts.length - 1] : '';
}
const ADDON_KINDS = new Set(['Eklenti', 'Eklenti Paketi', 'Kostüm', 'Harita', 'Seviye', 'Karakter', 'Öğe', 'Araç', 'Sezon Bileti']);
const BUNDLE_KINDS = new Set(['Oyun Paketi', 'Premium Sürüm']);
const KIND_EN = { 'Eklenti': 'Add-on', 'Eklenti Paketi': 'Add-on pack', 'Kostüm': 'Costume', 'Harita': 'Map', 'Seviye': 'Level', 'Karakter': 'Character', 'Öğe': 'Item', 'Araç': 'Vehicle', 'Sezon Bileti': 'Season pass', 'Oyun Paketi': 'Game bundle', 'Premium Sürüm': 'Premium edition' };
export const kindLabel = (k) => (isEn() && KIND_EN[k]) || k;
export const isAddonKind = (k) => ADDON_KINDS.has(k);
export const isBundleKind = (k) => BUNDLE_KINDS.has(k);
/** Mağaza adından tahmin: ek paket mi, paket/tam sürüm mü? (PlayStation dışı teklifler için yedek). */
export function nameKind(name) {
  const n = String(name || '').toLowerCase();
  if (/\b(dlc|season pass|expansion pass|add-?on|soundtrack|skin pack|cosmetic)\b/.test(n)) return 'addon';
  if (/\b(complete|ultimate|gold|goty|game of the year|collection|bundle|definitive|legendary|deluxe|premium|anthology|trilogy)\b/.test(n)) return 'bundle';
  return '';
}
export function classifyRow(row) {
  const k = editionKind(row?.edition);
  if (isAddonKind(k)) return 'addon';
  if (isBundleKind(k)) return 'bundle';
  if (k === 'Tam Sürüm Oyun') return 'game';
  return nameKind(row?.name) || 'game';
}

const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
/** Bir başlık anahtarının teklifleri arasında en ucuz TRY fiyatlısı (TRY yoksa en ucuz herhangi bir para birimi). */
export function cheapest(offers) {
  const ok = (offers || []).filter((o) => Number.isFinite(num(o.price)) && num(o.price) > 0).map((o) => ({ ...o, price: num(o.price), original_price: num(o.original_price), discount_percent: num(o.discount_percent) || 0 }));
  const isTry = (o) => !o.currency || o.currency === 'TRY';
  const tryOnes = ok.filter(isTry);
  const pool = tryOnes.length ? tryOnes : ok;
  return pool.sort((a, b) => a.price - b.price)[0] || null;
}

/** Seri satırlarına fiyat ekler; toplam yalnız TRY fiyatlı oyunları sayar, kalanı ayrıca bildirir. */
export function seriesSummary(series, offersByKey) {
  const rows = (series || []).map((e) => ({ entry: e, best: cheapest(offersByKey.get(e.k)) }));
  let total = 0, priced = 0, foreign = 0, missing = 0;
  for (const r of rows) {
    if (!r.best) { missing++; continue; }
    if (r.best.currency && r.best.currency !== 'TRY') { foreign++; continue; }
    total += r.best.price; priced++;
  }
  return { rows, total: Math.round(total * 100) / 100, priced, foreign, missing };
}

/** Ek paket ve paket listeleri. Aynı başlık anahtarı bir kez sayılır, ana oyun listede yer almaz. */
export function splitFamily(baseKey, rows) {
  const seen = new Set(), addons = [], bundles = [];
  for (const r of rows || []) {
    if (!r?.title_key || r.title_key === baseKey || seen.has(r.title_key)) continue;
    const kind = classifyRow(r);
    if (kind === 'addon') { seen.add(r.title_key); addons.push(r); }
    else if (kind === 'bundle') { seen.add(r.title_key); bundles.push(r); }
  }
  const byPrice = (a, b) => (num(a.price) || 1e12) - (num(b.price) || 1e12);
  return { addons: addons.sort(byPrice), bundles: bundles.sort(byPrice) };
}

/** Ana oyun + fiyatlı tüm ek paketler toplamı ile paket fiyatı: tasarruf (TRY, yalnız hepsi TRY ise). Gösterge niteliğindedir. */
export function bundleSaving(base, addons, bundle) {
  const tryOnly = (o) => o && (!o.currency || o.currency === 'TRY') && num(o.price) > 0;
  if (!tryOnly(base) || !tryOnly(bundle)) return null;
  const priced = (addons || []).filter(tryOnly);
  if (!priced.length) return null;
  const separate = num(base.price) + priced.reduce((s, a) => s + num(a.price), 0);
  const diff = separate - num(bundle.price);
  return { separate: Math.round(separate * 100) / 100, bundle: num(bundle.price), diff: Math.round(diff * 100) / 100, cheaper: diff > 0, count: priced.length };
}

// ---- Takip listesi (cihazda) ----
const TRACK_KEY = 'radar-tools-track-v1';
export function cleanTrack(list) {
  const out = [], seen = new Set();
  for (const e of Array.isArray(list) ? list : []) {
    if (!e || typeof e.k !== 'string' || !KEY_RE.test(e.k) || seen.has(e.k)) continue;
    seen.add(e.k);
    out.push({ k: e.k, n: String(e.n || e.k).slice(0, 160), p: Number.isFinite(e.p) && e.p > 0 ? e.p : null, c: e.c === 'USD' || e.c === 'EUR' ? e.c : 'TRY', at: Number.isFinite(e.at) ? e.at : 0 });
    if (out.length >= 60) break;
  }
  return out;
}
export function trackChange(entry, now) {
  const n = num(now?.price);
  if (!entry || !entry.p || !Number.isFinite(n) || n <= 0 || (now.currency || 'TRY') !== entry.c) return null;
  return { from: entry.p, to: n, pct: Math.round(((n - entry.p) / entry.p) * 100) };
}

// ---- İndirim sezonu takvimi ----
/** Bugünden itibaren ~12 ay içindeki dönemler; her biri durum ve gün sayısıyla (yaklaşık tarih). */
export function seasonTimeline(today, seasons = SALE_SEASONS) {
  const d0 = Math.floor(today / DAY) * DAY;
  const list = seasonsBetween(d0 - 40 * DAY, d0 + 366 * DAY, seasons).filter((s) => s.to > d0);
  const seen = new Set();
  const out = [];
  for (const s of list) {
    if (seen.has(s.key)) continue;
    seen.add(s.key);
    const on = s.from <= d0;
    out.push({ key: s.key, tr: s.tr, en: s.en, from: s.from, to: s.to - DAY, on, days: on ? 0 : Math.round((s.from - d0) / DAY), left: on ? Math.max(0, Math.round((s.to - d0) / DAY)) : null });
  }
  return out.sort((a, b) => a.from - b.from);
}
export const PREP_TASKS = [
  { id: 'wish', tr: 'İstek listemi gözden geçir', en: 'Review my wishlist' },
  { id: 'budget', tr: 'Harcama bütçemi belirle', en: 'Set a spending budget' },
  { id: 'alerts', tr: 'Fiyat alarmlarını kur', en: 'Set price alerts' },
  { id: 'wallet', tr: 'Cüzdan bakiyesini ya da ön ödemeli kartı hazırla', en: 'Top up wallet funds or a prepaid card' },
  { id: 'extras', tr: 'Ek paket ve DLC takip listemi kontrol et', en: 'Check my DLC tracking list' },
  { id: 'space', tr: 'Diskte yer aç', en: 'Free up disk space' },
];
export function cleanPrep(v) {
  const out = {};
  if (!v || typeof v !== 'object') return out;
  for (const s of SALE_SEASONS) {
    const e = v[s.key];
    if (!e || typeof e !== 'object') continue;
    const done = {};
    for (const t of PREP_TASKS) if (e.done && e.done[t.id] === true) done[t.id] = true;
    const b = Number(e.budget);
    out[s.key] = { done, budget: Number.isFinite(b) && b >= 0 && b < 1e7 ? Math.round(b) : null };
  }
  return out;
}
/** radar-fav-v3 içinden "İstiyorum" durumundaki oyunlar. */
export function wishItems(raw) {
  let a;
  try { a = JSON.parse(raw || '[]'); } catch { return []; }
  return (Array.isArray(a) ? a : []).filter((e) => e && e.status === 'wish' && typeof e.id === 'string' && typeof e.name === 'string')
    .map((e) => ({ id: e.id, name: e.name, url: typeof e.url === 'string' && /^https:\/\//.test(e.url) ? e.url : null, price: Number.isFinite(e.price) ? e.price : null, currency: e.currency || 'TRY' }));
}

// ---- Sistem gereksinimi ----
// Göreli skorlar: yaklaşık PassMark G3D / tek çekirdek ölçeği. Kesin değildir; yalnız "yakın mı, çok altında mı" sorusuna yarar.
const NV = { '650': 1300, '650ti': 2000, '660': 3000, '660ti': 3600, '670': 4100, '680': 4500, '750': 3200, '750ti': 3900, '760': 4400, '770': 5000, '780': 6100, '950': 5700, '960': 6600, '970': 9300, '980': 10900, '980ti': 12500, '1050': 5000, '1050ti': 6300, '1060': 10000, '1070': 14000, '1070ti': 15000, '1080': 17000, '1080ti': 18500, '1630': 4500, '1650': 7800, '1650s': 10500, '1660': 11000, '1660s': 12100, '1660ti': 12400, '2060': 13700, '2060s': 15300, '2070': 15800, '2070s': 17800, '2080': 19300, '2080s': 20000, '2080ti': 21700, '3050': 12900, '3060': 17000, '3060ti': 20400, '3070': 22300, '3070ti': 23500, '3080': 25000, '3080ti': 26500, '3090': 26800, '4060': 19600, '4060ti': 22600, '4070': 26900, '4070s': 29500, '4070ti': 31400, '4080': 34600, '4080s': 35500, '4090': 38700, '5050': 18000, '5060': 24000, '5060ti': 27000, '5070': 32500, '5070ti': 38500, '5080': 41500, '5090': 47000 };
const RX = { '460': 4700, '470': 7000, '480': 8700, '550': 3200, '560': 4500, '570': 7900, '580': 8900, '590': 9700, '5500xt': 8800, '5600xt': 12600, '5700': 14500, '5700xt': 16000, '6400': 7900, '6500xt': 8500, '6600': 15500, '6600xt': 17000, '6650xt': 17800, '6700xt': 20000, '6750xt': 20700, '6800': 24500, '6800xt': 26800, '6900xt': 28000, '7600': 17500, '7600xt': 18800, '7700xt': 25000, '7800xt': 28500, '7900gre': 30500, '7900xt': 32500, '7900xtx': 35500, '9060xt': 25000, '9070': 33000, '9070xt': 36000 };
const HD = { '7770': 2400, '7790': 2900, '7850': 3300, '7870': 4400, '7950': 5000, '7970': 5900 };
const R9 = { '270': 4000, '270x': 4400, '280': 4300, '280x': 5900, '285': 4500, '290': 6500, '290x': 7000, '380': 5300, '390': 7900, '390x': 8200 };
const INTEL_GPU = { 'hd 4000': 600, 'hd 4400': 700, 'hd 4600': 800, 'hd 5500': 900, 'hd 520': 1000, 'hd 530': 1250, 'hd 620': 1350, 'uhd 620': 1350, 'uhd 630': 1650, 'iris xe': 2400, 'arc a380': 6300, 'arc a580': 12500, 'arc a750': 15500, 'arc a770': 17000 };

/** Ekran kartı metni -> yaklaşık skor. "A veya B" ise en düşük (biri yeter). Tanınmazsa null. */
export function gpuScore(text) {
  const t = String(text || '').toLowerCase().replace(/geforce|nvidia|amd|radeon\s+rx/g, (m) => (m.startsWith('radeon') ? 'rx' : ' ')).replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  const found = [];
  const suffix = (s) => { s = (s || '').replace(/\s+/g, ''); return s === 'super' ? 's' : s === 'tisuper' ? 'tis' : s; };
  for (const m of t.matchAll(/\b(?:gtx|rtx|gt|gts)\s*(\d{3,4})\s*(ti\s*super|ti|super)?/g)) { const v = NV[m[1] + suffix(m[2])]; if (v) found.push(v); }
  for (const m of t.matchAll(/\brx\s*(\d{3,4})\s*(xtx|xt|gre)?/g)) { const v = RX[m[1] + (m[2] || '')]; if (v) found.push(v); }
  for (const m of t.matchAll(/\b(?:radeon\s*)?hd\s*(\d{4})\b/g)) { const v = HD[m[1]]; if (v) found.push(v); }
  for (const m of t.matchAll(/\bradeon\s+(\d{4})\b/g)) { const v = HD[m[1]]; if (v) found.push(v); }
  for (const m of t.matchAll(/\br9\s*(\d{3})\s*(x)?/g)) { const v = R9[m[1] + (m[2] || '')]; if (v) found.push(v); }
  if (/\bvega\s*56\b/.test(t)) found.push(13000);
  if (/\bvega\s*64\b/.test(t)) found.push(14000);
  if (/\bvega\s*8\b/.test(t)) found.push(1700);
  if (/\bvega\s*11\b/.test(t)) found.push(2100);
  for (const m of t.matchAll(/\b(?:intel\s+)?(u?hd)(?:\s+graphics)?\s*(\d{3,4})\b/g)) { const v = INTEL_GPU[m[1] + ' ' + m[2]]; if (v) found.push(v); }
  if (/\biris\s*xe\b/.test(t)) found.push(INTEL_GPU['iris xe']);
  for (const m of t.matchAll(/\barc\s*(a\d{3})\b/g)) { const v = INTEL_GPU['arc ' + m[1]]; if (v) found.push(v); }
  return found.length ? Math.min(...found) : null;
}

const TIER = { 3: 1.0, 5: 1.35, 7: 1.7, 9: 2.1 };
const ZEN_GEN = { 1: 6, 2: 7.5, 3: 9, 4: 9.5, 5: 11, 7: 13, 8: 13, 9: 14 };
const gen_ = (g) => 1 + 0.12 * (Math.min(g, 14) - 4);
/** İşlemci metni -> yaklaşık skor (tek çekirdek ağırlıklı, göreli). "A veya B" ise en düşük. Tanınmazsa null. */
export function cpuScore(text) {
  const t = String(text || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  const found = [];
  for (const m of t.matchAll(/\bi([3579])\s*(\d{4,5})[a-z]{0,2}\b/g)) { const n = +m[2], gen = n >= 10000 ? Math.floor(n / 1000) : Math.floor(n / 1000); found.push(TIER[m[1]] * gen_(gen)); }
  for (const m of t.matchAll(/\bcore\s+ultra\s*([3579])\b/g)) found.push(TIER[m[1]] * gen_(14));
  for (const m of t.matchAll(/\bryzen\s*([3579])\s*(\d{4})/g)) { const g = ZEN_GEN[+m[2][0]]; if (g) found.push(TIER[m[1]] * gen_(g)); }
  for (const m of t.matchAll(/\bfx\s*(\d{4})/g)) found.push(TIER[5] * gen_(3));
  if (/\bcore\s*2\s*duo\b/.test(t)) found.push(0.45);
  if (/\bcore\s*2\s*quad\b/.test(t)) found.push(0.6);
  if (/\b(pentium|celeron)\b/.test(t)) found.push(0.6);
  if (/\b(athlon|phenom)\b/.test(t)) found.push(0.8);
  return found.length ? Math.round(Math.min(...found) * 1000) / 1000 : null;
}
export function parseGB(text) {
  const m = String(text || '').match(/(\d+(?:[.,]\d+)?)\s*(gb|mb|tb)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toLowerCase();
  return u === 'mb' ? v / 1024 : u === 'tb' ? v * 1024 : v;
}
const WIN = { xp: 5, vista: 6, '7': 7, '8': 8, '8.1': 8, '10': 10, '11': 11 };
/** Gereksinim metnindeki en düşük Windows sürümü ("7 ve üzeri", "7/8/10" ise 7). */
export function parseWin(text) {
  const t = String(text || '').toLowerCase();
  const vals = [...t.matchAll(/windows\s*(xp|vista|10|11|8\.1|8|7)\b/g)].map((m) => WIN[m[1]]);
  if (!vals.length) return /windows|win\b/.test(t) ? 7 : null;
  return Math.min(...vals);
}
export const OS_CHOICES = [['win11', 'Windows 11', 11], ['win10', 'Windows 10', 10], ['win8', 'Windows 8/8.1', 8], ['win7', 'Windows 7', 7], ['other', 'macOS / Linux', 0]];

const LABELS = {
  os: [/^(i[sş]letim|os\b)/i], cpu: [/^(i[sş]lemci|processor|cpu)/i], ram: [/^(bellek|memory|ram)/i],
  gpu: [/^(ekran kart|graphics|video|gpu)/i], disk: [/^(depolama|storage|hard disk|disk)/i],
};
function pick(list, kind) {
  for (const [label, value] of list || []) if (LABELS[kind].some((re) => re.test(String(label).trim().replace(/İ/g, 'I').replace(/ı/g, 'i')))) return String(value);
  return null;
}
const ratio = (have, need) => (need > 0 ? have / need : 1);
const grade = (r) => (r >= 1 ? 'ok' : r >= 0.85 ? 'edge' : 'no');

/** Kullanıcı sistemi ile bir gereksinim listesi ([[etiket, değer], ...]) karşılaştırması. */
export function compareList(sys, list) {
  const rows = [];
  const os = pick(list, 'os');
  if (os) {
    const need = parseWin(os);
    const have = (OS_CHOICES.find((o) => o[0] === sys.os) || [])[2];
    if (need == null || have == null) rows.push({ key: 'os', need: os, status: 'unknown' });
    else rows.push({ key: 'os', need: os, status: have === 0 ? 'no' : have >= need ? 'ok' : 'no' });
  }
  const ram = pick(list, 'ram');
  if (ram) {
    const need = parseGB(ram);
    if (need == null || !Number.isFinite(sys.ram)) rows.push({ key: 'ram', need: ram, status: 'unknown' });
    else rows.push({ key: 'ram', need: ram, status: sys.ram >= need ? 'ok' : 'no', ratio: ratio(sys.ram, need) });
  }
  const disk = pick(list, 'disk');
  if (disk) {
    const need = parseGB(disk);
    if (need == null || !Number.isFinite(sys.disk)) rows.push({ key: 'disk', need: disk, status: 'unknown' });
    else rows.push({ key: 'disk', need: disk, status: sys.disk >= need ? 'ok' : 'no', ratio: ratio(sys.disk, need) });
  }
  const cpu = pick(list, 'cpu');
  if (cpu) {
    const need = cpuScore(cpu), have = cpuScore(sys.cpu);
    if (need == null || have == null) rows.push({ key: 'cpu', need: cpu, status: 'unknown', userUnknown: have == null });
    else { const r = ratio(have, need); rows.push({ key: 'cpu', need: cpu, status: grade(r), ratio: r, approx: true }); }
  }
  const gpu = pick(list, 'gpu');
  if (gpu) {
    const need = gpuScore(gpu), have = gpuScore(sys.gpu);
    if (need == null || have == null) rows.push({ key: 'gpu', need: gpu, status: 'unknown', userUnknown: have == null });
    else { const r = ratio(have, need); rows.push({ key: 'gpu', need: gpu, status: grade(r), ratio: r, approx: true }); }
  }
  return rows;
}
const worst = (rows) => (rows.some((r) => r.status === 'no') ? 'no' : rows.some((r) => r.status === 'edge') ? 'edge' : 'ok');
/** Genel karar: rec-ok, min-ok, edge, no, unknown. Bilinmeyen satırlar kararı sessizce yükseltmez ("unknownRows" ayrıca döner). */
export function checkGame(sys, req) {
  const min = compareList(sys, req?.min), rec = req?.rec?.length ? compareList(sys, req.rec) : [];
  const known = (rows) => rows.filter((r) => r.status !== 'unknown');
  if (!known(min).length && !known(rec).length) return { verdict: 'unknown', min, rec };
  const minW = known(min).length ? worst(known(min)) : null;
  if (minW === 'no') return { verdict: 'no', min, rec };
  if (minW === 'edge') return { verdict: 'edge', min, rec };
  const recK = known(rec);
  if (recK.length && worst(recK) === 'ok' && !rec.some((r) => r.status === 'unknown' && r.userUnknown)) return { verdict: 'rec-ok', min, rec };
  return { verdict: 'min-ok', min, rec };
}
export const cleanSys = (v) => {
  const o = v && typeof v === 'object' ? v : {};
  const ram = Number(o.ram), disk = Number(o.disk);
  return {
    os: OS_CHOICES.some((c) => c[0] === o.os) ? o.os : 'win10',
    ram: Number.isFinite(ram) && ram > 0 && ram <= 1024 ? ram : 16,
    disk: Number.isFinite(disk) && disk >= 0 && disk <= 100000 ? disk : 100,
    cpu: String(o.cpu || '').slice(0, 80), gpu: String(o.gpu || '').slice(0, 80),
  };
};
export const CPU_SUGGEST = ['Intel Core i3-4130', 'Intel Core i5-4460', 'Intel Core i5-6600K', 'Intel Core i7-4770', 'Intel Core i7-7700K', 'Intel Core i5-9400F', 'Intel Core i7-9700K', 'Intel Core i5-10400F', 'Intel Core i5-11400F', 'Intel Core i5-12400F', 'Intel Core i7-12700K', 'Intel Core i5-13600K', 'Intel Core i7-14700K', 'Intel Core i9-13900K', 'Intel Core Ultra 7', 'AMD Ryzen 3 1200', 'AMD Ryzen 5 1600', 'AMD Ryzen 5 2600', 'AMD Ryzen 5 3600', 'AMD Ryzen 7 3700X', 'AMD Ryzen 5 5600X', 'AMD Ryzen 7 5800X3D', 'AMD Ryzen 5 7600X', 'AMD Ryzen 7 7800X3D', 'AMD Ryzen 9 7950X', 'AMD FX-6300', 'AMD FX-8350'];
export const GPU_SUGGEST = ['GeForce GTX 750 Ti', 'GeForce GTX 960', 'GeForce GTX 970', 'GeForce GTX 1050 Ti', 'GeForce GTX 1060', 'GeForce GTX 1070', 'GeForce GTX 1080', 'GeForce GTX 1650', 'GeForce GTX 1660 Super', 'GeForce RTX 2060', 'GeForce RTX 2070 Super', 'GeForce RTX 3050', 'GeForce RTX 3060', 'GeForce RTX 3060 Ti', 'GeForce RTX 3070', 'GeForce RTX 3080', 'GeForce RTX 4060', 'GeForce RTX 4070', 'GeForce RTX 4080', 'GeForce RTX 4090', 'GeForce RTX 5070', 'Radeon RX 480', 'Radeon RX 570', 'Radeon RX 580', 'Radeon RX 5700 XT', 'Radeon RX 6600', 'Radeon RX 6700 XT', 'Radeon RX 6800 XT', 'Radeon RX 7600', 'Radeon RX 7800 XT', 'Radeon RX 7900 XTX', 'Radeon HD 7870', 'Intel UHD Graphics 630', 'Intel Iris Xe', 'Intel Arc A750'];

// ======================= Veri =======================
const head = { apikey: KEY, Authorization: 'Bearer ' + KEY };
async function rest(path) {
  const r = await fetch(SB + path, { headers: head, credentials: 'omit', signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
const PRICE_COLS = 'title_key,name,image,price,original_price,discount_percent,currency,url,edition,lowest_ever';
const OFFER_COLS = 'platform,title_key,name,image,price,original_price,discount_percent,currency,url,edition';
async function offersFor(keys) {
  const list = [...new Set(keys.filter((k) => KEY_RE.test(k)))].slice(0, 150);
  const map = new Map();
  for (let i = 0; i < list.length; i += 50) {
    const part = inList(list.slice(i, i + 50));
    const [ps, so] = await Promise.all([
      rest(`library?select=${PRICE_COLS}&title_key=${part}`).catch(() => []),
      rest(`store_offers?select=${OFFER_COLS}&title_key=${part}`).catch(() => []),
    ]);
    for (const r of ps) (map.get(r.title_key) || map.set(r.title_key, []).get(r.title_key)).push({ ...r, store: 'PlayStation' });
    for (const r of so) (map.get(r.title_key) || map.set(r.title_key, []).get(r.title_key)).push({ ...r, store: r.platform });
  }
  return map;
}
const familyRow = async (key) => (KEY_RE.test(key) ? (await rest('game_family?select=title_key,igdb_id,series_name,series,dlcs,dlc_total,parent&title_key=eq.' + encodeURIComponent(key)).catch(() => []))[0] || null : null);
async function searchGames(term, extra = '') {
  const t = cleanTerm(term);
  if (t.length < 2) return [];
  const [ps, so] = await Promise.all([
    rest(`library?select=${PRICE_COLS},requirements&name_search=ilike.*${encodeURIComponent(t)}*${extra}&order=best_score.desc.nullslast&limit=10`).catch(() => []),
    rest(`store_offers?select=${OFFER_COLS}&name_search=ilike.*${encodeURIComponent(t)}*&limit=10`).catch(() => []),
  ]);
  const seen = new Set(), out = [];
  for (const r of [...ps, ...so]) {
    if (!r.title_key || seen.has(r.title_key) || classifyRow(r) !== 'game') continue;
    seen.add(r.title_key); out.push(r);
  }
  return out.slice(0, 8);
}

// ======================= Arayüz =======================
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const safeUrl = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);
function money(v, cur) {
  if (!Number.isFinite(v)) return '';
  try { return new Intl.NumberFormat(isEn() ? 'en-GB' : 'tr-TR', { style: 'currency', currency: cur || 'TRY', currencyDisplay: 'narrowSymbol', maximumFractionDigits: v % 1 ? 2 : 0 }).format(v); } catch { return v + ' ' + (cur || ''); }
}
const fmtDate = (t) => new Date(t).toLocaleDateString(isEn() ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const loading = () => h('p', { class: 'ct-note', role: 'status' }, L('Yükleniyor…', 'Loading…'));
const empty = (m) => h('p', { class: 'ct-empty' }, m);

function offerRow(o, extra) {
  const best = o.best || o;
  const url = safeUrl(best.url);
  const price = Number.isFinite(num(best.price)) && num(best.price) > 0 ? money(num(best.price), best.currency) : L('Fiyat yok', 'No price');
  const disc = num(best.discount_percent) > 0 ? h('em', { class: 'ct-disc' }, '−%' + Math.round(num(best.discount_percent))) : null;
  return h('li', { class: 'ct-row' },
    best.image && safeUrl(best.image) ? h('img', { src: best.image, alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: 'ct-ph', 'aria-hidden': 'true' }),
    h('span', { class: 'ct-txt' }, h('b', null, o.name || best.name), h('small', null, [o.sub, best.store || best.platform].filter(Boolean).join(' · '))),
    h('span', { class: 'ct-price' }, disc, price),
    extra,
    url ? h('a', { class: 'ct-open', href: url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': L('Mağazada aç', 'Open in store') }, '↗') : null);
}

// ---- Oyun arama kutusu (ortak) ----
function gamePicker({ placeholder, onPick, withSeries }) {
  const input = h('input', { type: 'search', class: 'ct-input', placeholder, 'aria-label': placeholder, autocomplete: 'off', enterkeyhint: 'search' });
  const list = h('ul', { class: 'ct-results', role: 'listbox' });
  let seq = 0, timer = 0;
  const run = async () => {
    const my = ++seq, q = input.value;
    if (cleanTerm(q).length < 2) { list.replaceChildren(); return; }
    list.replaceChildren(h('li', { class: 'ct-note' }, L('Aranıyor…', 'Searching…')));
    const [games, series] = await Promise.all([
      searchGames(q).catch(() => []),
      withSeries ? rest(`game_family?select=series_name&series_name=ilike.*${encodeURIComponent(cleanTerm(q))}*&limit=40`).catch(() => []) : [],
    ]);
    if (my !== seq) return;
    const names = [...new Set(series.map((r) => r.series_name).filter(Boolean))].slice(0, 4);
    const items = [
      ...names.map((n) => h('li', null, h('button', { type: 'button', onclick: () => { list.replaceChildren(); onPick({ series: n }); } }, h('b', null, n), h('small', null, L('Seri', 'Series'))))),
      ...games.map((g) => h('li', null, h('button', { type: 'button', onclick: () => { list.replaceChildren(); onPick({ game: g }); } }, h('b', null, g.name), h('small', null, g.edition || (g.platform || ''))))),
    ];
    list.replaceChildren(...(items.length ? items : [h('li', { class: 'ct-note' }, L('Eşleşen oyun bulunamadı.', 'No matching game found.'))]));
  };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 280); });
  return { el: h('div', { class: 'ct-picker' }, input, list), input, list };
}

// ---- 1) Ek paket ve DLC ----
function trackBtn(entry, onChange) {
  const tracked = () => cleanTrack(store.get(TRACK_KEY, [])).some((e) => e.k === entry.k);
  const b = h('button', { type: 'button', class: 'ct-track', 'aria-pressed': String(tracked()) });
  const paint = () => { const on = tracked(); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? L('Takipte ✓', 'Tracking ✓') : L('Takip et', 'Track'); };
  b.addEventListener('click', () => {
    let list = cleanTrack(store.get(TRACK_KEY, []));
    if (tracked()) list = list.filter((e) => e.k !== entry.k);
    else list = cleanTrack([{ ...entry, at: Date.now() }, ...list]);
    store.set(TRACK_KEY, list); paint(); onChange?.();
  });
  paint();
  return b;
}
async function renderDlc(root) {
  const out = h('div', { class: 'ct-out' });
  const trackBox = h('div', { class: 'ct-box' });
  const feed = h('div', { class: 'ct-box' });
  const picker = gamePicker({ placeholder: L('Oyun ara (ör. Cyberpunk 2077)', 'Search a game (e.g. Cyberpunk 2077)'), onPick: ({ game }) => show(game) });
  root.append(
    h('p', { class: 'ct-lead' }, L('Bir oyunun ek paketlerini ve tam sürüm paketlerini fiyatıyla gör; fiyatını izlemek istediklerini takibe al.', 'See a game’s add-ons and complete-edition bundles with prices, and track the ones you want.')),
    picker.el, out, trackBox, feed);

  async function show(game) {
    out.replaceChildren(loading());
    const key = game.title_key;
    try {
      const fam = await familyRow(key);
      const dlcKeys = (fam?.dlcs || []).map((e) => e.k).filter(Boolean);
      const [offers, near] = await Promise.all([
        offersFor(dlcKeys),
        rest(`library?select=${PRICE_COLS}&title_key=like.${encodeURIComponent(key)}%25&limit=80`).catch(() => []),
      ]);
      const rows = [];
      for (const [, list] of offers) { const b = cheapest(list); if (b) rows.push({ ...b, title_key: b.title_key }); }
      for (const r of near) rows.push(r);
      const base = cheapest([...(offers.get(key) || []), ...near.filter((r) => r.title_key === key)]) || (game.price ? game : null);
      const { addons, bundles } = splitFamily(key, rows);
      const priced = addons.filter((a) => num(a.price) > 0).length;
      const igdbTotal = Math.max(fam?.dlc_total || 0, dlcKeys.length);
      const sec = [];
      sec.push(h('h3', { class: 'ct-h' }, game.name), base ? h('p', { class: 'ct-sub' }, L('Ana oyun: ', 'Base game: '), h('b', null, money(num(base.price), base.currency))) : h('p', { class: 'ct-sub' }, L('Ana oyunun fiyatı katalogda yok.', 'The base game has no price in the catalogue.')));
      sec.push(h('h4', null, L('Ek paketler', 'Add-ons'), ' ', h('span', { class: 'ct-tag' }, String(addons.length))));
      sec.push(addons.length ? h('ul', { class: 'ct-list' }, addons.slice(0, 30).map((a) => offerRow({ ...a, sub: kindLabel(editionKind(a.edition)) }, trackBtn({ k: a.title_key, n: a.name, p: num(a.price) || null, c: a.currency }, () => renderTrack())))) : empty(L('Katalogda fiyatı olan ek paket bulunamadı.', 'No add-on with a price was found in the catalogue.')));
      sec.push(h('h4', null, L('Paketler ve tam sürümler', 'Bundles and complete editions'), ' ', h('span', { class: 'ct-tag' }, String(bundles.length))));
      if (bundles.length) {
        sec.push(h('ul', { class: 'ct-list' }, bundles.slice(0, 20).map((b) => {
          const s = bundleSaving(base, addons, b);
          const note = s ? h('small', { class: 'ct-save' + (s.cheaper ? ' good' : '') }, s.cheaper
            ? L(`Ana oyun + ${s.count} ek paket ayrı ayrı ${money(s.separate)}; paket ${money(s.diff)} daha ucuz`, `Base + ${s.count} add-ons separately ${money(s.separate)}; the bundle saves ${money(s.diff)}`)
            : L(`Ana oyun + ${s.count} ek paket ayrı ayrı ${money(s.separate)}; paket daha pahalı`, `Base + ${s.count} add-ons separately ${money(s.separate)}; the bundle costs more`)) : null;
          const li = offerRow({ ...b, sub: kindLabel(editionKind(b.edition)) }, trackBtn({ k: b.title_key, n: b.name, p: num(b.price) || null, c: b.currency }, () => renderTrack()));
          if (note) li.querySelector('.ct-txt').append(note);
          return li;
        })));
        sec.push(h('p', { class: 'ct-fine' }, L('Karşılaştırma göstergedir: paketin hangi ek paketleri içerdiği bilinmez, bu yüzden kataloğumuzdaki tüm fiyatlı ek paketlerle kıyaslanır.', 'The comparison is indicative: which add-ons a bundle includes is unknown, so it is compared with every priced add-on in our catalogue.')));
      } else sec.push(empty(L('Katalogda bu oyunun paketi bulunamadı.', 'No bundle for this game was found in the catalogue.')));
      if (igdbTotal > priced) sec.push(h('p', { class: 'ct-fine' }, L(`IGDB bu oyun için ${igdbTotal} ek içerik listeliyor; ${priced} tanesinin fiyatı katalogda var. Kalanı için fiyat verisi yok.`, `IGDB lists ${igdbTotal} add-ons for this game; ${priced} have a price in the catalogue. The rest have no price data.`)));
      out.replaceChildren(...sec);
    } catch {
      out.replaceChildren(empty(L('Veri şu an alınamadı. Biraz sonra yeniden dene.', 'Data could not be loaded right now. Try again shortly.')));
    }
  }
  async function renderTrack() {
    const list = cleanTrack(store.get(TRACK_KEY, []));
    if (!list.length) { trackBox.replaceChildren(h('h4', null, L('Takip ettiklerim', 'My tracked items')), empty(L('Henüz takip ettiğin ek paket yok.', 'You are not tracking any add-ons yet.'))); return; }
    trackBox.replaceChildren(h('h4', null, L('Takip ettiklerim', 'My tracked items'), ' ', h('span', { class: 'ct-tag' }, String(list.length))), loading());
    const offers = await offersFor(list.map((e) => e.k)).catch(() => new Map());
    trackBox.replaceChildren(h('h4', null, L('Takip ettiklerim', 'My tracked items'), ' ', h('span', { class: 'ct-tag' }, String(list.length))),
      h('ul', { class: 'ct-list' }, list.map((e) => {
        const now = cheapest(offers.get(e.k)), ch = now ? trackChange(e, now) : null;
        const li = offerRow({ name: e.n, best: now || { price: null }, sub: ch ? '' : (now ? '' : L('Güncel fiyat yok', 'No current price')) }, trackBtn(e, renderTrack));
        if (e.p) li.querySelector('.ct-txt').append(h('small', { class: 'ct-save' + (ch && ch.pct < 0 ? ' good' : '') }, L('Eklerken ', 'When added '), money(e.p, e.c), ch ? ' → ' + (ch.pct === 0 ? L('değişmedi', 'unchanged') : (ch.pct < 0 ? '↓ ' : '↑ ') + Math.abs(ch.pct) + '%') : ''));
        return li;
      })));
  }
  async function renderFeed() {
    feed.replaceChildren(h('h4', null, L('İndirimdeki ek paketler', 'Add-ons on sale')), loading());
    try {
      const rows = await rest(`library?select=${PRICE_COLS}&edition=ilike.*Eklenti*&discount_percent=gt.0&price=gt.0&order=discount_percent.desc&limit=12`);
      feed.replaceChildren(h('h4', null, L('İndirimdeki ek paketler', 'Add-ons on sale')), rows.length ? h('ul', { class: 'ct-list' }, rows.map((r) => offerRow({ ...r, sub: kindLabel(editionKind(r.edition)) }))) : empty(L('Şu an indirimde ek paket yok.', 'No add-ons are on sale right now.')), h('p', { class: 'ct-fine' }, L('Kaynak: PlayStation Türkiye mağazası. Diğer mağazaların ek paket fiyatı katalogda yok.', 'Source: PlayStation Türkiye store. Add-on prices from other stores are not in the catalogue.')));
    } catch { feed.replaceChildren(); }
  }
  renderTrack(); renderFeed();
}

// ---- 2) İndirim sezonu ----
async function renderSale(root) {
  const now = Date.now();
  const prep = cleanPrep(store.get('radar-tools-prep-v1', {}));
  const wish = wishItems((() => { try { return localStorage.getItem('radar-fav-v3'); } catch { return null; } })());
  const timeline = seasonTimeline(now);
  const focus = timeline[0];
  root.append(h('p', { class: 'ct-lead' }, L('Büyük indirim dönemleri her yıl aşağı yukarı aynı haftalarda gelir. Tarihler yaklaşıktır; mağazalar kesin günü kısa süre önce açıklar.', 'Big sales land in roughly the same weeks every year. Dates are approximate; stores announce exact days shortly before.')));
  const cal = h('ol', { class: 'ct-season' });
  for (const s of timeline) {
    cal.append(h('li', { class: s.on ? 'on' : '' },
      h('span', { class: 'ct-sdate' }, fmtDate(s.from) + ' – ' + fmtDate(s.to)),
      h('b', null, isEn() ? s.en : s.tr),
      h('span', { class: 'ct-chip' + (s.on ? ' on' : '') }, s.on ? L(`Şimdi · ${s.left} gün kaldı`, `On now · ${s.left} days left`) : L(`${s.days} gün sonra`, `in ${s.days} days`))));
  }
  root.append(cal);
  if (!focus) return;
  const mine = (prep[focus.key] ||= { done: {}, budget: null });
  const save = () => store.set('radar-tools-prep-v1', prep);
  const box = h('div', { class: 'ct-box' }, h('h4', null, L('Hazırlık listesi: ', 'Prep list: '), isEn() ? focus.en : focus.tr));
  const ul = h('ul', { class: 'ct-check' });
  const budgetInput = h('input', { type: 'number', min: '0', step: '50', inputmode: 'numeric', class: 'ct-input ct-budget', placeholder: '₺', 'aria-label': L('Bütçe (₺)', 'Budget (₺)'), value: mine.budget ?? '' });
  const spendNote = h('p', { class: 'ct-fine' });
  const paintSpend = () => {
    const b = Number(budgetInput.value);
    const total = wishTotal;
    spendNote.textContent = Number.isFinite(b) && b > 0 && total > 0
      ? (total > b ? L(`İstek listendeki fiyatlı oyunların toplamı ${money(total)}; bütçeni ${money(total - b)} aşıyor, öncelik sıralaman gerek.`, `Your priced wishlist adds up to ${money(total)}, which is ${money(total - b)} over budget; rank your priorities.`)
        : L(`İstek listendeki fiyatlı oyunların toplamı ${money(total)}; bütçene ${money(b - total)} yer kalıyor.`, `Your priced wishlist adds up to ${money(total)}, leaving ${money(b - total)} of your budget.`)) : '';
  };
  let wishTotal = wish.filter((w) => w.price > 0 && w.currency === 'TRY').reduce((s, w) => s + w.price, 0);
  for (const t of PREP_TASKS) {
    const cb = h('input', { type: 'checkbox', id: 'ct-t-' + t.id, checked: mine.done[t.id] ? true : null });
    cb.addEventListener('change', () => { if (cb.checked) mine.done[t.id] = true; else delete mine.done[t.id]; save(); });
    const li = h('li', null, h('label', { for: 'ct-t-' + t.id }, cb, h('span', null, isEn() ? t.en : t.tr)));
    if (t.id === 'wish') li.append(h('small', null, wish.length ? L(`${wish.length} oyun istek listende`, `${wish.length} games on your wishlist`) : L('İstek listen boş; oyunlarda "İstiyorum" de.', 'Your wishlist is empty; mark games as "Want".')));
    if (t.id === 'budget') li.append(budgetInput);
    ul.append(li);
  }
  budgetInput.addEventListener('input', () => { const b = Number(budgetInput.value); mine.budget = Number.isFinite(b) && b >= 0 && budgetInput.value !== '' ? Math.round(b) : null; save(); paintSpend(); });
  box.append(ul, spendNote);
  root.append(box);
  paintSpend();
  if (wish.length) {
    const wb = h('div', { class: 'ct-box' }, h('h4', null, L('İstek listemdeki oyunların şimdiki durumu', 'Current state of my wishlist')), loading());
    root.append(wb);
    const psIds = wish.filter((w) => !w.id.includes(':') && /^[A-Za-z0-9_-]+$/.test(w.id)).map((w) => w.id).slice(0, 60);
    let fresh = new Map();
    try { if (psIds.length) for (const r of await rest(`library?select=id,price,original_price,discount_percent,currency,lowest_ever,title_key&id=in.(${psIds.map((x) => '"' + x + '"').join(',')})`)) fresh.set(r.id, r); } catch {}
    const rows = wish.slice(0, 40).map((w) => { const f = fresh.get(w.id); return { ...w, price: f ? num(f.price) : w.price, currency: f?.currency || w.currency, disc: f ? num(f.discount_percent) || 0 : 0, fresh: !!f }; });
    wishTotal = rows.filter((w) => w.price > 0 && w.currency === 'TRY').reduce((s, w) => s + w.price, 0);
    paintSpend();
    const onSale = rows.filter((r) => r.disc > 0).length;
    wb.replaceChildren(h('h4', null, L('İstek listemdeki oyunların şimdiki durumu', 'Current state of my wishlist'), ' ', h('span', { class: 'ct-tag' }, L(`${onSale} indirimde`, `${onSale} on sale`))),
      h('ul', { class: 'ct-list' }, rows.map((r) => h('li', { class: 'ct-row ct-slim' },
        h('span', { class: 'ct-txt' }, h('b', null, r.name), h('small', null, r.fresh ? '' : L('kayıtlı fiyat', 'saved price'))),
        h('span', { class: 'ct-price' }, r.disc > 0 ? h('em', { class: 'ct-disc' }, '−%' + Math.round(r.disc)) : null, r.price > 0 ? money(r.price, r.currency) : L('Fiyat yok', 'No price')),
        r.url ? h('a', { class: 'ct-open', href: r.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': L('Mağazada aç', 'Open in store') }, '↗') : null))),
      h('p', { class: 'ct-fine' }, L('Güncel fiyat yalnız PlayStation kayıtları için okunur; diğer mağazalarda kayıtlı fiyat gösterilir.', 'Live prices are read for PlayStation entries only; other stores show the saved price.')));
  }
}

// ---- 3) Sistem gereksinimi ----
async function renderReq(root) {
  const sys = cleanSys(store.get('radar-tools-sys-v1', {}));
  const save = () => store.set('radar-tools-sys-v1', sys);
  const dl = (id, list) => h('datalist', { id }, list.map((v) => h('option', { value: v })));
  const field = (label, control) => h('label', { class: 'ct-field' }, h('span', null, label), control);
  const cpu = h('input', { class: 'ct-input', list: 'ct-cpu', value: sys.cpu, placeholder: L('ör. Ryzen 5 3600', 'e.g. Ryzen 5 3600'), autocomplete: 'off' });
  const gpu = h('input', { class: 'ct-input', list: 'ct-gpu', value: sys.gpu, placeholder: L('ör. GTX 1060', 'e.g. GTX 1060'), autocomplete: 'off' });
  const ram = h('select', { class: 'ct-input' }, [4, 6, 8, 12, 16, 24, 32, 48, 64].map((v) => h('option', { value: v, selected: v === sys.ram ? true : null }, v + ' GB')));
  const disk = h('input', { class: 'ct-input', type: 'number', min: '0', step: '10', inputmode: 'numeric', value: sys.disk });
  const os = h('select', { class: 'ct-input' }, OS_CHOICES.map(([v, n]) => h('option', { value: v, selected: v === sys.os ? true : null }, n)));
  const hint = h('p', { class: 'ct-fine' });
  const out = h('div', { class: 'ct-out' });
  const paintHint = () => {
    const bits = [];
    if (cpu.value && cpuScore(cpu.value) == null) bits.push(L('İşlemciyi tanıyamadım; listeden bir model seç.', 'I could not recognise the CPU; pick a model from the list.'));
    if (gpu.value && gpuScore(gpu.value) == null) bits.push(L('Ekran kartını tanıyamadım; listeden bir model seç.', 'I could not recognise the GPU; pick a model from the list.'));
    hint.textContent = bits.join(' ');
  };
  const onChange = () => {
    sys.cpu = cpu.value.slice(0, 80); sys.gpu = gpu.value.slice(0, 80); sys.ram = Number(ram.value); sys.os = os.value;
    const d = Number(disk.value); sys.disk = Number.isFinite(d) && d >= 0 ? d : 0;
    save(); paintHint(); if (current) paintVerdict(current);
  };
  for (const el of [cpu, gpu, ram, disk, os]) el.addEventListener('input', onChange);
  let current = null;
  const picker = gamePicker({ placeholder: L('Oyun ara (ör. Elden Ring)', 'Search a game (e.g. Elden Ring)'), onPick: ({ game }) => pickGame(game) });
  root.append(
    h('p', { class: 'ct-lead' }, L('Bilgisayarının özelliklerini bir kez gir (bu cihazda saklanır), sonra oyun ara: Steam’in gereksinim listesiyle karşılaştırırım.', 'Enter your PC specs once (kept on this device), then search a game: I compare them with Steam’s requirement list.')),
    h('div', { class: 'ct-fields' }, field(L('İşlemci', 'Processor'), cpu), field(L('Ekran kartı', 'Graphics card'), gpu), field('RAM', ram), field(L('Boş disk (GB)', 'Free disk (GB)'), disk), field(L('İşletim sistemi', 'Operating system'), os)),
    dl('ct-cpu', CPU_SUGGEST), dl('ct-gpu', GPU_SUGGEST), hint, picker.el, out);
  paintHint();
  async function pickGame(g) {
    out.replaceChildren(loading());
    let req = g.requirements;
    if (!req) {
      const m = await rest('library?select=requirements&title_key=eq.' + encodeURIComponent(g.title_key) + '&limit=1').catch(() => []);
      req = m[0]?.requirements;
    }
    current = { game: g, req: req && (req.min?.length || req.rec?.length) ? req : null };
    paintVerdict(current);
  }
  function paintVerdict({ game, req }) {
    if (!req) { out.replaceChildren(h('h3', { class: 'ct-h' }, game.name), empty(L('Bu oyun için Steam gereksinim verisi yok (ör. yalnızca konsolda ya da Steam eşleşmesi yok).', 'There is no Steam requirement data for this game (for example console-only, or no Steam match).'))); return; }
    const res = checkGame(sys, req);
    const V = {
      'rec-ok': [L('Önerilen ayarlarda rahat çalışmalı', 'Should run comfortably at recommended settings'), 'good'],
      'min-ok': [L('Minimum gereksinimi karşılıyor', 'Meets the minimum requirements'), 'ok'],
      edge: [L('Sınırda: bazı parçalar minimumun hemen altında', 'Borderline: some parts are just under the minimum'), 'edge'],
      no: [L('Minimumu karşılamıyor', 'Does not meet the minimum'), 'bad'],
      unknown: [L('Karşılaştırılamadı', 'Could not compare'), 'edge'],
    }[res.verdict];
    const NAMES = { os: L('İşletim sistemi', 'OS'), cpu: L('İşlemci', 'CPU'), gpu: L('Ekran kartı', 'GPU'), ram: 'RAM', disk: L('Depolama', 'Storage') };
    const ST = { ok: ['✓', L('Yeterli', 'OK')], edge: ['≈', L('Sınırda', 'Borderline')], no: ['✕', L('Yetersiz', 'Too low')], unknown: ['?', L('Doğrulanamadı', 'Unverified')] };
    const table = (title, rows) => rows.length ? h('div', { class: 'ct-reqcol' }, h('h4', null, title), h('ul', null, rows.map((r) => h('li', { class: 'st-' + r.status },
      h('span', { class: 'ct-st', 'aria-hidden': 'true' }, ST[r.status][0]), h('span', { class: 'ct-txt' }, h('b', null, NAMES[r.key]), h('small', null, r.need)), h('span', { class: 'ct-stl' }, ST[r.status][1] + (r.approx && r.status !== 'unknown' ? ' ~' : '')))))) : null;
    out.replaceChildren(
      h('h3', { class: 'ct-h' }, game.name),
      h('p', { class: 'ct-verdict ' + V[1], role: 'status' }, V[0]),
      h('div', { class: 'ct-reqgrid' }, table(L('Minimum', 'Minimum'), res.min), table(L('Önerilen', 'Recommended'), res.rec)),
      h('p', { class: 'ct-fine' }, L('RAM, depolama ve işletim sistemi kesin karşılaştırılır. İşlemci ve ekran kartı yaklaşık performans skoruyla (~) kıyaslanır; yeni nesil ya da nadir modellerde "doğrulanamadı" çıkabilir. Kaynak: Steam gereksinim listesi.', 'RAM, storage and OS are compared exactly. CPU and GPU use an approximate performance score (~); newer or rare models may show "unverified". Source: Steam requirement list.')));
  }
}

// ---- 4) Oyun serisi ----
async function renderSeries(root, preset) {
  const out = h('div', { class: 'ct-out' });
  const picker = gamePicker({ placeholder: L('Oyun ya da seri ara (ör. Witcher, Resident Evil)', 'Search a game or series (e.g. Witcher, Resident Evil)'), withSeries: true, onPick: (p) => (p.series ? showSeries(p.series) : showGame(p.game)) });
  root.append(h('p', { class: 'ct-lead' }, L('Serinin tüm oyunlarını ve katalogdaki en ucuz fiyatlarının toplamını gör.', 'See every game in a series and the total of their cheapest catalogue prices.')), picker.el, out);
  async function showGame(g) {
    out.replaceChildren(loading());
    const fam = await familyRow(g.title_key);
    if (!fam?.series?.length) { out.replaceChildren(h('h3', { class: 'ct-h' }, g.name), empty(L('IGDB bu oyun için bir seri bildirmiyor.', 'IGDB does not list a series for this game.'))); return; }
    paintSeries(fam.series_name, fam.series, g.title_key);
  }
  async function showSeries(name) {
    out.replaceChildren(loading());
    const rows = await rest('game_family?select=series_name,series&series_name=eq.' + encodeURIComponent(name) + '&limit=1').catch(() => []);
    if (!rows[0]?.series?.length) { out.replaceChildren(empty(L('Seri verisi alınamadı.', 'Could not load series data.'))); return; }
    paintSeries(rows[0].series_name, rows[0].series, null);
  }
  async function paintSeries(name, series, selfKey) {
    const list = [...series].filter((e) => e && e.k && KEY_RE.test(e.k)).sort((a, b) => (a.y || 9999) - (b.y || 9999));
    const offers = await offersFor(list.map((e) => e.k)).catch(() => new Map());
    const sum = seriesSummary(list, offers);
    const parts = [h('h3', { class: 'ct-h' }, name, ' ', h('span', { class: 'ct-tag' }, L(`${list.length} oyun`, `${list.length} games`)))];
    parts.push(h('div', { class: 'ct-total' },
      h('span', null, L('Hepsi birden (en ucuz fiyatlarla)', 'All together (cheapest prices)')),
      h('b', null, sum.priced ? money(sum.total) : L('Fiyat yok', 'No price')),
      h('small', null, L(`${sum.priced} oyunun fiyatı toplamda`, `${sum.priced} games counted`) + (sum.foreign ? L(`, ${sum.foreign} oyun dolar fiyatlı (dahil değil)`, `, ${sum.foreign} priced in USD (not counted)`) : '') + (sum.missing ? L(`, ${sum.missing} oyunun fiyatı katalogda yok`, `, ${sum.missing} have no catalogue price`) : ''))));
    parts.push(h('ol', { class: 'ct-list ct-series' }, sum.rows.map(({ entry, best }) => {
      const li = best ? offerRow({ name: entry.n, best, sub: entry.y ? String(entry.y) : '' }) : h('li', { class: 'ct-row' }, h('span', { class: 'ct-ph', 'aria-hidden': 'true' }), h('span', { class: 'ct-txt' }, h('b', null, entry.n), h('small', null, entry.y ? String(entry.y) : '')), h('span', { class: 'ct-price muted' }, L('Fiyat yok', 'No price')));
      if (entry.k === selfKey) li.classList.add('cur');
      return li;
    })));
    parts.push(h('p', { class: 'ct-fine' }, L('Toplam yalnız TRY fiyatlı oyunları sayar; her oyun için en ucuz teklif alınır, DLC dahil değildir. Seri bilgisi: IGDB.', 'The total counts TRY-priced games only, each at its cheapest offer, without DLC. Series data: IGDB.')));
    out.replaceChildren(...parts);
  }
  if (preset) showSeries(preset);
}

// ---- Pencere ----
const TABS = [
  ['dlc', 'Ek paketler', 'Add-ons', renderDlc],
  ['sezon', 'İndirim takvimi', 'Sale calendar', renderSale],
  ['gereksinim', 'Gereksinim', 'Can I run it', renderReq],
  ['seri', 'Seriler', 'Series', renderSeries],
];
let overlay = null, lastFocus = null;
export function closeTools() {
  if (!overlay) return;
  overlay.remove(); overlay = null;
  document.documentElement.classList.remove('ct-lock');
  try { const u = new URL(location.href); if (u.searchParams.has('arac')) { u.searchParams.delete('arac'); u.searchParams.delete('seri'); history.replaceState(null, '', u); } } catch {}
  lastFocus?.focus?.();
}
export function openTools(tab = 'dlc', preset) {
  if (typeof document === 'undefined') return;
  if (!TABS.some((t) => t[0] === tab)) tab = 'dlc';
  lastFocus = document.activeElement;
  overlay?.remove();
  const body = h('div', { class: 'ct-body', id: 'ct-panel', role: 'tabpanel' });
  const bar = h('div', { class: 'ct-tabs', role: 'tablist', 'aria-label': L('Katalog araçları', 'Catalogue tools') });
  const select = (key, p) => {
    for (const b of bar.children) { const on = b.dataset.tab === key; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }
    const t = TABS.find((x) => x[0] === key);
    body.replaceChildren(); body.scrollTop = 0;
    t[3](body, p);
  };
  for (const [key, tr, en] of TABS) bar.append(h('button', { type: 'button', role: 'tab', 'data-tab': key, 'aria-controls': 'ct-panel', onclick: () => select(key) }, L(tr, en)));
  bar.addEventListener('keydown', (e) => {
    const bs = [...bar.children], i = bs.indexOf(document.activeElement);
    if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length];
    n.focus(); n.click(); e.preventDefault();
  });
  const close = h('button', { type: 'button', class: 'ct-close', 'aria-label': L('Kapat', 'Close'), onclick: closeTools }, '✕');
  overlay = h('div', { class: 'ct-overlay', onclick: (e) => { if (e.target === overlay) closeTools(); } },
    h('div', { class: 'ct-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': L('Katalog araçları', 'Catalogue tools') },
      h('div', { class: 'ct-head' }, h('h2', null, L('Katalog araçları', 'Catalogue tools')), close), bar, body));
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeTools(); } });
  document.body.append(overlay);
  document.documentElement.classList.add('ct-lock');
  select(tab, preset);
  close.focus();
}

// ---- Menüye giriş ----
const MENU = [['dlc', 'Ek paket ve DLC takibi', 'DLC and add-on tracking', 'Paketler ve ek içerik fiyatları', 'Bundles and add-on prices'],
  ['sezon', 'İndirim takvimi', 'Sale calendar', 'Sezonlar ve hazırlık listesi', 'Seasons and a prep list'],
  ['gereksinim', 'Bilgisayarım çalıştırır mı?', 'Can my PC run it?', 'Sistem gereksinimi kontrolü', 'System requirement check'],
  ['seri', 'Oyun serileri', 'Game series', 'Serideki oyunlar ve toplam fiyat', 'Series games and total price']];
export function injectMenu(panel) {
  if (!panel || panel.querySelector('[data-ct-menu]')) return;
  const sec = h('section', { 'data-ct-menu': '' }, h('h3', null, L('Katalog araçları', 'Catalogue tools')),
    h('div', { class: 'menu-grid' }, MENU.map(([key, tr, en, str, sen]) => h('button', { type: 'button', onclick: () => { document.querySelector('.menu-overlay')?.click(); openTools(key); } },
      h('i', { 'aria-hidden': 'true' }, { dlc: '＋', sezon: '▦', gereksinim: '⚙', seri: '☰' }[key]),
      h('span', null, h('b', null, L(tr, en)), h('small', null, L(str, sen)))))));
  const extra = panel.querySelector('.menu-extra');
  extra ? panel.insertBefore(sec, extra) : panel.append(sec);
}
export function boot() {
  if (typeof document === 'undefined' || globalThis.__ctBooted) return;
  globalThis.__ctBooted = true;
  const mo = new MutationObserver(() => { const p = document.querySelector('.menu-panel'); if (p) injectMenu(p); });
  mo.observe(document.body, { childList: true, subtree: true });
  globalThis.radarTools = { open: openTools, close: closeTools };
  try {
    const q = new URLSearchParams(location.search), a = q.get('arac');
    if (a) setTimeout(() => openTools(a, a === 'seri' ? q.get('seri') || undefined : undefined), 600);
  } catch {}
}
boot();
