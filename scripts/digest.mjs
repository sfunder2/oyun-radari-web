// Fırsat merkezi sunucu tarafı: haftalık e-posta özeti ve telefona (ntfy) bildirim.
// Saf mantık assets/hub-20261121.js'te; burada veri okuma, gönderme ve "bir kez gönder" kayıtları var.
// Bağımlılığı olmayan, enjekte edilebilir parçalar: sb (scripts/supabase.mjs), get (fetch), mail/ntfy göndericiler.
import { buyAdvice, buildDigest, alarmStatus, normalizeFree, dueReminders, pushMessage, cleanTopic, SITE } from '../assets/hub-20261121.js';

const DAY = 864e5;
const ID_OK = /^[A-Za-z0-9_-]{1,140}$/;
const q = v => '"' + String(v).replace(/"/g, '') + '"';
const num = v => { const n = typeof v === 'string' ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : null; };

export const WEEKLY_GAP_MS = 6.5 * DAY;

// Epic'in ücretsiz oyun yanıtı -> normalizeFree'nin beklediği { id, name, image, end, url } listesi (radar-services epic ile aynı kurallar).
export function parseEpicFree(data, now = Date.now()) {
  const games = [];
  for (const g of data?.data?.Catalog?.searchStore?.elements || []) {
    const offers = g.promotions?.promotionalOffers?.flatMap(x => x.promotionalOffers || []) || [];
    const active = offers.find(x => Date.parse(x.startDate) <= now && Date.parse(x.endDate) > now);
    if (!active || g.price?.totalPrice?.discountPrice !== 0 || !(g.price?.totalPrice?.originalPrice > 0)) continue;
    const slug = g.catalogNs?.mappings?.[0]?.pageSlug || g.productSlug;
    if (!/^[a-zA-Z0-9/_-]+$/.test(slug || '')) continue;
    games.push({ id: g.id, name: g.title, image: g.keyImages?.find(x => /OfferImageWide|DieselStoreFrontWide|Thumbnail/.test(x.type))?.url, end: active.endDate, url: 'https://store.epicgames.com/tr/p/' + slug });
  }
  return games;
}

export async function loadFree({ sb, get, now = Date.now() }) {
  const [epic, offers] = await Promise.all([
    get('https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=tr&country=TR&allowCountries=TR').then(d => parseEpicFree(d, now)).catch(() => []),
    sb.select('store_offers?select=platform,store_id,name,image,url,price,original_price,currency,checked_at&platform=in.(steam,xbox,gog)&price=eq.0&original_price=gt.0&order=checked_at.desc&limit=40').catch(() => []),
  ]);
  return normalizeFree({ epic, offers }, now);
}

export async function loadPrices(sb, favs) {
  const out = {};
  const ps = favs.filter(f => !f.id.includes(':') && ID_OK.test(f.id)).map(f => f.id);
  for (let i = 0; i < ps.length; i += 50) {
    const rows = await sb.select('ps_products?select=id,price,currency,original_price,discount_percent,checked_at&id=in.(' + ps.slice(i, i + 50).map(q).join(',') + ')').catch(() => []);
    for (const r of rows) out[r.id] = { price: num(r.price), originalPrice: num(r.original_price), currency: r.currency || 'TRY', discountPercent: r.discount_percent || 0, checkedAt: r.checked_at };
  }
  const by = {};
  for (const f of favs) { const k = f.id.indexOf(':'); if (k > 0) (by[f.id.slice(0, k)] ||= []).push(f.id.slice(k + 1)); }
  for (const [plat, ids] of Object.entries(by)) {
    const ok = ids.filter(x => ID_OK.test(x));
    for (let i = 0; i < ok.length; i += 50) {
      const rows = await sb.select('store_offers?select=platform,store_id,price,original_price,currency,discount_percent,checked_at&platform=eq.' + encodeURIComponent(plat) + '&store_id=in.(' + ok.slice(i, i + 50).map(q).join(',') + ')').catch(() => []);
      for (const r of rows) out[plat + ':' + r.store_id] = { price: num(r.price), originalPrice: num(r.original_price), currency: r.currency || 'TRY', discountPercent: r.discount_percent || 0, checkedAt: r.checked_at };
    }
  }
  return out;
}

export function historyPath(f) {
  const k = f.id.indexOf(':');
  if (k < 0) return ID_OK.test(f.id) ? 'ps_price_history?select=day,price&order=day.asc&limit=400&product_id=eq.' + encodeURIComponent(f.id) : null;
  const sid = f.id.slice(k + 1);
  return ID_OK.test(sid) ? 'offer_price_history?select=day,price&order=day.asc&limit=400&platform=eq.' + encodeURIComponent(f.id.slice(0, k)) + '&store_id=eq.' + encodeURIComponent(sid) : null;
}

// Yalnız şu an taze fiyatı olan ve hedefe inmemiş favoriler için geçmiş okunur (en çok 12): özet "şimdi al" önerisini bunlardan çıkarır.
export async function loadAdvice(sb, favs, prices, now = Date.now(), limit = 12) {
  const out = {};
  const todo = favs.filter(f => (f.status || 'wish') === 'wish' && prices[f.id]?.price > 0 && now - Date.parse(prices[f.id].checkedAt || '') <= 2 * DAY).slice(0, limit);
  for (const f of todo) {
    const p = historyPath(f);
    if (!p) continue;
    try { out[f.id] = buyAdvice(await sb.select(p), prices[f.id].price, now); } catch { /* öneri atlanır */ }
  }
  return out;
}

async function userFavorites(sb, userId) {
  const rows = await sb.select('radar_user_data?select=favorites&user_id=eq.' + encodeURIComponent(userId));
  const favs = rows?.[0]?.favorites;
  return Array.isArray(favs) ? favs.filter(f => f && typeof f.id === 'string') : [];
}

// Haftalık özet: weekly=true olanlara, son özetten 6,5 gün geçtiyse ve gönderecek haber varsa.
export async function runWeekly({ sb, get, mail, now = Date.now(), log = () => {}, dry = false }) {
  const rows = await sb.select('radar_digest?select=user_id,email,lang,last_digest_at&weekly=eq.true&email=neq.');
  const free = await loadFree({ sb, get, now });
  const result = { users: rows.length, sent: 0, skipped: 0 };
  for (const r of rows) {
    const last = Date.parse(r.last_digest_at || '');
    if (Number.isFinite(last) && now - last < WEEKLY_GAP_MS) { result.skipped++; continue; }
    try {
      const favs = await userFavorites(sb, r.user_id);
      const prices = await loadPrices(sb, favs);
      const advice = await loadAdvice(sb, favs, prices, now);
      const digest = buildDigest({ favs, prices, advice, free, now, en: r.lang === 'en' });
      if (!digest) { result.skipped++; log(`${r.user_id}: haber yok, e-posta gönderilmedi`); continue; }
      if (dry) { log(`[dry] ${r.user_id}: ${digest.subject} (${digest.count} madde)`); continue; }
      await mail({ to: r.email, subject: digest.subject, text: digest.text, html: digest.html });
      await sb.patch('radar_digest?user_id=eq.' + encodeURIComponent(r.user_id), { last_digest_at: new Date(now).toISOString() });
      result.sent++;
    } catch (e) { log(`${r.user_id}: ${e.message}`); }
  }
  return result;
}

// Telefona bildirim: hedefe inen favori (gün başına bir kez) ve bitişi bilinen ücretsiz oyunlar için 24 sa / 2 sa kala.
export async function runPush({ sb, get, ntfy, now = Date.now(), log = () => {}, dry = false }) {
  const rows = (await sb.select('radar_digest?select=user_id,lang,ntfy_topic,pushed&ntfy_topic=not.is.null')).filter(r => cleanTopic(r.ntfy_topic));
  const free = await loadFree({ sb, get, now });
  const day = new Date(now).toISOString().slice(0, 10);
  const result = { users: rows.length, sent: 0 };
  for (const r of rows) {
    try {
      const sent = new Set(Array.isArray(r.pushed) ? r.pushed : []);
      const en = r.lang === 'en';
      const msgs = [];
      for (const d of dueReminders(free, now, sent)) msgs.push({ key: d.key, ...pushMessage('free', { ...d.game, now }, en) });
      const favs = (await userFavorites(sb, r.user_id)).filter(f => num(f.target) !== null);
      if (favs.length) {
        const prices = await loadPrices(sb, favs);
        for (const f of favs) {
          const st = alarmStatus(f, prices[f.id], now);
          const key = `hit:${f.id}:${day}`;
          if (st?.state === 'hit' && !sent.has(key)) msgs.push({ key, ...pushMessage('hit', { name: f.name, price: st.price, currency: f.currency }, en) });
        }
      }
      if (!msgs.length) continue;
      for (const m of msgs.slice(0, 5)) {
        if (dry) log(`[dry] ${r.user_id}: ${m.title} · ${m.body}`);
        else { await ntfy({ topic: r.ntfy_topic, title: m.title, message: m.body, click: m.click || SITE }); result.sent++; }
        sent.add(m.key);
      }
      if (!dry) await sb.patch('radar_digest?user_id=eq.' + encodeURIComponent(r.user_id), { pushed: [...sent].slice(-300) });
    } catch (e) { log(`${r.user_id}: ${e.message}`); }
  }
  return result;
}

// ---- göndericiler ----
export const resendMailer = ({ key, from, fetchImpl = fetch }) => async ({ to, subject, text, html }) => {
  const r = await fetchImpl('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, text, html }), signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('Resend HTTP ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 160));
};
// ntfy JSON yayını: UTF-8 başlık ve gövde (Türkçe karakterler) güvenle gider.
export const ntfySender = ({ server = 'https://ntfy.sh', fetchImpl = fetch } = {}) => async ({ topic, title, message, click }) => {
  const r = await fetchImpl(server, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, title, message, click, tags: ['video_game'] }), signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('ntfy HTTP ' + r.status);
};
