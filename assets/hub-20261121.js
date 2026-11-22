// Fırsat merkezi (21 Kasım 2026): alarmlar, al/bekle önerisi, ücretsiz oyunlar, bölge uyarısı, e-posta özeti ve paylaşım.
//  1 Fiyat alarmı merkezi: hedefe inen / yaklaşan favoriler, tarayıcı bildirimi, kapalıyken telefona bildirim (ntfy)
//  2 "Almalı mıyım?": fiyat geçmişinden şimdi al / bekle önerisi (tahmin değil, gerekçesi yazılı)
//  3 Paylaşılabilir fırsat kartı (tasarım modülündeki cihazda üretilen görsel)
//  4 Haftalık e-posta özeti (tercih hesapta saklanır, gönderimi scripts/weekly-digest.mjs yapar)
//  5 Ücretsiz oyun takibi (Epic gerçek bitişiyle, Steam/Xbox/GOG fiyatı 0 olanlar) ve süre dolmadan hatırlatma
//  6 Bölgeye göre en ucuz mağaza uyarısı (regional-prices fonksiyonu)
// Saf yardımcılar Node'da sınanır ve digest betiği tarafından da kullanılır. Tarayıcı kodu en sonda ve yalnız tarayıcıda çalışır.
import { nextSeason } from './tasarim-20261117.js';

const DAY = 864e5, HOUR = 36e5;
const num = v => { const n = typeof v === 'string' ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : null; };

// ---- 2: al / bekle ----
export function cleanHistory(rows) {
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const t = Date.parse(String(r?.day || '').slice(0, 10) + 'T00:00:00Z');
    const p = num(r?.price);
    if (Number.isFinite(t) && p !== null && p >= 0) out.push({ t, p });
  }
  return out.sort((a, b) => a.t - b.t);
}

// Öneri üç değerden biridir: buy (dipte), fair (makul, dip değil), wait (bekle). Yeterli geçmiş yoksa unknown.
// Bu bir fiyat tahmini değildir; yalnız şimdiki fiyatı kayıtlı geçmişle ve her yıl yinelenen büyük indirim haftalarıyla kıyaslar.
export function buyAdvice(rows, price, now = Date.now()) {
  const pts = cleanHistory(rows), cur = num(price);
  if (cur === null || cur < 0) return { verdict: 'unknown', why: 'noprice' };
  if (cur === 0) return { verdict: 'buy', why: 'free', price: 0 };
  const span = pts.length ? (pts[pts.length - 1].t - pts[0].t) / DAY : 0;
  if (pts.length < 5 || span < 14) return { verdict: 'unknown', why: 'short', days: Math.round(span) };
  const seen = pts.filter(x => x.p > 0);
  const low = Math.min(...seen.map(x => x.p), cur);
  const lowAt = seen.find(x => x.p === low)?.t ?? null;
  const recent = seen.filter(x => x.t >= now - 365 * DAY);
  const ps = recent.map(x => x.p).sort((a, b) => a - b);
  const median = ps.length ? ps[Math.floor(ps.length / 2)] : null;
  const ratio = cur / low;
  const sale = nextSeason(now);
  const saleSoon = !!sale && sale.days <= 21;
  let verdict;
  if (ratio <= 1.08) verdict = 'buy';
  else if (ratio > 1.25 || saleSoon) verdict = 'wait';
  else verdict = 'fair';
  // Ucuzladıktan sonra kayıtlı en düşüğe eşit ya da altındaysa her zaman al.
  if (cur <= low) verdict = 'buy';
  const dips = recent.filter(x => x.p <= low * 1.08).length;
  return { verdict, price: cur, low, lowAt, median, ratio, days: Math.round(span), saleSoon, sale: sale ? { key: sale.key, tr: sale.tr, en: sale.en, days: sale.days } : null, dips };
}

export function adviceLabel(a, en = false) {
  const m = {
    buy: ['Şimdi al', 'Buy now'], fair: ['Makul', 'Fair'], wait: ['Bekle', 'Wait'], unknown: ['Veri az', 'Not enough data'],
  }[a?.verdict] || ['—', '—'];
  return en ? m[1] : m[0];
}

const fmtMoney = (v, cur, en) => {
  if (!Number.isFinite(v)) return '';
  try { return new Intl.NumberFormat(en ? 'en-US' : 'tr-TR', { style: 'currency', currency: ['TRY', 'USD', 'EUR'].includes(cur) ? cur : 'TRY', maximumFractionDigits: v >= 100 ? 0 : 2 }).format(v); }
  catch { return String(v); }
};
export const money = fmtMoney;

// Önerinin gerekçesi: kısa, kanıta dayalı cümleler.
export function adviceLines(a, cur = 'TRY', en = false) {
  if (!a) return [];
  if (a.verdict === 'unknown') {
    if (a.why === 'noprice') return [en ? 'No current price yet.' : 'Şu an fiyat bilgisi yok.'];
    return [en ? `Only ${a.days || 0} days of price history so far; at least 14 are needed.` : `Fiyat geçmişi henüz ${a.days || 0} gün; öneri için en az 14 gün gerekir.`];
  }
  if (a.why === 'free') return [en ? 'It is free right now.' : 'Şu an ücretsiz.'];
  const out = [];
  const pct = Math.max(0, Math.round((a.ratio - 1) * 100));
  out.push(pct <= 0
    ? (en ? `At the lowest price we have recorded (${fmtMoney(a.low, cur, true)}).` : `Kaydettiğimiz en düşük fiyatta (${fmtMoney(a.low, cur)}).`)
    : (en ? `${pct}% above the lowest we recorded (${fmtMoney(a.low, cur, true)}).` : `Kayıtlı en düşük fiyatın (${fmtMoney(a.low, cur)}) %${pct} üstünde.`));
  if (a.median && a.median > 0) {
    const d = Math.round((1 - a.price / a.median) * 100);
    if (Math.abs(d) >= 3) out.push(d > 0
      ? (en ? `${d}% below its usual price over the past year.` : `Son bir yılın olağan fiyatının %${d} altında.`)
      : (en ? `${-d}% above its usual price over the past year.` : `Son bir yılın olağan fiyatının %${-d} üstünde.`));
  }
  if (a.verdict !== 'buy' && a.sale) {
    if (a.sale.days === 0) out.push(en ? `${a.sale.en} usually runs about now.` : `${a.sale.tr} genelde bu sıralarda.`);
    else if (a.saleSoon) out.push(en ? `${a.sale.en} usually starts in about ${a.sale.days} days.` : `${a.sale.tr} genelde yaklaşık ${a.sale.days} gün sonra başlar.`);
  }
  out.push(en ? `Based on ${a.days} days of price history. This is not a price prediction.` : `${a.days} günlük fiyat geçmişine dayanır. Fiyat tahmini değildir.`);
  return out;
}

