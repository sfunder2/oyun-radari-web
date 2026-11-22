// Kişisel merkez (21 Kasım 2026): "Senin için", bütçeye göre sepet, gizli hazine, ortak istek listesi ve hediye önerisi,
// 2–3 oyun karşılaştırma, topluluğun "fiyatına değer mi?" oyu ve saat başı maliyet.
//
// Her şey bu dosyada ve hub-20261121.css'te yaşar; derlenmiş React paketine dokunulmaz.
//  * Veri, sitenin zaten kullandığı search_market RPC'sinden (Mac mini ya da Supabase) ve game_ttb tablosundan okunur.
//  * Oyun ayrıntısında yalnız kendi eklediğimiz bölüm (data-dt-own) eklenir.
//  * Tercihler (karşılaştırma tepsisi, bütçe) yalnız bu cihazda tutulur. Oylar için supabase/schema-v50-fiyata-deger-mi.sql gerekir;
//    şema yoksa oylama sessizce gizlenir, geri kalanı çalışır.
// Eksik veri üretilmez: kuru, süreyi ya da puanı bilinmeyen oyun o hesabın dışında kalır.

// ---- Saf yardımcılar (Node'da sınanır) ----
export const OFFICIAL = ['playstation', 'steam', 'xbox', 'switch', 'epic', 'gog'];
export const STORE_NAME = { playstation: 'PlayStation Store', steam: 'Steam', xbox: 'Xbox', switch: 'Nintendo eShop', epic: 'Epic Games', gog: 'GOG' };

// Sitenin oyuncu tarzları (index paketindeki listenin aynısı). Kimlikler hesaba senkronlanan "personas" ile eşleşir.
export const PERSONAS = [
  { id: 'story', tr: 'Hikâye avcısı', en: 'Story hunter', genres: ['Macera', 'RPG'], tags: ['Story Rich', 'Choices Matter', 'Narrative', 'Great Soundtrack'] },
  { id: 'action', tr: 'Aksiyon tutkunu', en: 'Action fan', genres: ['Aksiyon'], tags: ['Shooter', 'FPS', 'Hack and Slash', 'Fast-Paced', 'Souls-like'] },
  { id: 'strategy', tr: 'Stratejist', en: 'Strategist', genres: ['Strateji'], tags: ['Turn-Based Strategy', 'Tactical', 'Grand Strategy', 'RTS', 'Base Building'] },
  { id: 'explorer', tr: 'Kâşif', en: 'Explorer', genres: ['Macera'], tags: ['Open World', 'Exploration', 'Survival', 'Sandbox'] },
  { id: 'competitive', tr: 'Rekabetçi', en: 'Competitive', genres: ['Spor', 'Yarış'], tags: ['Competitive', 'PvP', 'Esports', 'Racing'] },
  { id: 'cozy', tr: 'Rahat oyuncu', en: 'Cozy player', genres: ['Rahat', 'Simülasyon'], tags: ['Relaxing', 'Cozy', 'Farming Sim', 'Life Sim', 'Cute'] },
  { id: 'social', tr: 'Birlikte oynayan', en: 'Plays together', genres: ['MMO'], tags: ['Co-op', 'Online Co-Op', 'Local Co-Op', 'Multiplayer', 'Party Game'] },
  { id: 'horror', tr: 'Gerilim seven', en: 'Thriller fan', genres: [], tags: ['Horror', 'Survival Horror', 'Psychological Horror', 'Atmospheric'] },
  { id: 'indie', tr: 'Bağımsız ruh', en: 'Indie soul', genres: ['Bağımsız'], tags: ['Pixel Graphics', 'Roguelike', 'Metroidvania', 'Platformer', 'Puzzle'] },
];
export const GENRES = ['Aksiyon', 'Macera', 'RPG', 'Strateji', 'Simülasyon', 'Spor', 'Yarış', 'Bağımsız', 'Rahat', 'MMO'];
export const GENRE_EN = { Aksiyon: 'Action', Macera: 'Adventure', RPG: 'RPG', Strateji: 'Strategy', 'Simülasyon': 'Simulation', Spor: 'Sports', 'Yarış': 'Racing', 'Bağımsız': 'Indie', Rahat: 'Casual', MMO: 'MMO' };

const finite = v => typeof v === 'number' && Number.isFinite(v);
const num = v => { const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return finite(n) ? n : null; };
const r2 = v => Math.round(v * 100) / 100;

/** Fiyatı TL'ye çevirir. Kur yoksa TL dışı fiyat için null döner; uydurma kur kullanılmaz. */
export function toTry(price, currency, rates) {
  const p = num(price);
  if (p === null || p < 0) return null;
  const c = currency || 'TRY';
  if (c === 'TRY') return p;
  const fx = c === 'USD' ? num(rates?.usdTry) : c === 'EUR' ? num(rates?.eurTry) : null;
  return fx && fx > 0 ? r2(p * fx) : null;
}

/** Oyunun ve resmî mağaza tekliflerinin en ucuzu (TL). Anahtar satıcılar sayılmaz. */
export function bestOffer(raw, rates) {
  if (!raw) return null;
  const cands = [raw, ...((Array.isArray(raw.offers) ? raw.offers : []))].filter(o => o && OFFICIAL.includes(o.platform));
  let best = null;
  for (const o of cands) {
    const priceTry = toTry(o.price, o.currency, rates);
    if (priceTry === null) continue;
    if (!best || priceTry < best.priceTry) {
      const price = num(o.price), original = num(o.original_price ?? o.originalPrice);
      const orig = original !== null && original > price ? original : null;
      const disc = orig ? Math.round((1 - price / orig) * 100) : Math.max(0, Math.round(num(o.discount_percent) || 0));
      best = {
        platform: o.platform, store: STORE_NAME[o.platform] || o.platform, price, currency: o.currency || 'TRY', priceTry,
        original: orig, originalTry: orig ? toTry(orig, o.currency, rates) : null, discount: disc, url: typeof o.url === 'string' && /^https:\/\//.test(o.url) ? o.url : '',
      };
    }
  }
  return best;
}

export const reviewsOf = raw => num(raw?.opencritic_reviews ?? raw?.scores?.opencritic_reviews);

/** Ham RPC satırını bu modülün kullandığı oyuna çevirir; fiyatı bilinmiyorsa null. */
export function normItem(raw, rates) {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) return null;
  const offer = bestOffer(raw, rates);
  if (!offer) return null;
  const score = num(raw.best_score) ?? num(raw.mc_score) ?? num(raw.oc_score);
  const year = Number(String(raw.release_date || '').slice(0, 4));
  const https = u => (typeof u === 'string' && /^https:\/\//.test(u) ? u : '');
  return {
    id: String(raw.id || ''), key: String(raw.title_key || ''), name: raw.name.trim(), image: https(raw.image), url: offer.url || https(raw.url),
    store: offer.store, platform: offer.platform, price: offer.price, currency: offer.currency, priceTry: offer.priceTry,
    original: offer.original, originalTry: offer.originalTry, discount: offer.discount,
    score, reviews: reviewsOf(raw), genres: Array.isArray(raw.genres) ? raw.genres.filter(g => typeof g === 'string') : [],
    tags: Array.isArray(raw.tags) ? raw.tags.filter(t => typeof t === 'string') : [], year: year > 1970 ? year : null,
    turkish: raw.turkish === true, free: offer.priceTry === 0, dlc: raw.edition ? /dlc|ek içerik|add-?on/i.test(String(raw.edition)) : false,
  };
}

/** Çıkış kimliğine göre tek kayıt: aynı oyun birden çok satırda geliyorsa en ucuz olanı kalır. */
export function uniqueGames(list) {
  const best = new Map();
  for (const g of list) {
    if (!g) continue;
    const k = g.key || g.id;
    const cur = best.get(k);
    if (!cur || g.priceTry < cur.priceTry) best.set(k, g);
  }
  return [...best.values()];
}

const personaMap = new Map(PERSONAS.map(p => [p.id, p]));
/** Oyuncu tarzı + favori türlerden zevk profili (sitenin kendi hesabıyla uyumlu: en çok 3 tarz, favorilerden en sık 2 tür). */
export function tasteProfile(experience, favs) {
  const ids = [...new Set((Array.isArray(experience?.personas) ? experience.personas : []).filter(id => personaMap.has(id)))].slice(0, 3);
  const ps = ids.map(id => personaMap.get(id));
  const genres = new Set(ps.flatMap(p => p.genres));
  const tags = new Set(ps.flatMap(p => p.tags));
  if (typeof experience?.preferredGenre === 'string' && experience.preferredGenre) genres.add(experience.preferredGenre);
  const count = new Map();
  for (const f of Array.isArray(favs) ? favs : []) for (const g of f?.genres || []) if (typeof g === 'string') count.set(g, (count.get(g) || 0) + 1);
  const top = [...count].sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
  for (const g of top) genres.add(g);
  return { personas: ids, genres: [...genres].slice(0, 8), tags: [...tags].slice(0, 16), fromFavs: top, empty: !genres.size && !tags.size };
}

/** Oyunun profille örtüşen türleri ve etiketleri. */
export function matchOf(game, profile) {
  const pg = new Set(profile?.genres || []), pt = new Set((profile?.tags || []).map(t => t.toLowerCase()));
  return { genres: (game.genres || []).filter(g => pg.has(g)), tags: [...new Set((game.tags || []).filter(t => pt.has(String(t).toLowerCase())))] };
}

