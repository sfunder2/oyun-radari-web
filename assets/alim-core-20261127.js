// Alım rehberi: saf hesaplar (Node'da sınanır). Tarayıcı katmanı alim-20261127.js içindedir.
// Eksik veri üretilmez: veri yoksa sonuç null döner, arayüz "veri yok" yazar.

const finite = v => typeof v === 'number' && Number.isFinite(v);
const num = v => { const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return finite(n) ? n : null; };
const r2 = v => Math.round(v * 100) / 100;
const DAY = 864e5;

/** Başlık anahtarı: sitenin title_key biçimine yakın (küçük harf, yalnız harf/rakam, tek boşluk). */
export function normTitle(s) {
  return String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[™®©]/g, ' ').replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
/** Sürüm eklerini atar ("Deluxe Edition", "GOTY"...) ki aynı oyunun sürümleri eşleşsin. */
export function baseTitle(s) {
  return normTitle(s).replace(/\b(game of the year|goty|deluxe|ultimate|premium|complete|definitive|gold|standard|digital|remastered|edition|collection)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---- 34: Fiyat alarmı kuralları ----
export const ALARM_MODES = ['target', 'percent', 'drop', 'atl'];
/** Kuralı temizler; geçersizse null. target: TL altı; percent: indirim ≥ %değer; drop: eklendiği fiyattan %değer ucuz; atl: tüm zamanların en düşüğü. */
export function cleanRule(r) {
  if (!r || typeof r.id !== 'string' || !/^[A-Za-z0-9:_.-]{1,160}$/.test(r.id) || typeof r.name !== 'string' || !r.name.trim()) return null;
  const mode = ALARM_MODES.includes(r.mode) ? r.mode : null;
  if (!mode) return null;
  let value = num(r.value);
  if (mode === 'target' && !(value > 0)) return null;
  if ((mode === 'percent' || mode === 'drop') && !(value >= 1 && value <= 95)) return null;
  if (mode === 'atl') value = null;
  const base = num(r.base);
  if (mode === 'drop' && !(base > 0)) return null;
  return { id: r.id, name: r.name.trim().slice(0, 120), key: typeof r.key === 'string' ? r.key.slice(0, 160) : '', mode, value, base: mode === 'drop' ? base : null, created: num(r.created) ?? 0, firedAt: num(r.firedAt) ?? 0 };
}
/**
 * Kural şimdi tetikleniyor mu? cur: {priceTry, discount}; low: geçmişteki en düşük (TL, yoksa null) ve lowDays: kayıt süresi.
 * Tetiklenmeyen kural için neden/uzaklık da döner.
 */
export function alarmState(rule, cur, { low = null, lowDays = 0 } = {}) {
  if (!rule || !cur || !finite(cur.priceTry)) return { state: 'stale' };
  const p = cur.priceTry;
  if (rule.mode === 'target') return p <= rule.value ? { state: 'hit', price: p } : { state: p <= rule.value * 1.15 ? 'near' : 'waiting', price: p, gap: p / rule.value - 1 };
  if (rule.mode === 'percent') {
    const d = finite(cur.discount) ? cur.discount : 0;
    return d >= rule.value ? { state: 'hit', price: p, discount: d } : { state: d >= rule.value * 0.8 ? 'near' : 'waiting', price: p, discount: d };
  }
  if (rule.mode === 'drop') {
    const goal = rule.base * (1 - rule.value / 100);
    return p <= goal ? { state: 'hit', price: p, goal } : { state: p <= goal * 1.1 ? 'near' : 'waiting', price: p, goal };
  }
  if (!finite(low) || lowDays < 14) return { state: 'nodata', price: p };
  return p <= low * 1.005 ? { state: 'hit', price: p, low } : { state: p <= low * 1.1 ? 'near' : 'waiting', price: p, low };
}
/** Aynı kuralı arka arkaya tekrar bildirmemek için: son bildirimden bu yana 24 saat geçmeli. */
export const shouldNotify = (rule, st, now = Date.now()) => st?.state === 'hit' && now - (rule.firedAt || 0) > DAY;

// ---- 35: İstek listesi içe aktarma ----
/** Metin, CSV, JSON ya da Steam wishlistdata dışa aktarımından oyun adlarını çıkarır. */
export function parseWishlistText(text, max = 300) {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  const out = [];
  const push = s => { const n = String(s ?? '').replace(/^[\s\-*•\d.)]+(?=\D)/, '').replace(/\s{2,}/g, ' ').trim(); if (n.length >= 2 && n.length <= 140) out.push(n); };
  let parsed = null;
  if (/^[\[{]/.test(raw)) { try { parsed = JSON.parse(raw); } catch { parsed = null; } }
  if (parsed) {
    const walk = v => {
      if (typeof v === 'string') push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        const n = v.name ?? v.title ?? v.game ?? v.Name ?? v.Title;
        if (typeof n === 'string') push(n); else Object.values(v).forEach(walk);
      }
    };
    walk(parsed);
  } else {
    const lines = raw.split(/\r?\n/);
    const head = lines[0].split(/[,;\t]/).map(x => x.trim().replace(/^"|"$/g, '').toLowerCase());
    const col = head.findIndex(h => ['name', 'title', 'game', 'oyun', 'ad', 'game name'].includes(h));
    const csv = col >= 0 && head.length > 1;
    for (const line of csv ? lines.slice(1) : lines) {
      if (!line.trim()) continue;
      if (csv) { const cells = line.match(/("([^"]|"")*"|[^,;\t]*)(?=[,;\t]|$)/g) || []; push((cells[col] || '').replace(/^"|"$/g, '').replace(/""/g, '"')); }
      else push(line.replace(/\s+[-–—|]\s*[₺$€]?\s?\d[\d.,]*\s*(TL|TRY|USD|EUR)?\s*$/i, ''));
    }
  }
  const seen = new Set(), list = [];
  for (const n of out) { const k = normTitle(n); if (k && !seen.has(k)) { seen.add(k); list.push(n); } }
  return list.slice(0, max);
}
/** Ada en uygun katalog kaydı: tam eşleşme, sonra sürüm eklerinden arınmış eşleşme, sonra sözcük örtüşmesi (≥%80). */
export function matchName(name, candidates) {
  const n = normTitle(name), b = baseTitle(name);
  if (!n) return null;
  const list = (candidates || []).filter(c => c && typeof c.name === 'string');
  const exact = list.find(c => normTitle(c.name) === n);
  if (exact) return { game: exact, how: 'exact' };
  const base = list.find(c => baseTitle(c.name) === b && b);
  if (base) return { game: base, how: 'base' };
  const tokens = new Set(b.split(' ').filter(Boolean));
  let best = null, bestScore = 0;
  for (const c of list) {
    const t = baseTitle(c.name).split(' ').filter(Boolean);
    if (!t.length || !tokens.size) continue;
    const inter = t.filter(x => tokens.has(x)).length;
    const score = inter / Math.max(t.length, tokens.size);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best && bestScore >= 0.8 ? { game: best, how: 'fuzzy' } : null;
}

// ---- 36: Kütüphane ve "zaten sahipsin" ----
export function cleanOwned(list) {
  const seen = new Set(), out = [];
  for (const o of Array.isArray(list) ? list : []) {
    if (!o || typeof o.name !== 'string') continue;
    const key = baseTitle(o.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: o.name.trim().slice(0, 140), source: ['steam', 'manual', 'import'].includes(o.source) ? o.source : 'manual', minutes: Math.max(0, Math.floor(num(o.minutes) || 0)), added: num(o.added) ?? 0 });
  }
  return out.slice(0, 5000);
}
export const ownedIndex = owned => new Map(cleanOwned(owned).map(o => [baseTitle(o.name), o]));
/** Oyun (ad ya da başlık anahtarı) kütüphanede mi? Sürüm ekleri yok sayılır. */
export function ownedMatch(idx, ...names) {
  for (const n of names) { const k = baseTitle(n); if (k && idx.has(k)) return idx.get(k); }
  return null;
}

// ---- 37: Paket / DLC dahil toplam ----
/**
 * Ana oyun + seçilen ek paketler toplamı, varsa tam sürüm paketiyle karşılaştırılır.
 * dlcs: [{name, priceTry|null}] · edition: {name, priceTry}|null. Fiyatı bilinmeyen ek paket toplama girmez ve ayrıca sayılır.
 */
export function bundleTotals(base, dlcs, edition) {
  const b = num(base);
  if (b === null) return null;
  const priced = (dlcs || []).filter(d => finite(d.priceTry) && d.priceTry >= 0);
  const unknown = (dlcs || []).length - priced.length;
  const extras = r2(priced.reduce((s, d) => s + d.priceTry, 0));
  const total = r2(b + extras);
  let verdict = null;
  if (edition && finite(edition.priceTry) && priced.length) {
    const diff = r2(total - edition.priceTry);
    verdict = { diff, better: Math.abs(diff) < 1 ? 'same' : diff > 0 ? 'edition' : 'separate', edition: edition.name, editionTry: edition.priceTry };
  }
  return { base: b, extras, total, count: priced.length, unknown, verdict };
}

// ---- 38: Bölgeler arası en ucuz ----
/** countries: regional-prices yanıtı. TR'den en az %10 ve 20 TL ucuz, kuru taze olan en ucuz ülke. */
export function cheapestRegion(countries, homeTry = null) {
  const rows = (countries || []).filter(c => c && c.status === 'ok' && finite(c.price_try) && c.price_try > 0 && !c.fx_stale);
  if (!rows.length) return null;
  const tr = rows.find(c => c.cc === 'TR');
  const home = finite(homeTry) ? homeTry : tr?.price_try ?? null;
  const best = rows.reduce((a, c) => (c.price_try < a.price_try ? c : a));
  const save = home && best.cc !== 'TR' ? r2(home - best.price_try) : 0;
  const pct = home && save > 0 ? Math.round((save / home) * 100) : 0;
  return { best, home, save, pct, worth: save >= 20 && pct >= 10, ranked: [...rows].sort((a, b) => a.price_try - b.price_try) };
}

// ---- 39: Almalı mıyım? skoru ----
/**
 * Girdiler (hepsi isteğe bağlı): priceTry, lowTry (geçmiş dip), lowDays, highTry, discount, score (0-100), cph (TL/saat), worthPct (0-100), nextSaleDays.
 * Bilinen bileşenler ağırlıklarına göre normalleştirilir; en az iki bileşen ve biri fiyat/puan değilse skor üretilmez.
 */
export function buyScore(i) {
  const parts = [];
  const add = (key, weight, value, tr, en) => { if (value !== null && Number.isFinite(value)) parts.push({ key, weight, value: Math.max(0, Math.min(100, Math.round(value))), tr, en }); };
  if (finite(i.priceTry) && finite(i.lowTry) && i.lowTry > 0 && (i.lowDays || 0) >= 14) {
    const gap = i.priceTry / i.lowTry - 1; // 0 = dipte
    add('low', 35, 100 - gap * 250, gap <= 0.005 ? 'Kayıtlı en düşük fiyatta' : `Dibin %${Math.round(gap * 100)} üstünde`, gap <= 0.005 ? 'At the recorded low' : `${Math.round(gap * 100)}% above the low`);
  }
  if (finite(i.discount)) add('disc', 15, (i.discount / 60) * 100, i.discount > 0 ? `%${i.discount} indirimde` : 'İndirim yok', i.discount > 0 ? `${i.discount}% off` : 'Not discounted');
  if (finite(i.score)) add('quality', 25, ((i.score - 50) / 40) * 100, `Puan ${i.score}`, `Score ${i.score}`);
  if (finite(i.cph) && i.cph > 0) add('cph', 12, 100 - (i.cph / 60) * 100, `Saati ₺${Math.round(i.cph)}`, `₺${Math.round(i.cph)} per hour`);
  if (finite(i.worthPct)) add('crowd', 8, i.worthPct, `Topluluk %${Math.round(i.worthPct)} “değer”`, `${Math.round(i.worthPct)}% say worth it`);
  if (finite(i.nextSaleDays) && i.nextSaleDays >= 0 && finite(i.discount) && i.discount < 30) {
    // Büyük indirim yakınsa beklemek mantıklı: 10 gün içindeyse puanı düşürür.
    add('sale', 5, i.nextSaleDays <= 10 ? 20 : i.nextSaleDays <= 30 ? 60 : 100, i.nextSaleDays <= 10 ? `Büyük indirim ${i.nextSaleDays} gün içinde` : 'Yakında büyük indirim yok', i.nextSaleDays <= 10 ? `Big sale within ${i.nextSaleDays} days` : 'No big sale soon');
  }
  const core = parts.filter(p => ['low', 'quality', 'disc'].includes(p.key));
  if (parts.length < 2 || !core.length || !(finite(i.priceTry))) return null;
  const wsum = parts.reduce((s, p) => s + p.weight, 0);
  const total = Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / wsum);
  const verdict = total >= 75 ? 'buy' : total >= 55 ? 'ok' : total >= 35 ? 'wait' : 'skip';
  return { total, verdict, parts, known: parts.length };
}
export const VERDICT_TEXT = {
  buy: ['Şimdi al', 'Buy now'], ok: ['Makul', 'Fair deal'], wait: ['Bekle', 'Wait'], skip: ['Pas geç', 'Skip for now'],
};

// ---- 40: İndirim takvimi hatırlatıcısı ----
const pad = n => String(n).padStart(2, '0');
const icsDate = t => { const d = new Date(t); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`; };
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** Dönem için tam gün etkinliği ve daysBefore gün önce çalan alarm içeren .ics metni. */
export function seasonIcs(season, daysBefore = 3, { en = false, uidHost = 'oyun-radari', now = Date.now() } = {}) {
  if (!season || !finite(season.from) || !finite(season.to)) return '';
  const title = en ? season.en : season.tr;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Oyun Radari//Alim Rehberi//TR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${season.key}-${icsDate(season.from)}@${uidHost}`, `DTSTAMP:${icsDate(now)}T000000Z`,
    `DTSTART;VALUE=DATE:${icsDate(season.from)}`, `DTEND;VALUE=DATE:${icsDate(season.to)}`,
    `SUMMARY:${icsEsc(title + (en ? ' (approx.)' : ' (yaklaşık)'))}`,
    `DESCRIPTION:${icsEsc(en ? 'Stores usually hold this sale around these dates. Exact dates are announced by the stores.' : 'Mağazalar bu indirimi genelde bu tarihlerde yapar. Kesin tarihi mağazalar duyurur.')}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, `TRIGGER:-P${Math.max(0, Math.floor(daysBefore))}D`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
/** Hatırlatma zamanı gelen dönemler: from - daysBefore ≤ şimdi < to ve bu dönem için daha önce bildirilmemiş. */
export function dueSeasonReminders(seasons, prefs, now = Date.now()) {
  const before = Math.max(0, Math.floor(num(prefs?.daysBefore) ?? 3)) * DAY;
  const done = new Set(prefs?.notified || []);
  return (seasons || []).filter(s => prefs?.on && now >= s.from - before && now < s.to && !done.has(s.key + ':' + icsDate(s.from)));
}
export const seasonMark = s => s.key + ':' + icsDate(s.from);

// ---- 41: Anahtar mağazası güvenilirliği ----
// Editör değerlendirmesidir, garanti değildir. Katalogdaki ITAD mağazaları yetkili satıcıdır; pazaryerlerinde satıcı üçüncü taraftır.
export const SHOP_TRUST = {
  playstation: { tier: 'official', name: 'PlayStation Store' }, steam: { tier: 'official', name: 'Steam' }, xbox: { tier: 'official', name: 'Xbox' },
  switch: { tier: 'official', name: 'Nintendo eShop' }, epic: { tier: 'official', name: 'Epic Games' }, gog: { tier: 'official', name: 'GOG' },
  fanatical: { tier: 'authorized', name: 'Fanatical' }, humble: { tier: 'authorized', name: 'Humble Store' }, gmg: { tier: 'authorized', name: 'Green Man Gaming' },
  wingamestore: { tier: 'authorized', name: 'WinGameStore' }, gamesplanet: { tier: 'authorized', name: 'Gamesplanet' },
  gamebillet: { tier: 'authorized', name: 'GameBillet' }, instantgaming: { tier: 'authorized', name: 'Instant Gaming' },
  g2a: { tier: 'market', name: 'G2A' }, kinguin: { tier: 'market', name: 'Kinguin' }, eneba: { tier: 'market', name: 'Eneba' }, gamivo: { tier: 'market', name: 'GAMIVO' },
};
export const TRUST_TEXT = {
  official: { tr: 'Resmî mağaza', en: 'Official store', tipTr: 'Yayıncının ya da platformun kendi mağazası.', tipEn: 'The publisher’s or platform’s own store.' },
  authorized: { tr: 'Yetkili satıcı', en: 'Authorized reseller', tipTr: 'Yayıncılarla çalışan anahtar satıcısı. Anahtar bölge kısıtlı olabilir; ödeme öncesi bölgeyi kontrol et.', tipEn: 'A key shop that works with publishers. Keys can be region-locked; check the region before paying.' },
  market: { tr: 'Pazaryeri — dikkat', en: 'Marketplace — be careful', tipTr: 'Anahtarı üçüncü kişiler satar. Bölge kilidi, iptal ve iade riski vardır; satıcı puanına bak.', tipEn: 'Keys are sold by third parties. Region locks, revoked keys and refund trouble are possible; check seller ratings.' },
  unknown: { tr: 'Tanınmayan mağaza', en: 'Unknown shop', tipTr: 'Bu mağaza hakkında güvenilirlik bilgimiz yok.', tipEn: 'We have no trust information about this shop.' },
};
export const trustOf = platform => SHOP_TRUST[String(platform || '').toLowerCase().replace(/[^a-z0-9]/g, '')] || { tier: 'unknown', name: String(platform || '?') };

// ---- 44: Aylık harcama özeti ----
const valid = p => p && finite(p.amount) && p.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(p.date || '');
export const prevMonth = m => { const [y, mm] = m.split('-').map(Number); return new Date(Date.UTC(y, mm - 2, 1)).toISOString().slice(0, 7); };
/** Cüzdan koçunun alım kayıtlarından ay raporu: toplam, tasarruf, ortalama, en büyük alım, önceki aya göre değişim ve son 6 ay. */
export function monthReport(purchases, month) {
  const all = (purchases || []).filter(valid);
  const of = m => all.filter(p => p.date.slice(0, 7) === m);
  const sum = l => r2(l.reduce((s, p) => s + p.amount, 0));
  const save = p => (finite(p.normal) && p.normal > p.amount ? p.normal - p.amount : 0);
  const list = of(month), prev = of(prevMonth(month));
  const spent = sum(list), saved = r2(list.reduce((s, p) => s + save(p), 0)), prevSpent = sum(prev);
  const months = [];
  for (let i = 5, m = month; i >= 0; i--) { months.unshift(m); m = prevMonth(m); }
  return {
    month, count: list.length, spent, saved, avg: list.length ? r2(spent / list.length) : null,
    savedPct: saved + spent > 0 && saved > 0 ? Math.round((saved / (saved + spent)) * 100) : 0,
    biggest: list.length ? list.reduce((a, p) => (p.amount > a.amount ? p : a)) : null,
    prevSpent, change: prev.length && prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : null,
    history: months.map(m => ({ month: m, spent: sum(of(m)) })), top: [...list].sort((a, b) => b.amount - a.amount).slice(0, 3),
  };
}
export function purchasesCsv(purchases) {
  const q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  return ['date,name,amount,normal_price', ...(purchases || []).filter(valid).sort((a, b) => a.date.localeCompare(b.date)).map(p => [p.date, q(p.name), p.amount, finite(p.normal) ? p.normal : ''].join(','))].join('\n');
}

// ---- 45: Abonelik karşılaştırma ----
export const SUBSCRIPTIONS = [
  { id: 'gp-pc', tr: 'Game Pass (PC)', en: 'Game Pass (PC)', url: 'https://www.xbox.com/tr-TR/xbox-game-pass' },
  { id: 'gp-ult', tr: 'Game Pass Ultimate', en: 'Game Pass Ultimate', url: 'https://www.xbox.com/tr-TR/xbox-game-pass' },
  { id: 'ps-extra', tr: 'PS Plus Extra', en: 'PS Plus Extra', url: 'https://www.playstation.com/tr-tr/ps-plus/' },
  { id: 'ps-prem', tr: 'PS Plus Premium', en: 'PS Plus Premium', url: 'https://www.playstation.com/tr-tr/ps-plus/' },
];
/**
 * Abonelik mi satın alma mı? hoursPerWeek: haftalık oyun süresi; items: {name, priceTry, hours}.
 * Katalog üyeliği verisi olmadığı için "hepsi abonelikte" varsayımıyla ÜST sınır verir; arayüz bunu açıkça söyler.
 */
export function subscriptionPlan({ fee, hoursPerWeek, items }) {
  const f = num(fee), hpw = num(hoursPerWeek);
  if (!(f > 0) || !(hpw > 0)) return null;
  const perMonth = hpw * 4.345;
  const rows = (items || []).filter(i => finite(i.priceTry) && i.priceTry > 0 && finite(i.hours) && i.hours > 0).map(i => {
    const months = Math.max(1, Math.ceil(i.hours / perMonth));
    const subCost = r2(months * f);
    return { name: i.name, priceTry: i.priceTry, hours: i.hours, months, subCost, cheaper: subCost < i.priceTry ? 'sub' : subCost > i.priceTry ? 'buy' : 'same' };
  });
  if (!rows.length) return null;
  const buyTotal = r2(rows.reduce((s, r) => s + r.priceTry, 0));
  const months = Math.max(1, Math.ceil(rows.reduce((s, r) => s + r.hours, 0) / perMonth));
  const subTotal = r2(months * f);
  const breakEvenMonths = Math.floor(buyTotal / f);
  return { rows, buyTotal, months, subTotal, diff: r2(buyTotal - subTotal), cheaper: subTotal < buyTotal ? 'sub' : subTotal > buyTotal ? 'buy' : 'same', breakEvenMonths };
}

// ---- 46: Saat başı sıralama ----
export function rankByCostPerHour(rows, limit = 20) {
  return (rows || []).filter(r => finite(r.cph) && r.cph > 0).sort((a, b) => a.cph - b.cph).slice(0, limit);
}

// ---- 42: Akış geri bildirimi ----
/** Beğenilen/ilgilenilmeyen türlere göre akış sıralamasını ayarlar. liked/hidden: {genres:{ad:sayı}, ids:Set}. */
export function feedAdjust(entries, fb) {
  const liked = fb?.genres || {};
  const hiddenIds = new Set(fb?.hidden || []);
  return (entries || []).filter(e => !hiddenIds.has(e.g.id) && !hiddenIds.has(e.g.key)).map(e => {
    let bonus = 0;
    for (const g of e.g.genres || []) bonus += Math.max(-12, Math.min(12, (liked[g] || 0) * 4));
    return { ...e, s: e.s + bonus, liked: bonus > 0 };
  }).sort((a, b) => b.s - a.s || a.g.priceTry - b.g.priceTry);
}

// ---- 43: Ortak liste kesişimi ----
export function commonGames(mine, theirs) {
  const idx = new Map((mine || []).map(m => [baseTitle(m.name), m]));
  const common = [], onlyTheirs = [];
  for (const t of theirs || []) (idx.has(baseTitle(t.name)) ? common : onlyTheirs).push(t);
  return { common, onlyTheirs };
}