// ---- 1: alarm durumu ----
// hit: hedefe ulaştı, near: hedefin %15 yakınında, waiting: uzak, stale: fiyat 24 saatten eski ya da para birimi uyuşmuyor.
export function alarmStatus(fav, cur, now = Date.now()) {
  const target = num(fav?.target);
  if (target === null) return null;
  const price = num(cur?.price);
  if (price === null || (cur.currency && fav.currency && cur.currency !== fav.currency)) return { state: 'stale', target };
  const at = Date.parse(cur.checkedAt || '');
  if (!Number.isFinite(at) || now - at > DAY) return { state: 'stale', target, price };
  if (price <= target) return { state: 'hit', target, price };
  const gap = price / target - 1;
  return { state: target > 0 && gap <= 0.15 ? 'near' : 'waiting', target, price, gap: target > 0 ? gap : null };
}

// ---- 6: bölge uyarısı ----
// Ülke satırları regional-prices çıktısıdır. En ucuz yabancı mağaza TR'den en az %15 ve 20 TL ucuzsa uyarır.
export function regionalAlert(data, { minPct = 15, minTry = 20 } = {}) {
  const rows = Array.isArray(data?.countries) ? data.countries : [];
  const home = rows.find(r => r.cc === 'TR' && r.status === 'ok' && num(r.price_try) > 0);
  if (!home) return null;
  const others = rows.filter(r => r.cc !== 'TR' && r.status === 'ok' && num(r.price_try) !== null && r.price_try > 0 && !r.fx_stale);
  if (!others.length) return null;
  const best = others.reduce((a, b) => (b.price_try < a.price_try ? b : a));
  const save = home.price_try - best.price_try;
  const pct = Math.round((save / home.price_try) * 100);
  if (pct < minPct || save < minTry) return null;
  return { cc: best.cc, name: best.name || best.cc, priceTry: best.price_try, price: num(best.price), currency: best.currency || 'TRY', homeTry: home.price_try, saveTry: Math.round(save * 100) / 100, savePct: pct, url: typeof best.url === 'string' && /^https:\/\//.test(best.url) ? best.url : null };
}

// ---- 5: ücretsiz oyunlar ----
const FREE_STORES = { steam: 'Steam', xbox: 'Xbox', gog: 'GOG', epic: 'Epic Games' };
export function normalizeFree({ epic = [], offers = [] } = {}, now = Date.now()) {
  const out = [];
  for (const g of Array.isArray(epic) ? epic : []) {
    const end = Date.parse(g?.end || '');
    if (!g?.id || !g?.name || !Number.isFinite(end) || end <= now) continue;
    out.push({ key: 'epic:' + g.id, store: 'epic', name: String(g.name).slice(0, 120), image: /^https:\/\//.test(g.image || '') ? g.image : null, url: /^https:\/\//.test(g.url || '') ? g.url : null, end, endKnown: true });
  }
  for (const o of Array.isArray(offers) ? offers : []) {
    if (!o || !FREE_STORES[o.platform] || o.platform === 'epic') continue;
    const price = num(o.price), orig = num(o.original_price), seen = Date.parse(o.checked_at || '');
    if (price !== 0 || orig === null || orig <= 0 || !o.name) continue;
    if (!Number.isFinite(seen) || now - seen > DAY) continue; // yalnız son 24 saatte doğrulananlar
    out.push({ key: o.platform + ':' + o.store_id, store: o.platform, name: String(o.name).slice(0, 120), image: /^https:\/\//.test(o.image || '') ? o.image : null, url: /^https:\/\//.test(o.url || '') ? o.url : null, end: null, endKnown: false, checkedAt: seen, originalPrice: orig, currency: o.currency || 'TRY' });
  }
  return out.sort((a, b) => (a.end ?? Infinity) - (b.end ?? Infinity) || a.name.localeCompare(b.name));
}
export const freeStoreName = k => FREE_STORES[k] || k;

// Bitişi bilinen oyunlar için süre dolmadan önce hatırlatma: 24 saat ve 2 saat kala. Daha önce gönderilenler `sent` kümesindedir.
export function dueReminders(games, now, sent = new Set(), leads = [24, 2]) {
  const out = [];
  for (const g of games || []) {
    if (!g.endKnown || !Number.isFinite(g.end) || g.end <= now) continue;
    const left = g.end - now;
    // Yalnız en yakın uygun eşiği tetikle (örn. 1 saat kalmışsa 24 sa ve 2 sa eşiklerinden yalnız 2 sa).
    const lead = [...leads].sort((a, b) => a - b).find(h => left <= h * HOUR);
    if (lead === undefined) continue;
    const key = `free:${g.key}:${lead}`;
    if (!sent.has(key)) out.push({ key, game: g, lead, left });
  }
  return out;
}

export function timeLeftText(ms, en = false) {
  if (!(ms > 0)) return en ? 'Ended' : 'Bitti';
  const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.max(1, Math.ceil((ms % HOUR) / 6e4));
  if (d >= 1) return en ? `${d} d ${h} h left` : `${d} gün ${h} saat kaldı`;
  if (h >= 1) return en ? `${h} h left` : `${h} saat kaldı`;
  return en ? `${m} min left` : `${m} dakika kaldı`;
}

// ---- 4: özet ----
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const SITE = 'https://sfunder2.github.io/oyun-radari-web/';

// Bir kullanıcının favorileri, güncel fiyatları (prices[id]), önerileri (advice[id]) ve ücretsiz oyunlardan özet üretir.
// Gönderilecek bir şey yoksa null döner: boş e-posta gitmez.
export function buildDigest({ favs = [], prices = {}, advice = {}, free = [], now = Date.now(), en = false } = {}) {
  const hit = [], near = [], drops = [], buys = [];
  for (const f of favs) {
    if (f.status && f.status !== 'wish') continue;
    const cur = prices[f.id];
    const st = alarmStatus(f, cur, now);
    const price = num(cur?.price);
    if (st?.state === 'hit') hit.push({ f, price, target: st.target });
    else if (st?.state === 'near') near.push({ f, price, target: st.target, gap: st.gap });
    const off = num(cur?.discountPercent) || 0;
    const prev = num(f.price);
    const fresh = cur && Number.isFinite(Date.parse(cur.checkedAt || '')) && now - Date.parse(cur.checkedAt) <= 2 * DAY;
    if (fresh && price !== null && (!st || st.state !== 'hit') && (off >= 25 || (prev !== null && prev > 0 && price <= prev * 0.85))) drops.push({ f, price, off, prev });
    if (fresh && advice[f.id]?.verdict === 'buy' && price > 0 && !hit.some(x => x.f.id === f.id)) buys.push({ f, price, a: advice[f.id] });
  }
  const freeList = (free || []).filter(g => !g.endKnown || g.end > now);
  if (!hit.length && !near.length && !drops.length && !buys.length && !freeList.length) return null;
  const T = (tr, e) => (en ? e : tr);
  const lineOf = (f, price, extra) => `${f.name} — ${price === 0 ? T('ücretsiz', 'free') : fmtMoney(price, f.currency, en)}${extra ? ' · ' + extra : ''}`;
  const sections = [];
  if (hit.length) sections.push({ title: T('Hedef fiyatına ulaşanlar', 'Reached your target'), lines: hit.map(x => lineOf(x.f, x.price, T('hedefin ', 'target ') + fmtMoney(x.target, x.f.currency, en))), items: hit.map(x => x.f) });
  if (near.length) sections.push({ title: T('Hedefe yaklaşanlar', 'Close to your target'), lines: near.map(x => lineOf(x.f, x.price, T('hedefin ', 'target ') + fmtMoney(x.target, x.f.currency, en))), items: near.map(x => x.f) });
  if (drops.length) sections.push({ title: T('Favorilerinde indirim', 'Discounts on your favourites'), lines: drops.map(x => lineOf(x.f, x.price, x.off ? '-%' + x.off : '')), items: drops.map(x => x.f) });
  if (buys.length) sections.push({ title: T('Şimdi almak için iyi zaman', 'Good time to buy'), lines: buys.map(x => lineOf(x.f, x.price, T('kayıtlı en düşük fiyata yakın', 'near the lowest we recorded'))), items: buys.map(x => x.f) });
  if (freeList.length) sections.push({ title: T('Ücretsiz oyunlar', 'Free games'), lines: freeList.map(g => `${g.name} — ${freeStoreName(g.store)}${g.endKnown ? ' · ' + timeLeftText(g.end - now, en) : ''}`), items: freeList });
  const count = hit.length + near.length + drops.length + buys.length + freeList.length;
  const subject = hit.length
    ? T(`${hit[0].f.name} hedef fiyatına ulaştı`, `${hit[0].f.name} reached your target price`)
    : T(`Haftalık Oyun Radarı özeti: ${count} gelişme`, `Your weekly Oyun Radarı digest: ${count} updates`);
  const text = [T('Oyun Radarı haftalık özeti', 'Oyun Radarı weekly digest'), '', ...sections.flatMap(s => [s.title, ...s.lines.map(l => '• ' + l), '']), SITE,
    '', T('Bu e-postayı Oyun Radarı > Fırsat merkezi > Özet bölümünden kapatabilirsin.', 'You can turn this email off in Oyun Radarı > Deal hub > Digest.')].join('\n');
  const html = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#16202b"><h1 style="font-size:20px">${esc(T('Oyun Radarı haftalık özeti', 'Oyun Radarı weekly digest'))}</h1>${sections.map(s => `<h2 style="font-size:15px;margin:18px 0 6px">${esc(s.title)}</h2><ul style="padding-left:18px;margin:0">${s.lines.map(l => `<li style="margin:4px 0">${esc(l)}</li>`).join('')}</ul>`).join('')}<p style="margin-top:22px"><a href="${SITE}" style="color:#3d6fb4">${esc(T('Oyun Radarı’nı aç', 'Open Oyun Radarı'))}</a></p><p style="font-size:12px;color:#6b7785">${esc(T('Bu e-postayı Oyun Radarı > Fırsat merkezi > Özet bölümünden kapatabilirsin.', 'You can turn this email off in Oyun Radarı > Deal hub > Digest.'))}</p></div>`;
  return { subject, text, html, count, sections };
}

// ---- telefona bildirim (ntfy) ----
export const TOPIC_RE = /^oyunradari-[a-f0-9]{24}$/;
export function makeTopic(bytes) {
  const hex = Array.from(bytes, b => (b & 255).toString(16).padStart(2, '0')).join('');
  return 'oyunradari-' + hex.slice(0, 24);
}
export const cleanTopic = v => (typeof v === 'string' && TOPIC_RE.test(v) ? v : null);

// ntfy iletisi: başlık ve gövde. Başlık başlık satırında gittiği için ASCII dışı karakterler gövdeye bırakılır.
export function pushMessage(kind, data, en = false) {
  const T = (tr, e) => (en ? e : tr);
  if (kind === 'hit') return { title: T('Hedef fiyata ulaştı', 'Target price reached'), body: `${data.name} · ${data.price === 0 ? T('ücretsiz', 'free') : fmtMoney(data.price, data.currency, en)}`, click: SITE };
  if (kind === 'free') return { title: T('Ücretsiz oyun', 'Free game'), body: `${data.name} · ${freeStoreName(data.store)}${data.endKnown ? ' · ' + timeLeftText(data.end - (data.now ?? Date.now()), en) : ''}`, click: data.url || SITE };
  return null;
}

// ======================= Tarayıcı =======================
const BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined' && typeof localStorage !== 'undefined';
if (BROWSER) initHub();

function initHub() {
  const SB = 'https://dsosckshigzijnsxmlwh.supabase.co';
  const KEY = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
  const ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzb3Nja3NoaWd6aWpuc3htbHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTI4MzMsImV4cCI6MjEwODI2ODgzM30.q18mat-kRqEx9_eNi7botGxD0A1Norl2nsWJOleTeII';
  const root = document.documentElement;
  const en = () => root.lang === 'en';
  const T = (tr, e) => (en() ? e : tr);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const json = (k, d) => { try { const v = JSON.parse(store.get(k) || 'null'); return v ?? d; } catch { return d; } };
  const favs = () => { const v = json('radar-fav-v3', []); return Array.isArray(v) ? v.filter(f => f && typeof f.id === 'string') : []; };
  const SEEN_KEY = 'radar-hub-seen';
  const seen = () => new Set(json(SEEN_KEY, []));
  const markSeen = keys => { const s = seen(); keys.forEach(k => s.add(k)); store.set(SEEN_KEY, JSON.stringify([...s].slice(-400))); };

  const el = (tag, props, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
    return n;
  };

  // ---- veri ----
  async function rest(path) {
    const r = await fetch(SB + '/rest/v1/' + path, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const quote = v => '"' + String(v).replace(/"/g, '') + '"';
  const ID_OK = /^[A-Za-z0-9_-]{1,140}$/;
  async function fetchPrices(list) {
    const out = {};
    const ps = list.filter(f => !f.id.includes(':') && ID_OK.test(f.id)).map(f => f.id);
    for (let i = 0; i < ps.length; i += 50) {
      try {
        const rows = await rest('ps_products?select=id,price,currency,original_price,discount_percent,checked_at,lowest_ever,historical_low,history_days&id=in.(' + ps.slice(i, i + 50).map(quote).join(',') + ')');
        for (const r of rows) out[r.id] = { price: num(r.price), currency: r.currency || 'TRY', discountPercent: r.discount_percent || 0, checkedAt: r.checked_at };
      } catch { /* bir parça başarısız olursa kalanlar yine gösterilir */ }
    }
    const by = {};
    for (const f of list) { const k = f.id.indexOf(':'); if (k > 0) (by[f.id.slice(0, k)] ||= []).push(f.id.slice(k + 1)); }
    for (const [plat, ids] of Object.entries(by)) {
      const ok = ids.filter(x => ID_OK.test(x));
      for (let i = 0; i < ok.length; i += 50) {
        try {
          const rows = await rest('store_offers?select=platform,store_id,price,currency,discount_percent,checked_at&platform=eq.' + encodeURIComponent(plat) + '&store_id=in.(' + ok.slice(i, i + 50).map(quote).join(',') + ')');
          for (const r of rows) out[plat + ':' + r.store_id] = { price: num(r.price), currency: r.currency || 'TRY', discountPercent: r.discount_percent || 0, checkedAt: r.checked_at };
        } catch { /* aynı */ }
      }
    }
    return out;
  }
  function historyPath(f) {
    const k = f.id.indexOf(':');
    if (k < 0) return ID_OK.test(f.id) ? 'ps_price_history?select=day,price&order=day.asc&limit=400&product_id=eq.' + encodeURIComponent(f.id) : null;
    const plat = f.id.slice(0, k), sid = f.id.slice(k + 1);
    return ID_OK.test(sid) ? 'offer_price_history?select=day,price&order=day.asc&limit=400&platform=eq.' + encodeURIComponent(plat) + '&store_id=eq.' + encodeURIComponent(sid) : null;
  }
  const cache = new Map();
  const cached = (key, ttl, load) => {
    const c = cache.get(key);
    if (c && Date.now() - c.at < ttl) return c.p;
    const p = load().catch(e => { cache.delete(key); throw e; });
    cache.set(key, { at: Date.now(), p });
    return p;
  };
  const getPrices = list => cached('prices:' + list.map(f => f.id).join('|'), 5 * 6e4, () => fetchPrices(list));
  const getHistory = f => { const p = historyPath(f); return p ? cached('hist:' + f.id, 30 * 6e4, () => rest(p)) : Promise.resolve([]); };
  const getFree = () => cached('free', 10 * 6e4, async () => {
    const [epic, offers] = await Promise.all([
      fetch(SB + '/functions/v1/radar-services?action=epic', { headers: { Authorization: 'Bearer ' + ANON_JWT }, signal: AbortSignal.timeout(20000) }).then(r => (r.ok ? r.json() : { games: [] })).then(d => d.games || []).catch(() => []),
      rest('store_offers?select=platform,store_id,name,image,url,price,original_price,currency,checked_at&platform=in.(steam,xbox,gog)&price=eq.0&original_price=gt.0&order=checked_at.desc&limit=40').catch(() => []),
    ]);
    return normalizeFree({ epic, offers }, Date.now());
  });
  const getRegional = f => {
    const k = f.id.indexOf(':');
    const platform = k < 0 ? 'playstation' : f.id.slice(0, k), id = k < 0 ? f.id : f.id.slice(k + 1);
    if (!['playstation', 'steam', 'xbox', 'gog', 'epic'].includes(platform) || !/^[A-Za-z0-9_.-]{1,64}$/.test(id)) return Promise.resolve(null);
    const q = new URLSearchParams({ platform, id, name: f.name || '' });
    return cached('reg:' + f.id, 6 * 36e5, () => fetch(SB + '/functions/v1/regional-prices?' + q, { headers: { Authorization: 'Bearer ' + ANON_JWT }, signal: AbortSignal.timeout(45000) }).then(r => (r.ok ? r.json() : null)));
  };

  // ---- oturum ve tercihler ----
  function session() {
    try {
      const t = JSON.parse(localStorage.getItem('radar-auth') || sessionStorage.getItem('radar-auth') || 'null');
      return t?.access_token && t.user?.id ? t : null;
    } catch { return null; }
  }
  async function userRest(path, init = {}) {
    const s = session();
    if (!s) throw new Error('login');
    if (s.expires_at && s.expires_at < Date.now() + 15e3) throw new Error('expired');
    const r = await fetch(SB + '/rest/v1/' + path, { ...init, headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates', ...(init.headers || {}) }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.status === 204 ? null : r.json();
  }
  const getPrefs = async () => (await userRest('radar_digest?select=weekly,lang,ntfy_topic,email,last_digest_at')).at?.(0) ?? null;
  const savePrefs = patch => userRest('radar_digest?on_conflict=user_id', { method: 'POST', body: JSON.stringify({ user_id: session().user.id, lang: en() ? 'en' : 'tr', ...patch }) });

  // ---- arayüz ----
  const ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  let fab, badge, panel, tab = 'alarms', body, tabs;
  const TABS = [['alarms', 'Alarmlar', 'Alerts'], ['advice', 'Al / bekle', 'Buy / wait'], ['free', 'Ücretsiz', 'Free'], ['region', 'Bölge', 'Region'], ['digest', 'Özet', 'Digest']];

  function mount() {
    if (fab) return;
    fab = el('button', { type: 'button', class: 'hub-fab', 'aria-haspopup': 'dialog', onclick: open });
    fab.innerHTML = ICON;
    badge = el('b', { class: 'hub-badge', hidden: true });
    fab.append(badge);
    document.body.append(fab);
    refreshFab();
  }
  function refreshFab() {
    if (!fab) return;
    const label = T('Fırsat merkezi', 'Deal hub');
    fab.setAttribute('aria-label', label); fab.title = label;
  }
  function setBadge(n) {
    if (!badge) return;
    badge.hidden = !(n > 0);
    badge.textContent = n > 9 ? '9+' : String(n);
  }

  function open() {
    if (panel) return;
    const prevFocus = document.activeElement;
    panel = el('div', { class: 'hub-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': T('Fırsat merkezi', 'Deal hub') });
    const sheet = el('div', { class: 'hub-sheet' });
    const head = el('div', { class: 'hub-head' }, el('h2', null, T('Fırsat merkezi', 'Deal hub')), el('button', { type: 'button', class: 'hub-close', 'aria-label': T('Kapat', 'Close'), onclick: close }, '×'));
    tabs = el('div', { class: 'hub-tabs', role: 'tablist' }, TABS.map(([k, tr, e]) => el('button', { type: 'button', role: 'tab', 'data-tab': k, 'aria-selected': String(k === tab), onclick: () => { tab = k; render(); } }, T(tr, e))));
    body = el('div', { class: 'hub-body', role: 'tabpanel', tabindex: '-1' });
    sheet.append(head, tabs, body);
    panel.append(sheet);
    panel.addEventListener('mousedown', e => { if (e.target === panel) close(); });
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    panel._off = () => { document.removeEventListener('keydown', onKey, true); prevFocus && prevFocus.focus && prevFocus.focus(); };
    document.body.append(panel);
    document.body.classList.add('hub-lock');
    render();
    head.querySelector('.hub-close').focus();
  }
  function close() {
    if (!panel) return;
    panel._off(); panel.remove(); panel = null; body = null;
    document.body.classList.remove('hub-lock');
  }

  const waitNote = txt => el('p', { class: 'hub-note hub-wait' }, txt);
  const empty = txt => el('p', { class: 'hub-empty' }, txt);
  const initial = f => el('i', { class: 'hub-noimg' }, String(f.name || '?').trim().charAt(0).toUpperCase());
  const thumb = f => {
    if (!f.image) return initial(f);
    const img = el('img', { src: f.image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => img.replaceWith(initial(f)), { once: true });
    return img;
  };

  let shareFn = null;
  async function shareItem(f, price, btn) {
    try { shareFn ||= (await import('./tasarim-20261117.js')).openShare; } catch { return; }
    if (typeof shareFn !== 'function') return;
    shareFn({ name: f.name, image: f.image, price: price?.price ?? f.price, originalPrice: price?.originalPrice ?? null, currency: price?.currency || f.currency || 'TRY', platform: platformOf(f) }, btn);
  }
  const platformOf = f => (f.id.includes(':') ? f.id.slice(0, f.id.indexOf(':')) : 'playstation');
  const shareBtn = (f, price) => el('button', { type: 'button', class: 'hub-mini', onclick: e => shareItem(f, price, e.currentTarget) }, T('Paylaş', 'Share'));

  function render() {
    if (!body) return;
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    body.replaceChildren();
    const draw = { alarms: drawAlarms, advice: drawAdvice, free: drawFree, region: drawRegion, digest: drawDigest }[tab];
    const token = (render.token = (render.token || 0) + 1);
    draw(body, () => token === render.token && !!body);
  }

  // 1 — Alarmlar
  async function drawAlarms(box, live) {
    const list = favs().filter(f => num(f.target) !== null);
    const exp = json('radar-experience-v1', {});
    const history = Array.isArray(exp.wishAlerts) ? exp.wishAlerts.slice(0, 6) : [];
    box.append(el('p', { class: 'hub-lead' }, T('Favorine hedef fiyat koyduğunda burada izlenir. Fiyat hedefe inince ya da yaklaşınca haber veririz.', 'Set a target price on a favourite and it is tracked here. We let you know when the price reaches or nears it.')));
    if (!list.length) box.append(empty(T('Henüz alarm yok. Bir oyunun sayfasında “Fiyat alarmı kur” ile hedef fiyat belirle.', 'No alerts yet. Open a game and use “Set price alert” to pick a target price.')));
    else {
      const wait = waitNote(T('Güncel fiyatlar okunuyor…', 'Reading current prices…'));
      box.append(wait);
      let prices = {};
      try { prices = await getPrices(list); } catch { /* hata gösterilir */ }
      if (!live()) return;
      wait.remove();
      const ul = el('ul', { class: 'hub-list' });
      const order = { hit: 0, near: 1, waiting: 2, stale: 3 };
      const rows = list.map(f => ({ f, st: alarmStatus(f, prices[f.id]) })).sort((a, b) => order[a.st.state] - order[b.st.state]);
      for (const { f, st } of rows) {
        const chip = { hit: [T('Hedefte', 'On target'), 'ok'], near: [T('Yaklaştı', 'Close'), 'warn'], waiting: [T('Bekliyor', 'Waiting'), ''], stale: [T('Fiyat yok', 'No fresh price'), 'mute'] }[st.state];
        ul.append(el('li', { class: 'hub-row' }, thumb(f),
          el('div', { class: 'hub-main' }, el('b', null, f.name), el('small', null, T('Hedef ', 'Target '), money(st.target, f.currency, en()), st.price != null ? ` · ${T('şimdi', 'now')} ${money(st.price, f.currency, en())}` : '')),
          el('span', { class: 'hub-chip ' + chip[1] }, chip[0])));
      }
      box.append(ul);
      setBadge(rows.filter(r => r.st.state === 'hit').length);
    }
    if (history.length) {
      box.append(el('h3', null, T('Son uyarılar', 'Recent alerts')), el('ul', { class: 'hub-list compact' }, history.map(a => el('li', { class: 'hub-row' }, el('div', { class: 'hub-main' }, el('b', null, a.name), el('small', null, `${a.reason || ''}${Number.isFinite(a.price) ? ' · ' + money(a.price, a.currency, en()) : ''}`))))));
    }
    // bildirim izni
    const perm = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
    const nb = el('div', { class: 'hub-card' }, el('h3', null, T('Bildirimler', 'Notifications')));
    if (perm === 'granted') nb.append(el('p', { class: 'hub-note' }, T('Tarayıcı bildirimi açık. Site açıkken hedef, ücretsiz oyun ve bölge uyarıları bildirim olarak gelir.', 'Browser notifications are on. While the site is open you get alerts for targets, free games and cheaper regions.')));
    else if (perm === 'default') nb.append(el('button', { type: 'button', class: 'hub-btn', onclick: async () => { try { await Notification.requestPermission(); } catch {} render(); } }, T('Tarayıcı bildirimine izin ver', 'Allow browser notifications')));
    else nb.append(el('p', { class: 'hub-note' }, perm === 'denied' ? T('Tarayıcı bildirimleri kapalı; uyarılar yalnız site içinde görünür.', 'Browser notifications are blocked; alerts only show inside the site.') : T('Bu tarayıcı bildirimleri desteklemiyor.', 'This browser does not support notifications.')));
    nb.append(el('p', { class: 'hub-note' }, T('Site kapalıyken telefona bildirim için “Özet” sekmesine bak.', 'To get phone alerts while the site is closed, see the “Digest” tab.')));
    box.append(nb);
  }

  // 2 — Al / bekle
  async function drawAdvice(box, live) {
    const list = favs().filter(f => (f.status || 'wish') === 'wish').slice(0, 12);
    box.append(el('p', { class: 'hub-lead' }, T('Favorilerin için fiyat geçmişine bakıp “şimdi al” ya da “bekle” diyoruz. Bu bir fiyat tahmini değildir; gerekçesi her satırda yazar.', 'We read each favourite’s price history and say “buy now” or “wait”. It is not a price prediction; every row shows its reasoning.')));
    if (!list.length) { box.append(empty(T('Önce birkaç oyunu favorilere ekle.', 'Add a few games to your favourites first.'))); return; }
    const ul = el('ul', { class: 'hub-list' });
    box.append(ul);
    const prices = await getPrices(list).catch(() => ({}));
    if (!live()) return;
    const rows = list.map(f => {
      const li = el('li', { class: 'hub-row tall' }, thumb(f), el('div', { class: 'hub-main' }, el('b', null, f.name), el('small', { class: 'hub-wait' }, T('Geçmiş okunuyor…', 'Reading history…'))));
      ul.append(li);
      return { f, li };
    });
    let idx = 0;
    const work = async () => {
      while (idx < rows.length) {
        const { f, li } = rows[idx++];
        const cur = prices[f.id];
        let a;
        try { a = buyAdvice(await getHistory(f), cur?.price ?? f.price, Date.now()); } catch { a = { verdict: 'unknown', why: 'short', days: 0 }; }
        if (!live()) return;
        const main = li.querySelector('.hub-main');
        main.replaceChildren(el('b', null, f.name), el('ul', { class: 'hub-why' }, adviceLines(a, f.currency, en()).map(t => el('li', null, t))));
        li.append(el('div', { class: 'hub-side' }, el('span', { class: 'hub-chip v-' + a.verdict }, adviceLabel(a, en())), a.verdict !== 'unknown' ? shareBtn(f, cur) : null));
      }
    };
    await Promise.all([work(), work(), work()]);
  }

  // 5 — Ücretsiz oyunlar
  async function drawFree(box, live) {
    box.append(el('p', { class: 'hub-lead' }, T('Epic’te bitiş saati gerçektir. Steam, Xbox ve GOG’da fiyatı 0 olanlar son 24 saatte doğrulanmışsa gösterilir; bitiş saatini bilmiyorsak yazmayız.', 'Epic end times are real. For Steam, Xbox and GOG we list games priced 0 and verified in the last 24 hours; when we do not know the end time we do not claim one.')));
    const wait = waitNote(T('Ücretsiz oyunlar aranıyor…', 'Looking for free games…'));
    box.append(wait);
    let games = [];
    try { games = await getFree(); } catch { /* boş */ }
    if (!live()) return;
    wait.remove();
    if (!games.length) { box.append(empty(T('Şu an doğrulanmış ücretsiz oyun yok.', 'No verified free games right now.'))); return; }
    const ul = el('ul', { class: 'hub-list' });
    for (const g of games) {
      const left = g.endKnown ? g.end - Date.now() : null;
      ul.append(el('li', { class: 'hub-row' }, thumb(g),
        el('div', { class: 'hub-main' }, el('b', null, g.name), el('small', { class: left != null && left < 2 * HOUR ? 'hub-hot' : '' }, freeStoreName(g.store), ' · ', g.endKnown ? timeLeftText(left, en()) : T('bitiş saati bilinmiyor', 'end time unknown'))),
        el('div', { class: 'hub-side' }, g.url ? el('a', { class: 'hub-mini primary', href: g.url, target: '_blank', rel: 'noreferrer' }, T('Mağazada aç', 'Open store')) : null)));
    }
    box.append(ul);
    box.append(el('p', { class: 'hub-note' }, T('Epic oyunları için süre dolmadan 24 saat ve 2 saat kala bildirim gelir (site açıkken, tarayıcı bildirimi izniyle; kapalıyken Özet sekmesindeki telefon bildirimiyle).', 'For Epic games you get a reminder 24 hours and 2 hours before it ends (while the site is open with notifications allowed; with the site closed, use the phone alerts in the Digest tab).')));
  }

  // 6 — Bölge
  async function drawRegion(box, live) {
    const list = favs().filter(f => (f.status || 'wish') === 'wish').slice(0, 8);
    box.append(el('p', { class: 'hub-lead' }, T('Başka bir ülkenin mağazası Türkiye fiyatından en az %15 ve 20 TL ucuzsa burada gösterilir. Fiyatlar TL’ye güncel kurla çevrilir; kart komisyonu ve ülke kısıtları dahil değildir.', 'If another country’s store is at least 15% and 20 TRY cheaper than Türkiye it shows here. Prices are converted to TRY at the current rate; card fees and regional locks are not included.')));
    if (!list.length) { box.append(empty(T('Önce birkaç oyunu favorilere ekle.', 'Add a few games to your favourites first.'))); return; }
    const ul = el('ul', { class: 'hub-list' });
    const wait = waitNote(T('Ülke fiyatları okunuyor… (ilk seferde birkaç saniye sürebilir)', 'Reading country prices… (can take a few seconds the first time)'));
    box.append(wait, ul);
    let found = 0, done = 0;
    await Promise.all(list.map(async f => {
      let a = null;
      try { a = regionalAlert(await getRegional(f)); } catch { /* atla */ }
      done++;
      if (!live()) return;
      if (a) {
        found++;
        ul.append(el('li', { class: 'hub-row' }, thumb(f), el('div', { class: 'hub-main' }, el('b', null, f.name), el('small', null, `${a.name}: ≈ ${money(a.priceTry, 'TRY', en())} · ${T('Türkiye', 'Türkiye')} ${money(a.homeTry, 'TRY', en())}`)), el('div', { class: 'hub-side' }, el('span', { class: 'hub-chip ok' }, '-%' + a.savePct), a.url ? el('a', { class: 'hub-mini primary', href: a.url, target: '_blank', rel: 'noreferrer' }, T('Aç', 'Open')) : null)));
      }
      wait.textContent = T(`${done}/${list.length} oyun kontrol edildi`, `${done}/${list.length} games checked`);
    }));
    if (!live()) return;
    wait.remove();
    if (!found) box.append(empty(T('Favorilerinde Türkiye’den belirgin ucuz bir ülke bulunamadı.', 'None of your favourites is clearly cheaper in another country.')));
  }

  // 4 + telefon bildirimi — Özet
  async function drawDigest(box, live) {
    box.append(el('p', { class: 'hub-lead' }, T('Haftada bir e-posta özeti ve site kapalıyken telefona bildirim. İkisi de hesabındaki favorilerden üretilir; sunucu tarafı için hesabına giriş yapmış olman gerekir.', 'A weekly email digest and phone alerts while the site is closed. Both are built from the favourites in your account, so you need to be signed in.')));
    if (!session()) { box.append(empty(T('Giriş yapmadın. Önce hesabınla giriş yap, sonra buraya dön.', 'You are not signed in. Sign in first, then come back here.'))); return; }
    const wait = waitNote(T('Tercihlerin okunuyor…', 'Loading your settings…'));
    box.append(wait);
    let prefs = null, failed = false;
    try { prefs = await getPrefs(); } catch (e) { failed = e.message; }
    if (!live()) return;
    wait.remove();
    if (failed) {
      box.append(empty(failed === 'expired' ? T('Oturumun süresi dolmuş görünüyor. Sayfayı yenileyip tekrar dene.', 'Your session looks expired. Reload the page and try again.') : T('Tercihler okunamadı. Bu özellik için veritabanı kurulumu gerekebilir (supabase/schema-v51-fiyat-merkezi.sql).', 'Could not load settings. This feature may need the database set up (supabase/schema-v51-fiyat-merkezi.sql).')));
      return;
    }
    const msg = el('p', { class: 'hub-note', role: 'status' });
    const say = t => { msg.textContent = t; };
    const email = session().user.email || '';
    const weekly = el('input', { type: 'checkbox', id: 'hub-weekly' });
    weekly.checked = !!prefs?.weekly;
    weekly.addEventListener('change', async () => {
      weekly.disabled = true;
      try { await savePrefs({ weekly: weekly.checked }); say(weekly.checked ? T('Haftalık özet açıldı.', 'Weekly digest turned on.') : T('Haftalık özet kapatıldı.', 'Weekly digest turned off.')); }
      catch { weekly.checked = !weekly.checked; say(T('Kaydedilemedi.', 'Could not save.')); }
      weekly.disabled = false;
    });
    box.append(el('div', { class: 'hub-card' }, el('h3', null, T('Haftalık e-posta özeti', 'Weekly email digest')),
      el('label', { class: 'hub-switch', for: 'hub-weekly' }, weekly, el('span', null, T('Haftalık özet gönder', 'Send a weekly digest'))),
      el('p', { class: 'hub-note' }, T(`Adres: ${email}. Özet yalnız gerçekten haber varsa (hedefe inen, indirimdeki favori, ücretsiz oyun) gider; boş e-posta göndermeyiz.`, `Address: ${email}. A digest is only sent when there is news (a target reached, a discounted favourite, a free game); we never send empty emails.`)),
      prefs?.last_digest_at ? el('p', { class: 'hub-note' }, T('Son özet: ', 'Last digest: '), new Date(prefs.last_digest_at).toLocaleDateString(en() ? 'en-GB' : 'tr-TR')) : null));

    // ntfy
    const topic = cleanTopic(prefs?.ntfy_topic);
    const nt = el('div', { class: 'hub-card' }, el('h3', null, T('Telefona bildirim (ücretsiz)', 'Phone alerts (free)')));
    if (topic) {
      const url = 'https://ntfy.sh/' + topic;
      nt.append(
        el('p', { class: 'hub-note' }, T('Telefonuna ücretsiz ntfy uygulamasını kur, “Konuya abone ol” de ve şu konu adını gir:', 'Install the free ntfy app on your phone, choose “Subscribe to topic” and enter this topic name:')),
        el('code', { class: 'hub-topic' }, topic),
        el('div', { class: 'hub-actions' },
          el('button', { type: 'button', class: 'hub-btn', onclick: async () => { try { await navigator.clipboard.writeText(topic); say(T('Konu adı kopyalandı.', 'Topic name copied.')); } catch { say(url); } } }, T('Kopyala', 'Copy')),
          el('a', { class: 'hub-btn', href: url, target: '_blank', rel: 'noreferrer' }, T('Tarayıcıda aç', 'Open in browser')),
          el('button', { type: 'button', class: 'hub-btn ghost', onclick: async () => { try { await savePrefs({ ntfy_topic: null }); render(); } catch { say(T('Kapatılamadı.', 'Could not turn off.')); } } }, T('Kapat', 'Turn off'))),
        el('p', { class: 'hub-note' }, T('Konu adını bilen herkes bildirimleri okuyabilir; rastgele üretilmiştir, paylaşma. Bildirimde oyun adı ve fiyat bulunur, başka kişisel bilgi yoktur.', 'Anyone who knows the topic name can read the alerts; it is random, do not share it. Alerts contain the game name and price only, no other personal data.')));
    } else {
      nt.append(el('p', { class: 'hub-note' }, T('Hedef fiyata inen favori ve süresi dolmak üzere olan ücretsiz oyun için, site kapalıyken bile telefonuna bildirim gelir.', 'Get a phone alert for a favourite reaching its target and for free games about to end, even when the site is closed.')),
        el('button', { type: 'button', class: 'hub-btn', onclick: async () => {
          try { await savePrefs({ ntfy_topic: makeTopic(crypto.getRandomValues(new Uint8Array(12))) }); render(); } catch { say(T('Açılamadı.', 'Could not turn on.')); }
        } }, T('Telefona bildirimi aç', 'Turn on phone alerts')));
    }
    box.append(nt, msg);
  }

  // ---- arka plan: site açıkken ücretsiz oyun hatırlatması ve bölge/hedef rozeti ----
  async function background() {
    mount();
    const list = favs();
    const targets = list.filter(f => num(f.target) !== null);
    let hits = 0;
    if (targets.length) {
      try { const p = await getPrices(targets); hits = targets.filter(f => alarmStatus(f, p[f.id])?.state === 'hit').length; } catch { /* sessiz */ }
    }
    let due = [];
    try { due = dueReminders(await getFree(), Date.now(), seen()); } catch { /* sessiz */ }
    setBadge(hits + due.length);
    if (due.length && typeof Notification !== 'undefined' && Notification.permission === 'granted' && !(json('radar-experience-v1', {}).quiet)) {
      for (const d of due.slice(0, 3)) {
        try { new Notification(d.game.name, { body: (en() ? 'Free ' : 'Ücretsiz ') + '· ' + freeStoreName(d.game.store) + ' · ' + timeLeftText(d.left, en()) }); } catch { /* sessiz */ }
      }
      markSeen(due.map(d => d.key));
    }
  }

  const start = () => { mount(); setTimeout(background, 4000); setInterval(background, 15 * 6e4); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  new MutationObserver(refreshFab).observe(root, { attributes: true, attributeFilter: ['lang'] });
}