/** Sitenin zevk puanıyla aynı mantık (tür 12, etiket 8, puan 0,4) + indirim katkısı. */
export function forYouScore(game, profile) {
  const m = matchOf(game, profile);
  const score = finite(game.score) ? game.score : 60;
  return 12 * Math.min(m.genres.length, 2) + 8 * Math.min(m.tags.length, 3) + 0.4 * score + 0.15 * (game.discount || 0);
}

export function rankForYou(games, profile, { exclude = new Set(), limit = 12, minScore = 70 } = {}) {
  return uniqueGames(games)
    .filter(g => !g.dlc && !g.free && g.discount > 0 && !exclude.has(g.id) && !exclude.has(g.key) && (g.score === null || g.score >= minScore))
    .map(g => ({ g, s: forYouScore(g, profile), m: matchOf(g, profile) }))
    .filter(x => profile?.empty || x.m.genres.length + x.m.tags.length > 0)
    .sort((a, b) => b.s - a.s || a.g.priceTry - b.g.priceTry)
    .slice(0, limit);
}

/** Bütçeye göre sepet: 0/1 sırt çantası. Değer = (puan−60)^1,5 (kaliteyi sayıdan üstün tutar) + zevk + indirim; en çok `max` oyun, toplam bütçeyi aşmaz. */
export function pickBasket(games, budget, { max = 5, profile = null, step = 5 } = {}) {
  const cap = Math.floor(num(budget) || 0);
  if (cap < step) return { picks: [], total: 0, left: Math.max(0, cap), saved: 0 };
  const pool = uniqueGames(games)
    .filter(g => !g.dlc && !g.free && g.priceTry > 0 && g.priceTry <= cap && g.score !== null && g.score >= 65)
    .map(g => ({ g, w: Math.max(1, Math.ceil(g.priceTry / step)), v: Math.pow(Math.max(g.score - 60, 1), 1.5) + (profile ? forYouScore(g, profile) - 0.4 * g.score - 0.15 * (g.discount || 0) : 0) + 0.2 * (g.discount || 0) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 40);
  const B = Math.floor(cap / step), K = Math.min(max, pool.length);
  // dp[k][b]: k oyunla b birim harcanarak ulaşılan en yüksek değer
  const dp = Array.from({ length: K + 1 }, () => new Float64Array(B + 1).fill(-1));
  const take = Array.from({ length: pool.length }, () => Array.from({ length: K + 1 }, () => new Uint8Array(B + 1)));
  dp[0].fill(0);
  for (let i = 0; i < pool.length; i++) {
    const { w, v } = pool[i];
    for (let k = K; k >= 1; k--) {
      for (let b = B; b >= w; b--) {
        const prev = dp[k - 1][b - w];
        if (prev >= 0 && prev + v > dp[k][b]) { dp[k][b] = prev + v; take[i][k][b] = 1; }
      }
    }
  }
  let bk = 0, bb = 0, bv = 0;
  for (let k = 1; k <= K; k++) for (let b = 0; b <= B; b++) if (dp[k][b] > bv + 1e-9) { bv = dp[k][b]; bk = k; bb = b; }
  const picks = [];
  let k = bk, b = bb;
  for (let i = pool.length - 1; i >= 0 && k > 0; i--) {
    if (take[i][k][b]) { picks.push(pool[i].g); b -= pool[i].w; k--; }
  }
  picks.sort((a, c) => (c.score || 0) - (a.score || 0));
  const total = r2(picks.reduce((s, g) => s + g.priceTry, 0));
  const saved = r2(picks.reduce((s, g) => s + (g.originalTry && g.originalTry > g.priceTry ? g.originalTry - g.priceTry : 0), 0));
  return { picks, total, left: r2(cap - total), saved };
}

/** Gizli hazine: puanı yüksek, az incelenmiş (OpenCritic'te 1–30 inceleme), ucuz. Sitenin "Akıllı sıralama" tanımıyla aynı. */
export function isHiddenGem(g, { maxPrice = 400, minScore = 80 } = {}) {
  return !!g && !g.dlc && !g.free && g.priceTry > 0 && g.priceTry <= maxPrice && g.score !== null && g.score >= minScore
    && g.reviews !== null && g.reviews >= 1 && g.reviews <= 30;
}
export function rankGems(games, opts = {}) {
  const genre = opts.genre || '';
  return uniqueGames(games)
    .filter(g => isHiddenGem(g, opts) && (!genre || g.genres.includes(genre)))
    .sort((a, b) => b.score - a.score || a.priceTry - b.priceTry);
}

/** Bitirme süresi (saat): sitenin Bitirme süresi paneliyle aynı kaynak, normal süre yoksa hızlı süre. */
export function hoursOf(ttb) {
  const m = num(ttb?.normally_min) ?? num(ttb?.hastily_min);
  return m && m > 0 ? m / 60 : null;
}
export function costPerHour(priceTry, hours) {
  return finite(priceTry) && priceTry > 0 && finite(hours) && hours >= 0.5 ? r2(priceTry / hours) : null;
}
/** Saat başı maliyet kademeleri (TL/saat). */
export function costTier(cph) {
  if (!finite(cph)) return null;
  return cph <= 8 ? 'great' : cph <= 25 ? 'good' : cph <= 60 ? 'fair' : 'high';
}
export const TIER_TEXT = {
  great: ['Çok verimli', 'Great value'], good: ['Verimli', 'Good value'], fair: ['Orta', 'Average'], high: ['Saati pahalı', 'Pricey per hour'],
};

/** Topluluk oyu özeti. Az oyda yüzde gösterilmez. */
export const MIN_VOTES = 5;
export function worthSummary(w) {
  const yes = Math.max(0, Math.floor(num(w?.yes) || 0)), no = Math.max(0, Math.floor(num(w?.no) || 0));
  const total = yes + no;
  if (total < MIN_VOTES) return { yes, no, total, pct: null, verdict: null };
  const pct = Math.round((yes / total) * 100);
  return { yes, no, total, pct, verdict: pct >= 70 ? 'yes' : pct >= 40 ? 'mixed' : 'no' };
}

// ---- Ortak istek listesi (sunucusuz): bağlantıya sıkıştırılmış, doğrulanmış liste ----
const ID_RE = /^[A-Za-z0-9:_-]{1,160}$/;
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
export function encodeWishlist(favs, { by = '' } = {}) {
  const items = (Array.isArray(favs) ? favs : [])
    .filter(f => f && typeof f.id === 'string' && ID_RE.test(f.id) && typeof f.name === 'string' && f.name.trim() && (f.status || 'wish') === 'wish')
    .slice(0, 30).map(f => [f.id, f.name.trim().slice(0, 80)]);
  if (!items.length) return '';
  const body = { v: 1, i: items };
  const name = String(by || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 24);
  if (name) body.b = name;
  return b64u(JSON.stringify(body));
}
export function decodeWishlist(code) {
  try {
    if (typeof code !== 'string' || code.length < 4 || code.length > 6000 || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
    const j = JSON.parse(unb64u(code));
    if (!j || j.v !== 1 || !Array.isArray(j.i)) return null;
    const items = j.i.filter(e => Array.isArray(e) && typeof e[0] === 'string' && ID_RE.test(e[0]) && typeof e[1] === 'string' && e[1].trim())
      .slice(0, 30).map(e => ({ id: e[0], name: e[1].trim().slice(0, 80) }));
    if (!items.length) return null;
    return { items, by: typeof j.b === 'string' ? j.b.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 24) : '' };
  } catch { return null; }
}

/** Hediye önerisi: alıcının sevdiği türler ve bütçe; zaten istek listesinde olanlar önce, sonra puanı yüksek indirimliler. */
export function giftIdeas(games, { budget = 0, genres = [], wanted = new Set(), limit = 8 } = {}) {
  const cap = num(budget) || 0;
  const want = new Set(genres);
  return uniqueGames(games)
    .filter(g => !g.dlc && !g.free && g.priceTry > 0 && (!cap || g.priceTry <= cap) && (g.score === null || g.score >= 70))
    .map(g => {
      const wished = wanted.has(g.id) || wanted.has(g.key);
      const hit = g.genres.filter(x => want.has(x)).length;
      return { g, wished, hit, s: (wished ? 1000 : 0) + (want.size ? hit * 15 : 0) + (finite(g.score) ? g.score : 60) * 0.5 + (g.discount || 0) * 0.2 };
    })
    .filter(x => x.wished || !want.size || x.hit > 0)
    .sort((a, b) => b.s - a.s || a.g.priceTry - b.g.priceTry)
    .slice(0, limit);
}

/** Karşılaştırma tablosu. Her satırda kazanan (en az iki oyunda değeri olan satırlarda) işaretlenir. */
export function compareRows(games, ttbMap = {}) {
  const rows = [];
  const add = (key, tr, en, vals, better, fmt) => {
    const known = vals.map((v, i) => [v, i]).filter(([v]) => v !== null && v !== undefined);
    let win = [];
    if (known.length >= 2) {
      const best = better === 'high' ? Math.max(...known.map(k => k[0])) : Math.min(...known.map(k => k[0]));
      const hits = known.filter(k => k[0] === best).map(k => k[1]);
      if (hits.length < known.length) win = hits;
    }
    if (known.length) rows.push({ key, tr, en, vals, win, fmt });
  };
  add('price', 'Fiyat', 'Price', games.map(g => g.priceTry), 'low', 'money');
  add('discount', 'İndirim', 'Discount', games.map(g => (g.discount > 0 ? g.discount : 0)), 'high', 'pct');
  add('score', 'Puan', 'Score', games.map(g => g.score), 'high', 'int');
  const hours = games.map(g => hoursOf(ttbMap[g.key]));
  add('hours', 'Bitirme süresi', 'Time to beat', hours, 'high', 'hours');
  add('cph', 'Saat başı maliyet', 'Cost per hour', games.map((g, i) => costPerHour(g.priceTry, hours[i])), 'low', 'money');
  add('year', 'Çıkış yılı', 'Release year', games.map(g => g.year), 'high', 'plain');
  return rows;
}


// ---- Tarayıcı katmanı ----
const BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined';
const SUPA = 'https://dsosckshigzijnsxmlwh.supabase.co';
const KEY = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
const root = BROWSER ? document.documentElement : null;
const isEn = () => BROWSER && root.lang === 'en';
const T = (tr, en) => (isEn() ? en : tr);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const jsonStore = (k, fallback) => { try { const v = JSON.parse(store.get(k) || 'null'); return v ?? fallback; } catch { return fallback; } };
const money = (v, en = isEn()) => (finite(v) ? '₺' + new Intl.NumberFormat(en ? 'en-US' : 'tr-TR', { maximumFractionDigits: v >= 100 ? 0 : 2, minimumFractionDigits: v >= 100 || Number.isInteger(v) ? 0 : 2 }).format(v) : '—');
const genreLabel = g => (isEn() ? GENRE_EN[g] || g : g);
const hoursText = h => (h < 10 ? (Math.round(h * 2) / 2).toString().replace('.', isEn() ? '.' : ',') : String(Math.round(h))) + T(' sa', ' h');

// ---- Veri ----
const memo = new Map();
function remember(key, ttl, make) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.p;
  const p = make().catch(e => { memo.delete(key); throw e; });
  if (memo.size > 60) memo.delete(memo.keys().next().value);
  memo.set(key, { at: Date.now(), p });
  return p;
}
const authHeaders = () => ({ apikey: KEY, Authorization: 'Bearer ' + KEY });

function getRates() {
  return remember('rates', 6e5, async () => {
    try {
      const r = await fetch(SUPA + '/functions/v1/radar-services?action=rates', { headers: { Authorization: 'Bearer ' + KEY }, credentials: 'omit', signal: AbortSignal.timeout(1e4) });
      const j = await r.json().catch(() => null);
      return r.ok && j && j.status === 'ok' && Number(j.usdTry) > 0 ? { usdTry: Number(j.usdTry), eurTry: Number(j.eurTry) || null } : null;
    } catch { return null; }
  });
}

/** search_market: sitenin kendi RPC'si. Dönen satırlar normalleştirilir; fiyatı TL'ye çevrilemeyenler atılır. */
async function market({ query = '', deals = false, sort = 'score', filters = {}, page = 0, size = 50, ids = null }) {
  const rates = await getRates();
  const fo = { ...filters };
  if (rates?.usdTry) fo.usdTry = rates.usdTry;
  if (ids) fo.ids = ids;
  for (const k of Object.keys(fo)) if (fo[k] === '' || fo[k] === undefined || fo[k] === false) delete fo[k];
  const body = JSON.stringify({ market: 'all', query_text: query, page_number: page, page_size: size, deals_only: deals, sort_order: sort, filter_options: fo });
  const rows = await remember('m:' + body, 3e5, async () => {
    const r = await fetch(SUPA + '/rest/v1/rpc/search_market', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body, credentials: 'omit', signal: AbortSignal.timeout(2e4) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    return Array.isArray(j?.items) ? j.items : [];
  });
  return { games: rows.map(x => normItem(x, rates)).filter(Boolean), rates, raw: rows.length };
}
async function marketPages(opts, pages) {
  const parts = await Promise.all(Array.from({ length: pages }, (_, i) => market({ ...opts, page: i }).catch(() => ({ games: [], rates: null, raw: 0 }))));
  return { games: parts.flatMap(p => p.games), rates: parts.find(p => p.rates)?.rates || null, raw: parts.reduce((s, p) => s + p.raw, 0) };
}

const ttbCache = new Map();
async function ttbFor(keys) {
  const need = [...new Set(keys.filter(k => k && /^[a-z0-9 ]{1,160}$/.test(k) && !ttbCache.has(k)))].slice(0, 80);
  if (need.length) {
    try {
      const list = need.map(k => '"' + k + '"').join(',');
      const r = await fetch(SUPA + '/rest/v1/game_ttb?select=title_key,hastily_min,normally_min,completely_min,votes&title_key=in.(' + encodeURIComponent(list) + ')', { headers: authHeaders(), credentials: 'omit', signal: AbortSignal.timeout(1e4) });
      const rows = r.ok ? await r.json() : [];
      for (const k of need) ttbCache.set(k, null);
      for (const row of Array.isArray(rows) ? rows : []) ttbCache.set(row.title_key, row);
    } catch { /* süre yoksa saat başı maliyet de yok */ }
  }
  const out = {};
  for (const k of keys) if (ttbCache.get(k)) out[k] = ttbCache.get(k);
  return out;
}

// Topluluk oyu: supabase/schema-v50-fiyata-deger-mi.sql. Şema yoksa (404/PGRST202) oylama gizlenir.
let worthMissing = false;
function voterId() {
  let v = store.get('radar-party-voter') || '';
  if (/^[0-9a-f]{32}$/.test(v)) return v;
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  v = [...a].map(x => x.toString(16).padStart(2, '0')).join('');
  store.set('radar-party-voter', v);
  return v;
}
async function worthRpc(name, body) {
  const r = await fetch(SUPA + '/rest/v1/rpc/' + name, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit', signal: AbortSignal.timeout(1.2e4) });
  if (r.status === 404) { worthMissing = true; return null; }
  const j = await r.json().catch(() => null);
  if (!r.ok) { if (/PGRST202|does not exist|Could not find/i.test(JSON.stringify(j))) worthMissing = true; return null; }
  return j;
}
const worthCache = new Map();
async function worthGet(key) {
  if (worthMissing || !key) return null;
  if (worthCache.has(key) && Date.now() - worthCache.get(key).at < 6e4) return worthCache.get(key).v;
  const v = await worthRpc('worth_get', { p_key: key, p_voter: voterId() });
  if (v) worthCache.set(key, { at: Date.now(), v });
  return v;
}
async function worthVote(key, vote) {
  const v = await worthRpc('worth_vote', { p_key: key, p_voter: voterId(), p_vote: vote });
  if (v) worthCache.set(key, { at: Date.now(), v });
  return v;
}

// ---- Cihazdaki kayıtlar ----
const readFavs = () => { const l = jsonStore('radar-fav-v3', []); return Array.isArray(l) ? l.filter(f => f && typeof f.id === 'string') : []; };
const readExperience = () => jsonStore('radar-experience-v1', {});
const localGenres = () => { const l = jsonStore('radar-kh-genres', []); return Array.isArray(l) ? l.filter(g => GENRES.includes(g)).slice(0, 4) : []; };
function profileNow() {
  const p = tasteProfile(readExperience(), readFavs());
  const extra = localGenres().filter(g => !p.genres.includes(g));
  if (extra.length) { p.genres = [...p.genres, ...extra].slice(0, 10); p.empty = false; }
  return p;
}
const favIds = () => new Set(readFavs().flatMap(f => (f.status === 'done' || f.status === 'dropped' ? [] : [f.id])));

// ---- Karşılaştırma tepsisi ----
const TRAY_MAX = 3;
const readTray = () => { const l = jsonStore('radar-kh-tray', []); return Array.isArray(l) ? l.filter(x => x && typeof x.key === 'string' && typeof x.name === 'string').slice(0, TRAY_MAX) : []; };
const saveTray = l => { store.set('radar-kh-tray', JSON.stringify(l.slice(0, TRAY_MAX).map(x => ({ key: x.key, id: x.id || '', name: String(x.name).slice(0, 120) })))); window.dispatchEvent(new CustomEvent('kh:tray')); };
function trayAdd(g) {
  const t = readTray();
  if (t.some(x => x.key === g.key) || t.length >= TRAY_MAX || !g.key) return false;
  t.push({ key: g.key, id: g.id, name: g.name });
  saveTray(t);
  return true;
}
const trayRemove = key => saveTray(readTray().filter(x => x.key !== key));

// ---- Ortak parçalar ----
const ICON = {
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  ext: '<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  up: '<path d="M7 10v11H3V10zM7 10l4-8a2.5 2.5 0 0 1 2.5 3L13 9h6.5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 18.4 20H7"/>',
  down: '<path d="M17 14V3h4v11zM17 14l-4 8a2.5 2.5 0 0 1-2.5-3L11 15H4.5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 5.6 4H17"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};
const svg = (name, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

function cardHtml(g, { why = '', onlyCompare = false } = {}) {
  const initial = esc(g.name.trim().charAt(0).toUpperCase());
  const cover = g.image ? `<img src="${esc(g.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
  const disc = g.discount > 0 ? `<em class="kh-off">-%${g.discount}</em>` : '';
  const old = g.original && g.original > g.price ? `<del>${esc(money(g.originalTry ?? g.original))}</del>` : '';
  const inTray = readTray().some(x => x.key === g.key);
  const full = readTray().length >= TRAY_MAX;
  return `<article class="kh-card" data-key="${esc(g.key)}">
<div class="kh-cover" aria-hidden="true"><span>${initial}</span>${cover}</div>
<div class="kh-info">
<b class="kh-name">${esc(g.name)}</b>
<small class="kh-meta">${esc(g.store)}${g.genres.length ? ' · ' + esc(g.genres.slice(0, 2).map(genreLabel).join(', ')) : ''}</small>
<div class="kh-price"><strong>${esc(money(g.priceTry))}</strong>${old}${disc}</div>
<div class="kh-chips">${g.score !== null ? `<span class="kh-chip">${T('Puan', 'Score')} ${g.score}</span>` : ''}${g.reviews !== null && g.reviews <= 30 && g.reviews >= 1 ? `<span class="kh-chip">${g.reviews} ${T('inceleme', 'reviews')}</span>` : ''}<span class="kh-chip kh-cph" data-cph hidden></span></div>
${why ? `<p class="kh-why">${why}</p>` : ''}
<div class="kh-actions">
${g.url ? `<a class="kh-btn" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">${T('Mağazada aç', 'Open store')} ${svg('ext', 13)}</a>` : ''}
<button type="button" class="kh-btn ghost" data-cmp="${esc(g.key)}" ${inTray || (full && !inTray) ? (inTray ? 'aria-pressed="true"' : 'disabled') : ''}>${svg('scale', 13)} ${inTray ? T('Kıyasta', 'In compare') : T('Kıyasla', 'Compare')}</button>
</div></div></article>`;
}
function fillCph(container, games) {
  ttbFor(games.map(g => g.key)).then(map => {
    for (const g of games) {
      const cph = costPerHour(g.priceTry, hoursOf(map[g.key]));
      const el = container.querySelector(`.kh-card[data-key="${CSS.escape(g.key)}"] [data-cph]`);
      if (!el || cph === null) continue;
      const tier = costTier(cph);
      el.hidden = false;
      el.dataset.tier = tier;
      el.textContent = `${money(cph)}/${T('sa', 'h')}`;
      el.title = `${T('Saat başı maliyet', 'Cost per hour')}: ${TIER_TEXT[tier][isEn() ? 1 : 0]}`;
    }
  });
}
function wireCards(container, games) {
  const byKey = new Map(games.map(g => [g.key, g]));
  container.querySelectorAll('[data-cmp]').forEach(b => b.addEventListener('click', () => {
    const g = byKey.get(b.dataset.cmp);
    if (g && trayAdd(g)) { b.setAttribute('aria-pressed', 'true'); b.innerHTML = `${svg('scale', 13)} ${T('Kıyasta', 'In compare')}`; toast(T('Karşılaştırmaya eklendi', 'Added to compare') + ` (${readTray().length}/${TRAY_MAX})`, () => openHub('compare')); }
  }));
  fillCph(container, games);
}
const skeleton = n => `<div class="kh-grid" aria-busy="true">${'<div class="kh-card kh-skel"></div>'.repeat(n)}</div>`;
const gridHtml = (items, why) => `<div class="kh-grid">${items.map(x => cardHtml(x.g || x, { why: why ? why(x) : '' })).join('')}</div>`;
const empty = (tr, en) => `<p class="kh-empty">${T(tr, en)}</p>`;
const errorBox = () => empty('Veriler şu an alınamadı. Biraz sonra tekrar dene.', 'Could not load data right now. Please try again shortly.');
const rateNote = rates => (rates ? '' : `<p class="kh-note">${T('Döviz kuru alınamadı; yalnız TL fiyatlı teklifler gösteriliyor.', 'Exchange rate unavailable; only offers priced in TL are shown.')}</p>`);

let toastEl = null, toastTimer = 0;
function toast(text, action) {
  toastEl?.remove();
  toastEl = document.createElement('div');
  toastEl.className = 'kh-toast';
  toastEl.setAttribute('role', 'status');
  toastEl.innerHTML = `<span>${esc(text)}</span>${action ? `<button type="button">${T('Aç', 'Open')}</button>` : ''}`;
  if (action) toastEl.querySelector('button').addEventListener('click', () => { toastEl.remove(); action(); });
  document.body.appendChild(toastEl);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl?.remove(), 4500);
}

// ---- Merkez (tam ekran pencere) ----
const TABS = [
  ['foryou', 'Senin için', 'For you'], ['basket', 'Sepet', 'Basket'], ['gems', 'Gizli hazine', 'Hidden gems'],
  ['gift', 'Hediye', 'Gifts'], ['compare', 'Karşılaştır', 'Compare'],
];
let hub = null, hubTab = 'foryou', renderToken = 0, lastFocus = null;
const giftState = { list: null, budget: 500, genres: [], by: '' };

function openHub(tab = hubTab) {
  if (!hub) {
    lastFocus = document.activeElement;
    hub = document.createElement('div');
    hub.className = 'kh-overlay';
    hub.setAttribute('role', 'dialog');
    hub.setAttribute('aria-modal', 'true');
    hub.innerHTML = `<div class="kh-sheet"><div class="kh-head"><div class="kh-title"><span class="kh-logo">${svg('spark', 18)}</span><b></b></div><button type="button" class="kh-close">${svg('close', 18)}</button><div class="kh-tabs" role="tablist"></div></div><div class="kh-body" role="tabpanel" tabindex="-1"></div></div>`;
    hub.addEventListener('mousedown', e => { if (e.target === hub) closeHub(); });
    hub.querySelector('.kh-close').addEventListener('click', closeHub);
    document.addEventListener('keydown', onHubKey, true);
    document.body.appendChild(hub);
    document.body.classList.add('kh-lock');
  }
  setTab(tab);
}
function closeHub() {
  if (!hub) return;
  hub.remove(); hub = null;
  document.body.classList.remove('kh-lock');
  document.removeEventListener('keydown', onHubKey, true);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
  schedule();
}
function onHubKey(e) {
  if (!hub) return;
  if (e.key === 'Escape') { e.stopPropagation(); closeHub(); return; }
  if (e.key === 'Tab') {
    const f = [...hub.querySelectorAll('button:not([disabled]),a[href],input,select,[tabindex="0"]')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !hub.contains(document.activeElement))) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
}
function paintChrome() {
  if (!hub) return;
  hub.setAttribute('aria-label', T('Senin için', 'For you'));
  hub.querySelector('.kh-title b').textContent = T('Senin için', 'For you');
  hub.querySelector('.kh-close').setAttribute('aria-label', T('Kapat', 'Close'));
  const nav = hub.querySelector('.kh-tabs');
  nav.setAttribute('aria-label', T('Bölümler', 'Sections'));
  nav.innerHTML = TABS.map(([k, tr, en]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === hubTab}" tabindex="${k === hubTab ? 0 : -1}">${T(tr, en)}${k === 'compare' && readTray().length ? ` <i>${readTray().length}</i>` : ''}</button>`).join('');
  nav.querySelectorAll('button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  nav.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const bs = [...nav.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    if (i < 0) return;
    const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length];
    n.focus(); n.click(); e.preventDefault();
  });
}
function setTab(tab) {
  hubTab = TABS.some(t => t[0] === tab) ? tab : 'foryou';
  paintChrome();
  renderTab();
}
async function renderTab() {
  if (!hub) return;
  const token = ++renderToken, body = hub.querySelector('.kh-body');
  const alive = () => hub && token === renderToken;
  body.scrollTop = 0;
  try {
    if (hubTab === 'foryou') await tabForYou(body, alive);
    else if (hubTab === 'basket') await tabBasket(body, alive);
    else if (hubTab === 'gems') await tabGems(body, alive);
    else if (hubTab === 'gift') await tabGift(body, alive);
    else await tabCompare(body, alive);
  } catch { if (alive()) body.innerHTML = errorBox(); }
}

// 1 — Senin için
async function forYouData() {
  const profile = profileNow();
  const filters = { minScore: 70, preferGenres: profile.genres, preferTags: profile.tags };
  const { games, rates } = await marketPages({ deals: true, sort: 'foryou', filters }, 2);
  const mine = favIds();
  const ranked = rankForYou(games, profile, { exclude: new Set(), limit: 12 });
  return { profile, ranked, rates, mine };
}
function whyText(x, mine) {
  const parts = [];
  if (x.m.genres.length) parts.push(T('Türü: ', 'Genre: ') + x.m.genres.slice(0, 2).map(genreLabel).join(', '));
  if (x.m.tags.length) parts.push(T('Etiket: ', 'Tag: ') + x.m.tags.slice(0, 2).join(', '));
  if (mine.has(x.g.id) || mine.has(x.g.key)) parts.push(T('İstek listende', 'On your wishlist'));
  return esc(parts.join(' · '));
}
function genrePicker() {
  const mine = new Set(localGenres());
  return `<p class="kh-cap">${T('Ek tür seç (en çok 4):', 'Add genres (up to 4):')}</p><div class="kh-picker" role="group" aria-label="${T('Sevdiğin türler', 'Genres you like')}">${GENRES.map(g => `<button type="button" aria-pressed="${mine.has(g)}" data-genre="${esc(g)}">${esc(genreLabel(g))}</button>`).join('')}</div>`;
}
function wireGenrePicker(root_, again) {
  root_.querySelectorAll('[data-genre]').forEach(b => b.addEventListener('click', () => {
    const cur = new Set(localGenres());
    if (cur.has(b.dataset.genre)) cur.delete(b.dataset.genre); else if (cur.size < 4) cur.add(b.dataset.genre);
    store.set('radar-kh-genres', JSON.stringify([...cur]));
    memo.clear();
    again();
  }));
}
async function tabForYou(body, alive) {
  body.innerHTML = skeleton(6);
  const { profile, ranked, rates, mine } = await forYouData();
  if (!alive()) return;
  const names = profile.personas.map(id => PERSONAS.find(p => p.id === id)).filter(Boolean).map(p => T(p.tr, p.en));
  const tasteLine = profile.empty
    ? T('Tarzını seçersen fırsatlar sana göre sıralanır. En çok 4 tür seç:', 'Pick your taste and deals are ranked for you. Choose up to 4 genres:')
    : `${T('Zevk profilin', 'Your taste')}: ${esc([...names, ...profile.genres.slice(0, 4).map(genreLabel)].join(' · '))}${profile.fromFavs.length ? ' ' + T('(favorilerinden de öğrendik)', '(partly learned from your favourites)') : ''}`;
  body.innerHTML = `<section class="kh-section"><h2>${T('Senin için fırsatlar', 'Deals for you')}</h2>
<p class="kh-lead">${tasteLine}</p>${genrePicker()}
${ranked.length ? gridHtml(ranked, x => whyText(x, mine)) : empty('Şu an zevkine uyan indirim bulamadık. Tür ekleyip tekrar dene.', 'No discounts match your taste right now. Add a genre and try again.')}
${rateNote(rates)}<p class="kh-note">${T('Sıralama: türün ve etiketlerin, oyunun puanı ve indirim oranı. Fiyat, resmî mağazalardaki en ucuz TL karşılığıdır.', 'Ranking: your genres and tags, the game’s score and the discount. Price is the cheapest official store, in TL.')}</p></section>`;
  wireGenrePicker(body, renderTab);
  const games = ranked.map(x => x.g);
  wireCards(body, games);
}

// 2 — Bütçeye göre sepet
const basketState = { budget: 1000, max: 4, taste: true, skip: new Set() };
async function tabBasket(body, alive) {
  const s = basketState;
  body.innerHTML = `<section class="kh-section"><h2>${T('Bütçene göre oyun sepeti', 'Game basket for your budget')}</h2>
<p class="kh-lead">${T('Bütçeni yaz; puanı yüksek, indirimde ve zevkine yakın oyunlardan toplamı aşmayan bir sepet kuralım.', 'Enter a budget and we’ll build a basket of high-scoring, discounted games that fit it.')}</p>
<form class="kh-form" novalidate>
<label>${T('Bütçe (₺)', 'Budget (₺)')}<input type="number" inputmode="numeric" min="50" max="20000" step="50" name="budget" value="${s.budget}"></label>
<label>${T('En çok oyun', 'Max games')}<select name="max">${[2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === s.max ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
<label class="kh-check"><input type="checkbox" name="taste" ${s.taste ? 'checked' : ''}> ${T('Zevkime göre', 'Match my taste')}</label>
<button type="submit" class="kh-btn primary">${T('Sepeti kur', 'Build basket')}</button></form>
<div class="kh-presets">${[250, 500, 1000, 2000, 3000].map(v => `<button type="button" data-budget="${v}" aria-pressed="${s.budget === v}">${money(v)}</button>`).join('')}</div>
<div class="kh-result" aria-live="polite"></div></section>`;
  const form = body.querySelector('form'), out = body.querySelector('.kh-result');
  const run = async () => {
    const fd = new FormData(form);
    s.budget = Math.min(20000, Math.max(50, Math.round(Number(fd.get('budget')) || 0)));
    s.max = Number(fd.get('max')) || 4;
    s.taste = fd.get('taste') === 'on';
    form.elements.budget.value = s.budget;
    body.querySelectorAll('[data-budget]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.budget) === s.budget)));
    out.innerHTML = skeleton(Math.min(s.max, 4));
    const profile = s.taste ? profileNow() : null;
    const base = { deals: true, filters: { minScore: 70, maxPrice: s.budget } };
    const [a, b] = await Promise.all([
      marketPages({ ...base, sort: 'score' }, 2),
      profile && !profile.empty ? marketPages({ ...base, sort: 'foryou', filters: { ...base.filters, preferGenres: profile.genres, preferTags: profile.tags } }, 1) : Promise.resolve({ games: [], rates: null }),
    ]);
    if (!alive()) return;
    const pool = [...a.games, ...b.games].filter(g => !s.skip.has(g.key));
    const res = pickBasket(pool, s.budget, { max: s.max, profile: profile && !profile.empty ? profile : null });
    if (!res.picks.length) { out.innerHTML = empty('Bu bütçeyle uygun, puanı yüksek bir indirim bulamadık. Bütçeyi biraz artırmayı dene.', 'No high-scoring discount fits this budget. Try raising it a little.') + rateNote(a.rates || b.rates); return; }
    out.innerHTML = `<div class="kh-summary"><div><small>${T('Toplam', 'Total')}</small><b>${money(res.total)}</b></div><div><small>${T('Kalan', 'Left')}</small><b>${money(res.left)}</b></div>${res.saved > 0 ? `<div><small>${T('İndirimle tasarruf', 'Saved by discounts')}</small><b>${money(res.saved)}</b></div>` : ''}<div class="kh-sumact"><button type="button" class="kh-btn" data-copy>${T('Listeyi kopyala', 'Copy list')}</button><button type="button" class="kh-btn ghost" data-other>${T('Başka bir sepet', 'Another basket')}</button></div></div>${gridHtml(res.picks)}${rateNote(a.rates || b.rates)}<p class="kh-note">${T('Sepet, puan + zevk + indirim değerini en yüksek yapan oyun kombinasyonudur; fiyatlar anlık olarak değişebilir.', 'The basket maximises score + taste + discount within your budget; prices can change at any time.')}</p>`;
    wireCards(out, res.picks);
    out.querySelector('[data-copy]').addEventListener('click', async () => {
      const text = res.picks.map(g => `• ${g.name} — ${money(g.priceTry)} (${g.store})`).join('\n') + `\n${T('Toplam', 'Total')}: ${money(res.total)}`;
      try { await navigator.clipboard.writeText(text); toast(T('Liste kopyalandı', 'List copied')); } catch { toast(T('Kopyalanamadı', 'Could not copy')); }
    });
    out.querySelector('[data-other]').addEventListener('click', () => { res.picks.forEach(g => s.skip.add(g.key)); run(); });
  };
  form.addEventListener('submit', e => { e.preventDefault(); s.skip.clear(); run(); });
  body.querySelectorAll('[data-budget]').forEach(b => b.addEventListener('click', () => { form.elements.budget.value = b.dataset.budget; s.skip.clear(); run(); }));
  await run();
}

// 3 — Gizli hazine
const gemState = { max: 400, genre: '' };
async function tabGems(body, alive) {
  const s = gemState;
  body.innerHTML = `<section class="kh-section"><h2>${T('Gizli hazineler', 'Hidden gems')}</h2>
<p class="kh-lead">${T('Puanı 80 ve üzeri, OpenCritic’te en çok 30 inceleme almış (az bilinen) ve seçtiğin fiyatın altındaki oyunlar.', 'Games scoring 80+, with at most 30 OpenCritic reviews (lesser known), under your price limit.')}</p>
<div class="kh-presets" role="group" aria-label="${T('En yüksek fiyat', 'Highest price')}">${[150, 300, 400, 600, 1000].map(v => `<button type="button" data-max="${v}" aria-pressed="${s.max === v}">${T('en çok', 'up to')} ${money(v)}</button>`).join('')}</div>
<div class="kh-picker" role="group" aria-label="${T('Tür', 'Genre')}"><button type="button" data-g="" aria-pressed="${!s.genre}">${T('Hepsi', 'All')}</button>${GENRES.map(g => `<button type="button" data-g="${esc(g)}" aria-pressed="${s.genre === g}">${esc(genreLabel(g))}</button>`).join('')}</div>
<div class="kh-result">${skeleton(6)}</div></section>`;
  body.querySelectorAll('[data-max]').forEach(b => b.addEventListener('click', () => { s.max = Number(b.dataset.max); renderTab(); }));
  body.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { s.genre = b.dataset.g; renderTab(); }));
  const { games, rates } = await marketPages({ sort: 'score', filters: { minScore: 80, maxPrice: s.max, genre: s.genre } }, 4);
  if (!alive()) return;
  const gems = rankGems(games, { maxPrice: s.max, genre: s.genre }).slice(0, 24);
  const out = body.querySelector('.kh-result');
  out.innerHTML = (gems.length ? gridHtml(gems) : empty('Bu ölçütlerle gizli hazine bulamadık. Fiyat sınırını ya da türü genişlet.', 'No hidden gems with these filters. Widen the price limit or genre.')) + rateNote(rates)
    + `<p class="kh-note">${T('“Az bilinen” iddiası yalnız OpenCritic inceleme sayısına dayanır (1–30). İnceleme sayısı bilinmeyen oyunlar listelenmez.', '“Lesser known” rests only on the OpenCritic review count (1–30). Games with an unknown review count are not listed.')}</p>`;
  wireCards(out, gems);
}

// 4 — Ortak istek listesi ve hediye önerisi
function wishlistLink(by) {
  const code = encodeWishlist(readFavs(), { by });
  return code ? `${location.origin}${location.pathname}?hediye=${code}` : '';
}
async function tabGift(body, alive) {
  const s = giftState;
  const favs = readFavs().filter(f => (f.status || 'wish') === 'wish');
  const mineLink = wishlistLink(s.by);
  const listBlock = s.list ? `<div class="kh-friend"><h3>${s.list.by ? esc(s.list.by) + T(' kişisinin istek listesi', '’s wishlist') : T('Paylaşılan istek listesi', 'Shared wishlist')}</h3><div class="kh-result" data-friend>${skeleton(3)}</div></div>` : '';
  body.innerHTML = `<section class="kh-section"><h2>${T('Ortak istek listesi ve hediye', 'Shared wishlist and gifts')}</h2>
<div class="kh-panel"><h3>${T('İstek listemi paylaş', 'Share my wishlist')}</h3>
${favs.length ? `<p class="kh-lead">${T(`${Math.min(favs.length, 30)} oyunluk “İstiyorum” listen tek bir bağlantıya sıkıştırılır; arkadaşın hesap açmadan görür, hediye seçer.`, `Your ${Math.min(favs.length, 30)} “Want” games are packed into one link; a friend sees them without an account and picks a gift.`)}</p>
<form class="kh-form" data-share novalidate><label class="kh-grow">${T('Listede görünecek ad (isteğe bağlı)', 'Name shown on the list (optional)')}<input name="by" maxlength="24" value="${esc(s.by)}" autocomplete="nickname"></label>
<button type="button" class="kh-btn primary" data-copylink>${T('Bağlantıyı kopyala', 'Copy link')}</button>
${navigator.share ? `<button type="button" class="kh-btn ghost" data-sharelink>${T('Paylaş', 'Share')}</button>` : ''}</form>
<input class="kh-link" readonly value="${esc(mineLink)}" aria-label="${T('Paylaşım bağlantısı', 'Share link')}">`
    : `<p class="kh-empty">${T('Henüz “İstiyorum” durumunda oyunun yok. Oyun kartındaki kalple istek listene ekle, sonra buradan paylaş.', 'You have no “Want” games yet. Add games with the heart on a card, then share them here.')}</p>`}</div>
<div class="kh-panel"><h3>${T('Bir arkadaşın listesini aç', 'Open a friend’s list')}</h3>
<form class="kh-form" data-open novalidate><label class="kh-grow">${T('Paylaşım bağlantısı', 'Share link')}<input name="link" placeholder="https://…?hediye=…" autocomplete="off"></label><button type="submit" class="kh-btn">${T('Listeyi aç', 'Open list')}</button></form></div>
${listBlock}
<div class="kh-panel"><h3>${T('Hediye öner', 'Suggest a gift')}</h3>
<p class="kh-lead">${T('Bütçeyi ve hediye alacak kişinin sevdiği türleri seç; puanı yüksek ve indirimdeki oyunlardan öneri çıkaralım.', 'Pick a budget and the genres your friend likes; we’ll suggest high-scoring games on sale.')}</p>
<form class="kh-form" data-gift novalidate><label>${T('Bütçe (₺)', 'Budget (₺)')}<input type="number" inputmode="numeric" min="50" max="5000" step="50" name="budget" value="${s.budget}"></label><button type="submit" class="kh-btn primary">${T('Öner', 'Suggest')}</button></form>
<div class="kh-picker" role="group" aria-label="${T('Sevdiği türler', 'Genres they like')}">${GENRES.map(g => `<button type="button" data-g="${esc(g)}" aria-pressed="${s.genres.includes(g)}">${esc(genreLabel(g))}</button>`).join('')}</div>
<div class="kh-result" data-ideas></div></div></section>`;
  const formShare = body.querySelector('[data-share]');
  if (formShare) {
    const input = formShare.elements.by, link = body.querySelector('.kh-link');
    input.addEventListener('input', () => { s.by = input.value; link.value = wishlistLink(s.by); });
    body.querySelector('[data-copylink]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(link.value); toast(T('Bağlantı kopyalandı', 'Link copied')); } catch { link.select(); toast(T('Bağlantıyı seçip kopyalayabilirsin', 'Select the link to copy it')); } });
    body.querySelector('[data-sharelink]')?.addEventListener('click', () => navigator.share({ title: T('İstek listem', 'My wishlist'), url: link.value }).catch(() => {}));
    link.addEventListener('focus', () => link.select());
  }
  body.querySelector('[data-open]').addEventListener('submit', e => {
    e.preventDefault();
    const raw = new FormData(e.currentTarget).get('link') || '';
    let code = String(raw).trim();
    try { code = new URL(code).searchParams.get('hediye') || code; } catch { /* kod olarak dene */ }
    const list = decodeWishlist(code);
    if (!list) { toast(T('Bu bağlantı geçerli bir liste içermiyor', 'That link has no valid list')); return; }
    s.list = list; renderTab();
  });
  body.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => {
    const g = b.dataset.g, i = s.genres.indexOf(g);
    if (i >= 0) s.genres.splice(i, 1); else if (s.genres.length < 4) s.genres.push(g);
    b.setAttribute('aria-pressed', String(s.genres.includes(g)));
    runIdeas();
  }));
  const ideasOut = body.querySelector('[data-ideas]');
  let ideasToken = 0;
  const runIdeas = async () => {
    const my = ++ideasToken;
    const form = body.querySelector('[data-gift]');
    s.budget = Math.min(5000, Math.max(50, Math.round(Number(form.elements.budget.value) || 0)));
    ideasOut.innerHTML = skeleton(3);
    const pool = await marketPages({ deals: true, sort: 'score', filters: { minScore: 70, maxPrice: s.budget, genre: s.genres.length === 1 ? s.genres[0] : '' } }, 2);
    if (!alive() || my !== ideasToken) return;
    const wanted = new Set([...(s.list?.items || []).map(i => i.id)]);
    const ideas = giftIdeas(pool.games, { budget: s.budget, genres: s.genres, wanted, limit: 8 });
    ideasOut.innerHTML = (ideas.length ? gridHtml(ideas, x => (x.wished ? esc(T('Arkadaşının listesinde', 'On their list')) : x.hit ? esc(T('Sevdiği türden', 'In a genre they like')) : '')) : empty('Bu bütçe ve türlerle öneri bulamadık. Bütçeyi artır ya da türleri değiştir.', 'No suggestions for this budget and genres. Raise the budget or change genres.')) + rateNote(pool.rates);
    wireCards(ideasOut, ideas.map(x => x.g));
  };
  body.querySelector('[data-gift]').addEventListener('submit', e => { e.preventDefault(); runIdeas(); });
  const friendOut = body.querySelector('[data-friend]');
  if (friendOut && s.list) {
    const ids = s.list.items.map(i => i.id);
    const { games, rates } = await market({ ids, size: 50, sort: 'score' }).catch(() => ({ games: [], rates: null }));
    if (!alive()) return;
    const byId = new Map(games.map(g => [g.id, g]));
    const found = s.list.items.map(i => byId.get(i.id)).filter(Boolean);
    const missing = s.list.items.filter(i => !byId.has(i.id));
    const within = found.filter(g => g.priceTry <= s.budget).length;
    friendOut.innerHTML = (found.length ? gridHtml(found, g => (g.discount > 0 ? esc(T('Şu an indirimde', 'On sale now')) : '')) : '') +
      (missing.length ? `<p class="kh-note">${T('Fiyatı şu an bulunamayanlar: ', 'No current price for: ')}${esc(missing.map(m => m.name).join(', '))}</p>` : '') +
      (found.length ? `<p class="kh-note">${T(`Hediye bütçeni (${money(s.budget)}) aşmayan ${within} oyun var.`, `${within} games fit your gift budget (${money(s.budget)}).`)}</p>` : '') + rateNote(rates);
    wireCards(friendOut, found);
  }
  await runIdeas();
}

// 5 — Karşılaştırma (2–3 oyun)
let cmpQuery = '';
async function tabCompare(body, alive) {
  const tray = readTray();
  body.innerHTML = `<section class="kh-section"><h2>${T('Oyun karşılaştırma', 'Compare games')}</h2>
<p class="kh-lead">${T('2 ya da 3 oyunu yan yana koy: fiyat, indirim, puan, bitirme süresi ve saat başı maliyet.', 'Put 2 or 3 games side by side: price, discount, score, time to beat and cost per hour.')}</p>
<form class="kh-form kh-search" role="search" novalidate><label class="kh-grow">${T('Oyun ara ve ekle', 'Search and add a game')}<input type="search" name="q" value="${esc(cmpQuery)}" placeholder="${T('Örn. Hades', 'e.g. Hades')}" autocomplete="off" ${tray.length >= TRAY_MAX ? 'disabled' : ''}></label></form>
<div class="kh-found" aria-live="polite"></div>
<div class="kh-result" data-table>${tray.length ? skeleton(tray.length) : empty('Karşılaştırmak için yukarıdan en az 2 oyun ekle. Kartlardaki “Kıyasla” düğmesi de buraya ekler.', 'Add at least 2 games above to compare. The “Compare” button on cards adds here too.')}</div></section>`;
  const input = body.querySelector('input[name=q]'), found = body.querySelector('.kh-found');
  let t = 0, st = 0;
  const search = async () => {
    const q = input.value.trim(); cmpQuery = input.value;
    if (q.length < 2) { found.innerHTML = ''; return; }
    const my = ++st;
    found.innerHTML = `<p class="kh-note">${T('Aranıyor…', 'Searching…')}</p>`;
    const { games } = await market({ query: q, size: 8, sort: 'default' }).catch(() => ({ games: [] }));
    if (!alive() || my !== st) return;
    const list = uniqueGames(games).slice(0, 6);
    const cur = new Set(readTray().map(x => x.key));
    found.innerHTML = list.length ? `<ul class="kh-hits">${list.map(g => `<li><span><b>${esc(g.name)}</b><small>${esc(g.store)} · ${esc(money(g.priceTry))}</small></span><button type="button" class="kh-btn" data-add="${esc(g.key)}" ${cur.has(g.key) ? 'disabled' : ''}>${cur.has(g.key) ? T('Ekli', 'Added') : T('Ekle', 'Add')}</button></li>`).join('')}</ul>` : empty('Eşleşen oyun bulunamadı.', 'No matching game found.');
    found.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
      const g = list.find(x => x.key === b.dataset.add);
      if (g && trayAdd(g)) { cmpQuery = ''; renderTab(); paintChrome(); }
    }));
  };
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(search, 250); });
  if (cmpQuery.trim().length >= 2) search();
  if (!tray.length) return;
  // Güncel fiyatlar: tepsideki her oyun için kimlikle tek istek.
  const ids = tray.map(x => x.id).filter(Boolean);
  const [fresh, ttb] = await Promise.all([ids.length ? market({ ids, size: 50, sort: 'score' }).catch(() => ({ games: [], rates: null })) : { games: [], rates: null }, ttbFor(tray.map(x => x.key))]);
  if (!alive()) return;
  const byKey = new Map(fresh.games.map(g => [g.key, g]));
  const games = tray.map(x => byKey.get(x.key)).filter(Boolean);
  const out = body.querySelector('[data-table]');
  const worth = await Promise.all(games.map(g => worthGet(g.key).catch(() => null)));
  if (!alive()) return;
  out.innerHTML = compareHtml(games, ttb, worth, tray, fresh.rates);
  out.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { trayRemove(b.dataset.rm); renderTab(); paintChrome(); }));
}
function fmtCell(row, v) {
  if (v === null || v === undefined) return '<span class="kh-na">—</span>';
  switch (row.fmt) {
    case 'money': return esc(money(v));
    case 'pct': return v > 0 ? `-%${v}` : '—';
    case 'hours': return esc(hoursText(v));
    default: return esc(String(v));
  }
}
function compareHtml(games, ttb, worth, tray, rates) {
  const missing = tray.filter(x => !games.some(g => g.key === x.key));
  if (games.length < 1) return empty('Seçilen oyunların güncel fiyatı alınamadı. Sonra tekrar dene ya da başka oyun ekle.', 'Could not get current prices for the chosen games. Try again later or add another.') + missing.map(m => `<button type="button" class="kh-btn ghost" data-rm="${esc(m.key)}">${esc(m.name)} ×</button>`).join(' ');
  const rows = compareRows(games, ttb);
  const wp = worth.map(w => (w ? worthSummary(w) : null));
  const wvals = wp.map(w => (w && w.pct !== null ? w.pct : null));
  if (wvals.some(v => v !== null)) {
    const known = wvals.filter(v => v !== null), best = Math.max(...known);
    rows.push({ key: 'worth', tr: 'Topluluk: fiyatına değer', en: 'Community: worth the price', vals: wvals, win: known.length >= 2 ? wvals.map((v, i) => (v === best ? i : -1)).filter(i => i >= 0) : [], fmt: 'pctplain' });
  }
  const wins = games.map((_, i) => rows.filter(r => r.win.includes(i)).length);
  const topN = Math.max(...wins);
  const lead = games.length >= 2 && topN > 0 && wins.filter(w => w === topN).length === 1 ? games[wins.indexOf(topN)] : null;
  return `<div class="kh-tablewrap"><table class="kh-table"><thead><tr><th scope="col"><span class="sr-only">${T('Özellik', 'Feature')}</span></th>${games.map(g => `<th scope="col"><div class="kh-th"><div class="kh-mini">${g.image ? `<img src="${esc(g.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</div><b>${esc(g.name)}</b><small>${esc(g.store)}</small><button type="button" class="kh-x" data-rm="${esc(g.key)}" aria-label="${T('Kıyastan çıkar', 'Remove from compare')}: ${esc(g.name)}">${svg('close', 14)}</button></div></th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr><th scope="row">${T(r.tr, r.en)}</th>${games.map((_, i) => `<td class="${r.win.includes(i) ? 'win' : ''}">${r.fmt === 'pctplain' ? (r.vals[i] === null ? '<span class="kh-na">—</span>' : `%${r.vals[i]}`) : fmtCell(r, r.vals[i])}${r.win.includes(i) ? `<span class="kh-win" title="${T('Bu satırda önde', 'Ahead on this row')}">${svg('check', 12)}</span>` : ''}</td>`).join('')}</tr>`).join('')}
<tr class="kh-links"><th scope="row">${T('Satın al', 'Buy')}</th>${games.map(g => `<td>${g.url ? `<a class="kh-btn" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">${T('Mağazada aç', 'Open store')} ${svg('ext', 13)}</a>` : '—'}</td>`).join('')}</tr></tbody></table></div>
${lead ? `<p class="kh-verdict"><b>${esc(lead.name)}</b> ${T(`${rows.length} satırın ${topN} tanesinde önde.`, `leads on ${topN} of ${rows.length} rows.`)}</p>` : ''}
${missing.length ? `<p class="kh-note">${T('Güncel fiyatı bulunamayanlar: ', 'No current price for: ')}${missing.map(m => `<button type="button" class="kh-btn ghost" data-rm="${esc(m.key)}">${esc(m.name)} ×</button>`).join(' ')}</p>` : ''}
<p class="kh-note">${T('Bilinmeyen değerler (—) kıyaslanmaz. Saat başı maliyet = en ucuz resmî mağaza fiyatı ÷ ortalama bitirme süresi. Topluluk oyu en az ' + MIN_VOTES + ' oyla görünür.', 'Unknown values (—) are not compared. Cost per hour = cheapest official-store price ÷ typical time to beat. Community votes show from ' + MIN_VOTES + ' votes.')}</p>${rateNote(rates)}`;
}

// ---- Oyun ayrıntısında: saat başı maliyet + fiyatına değer mi? + kıyasa ekle ----
const detailState = new WeakMap();
const normName = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
async function resolveGame(name) {
  // Arama kesme işaretine duyarlı: ad, kesmesiz ad ve sadeleştirilmiş ad birlikte denenir.
  const qs = [...new Set([name, name.replace(/['’`]/g, ''), normName(name)])];
  const parts = await Promise.all(qs.map(q => market({ query: q, size: 12, sort: 'default' }).catch(() => ({ games: [] }))));
  const games = parts.flatMap(x => x.games);
  const n = normName(name);
  const exact = games.filter(g => normName(g.name) === n || g.key === n);
  return exact.sort((a, b) => a.priceTry - b.priceTry)[0] || null;
}
function detailTitle(m) {
  const h = m.querySelector('h2'); if (!h) return '';
  return (h.querySelector('.sr-only')?.textContent || h.childNodes[0]?.textContent || '').trim();
}
function setupDetail(m) {
  const name = detailTitle(m);
  if (!name || name.length < 2) return;
  const st = { name, el: null };
  detailState.set(m, st);
  resolveGame(name).then(async g => {
    if (!g || !m.isConnected || detailState.get(m) !== st) return;
    st.game = g;
    const [ttb, worth] = await Promise.all([ttbFor([g.key]), worthGet(g.key).catch(() => null)]);
    if (!m.isConnected || detailState.get(m) !== st) return;
    st.ttb = ttb[g.key] || null; st.worth = worth;
    paintDetail(m, st);
  }).catch(() => {});
}
function paintDetail(m, st) {
  const g = st.game; if (!g) return;
  let el = st.el;
  if (!el || !el.isConnected) {
    el = document.createElement('section');
    el.className = 'kh-detail';
    el.dataset.dtOwn = 'kh';
    st.el = el;
    const price = m.querySelector(':scope>.pricecompare');
    if (price) price.after(el); else m.append(el);
  }
  const hours = hoursOf(st.ttb), cph = costPerHour(g.priceTry, hours), tier = costTier(cph);
  const w = worthSummary(st.worth || {}), mine = st.worth?.mine ?? null;
  const parts = [];
  parts.push(`<div class="kh-d-cph">${cph !== null ? `<div><small>${T('Saat başı maliyet', 'Cost per hour')}</small><b data-tier="${tier}">${esc(money(cph))}<span>/${T('sa', 'h')}</span></b></div><p>${T(`${esc(g.store)} fiyatı ${esc(money(g.priceTry))} ÷ yaklaşık ${esc(hoursText(hours))} bitirme süresi`, `${esc(g.store)} price ${esc(money(g.priceTry))} ÷ about ${esc(hoursText(hours))} to beat`)} · <b>${esc(TIER_TEXT[tier][isEn() ? 1 : 0])}</b></p>` : `<div><small>${T('Saat başı maliyet', 'Cost per hour')}</small><b class="kh-na">—</b></div><p>${T('Bu oyun için bitirme süresi verisi yok; bu yüzden saat başı maliyet hesaplanmadı.', 'No time-to-beat data for this game, so cost per hour was not calculated.')}</p>`}</div>`);
  if (!worthMissing && st.worth) {
    const bar = w.pct !== null ? `<div class="kh-bar" role="img" aria-label="${T('Evet oranı', 'Yes share')} %${w.pct}"><i style="width:${w.pct}%"></i></div>` : '';
    parts.push(`<div class="kh-d-vote"><div class="kh-d-q"><b>${T('Bu fiyata değer mi?', 'Worth this price?')}</b><small>${esc(g.store)} · ${esc(money(g.priceTry))}</small></div>
<div class="kh-d-btns" role="group" aria-label="${T('Topluluk oyu', 'Community vote')}"><button type="button" data-vote="yes" aria-pressed="${mine === 'yes'}">${svg('up', 15)} ${T('Evet', 'Yes')} <i>${w.yes}</i></button><button type="button" data-vote="no" aria-pressed="${mine === 'no'}">${svg('down', 15)} ${T('Hayır', 'No')} <i>${w.no}</i></button></div>
${bar}<p class="kh-note">${w.pct !== null ? T(`${w.total} oyun içinden %${w.pct}’i “değer” dedi.`, `${w.pct}% of ${w.total} votes say it’s worth it.`) : T(`Yüzde ${MIN_VOTES} oydan sonra görünür (${w.total}/${MIN_VOTES}).`, `The percentage shows after ${MIN_VOTES} votes (${w.total}/${MIN_VOTES}).`)}</p></div>`);
  }
  const inTray = readTray().some(x => x.key === g.key), full = readTray().length >= TRAY_MAX;
  parts.push(`<div class="kh-d-act"><button type="button" class="kh-btn" data-addcmp ${inTray || full ? 'disabled' : ''}>${svg('scale', 14)} ${inTray ? T('Kıyasta', 'In compare') : T('Karşılaştırmaya ekle', 'Add to compare')} (${readTray().length}/${TRAY_MAX})</button>${readTray().length ? `<button type="button" class="kh-btn ghost" data-opencmp>${T('Kıyası aç', 'Open compare')}</button>` : ''}</div>`);
  const html = parts.join('');
  const sig = html + (isEn() ? 'en' : 'tr');
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  el.innerHTML = `<h3>${svg('spark', 15)} ${T('Değer analizi', 'Value check')}</h3>${html}`;
  el.querySelectorAll('[data-vote]').forEach(b => b.addEventListener('click', async () => {
    const next = st.worth?.mine === b.dataset.vote ? null : b.dataset.vote;
    b.disabled = true;
    const v = await worthVote(g.key, next);
    if (v) st.worth = v; else toast(T('Oy şu an kaydedilemedi', 'Could not save your vote right now'));
    paintDetail(m, st);
  }));
  el.querySelector('[data-addcmp]')?.addEventListener('click', () => { if (trayAdd(g)) { toast(T('Karşılaştırmaya eklendi', 'Added to compare') + ` (${readTray().length}/${TRAY_MAX})`, () => openHub('compare')); paintDetail(m, st); } });
  el.querySelector('[data-opencmp]')?.addEventListener('click', () => openHub('compare'));
}
function scanDetails() {
  document.querySelectorAll('.modal.game-detail').forEach(m => {
    const name = detailTitle(m), st = detailState.get(m);
    if (!name) return;
    if (!st || st.name !== name) { st?.el?.remove(); setupDetail(m); }
    else if (st.game && (!st.el || !st.el.isConnected)) paintDetail(m, st);
  });
}

// ---- Girişler: üst menü, Menü paneli, ana sayfa şeridi ----
function placeNav() {
  document.querySelectorAll('header .topbar > nav:not(.bottom-nav)').forEach(nav => {
    let b = nav.querySelector(':scope > .kh-nav');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button'; b.className = 'kh-nav';
      b.addEventListener('click', () => openHub('foryou'));
      const ink = nav.querySelector(':scope > .tz-ink');
      nav.insertBefore(b, ink || null);
    }
    const label = T('Senin için', 'For you');
    if (b.dataset.l !== label) { b.dataset.l = label; b.innerHTML = `${svg('spark', 16)}<span>${label}</span>`; }
  });
}
function placeMenu() {
  const panel = document.querySelector('.menu-panel');
  const grid = panel && panel.querySelector('.menu-grid');
  if (!grid) return;
  let b = grid.querySelector(':scope > .kh-menuitem');
  if (!b) {
    b = document.createElement('button');
    b.type = 'button'; b.className = 'kh-menuitem';
    b.addEventListener('click', () => { panel.querySelector('.menu-close')?.click(); setTimeout(() => openHub('foryou'), 50); });
    grid.append(b);
  }
  const sig = isEn() ? 'en' : 'tr';
  if (b.dataset.l !== sig) {
    b.dataset.l = sig;
    b.innerHTML = `<i>${svg('spark', 20)}</i><span><b>${T('Senin için', 'For you')}</b><small>${T('Fırsatlar, sepet, gizli hazine, hediye, kıyas', 'Deals, basket, hidden gems, gifts, compare')}</small></span>`;
  }
}
let homeToken = 0;
async function placeHome() {
  const tab = document.querySelector('.tabfade');
  const simple = tab && tab.querySelector(':scope > .storebrowser.simple-home');
  const form = tab && [...tab.children].find(c => c.classList.contains('csearch') || (c.tagName === 'DIV' && c.querySelector(':scope > .csearch')));
  let sec = tab && tab.querySelector(':scope > .kh-home');
  if (!simple || !form) { sec?.remove(); return; }
  if (!sec) {
    sec = document.createElement('section');
    sec.className = 'kh-home';
    sec.setAttribute('aria-label', T('Senin için fırsatlar', 'Deals for you'));
    form.after(sec);
  }
  const lang = isEn() ? 'en' : 'tr', fav = readFavs().length + ':' + localGenres().join();
  if (sec.dataset.sig === lang + fav && sec.dataset.ready) return;
  sec.dataset.sig = lang + fav;
  const my = ++homeToken;
  sec.innerHTML = `<div class="kh-home-head"><h2>${svg('spark', 18)} ${T('Senin için fırsatlar', 'Deals for you')}</h2><button type="button" class="kh-link-btn" data-all>${T('Hepsini gör →', 'See all →')}</button></div><div class="kh-rail">${'<div class="kh-rail-card kh-skel"></div>'.repeat(4)}</div>`;
  sec.querySelector('[data-all]').addEventListener('click', () => openHub('foryou'));
  try {
    const { ranked } = await forYouData();
    if (my !== homeToken || !sec.isConnected) return;
    sec.dataset.ready = '1';
    const profile = profileNow();
    if (!ranked.length) { sec.querySelector('.kh-rail').innerHTML = `<p class="kh-empty">${profile.empty ? T('Tarzını seç, fırsatlar sana göre sıralansın.', 'Pick your taste and deals are ranked for you.') : T('Şu an zevkine uyan indirim yok.', 'No discounts match your taste right now.')} <button type="button" class="kh-link-btn" data-all2>${T('Tarzını seç', 'Pick your taste')}</button></p>`; sec.querySelector('[data-all2]').addEventListener('click', () => openHub('foryou')); return; }
    sec.querySelector('.kh-rail').innerHTML = ranked.slice(0, 8).map(({ g }) => `<a class="kh-rail-card" ${g.url ? `href="${esc(g.url)}" target="_blank" rel="noopener noreferrer"` : ''}><span class="kh-rail-cover">${g.image ? `<img src="${esc(g.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<em>${esc(g.name.charAt(0).toUpperCase())}</em>${g.discount > 0 ? `<i>-%${g.discount}</i>` : ''}</span><b>${esc(g.name)}</b><small>${esc(money(g.priceTry))} · ${esc(g.store)}</small></a>`).join('');
  } catch { if (my === homeToken) { sec.dataset.ready = ''; sec.remove(); } }
}

let queued = false;
function tick() {
  queued = false;
  placeNav();
  placeMenu();
  scanDetails();
  placeHome();
}
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(tick);
}

function openFromUrl() {
  const code = new URLSearchParams(location.search).get('hediye');
  if (!code) return;
  const list = decodeWishlist(code);
  if (!list) return;
  giftState.list = list;
  openHub('gift');
}

export function start() {
  if (!BROWSER || start.done) return;
  start.done = true;
  const boot = () => {
    tick();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(() => {
      document.querySelectorAll('.kh-nav,.kh-menuitem').forEach(b => { delete b.dataset.l; });
      document.querySelectorAll('.kh-home').forEach(s => { delete s.dataset.sig; });
      if (hub) { paintChrome(); renderTab(); }
      schedule();
    }).observe(root, { attributes: true, attributeFilter: ['lang'] });
    window.addEventListener('kh:tray', () => { if (hub) paintChrome(); document.querySelectorAll('.modal.game-detail').forEach(m => { const st = detailState.get(m); if (st?.game) paintDetail(m, st); }); });
    openFromUrl();
  };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot, { once: true });
}
start();
