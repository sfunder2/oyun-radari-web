// Alım rehberi (27 Kasım 2026): fiyat alarmı, istek listesi içe aktarma, kütüphane ve "zaten sahipsin" uyarısı, ek içerik toplamı,
// bölgeler arası en ucuz, "Almalı mıyım?" skoru, indirim takvimi hatırlatıcısı, mağaza güven rozetleri, kişisel akış, ortak liste,
// aylık harcama, abonelik karşılaştırma, saat başı fiyat ve fiyat doğrulama oyları.
//
// Paketin React koduna dokunmaz; DOM'u izler (kisisel-20261121.js ile aynı yöntem). Hesaplar alim-core-20261127.js içindedir ve Node'da sınanır.
// Kişisel kayıtlar yalnız bu cihazda tutulur (radar-alim-*). Eksik veri üretilmez: veri yoksa "veri yok" yazılır.
import {
  normTitle, baseTitle, cleanRule, alarmState, shouldNotify, parseWishlistText, matchName, cleanOwned, ownedIndex, ownedMatch,
  bundleTotals, cheapestRegion, buyScore, VERDICT_TEXT, seasonIcs, dueSeasonReminders, seasonMark, trustOf, TRUST_TEXT, monthReport,
  purchasesCsv, SUBSCRIPTIONS, subscriptionPlan, rankByCostPerHour, feedAdjust, commonGames,
} from './alim-core-20261127.js';
import { normItem, hoursOf, costPerHour, costTier, TIER_TEXT, rankForYou, tasteProfile, worthSummary, encodeWishlist, decodeWishlist, GENRE_EN } from './kisisel-20261121.js';
import { seasonsBetween } from './tasarim-20261117.js';

const BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined';
const SUPA = 'https://dsosckshigzijnsxmlwh.supabase.co';
const KEY = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
const root = BROWSER ? document.documentElement : null;
const isEn = () => BROWSER && root.lang === 'en';
const T = (tr, en) => (isEn() ? en : tr);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const finite = v => typeof v === 'number' && Number.isFinite(v);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const jget = (k, fb) => { try { const v = JSON.parse(store.get(k) || 'null'); return v ?? fb; } catch { return fb; } };
const jset = (k, v) => store.set(k, JSON.stringify(v));
const money = v => (finite(v) ? '₺' + new Intl.NumberFormat(isEn() ? 'en-US' : 'tr-TR', { maximumFractionDigits: v >= 100 ? 0 : 2, minimumFractionDigits: v >= 100 || Number.isInteger(v) ? 0 : 2 }).format(v) : '—');
const dateText = t => new Date(t).toLocaleDateString(isEn() ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const authHeaders = () => ({ apikey: KEY, Authorization: 'Bearer ' + KEY });
const DAYMS = 864e5;

// ---- Kayıtlar ----
const K = { alarms: 'radar-alim-alarms-v1', owned: 'radar-alim-owned-v1', feed: 'radar-alim-feed-v1', cal: 'radar-alim-cal-v1', subs: 'radar-alim-subs-v1' };
const readAlarms = () => (Array.isArray(jget(K.alarms, [])) ? jget(K.alarms, []).map(cleanRule).filter(Boolean).slice(0, 100) : []);
const writeAlarms = l => { jset(K.alarms, l.slice(0, 100)); window.dispatchEvent(new CustomEvent('alim:alarms')); };
const readOwned = () => cleanOwned(jget(K.owned, []));
const writeOwned = l => { jset(K.owned, cleanOwned(l)); window.dispatchEvent(new CustomEvent('alim:owned')); };
const readFeed = () => { const f = jget(K.feed, {}); return { genres: f && typeof f.genres === 'object' && f.genres ? f.genres : {}, hidden: Array.isArray(f?.hidden) ? f.hidden.slice(-300) : [] }; };
const readFavs = () => { const l = jget('radar-fav-v3', []); return Array.isArray(l) ? l.filter(f => f && typeof f.id === 'string') : []; };
const readPurchases = () => { const p = jget('radar-lifestyle-v1', {}).purchases; return Array.isArray(p) ? p : []; };
const session = () => { try { const t = JSON.parse(localStorage.getItem('radar-auth') || sessionStorage.getItem('radar-auth') || 'null'); return t?.access_token && t.user?.id ? t : null; } catch { return null; } };

// ---- Veri ----
const memo = new Map();
function remember(key, ttl, make) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.p;
  const p = make().catch(e => { memo.delete(key); throw e; });
  if (memo.size > 80) memo.delete(memo.keys().next().value);
  memo.set(key, { at: Date.now(), p });
  return p;
}
const getRates = () => remember('rates', 6e5, async () => {
  try {
    const r = await fetch(SUPA + '/functions/v1/radar-services?action=rates', { headers: { Authorization: 'Bearer ' + KEY }, credentials: 'omit', signal: AbortSignal.timeout(1e4) });
    const j = await r.json().catch(() => null);
    return r.ok && j && j.status === 'ok' && Number(j.usdTry) > 0 ? { usdTry: Number(j.usdTry), eurTry: Number(j.eurTry) || null } : null;
  } catch { return null; }
});
/** search_market: normalleşmiş oyun + ham satır (teklif listesi güven rozetleri için gerekir). */
async function market({ query = '', deals = false, sort = 'score', page = 0, size = 50, ids = null, filters = {} } = {}) {
  const rates = await getRates();
  const fo = { ...filters };
  if (rates?.usdTry) fo.usdTry = rates.usdTry;
  if (ids) fo.ids = ids;
  const body = JSON.stringify({ market: 'all', query_text: query, page_number: page, page_size: size, deals_only: deals, sort_order: sort, filter_options: fo });
  const rows = await remember('m:' + body, 3e5, async () => {
    const r = await fetch(SUPA + '/rest/v1/rpc/search_market', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body, credentials: 'omit', signal: AbortSignal.timeout(2e4) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    return Array.isArray(j?.items) ? j.items : [];
  });
  const games = [];
  for (const raw of rows) { const g = normItem(raw, rates); if (g) games.push({ ...g, raw }); }
  return { games, rows, rates };
}
async function marketPages(opts, pages) {
  const parts = await Promise.all(Array.from({ length: pages }, (_, i) => market({ ...opts, page: i }).catch(() => ({ games: [], rows: [], rates: null }))));
  return parts.flatMap(p => p.games);
}
async function resolveGame(name) {
  const n = baseTitle(name);
  const qs = [...new Set([name, name.replace(/['’`]/g, ''), normTitle(name)])];
  const parts = await Promise.all(qs.map(q => market({ query: q, size: 12, sort: 'default' }).catch(() => ({ games: [] }))));
  const games = parts.flatMap(p => p.games);
  return games.filter(g => baseTitle(g.name) === n).sort((a, b) => a.priceTry - b.priceTry)[0] || null;
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
const rest = async path => {
  const r = await fetch(SUPA + '/rest/v1/' + path, { headers: authHeaders(), credentials: 'omit', signal: AbortSignal.timeout(15e3) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
};
const ID_OK = /^[A-Za-z0-9_.-]{1,140}$/;
/** Geçmiş fiyat satırları (kendi para biriminde). id "platform:store_id" ise teklif geçmişi, değilse PlayStation geçmişi. */
function priceHistory(id) {
  const k = id.indexOf(':');
  const path = k < 0
    ? ID_OK.test(id) && 'ps_price_history?select=day,price&order=day.asc&limit=400&product_id=eq.' + encodeURIComponent(id)
    : ID_OK.test(id.slice(k + 1)) && 'offer_price_history?select=day,price&order=day.asc&limit=400&platform=eq.' + encodeURIComponent(id.slice(0, k)) + '&store_id=eq.' + encodeURIComponent(id.slice(k + 1));
  return path ? remember('h:' + id, 18e5, () => rest(path)) : Promise.resolve([]);
}
/** Geçmişin TL ölçeğinde en düşüğü ve kayıt süresi (gün). Para birimi çevrimi güncel fiyat oranıyla yapılır. */
async function lowOf(g) {
  try {
    const rows = (await priceHistory(g.id)).map(r => ({ t: Date.parse(r.day), p: Number(r.price) })).filter(r => Number.isFinite(r.t) && Number.isFinite(r.p) && r.p > 0);
    if (rows.length < 2 || !(g.price > 0)) return { low: null, days: 0, high: null };
    const scale = g.priceTry / g.price;
    const days = Math.round((Date.now() - Math.min(...rows.map(r => r.t))) / DAYMS);
    return { low: Math.min(...rows.map(r => r.p)) * scale, high: Math.max(...rows.map(r => r.p)) * scale, days };
  } catch { return { low: null, days: 0, high: null }; }
}

// ---- Fiyat doğrulama oyları (supabase/schema-v53-fiyat-dogrulama.sql) ----
let checkMissing = false;
const voterId = () => {
  let v = store.get('radar-party-voter') || '';
  if (/^[0-9a-f]{32}$/.test(v)) return v;
  const a = new Uint8Array(16); crypto.getRandomValues(a);
  v = [...a].map(x => x.toString(16).padStart(2, '0')).join('');
  store.set('radar-party-voter', v);
  return v;
};
async function checkRpc(name, body) {
  const r = await fetch(SUPA + '/rest/v1/rpc/' + name, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit', signal: AbortSignal.timeout(12e3) });
  if (r.status === 404) { checkMissing = true; return null; }
  const j = await r.json().catch(() => null);
  if (!r.ok) { if (/PGRST202|does not exist|Could not find/i.test(JSON.stringify(j))) checkMissing = true; return null; }
  return j;
}
const storeSlug = p => String(p || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
const checkGet = (key, plat) => (checkMissing || !key || storeSlug(plat).length < 2 ? Promise.resolve(null) : checkRpc('price_check_get', { p_key: key, p_store: storeSlug(plat), p_voter: voterId() }));
const checkVote = (key, plat, vote) => checkRpc('price_check_vote', { p_key: key, p_store: storeSlug(plat), p_voter: voterId(), p_vote: vote });

// ---- Ortak parçalar ----
const ICON = {
  guide: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  ext: '<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  lib: '<path d="M4 4h4v16H4zM10 4h4v16h-4zM16.5 5.5l3.9-.9 3 15-3.9.9z"/>',
};
const svg = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
let toastEl = null, toastTimer = 0;
function toast(text, action, label) {
  toastEl?.remove();
  toastEl = document.createElement('div');
  toastEl.className = 'kh-toast al-toast';
  toastEl.setAttribute('role', 'status');
  toastEl.innerHTML = `<span>${esc(text)}</span>${action ? `<button type="button">${esc(label || T('Aç', 'Open'))}</button>` : ''}`;
  if (action) toastEl.querySelector('button').addEventListener('click', () => { toastEl.remove(); action(); });
  document.body.appendChild(toastEl);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl?.remove(), 6000);
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3e4);
}
const copyText = async t => { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } };
const skeleton = n => `<div class="kh-grid" aria-busy="true">${'<div class="kh-card kh-skel"></div>'.repeat(n)}</div>`;
const empty = (tr, en) => `<p class="kh-empty">${T(tr, en)}</p>`;
const errorBox = () => empty('Veriler şu an alınamadı. Biraz sonra tekrar dene.', 'Could not load data right now. Please try again shortly.');
const genreLabel = g => (isEn() ? GENRE_EN[g] || g : g);
const trustChip = platform => {
  const t = trustOf(platform), x = TRUST_TEXT[t.tier];
  return `<span class="al-trust" data-tier="${t.tier}" title="${esc(T(x.tipTr, x.tipEn))}">${esc(T(x.tr, x.en))}</span>`;
};
const storeName = g => g.store;
const coverHtml = g => `<div class="kh-cover" aria-hidden="true"><span>${esc(g.name.trim().charAt(0).toUpperCase())}</span>${g.image ? `<img src="${esc(g.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</div>`;
function gameCard(g, { why = '', actions = '' } = {}) {
  const owned = ownedMatch(ownedIndex(readOwned()), g.name);
  const old = g.original && g.original > g.price ? `<del>${esc(money(g.originalTry ?? g.original))}</del>` : '';
  return `<article class="kh-card" data-key="${esc(g.key)}" data-id="${esc(g.id)}">${coverHtml(g)}<div class="kh-info">
<b class="kh-name">${esc(g.name)}</b><small class="kh-meta">${esc(storeName(g))}${g.genres.length ? ' · ' + esc(g.genres.slice(0, 2).map(genreLabel).join(', ')) : ''}</small>
<div class="kh-price"><strong>${esc(money(g.priceTry))}</strong>${old}${g.discount > 0 ? `<em class="kh-off">-%${g.discount}</em>` : ''}</div>
<div class="kh-chips">${g.score !== null ? `<span class="kh-chip">${T('Puan', 'Score')} ${g.score}</span>` : ''}${owned ? `<span class="kh-chip al-owned-chip">${T('Kütüphanende', 'In your library')}</span>` : ''}${g.cph ? `<span class="kh-chip" data-tier="${costTier(g.cph)}">${esc(money(g.cph))}/${T('sa', 'h')}</span>` : ''}</div>
${why ? `<p class="kh-why">${why}</p>` : ''}
<div class="kh-actions">${g.url ? `<a class="kh-btn" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">${T('Mağazada aç', 'Open store')} ${svg('ext', 13)}</a>` : ''}${actions}</div></div></article>`;
}
function addFavorite(g) {
  const favs = readFavs();
  if (favs.some(f => f.id === g.id)) return false;
  const cur = ['TRY', 'USD', 'EUR'].includes(g.currency) ? g.currency : 'TRY';
  favs.unshift({ id: g.id, name: g.name.slice(0, 180), url: g.url || 'https://store.playstation.com/', image: g.image || undefined, price: g.price, currency: cur, status: 'wish', added: Date.now(), genres: g.genres.slice(0, 12) });
  jset('radar-fav-v3', favs.slice(0, 2000));
  return true;
}

// ---- Akış (42) ----
const feedGames = () => remember('feed', 6e5, () => marketPages({ deals: true, sort: 'score' }, 3));
async function tabFeed(body, alive) {
  body.innerHTML = skeleton(6);
  const all = await feedGames();
  if (!alive()) return;
  const fb = readFeed(), idx = ownedIndex(readOwned());
  const profile = tasteProfile(jget('radar-experience-v1', {}), readFavs());
  const liked = Object.entries(fb.genres).filter(([, v]) => v > 0).map(([g]) => g);
  if (liked.length) { profile.genres = [...new Set([...profile.genres, ...liked])].slice(0, 10); profile.empty = false; }
  const favIds = new Set(readFavs().map(f => f.id));
  const entries = rankForYou(all, profile, { exclude: favIds, limit: 60 }).filter(e => !ownedMatch(idx, e.g.name));
  const list = feedAdjust(entries, fb).slice(0, 24);
  const head = `<p class="kh-lead">${T('Tarzına, istek listene, beğendiğin türlere ve kütüphanene göre sıralanır. Sahip olduklarını ve “İlgilenmem” dediklerini göstermeyiz.', 'Ranked by your taste, wishlist and the genres you liked. Games you own or hid are never shown.')}</p>`;
  if (!list.length) { body.innerHTML = head + empty(profile.empty ? 'Önce Senin için bölümünden oyuncu tarzını seç ya da birkaç oyunu istek listene ekle.' : 'Şu an zevkine uyan indirim yok.', profile.empty ? 'Pick your play style in For you or add a few games to your wishlist first.' : 'No discounts match your taste right now.'); return; }
  const byId = new Map(list.map(x => [x.g.id, x.g]));
  const why = x => {
    const bits = [...x.m.genres.map(genreLabel), ...x.m.tags.slice(0, 2)];
    return (x.liked ? T('Beğendiğin türlere yakın · ', 'Close to genres you liked · ') : '') + (bits.length ? T('Eşleşen: ', 'Matches: ') + esc(bits.join(', ')) : T('Yüksek puan ve indirim', 'High score and discount'));
  };
  const act = `<button type="button" class="kh-btn" data-like>${T('Beğendim', 'Like')}</button><button type="button" class="kh-btn ghost" data-hide>${T('İlgilenmem', 'Not interested')}</button><button type="button" class="kh-btn ghost" data-fav>${T('İstek listesi', 'Wishlist')}</button>`;
  body.innerHTML = head + `<div class="kh-grid">${list.map(x => gameCard(x.g, { why: why(x), actions: act })).join('')}</div>`;
  body.querySelectorAll('.kh-card').forEach(card => {
    const g = byId.get(card.dataset.id);
    const save = fn => { const f = readFeed(); fn(f); jset(K.feed, f); };
    card.querySelector('[data-like]')?.addEventListener('click', e => { save(f => { for (const x of g.genres) f.genres[x] = Math.min(5, (f.genres[x] || 0) + 1); }); e.currentTarget.disabled = true; e.currentTarget.textContent = T('Beğenildi', 'Liked'); });
    card.querySelector('[data-hide]')?.addEventListener('click', () => { save(f => { f.hidden.push(g.id); for (const x of g.genres) f.genres[x] = Math.max(-5, (f.genres[x] || 0) - 1); }); card.remove(); });
    card.querySelector('[data-fav]')?.addEventListener('click', e => { if (addFavorite(g)) toast(T('İstek listene eklendi. Listeyi görmek için sayfayı yenile.', 'Added to your wishlist. Reload to see it.'), () => location.reload(), T('Yenile', 'Reload')); e.currentTarget.disabled = true; });
  });
}

// ---- Alarmlar (34) ----
const MODE_TEXT = {
  target: ['Hedef fiyat', 'Target price'], percent: ['İndirim yüzdesi', 'Discount percent'], drop: ['Şu andan % ucuzlayınca', 'Drops by %'], atl: ['Tüm zamanların en düşüğü', 'All-time low'],
};
const modeLine = r => {
  if (r.mode === 'target') return T(`${money(r.value)} ve altı`, `${money(r.value)} or lower`);
  if (r.mode === 'percent') return T(`İndirim %${r.value} ve üstü`, `Discount ${r.value}% or more`);
  if (r.mode === 'drop') return T(`Eklendiği fiyattan (${money(r.base)}) %${r.value} ucuz`, `${r.value}% below the price when added (${money(r.base)})`);
  return T('Kayıtlı en düşük fiyata inince', 'When it hits the recorded low');
};
async function evaluateAlarms(rules) {
  const ids = [...new Set(rules.map(r => r.id))];
  const found = new Map();
  for (let i = 0; i < ids.length; i += 20) {
    try { for (const g of (await market({ ids: ids.slice(i, i + 20), size: 50, sort: 'default' })).games) found.set(g.id, g); } catch { /* kalanlar gösterilir */ }
  }
  const out = [];
  for (const r of rules) {
    const g = found.get(r.id) || null;
    const hist = g && r.mode === 'atl' ? await lowOf(g) : { low: null, days: 0 };
    out.push({ rule: r, game: g, st: alarmState(r, g, { low: hist.low, lowDays: hist.days }) });
  }
  return out;
}
function ensureNotifyPermission() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* izin yok */ } }
function notify(title, text) {
  toast(title + ' · ' + text, () => openHub('alarms'));
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body: text, icon: '/oyun-radari-web/icons/icon.svg' }); } catch { /* izin yok */ }
}
let alarmBusy = false;
async function checkAlarms({ silent = false } = {}) {
  const rules = readAlarms();
  if (!rules.length || alarmBusy) { paintBadge(0); return []; }
  alarmBusy = true;
  try {
    const res = await evaluateAlarms(rules);
    const now = Date.now();
    let changed = false;
    for (const x of res) {
      if (!silent && shouldNotify(x.rule, x.st, now)) {
        notify(T('Fiyat alarmı', 'Price alert'), `${x.rule.name}: ${money(x.st.price)}`);
        x.rule.firedAt = now; changed = true;
      }
    }
    if (changed) jset(K.alarms, rules);
    paintBadge(res.filter(x => x.st.state === 'hit').length);
    return res;
  } finally { alarmBusy = false; }
}
function paintBadge(n) {
  document.querySelectorAll('.al-nav,.al-menuitem').forEach(b => { b.dataset.hits = n ? String(n) : ''; });
}
async function tabAlarms(body, alive) {
  body.innerHTML = skeleton(3);
  const res = await checkAlarms({ silent: true });
  if (!alive()) return;
  const chip = { hit: [T('Hedefte', 'Reached'), 'ok'], near: [T('Yaklaştı', 'Close'), 'warn'], waiting: [T('Bekliyor', 'Waiting'), ''], stale: [T('Fiyat yok', 'No price'), 'mute'], nodata: [T('Geçmiş az', 'Little history'), 'mute'] };
  const list = readAlarms().length ? res : [];
  body.innerHTML = `<p class="kh-lead">${T('Dört alarm türü: hedef fiyat, indirim yüzdesi, şu anki fiyattan % ucuzlama ve tüm zamanların en düşüğü. Site açıkken 5 dakikada bir kontrol edilir; tarayıcı izni verirsen bildirim de gelir.', 'Four alert types: target price, discount percent, % below the current price, and all-time low. Checked every 5 minutes while the site is open; allow notifications to get a browser alert.')}</p>
<form class="al-form" data-new><label>${T('Oyun', 'Game')}<input type="search" name="q" placeholder="${T('Oyun ara…', 'Search a game…')}" autocomplete="off" required></label><div class="al-hits" role="listbox" aria-label="${T('Sonuçlar', 'Results')}"></div>
<div class="al-row"><label>${T('Alarm türü', 'Alert type')}<select name="mode">${Object.entries(MODE_TEXT).map(([k, v]) => `<option value="${k}">${esc(T(v[0], v[1]))}</option>`).join('')}</select></label>
<label data-valwrap>${T('Değer', 'Value')}<input type="number" name="value" min="1" step="any" inputmode="decimal" placeholder="${T('TL', 'TRY')}"></label>
<button type="submit" class="kh-btn" disabled>${svg('bell', 14)} ${T('Alarm kur', 'Set alert')}</button></div><p class="kh-note" data-msg></p></form>
<div class="al-actions"><button type="button" class="kh-btn ghost" data-perm>${T('Tarayıcı bildirimine izin ver', 'Allow browser notifications')}</button></div>
<ul class="al-list">${list.length ? list.map(x => `<li class="al-item" data-id="${esc(x.rule.id)}" data-mode="${x.rule.mode}"><div class="al-main"><b>${esc(x.rule.name)}</b><small>${esc(T(MODE_TEXT[x.rule.mode][0], MODE_TEXT[x.rule.mode][1]))}: ${esc(modeLine(x.rule))}${x.st.price != null ? ` · ${T('şimdi', 'now')} ${esc(money(x.st.price))}` : ''}</small></div><span class="al-chip" data-tone="${chip[x.st.state][1]}">${esc(chip[x.st.state][0])}</span><button type="button" class="kh-btn ghost" data-del aria-label="${T('Alarmı sil', 'Delete alert')}">${svg('close', 13)}</button></li>`).join('') : `<li class="al-none">${T('Henüz alarm yok.', 'No alerts yet.')}</li>`}</ul>`;
  const form = body.querySelector('[data-new]'), hits = body.querySelector('.al-hits'), submit = form.querySelector('button[type=submit]');
  const msg = form.querySelector('[data-msg]');
  let picked = null, timer = 0;
  const syncMode = () => {
    const m = form.mode.value, w = form.querySelector('[data-valwrap]');
    w.hidden = m === 'atl';
    form.value.placeholder = m === 'target' ? T('TL', 'TRY') : '%';
    if (picked && m === 'target' && !form.value.value) form.value.value = String(Math.max(1, Math.floor(picked.priceTry * 0.8)));
  };
  form.mode.addEventListener('change', syncMode); syncMode();
  form.q.addEventListener('input', () => {
    picked = null; submit.disabled = true; clearTimeout(timer);
    const q = form.q.value.trim();
    if (q.length < 2) { hits.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      try {
        const { games } = await market({ query: q, size: 8, sort: 'default' });
        if (form.q.value.trim() !== q) return;
        hits.innerHTML = games.slice(0, 6).map((g, i) => `<button type="button" role="option" data-i="${i}">${esc(g.name)} <small>${esc(money(g.priceTry))} · ${esc(g.store)}</small></button>`).join('') || `<p class="kh-note">${T('Sonuç yok', 'No results')}</p>`;
        hits.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
          picked = games[Number(b.dataset.i)]; form.q.value = picked.name; hits.innerHTML = ''; submit.disabled = false; syncMode();
          msg.textContent = T(`Şimdiki fiyat ${money(picked.priceTry)}${picked.discount > 0 ? ` (%${picked.discount} indirim)` : ''}.`, `Current price ${money(picked.priceTry)}${picked.discount > 0 ? ` (${picked.discount}% off)` : ''}.`);
        }));
      } catch { hits.innerHTML = errorBox(); }
    }, 300);
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!picked) return;
    const rule = cleanRule({ id: picked.id, name: picked.name, key: picked.key, mode: form.mode.value, value: Number(form.value.value), base: picked.priceTry, created: Date.now() });
    if (!rule) { msg.textContent = T('Değer geçersiz. Yüzdeler 1–95, hedef fiyat 0’dan büyük olmalı.', 'Invalid value. Percents are 1–95, a target price must be above 0.'); return; }
    const rules = readAlarms().filter(r => !(r.id === rule.id && r.mode === rule.mode));
    rules.unshift(rule); writeAlarms(rules); ensureNotifyPermission(); renderTab();
  });
  body.querySelector('[data-perm]').addEventListener('click', () => { ensureNotifyPermission(); toast(T('İzin penceresi açıldıysa “İzin ver” de.', 'If a prompt appeared, choose “Allow”.')); });
  body.querySelectorAll('.al-item [data-del]').forEach(b => b.addEventListener('click', () => {
    const li = b.closest('.al-item');
    writeAlarms(readAlarms().filter(r => !(r.id === li.dataset.id && r.mode === li.dataset.mode))); renderTab();
  }));
}

// ---- İçe aktar (35) ----
const imp = { found: [], missed: [], busy: false, msg: '' };
async function matchAll(names, onStep) {
  const found = [], missed = [];
  let i = 0;
  const worker = async () => {
    while (i < names.length) {
      const name = names[i++];
      try {
        const { games } = await market({ query: name, size: 10, sort: 'default' });
        const m = matchName(name, games);
        (m ? found : missed).push(m ? { name, game: m.game, how: m.how } : { name });
      } catch { missed.push({ name }); }
      onStep(found.length + missed.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return { found, missed };
}
async function steamWishlistNames() {
  const s = session();
  if (!s) return { error: T('Steam isteklerini getirmek için siteye giriş yapıp Steam hesabını bağla.', 'Sign in and link your Steam account to fetch your Steam wishlist.') };
  const r = await fetch(SUPA + '/functions/v1/steam-account?action=wishlist', { headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token }, signal: AbortSignal.timeout(2e4) }).catch(() => null);
  const j = r ? await r.json().catch(() => null) : null;
  if (!r || !r.ok) return { error: j?.error || T('Steam isteği şu an alınamadı. Fonksiyonun güncel sürümü yayında olmayabilir.', 'Could not reach Steam right now. The latest function version may not be deployed yet.') };
  if (!j.linked) return { error: T('Önce Steam hesabını bağla (Profil → Steam).', 'Link your Steam account first (Profile → Steam).') };
  if (!j.visible) return { error: T('Steam istek listen herkese açık değil. Steam’de Gizlilik → Oyun ayrıntıları’nı herkese aç.', 'Your Steam wishlist is not public. Make Game details public in Steam privacy settings.') };
  const ids = j.items.map(i => String(i.appid));
  const rows = [];
  for (let k = 0; k < ids.length; k += 80) {
    try { rows.push(...await rest('store_offers?select=store_id,name&platform=eq.steam&store_id=in.(' + ids.slice(k, k + 80).map(x => '"' + x + '"').join(',') + ')')); } catch { /* kalanlar */ }
  }
  const names = rows.map(r => r.name).filter(Boolean);
  return { names, total: ids.length };
}
async function tabImport(body, alive) {
  const ownedIdx = ownedIndex(readOwned()), favIds = new Set(readFavs().map(f => baseTitle(f.name)));
  const results = imp.found.length || imp.missed.length ? `<div class="al-result">
<p class="kh-note">${T(`${imp.found.length} oyun eşleşti, ${imp.missed.length} oyun katalogda bulunamadı.`, `${imp.found.length} games matched, ${imp.missed.length} were not found in the catalog.`)} ${imp.msg ? esc(imp.msg) : ''}</p>
<ul class="al-list">${imp.found.map((x, i) => `<li class="al-item"><label class="al-check"><input type="checkbox" data-pick="${i}" ${favIds.has(baseTitle(x.game.name)) ? '' : 'checked'}><span class="al-main"><b>${esc(x.game.name)}</b><small>${esc(money(x.game.priceTry))}${x.game.discount > 0 ? ` · -%${x.game.discount}` : ''} · ${esc(x.game.store)}${x.how === 'fuzzy' ? ` · ${T('yaklaşık eşleşme', 'approximate match')}` : ''}${ownedMatch(ownedIdx, x.game.name) ? ` · ${T('kütüphanende', 'in your library')}` : ''}${favIds.has(baseTitle(x.game.name)) ? ` · ${T('listede', 'already listed')}` : ''}</small></span></label></li>`).join('')}</ul>
<div class="al-actions"><button type="button" class="kh-btn" data-addfav>${T('Seçilenleri istek listesine ekle', 'Add selected to wishlist')}</button><button type="button" class="kh-btn ghost" data-addowned>${T('Seçilenleri kütüphanem olarak işaretle', 'Mark selected as owned')}</button></div>
${imp.missed.length ? `<details><summary>${T('Bulunamayanlar', 'Not found')} (${imp.missed.length})</summary><p class="kh-note">${esc(imp.missed.map(x => x.name).join(' · '))}</p></details>` : ''}</div>` : '';
  body.innerHTML = `<p class="kh-lead">${T('Başka mağazalardaki istek listeni tek seferde getir. Eşleşmeyenleri atlar, uydurma kayıt eklemez.', 'Bring in wishlists from other stores in one go. Unmatched titles are skipped, nothing is invented.')}</p>
<div class="al-cols"><section class="al-box"><h3>Steam</h3><p class="kh-note">${T('Steam hesabın bağlıysa ve istek listen herkese açıksa tek tuşla gelir.', 'One tap if your Steam account is linked and the wishlist is public.')}</p><button type="button" class="kh-btn" data-steam ${imp.busy ? 'disabled' : ''}>${T('Steam istek listemi getir', 'Fetch my Steam wishlist')}</button></section>
<section class="al-box"><h3>Epic · GOG · ${T('diğer', 'other')}</h3><p class="kh-note">${T('Bu mağazaların herkese açık bir istek listesi hizmeti yok. Listeni sayfadan kopyalayıp yapıştır ya da CSV/JSON/TXT dosyası yükle; her satır bir oyun adı.', 'These stores offer no public wishlist service. Copy your list from the page and paste it, or upload a CSV/JSON/TXT file with one game name per line.')}</p>
<textarea rows="5" data-paste placeholder="${T('Oyun adları, her satıra bir tane…', 'Game names, one per line…')}"></textarea>
<div class="al-actions"><button type="button" class="kh-btn" data-go ${imp.busy ? 'disabled' : ''}>${T('Eşleştir', 'Match')}</button><label class="kh-btn ghost al-file">${T('Dosya yükle', 'Upload file')}<input type="file" accept=".txt,.csv,.json,text/plain,text/csv,application/json" hidden data-file></label></div></section></div>
<p class="kh-note" data-status role="status">${esc(imp.status || '')}</p>${results}`;
  const status = body.querySelector('[data-status]');
  const run = async names => {
    if (!names.length) { status.textContent = T('Okunacak oyun adı bulunamadı.', 'No game names found to read.'); return; }
    imp.busy = true; imp.found = []; imp.missed = []; imp.msg = '';
    const cut = names.slice(0, 150);
    const done = await matchAll(cut, n => { status.textContent = T(`Eşleştiriliyor… ${n}/${cut.length}`, `Matching… ${n}/${cut.length}`); });
    imp.busy = false; imp.found = done.found; imp.missed = done.missed;
    imp.status = names.length > cut.length ? T(`İlk ${cut.length} oyun işlendi.`, `Processed the first ${cut.length} games.`) : '';
    if (alive()) tabImport(body, alive);
  };
  body.querySelector('[data-go]')?.addEventListener('click', () => run(parseWishlistText(body.querySelector('[data-paste]').value)));
  body.querySelector('[data-file]')?.addEventListener('change', async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2e6) { status.textContent = T('Dosya çok büyük (en çok 2 MB).', 'File too large (2 MB max).'); return; }
    run(parseWishlistText(await f.text()));
  });
  body.querySelector('[data-steam]')?.addEventListener('click', async () => {
    status.textContent = T('Steam’e soruluyor…', 'Asking Steam…');
    const r = await steamWishlistNames();
    if (r.error) { status.textContent = r.error; return; }
    if (!r.names.length) { status.textContent = T(r.total ? 'Steam listendeki oyunlar katalogda yok.' : 'Steam istek listen boş.', r.total ? 'None of your Steam wishlist games are in the catalog.' : 'Your Steam wishlist is empty.'); return; }
    run(r.names);
  });
  const picked = () => [...body.querySelectorAll('[data-pick]:checked')].map(c => imp.found[Number(c.dataset.pick)]).filter(Boolean);
  body.querySelector('[data-addfav]')?.addEventListener('click', () => {
    let n = 0; for (const x of picked()) if (addFavorite(x.game)) n++;
    toast(T(`${n} oyun istek listene eklendi. Görmek için sayfayı yenile.`, `${n} games added to your wishlist. Reload to see them.`), () => location.reload(), T('Yenile', 'Reload'));
  });
  body.querySelector('[data-addowned]')?.addEventListener('click', () => {
    const list = readOwned(); for (const x of picked()) list.push({ name: x.game.name, source: 'import', added: Date.now() });
    writeOwned(list); toast(T('Kütüphaneye işlendi.', 'Added to your library.'));
  });
}

// ---- Kütüphane (36) ----
async function syncSteamLibrary() {
  const s = session();
  if (!s) return { error: T('Önce siteye giriş yap ve Steam hesabını bağla.', 'Sign in and link your Steam account first.') };
  const r = await fetch(SUPA + '/functions/v1/steam-account?action=library', { headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token }, signal: AbortSignal.timeout(25e3) }).catch(() => null);
  const j = r ? await r.json().catch(() => null) : null;
  if (!r || !r.ok) return { error: j?.error || T('Steam şu an yanıt vermiyor.', 'Steam is not responding right now.') };
  if (!j.linked) return { error: T('Steam hesabı bağlı değil.', 'No Steam account linked.') };
  if (!j.visible) return { error: T('Steam oyun ayrıntıların herkese açık değil; kütüphane boş görünüyor.', 'Your Steam game details are private, so the library looks empty.') };
  const keep = readOwned().filter(o => o.source !== 'steam');
  writeOwned([...(j.games || []).map(g => ({ name: g.name, source: 'steam', minutes: g.minutes })), ...keep]);
  return { count: j.games.length };
}
async function tabLibrary(body) {
  const owned = readOwned();
  const hours = Math.round(owned.reduce((s, o) => s + o.minutes, 0) / 60);
  const SRC = { steam: 'Steam', manual: T('Elle', 'Manual'), import: T('İçe aktarma', 'Import') };
  body.innerHTML = `<p class="kh-lead">${T('Sahip olduğun oyunları burada tut. Bir oyunun sayfasında ya da alım listelerinde “Zaten sahipsin” uyarısı çıkar; sürüm adları (Deluxe, GOTY…) yok sayılır.', 'Keep what you own here. Game pages and lists then warn “You already own this”; edition names (Deluxe, GOTY…) are ignored.')}</p>
<div class="al-stats"><div><b>${owned.length}</b><small>${T('oyun', 'games')}</small></div><div><b>${hours || '—'}</b><small>${T('saat (Steam)', 'hours (Steam)')}</small></div></div>
<div class="al-actions"><button type="button" class="kh-btn" data-sync>${T('Steam kütüphanemi eşitle', 'Sync my Steam library')}</button></div>
<form class="al-form" data-add><div class="al-row"><label>${T('Elle ekle', 'Add manually')}<input name="n" placeholder="${T('Oyun adı', 'Game name')}" required maxlength="140"></label><button type="submit" class="kh-btn">${T('Ekle', 'Add')}</button></div></form>
<p class="kh-note" data-status role="status"></p>
<label class="al-search">${T('Kütüphanede ara', 'Search library')}<input type="search" data-q></label>
<ul class="al-list" data-list></ul>`;
  const status = body.querySelector('[data-status]'), ul = body.querySelector('[data-list]');
  const paint = () => {
    const q = normTitle(body.querySelector('[data-q]').value);
    const rows = readOwned().filter(o => !q || normTitle(o.name).includes(q)).slice(0, 200);
    ul.innerHTML = rows.length ? rows.map(o => `<li class="al-item" data-n="${esc(o.name)}"><div class="al-main"><b>${esc(o.name)}</b><small>${esc(SRC[o.source])}${o.minutes ? ' · ' + Math.round(o.minutes / 60) + T(' sa oynandı', ' h played') : ''}</small></div><button type="button" class="kh-btn ghost" data-del aria-label="${T('Kaldır', 'Remove')}">${svg('close', 13)}</button></li>`).join('') : `<li class="al-none">${T('Kayıt yok.', 'Nothing here.')}</li>`;
    ul.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { const n = b.closest('.al-item').dataset.n; writeOwned(readOwned().filter(o => o.name !== n)); tabLibrary(body); }));
  };
  paint();
  body.querySelector('[data-q]').addEventListener('input', paint);
  body.querySelector('[data-add]').addEventListener('submit', e => { e.preventDefault(); const n = e.currentTarget.n.value.trim(); if (n) { writeOwned([{ name: n, source: 'manual', added: Date.now() }, ...readOwned()]); tabLibrary(body); } });
  body.querySelector('[data-sync]').addEventListener('click', async () => {
    status.textContent = T('Steam’e soruluyor…', 'Asking Steam…');
    const r = await syncSteamLibrary();
    if (r.error) status.textContent = r.error; else tabLibrary(body);
  });
}

// ---- Takvim hatırlatıcısı (40) ----
const readCal = () => { const c = jget(K.cal, {}); return { on: !!c.on, daysBefore: [1, 3, 7].includes(c.daysBefore) ? c.daysBefore : 3, notified: Array.isArray(c.notified) ? c.notified.slice(-20) : [] }; };
const upcomingSeasons = (n = 4) => { const t = Date.now(); return seasonsBetween(t - 20 * DAYMS, t + 400 * DAYMS).filter(s => s.to > t).slice(0, n); };
function checkSeasons() {
  const prefs = readCal();
  const due = dueSeasonReminders(upcomingSeasons(5), prefs);
  if (!due.length) return;
  const s = due[0], days = Math.max(0, Math.ceil((s.from - Date.now()) / DAYMS));
  prefs.notified.push(seasonMark(s)); jset(K.cal, prefs);
  notify(T(s.tr, s.en), s.from <= Date.now() ? T('Büyük indirim dönemi başladı (yaklaşık).', 'The big sale period has started (approx.).') : T(`Yaklaşık ${days} gün sonra başlıyor.`, `Starts in about ${days} days.`));
}
async function tabCalendar(body) {
  const prefs = readCal(), list = upcomingSeasons(5), alarms = readAlarms().length;
  body.innerHTML = `<p class="kh-lead">${T('Mağazalar büyük indirimlerini her yıl aşağı yukarı aynı haftalarda yapar. Tarihler yaklaşıktır; kesin günü mağazalar duyurur.', 'Stores hold their big sales around the same weeks every year. Dates are approximate; stores announce the exact days.')}</p>
<div class="al-box"><label class="al-switch"><input type="checkbox" data-on ${prefs.on ? 'checked' : ''}> ${T('Büyük indirim yaklaşınca haber ver (site açıkken)', 'Remind me before big sales (while the site is open)')}</label>
<label>${T('Kaç gün önce', 'How many days before')}<select data-days>${[1, 3, 7].map(d => `<option value="${d}" ${d === prefs.daysBefore ? 'selected' : ''}>${d} ${T('gün', d === 1 ? 'day' : 'days')}</option>`).join('')}</select></label>
<p class="kh-note">${alarms ? T(`${alarms} fiyat alarmın indirim döneminde de çalışmaya devam eder.`, `Your ${alarms} price alerts keep working during sales.`) : T('Fiyat alarmı kurarsan indirim gelince haber alırsın.', 'Set price alerts to hear about sales on games you want.')}</p></div>
<ul class="al-list">${list.map((s, i) => { const days = Math.round((s.from - Date.now()) / DAYMS); return `<li class="al-item"><div class="al-main"><b>${esc(T(s.tr, s.en))}</b><small>${esc(dateText(s.from))} – ${esc(dateText(s.to - DAYMS))} · ${s.from <= Date.now() ? T('şu an sürüyor (yaklaşık)', 'running now (approx.)') : T(`${days} gün sonra`, `in ${days} days`)}</small></div><button type="button" class="kh-btn" data-ics="${i}">${T('Takvime ekle (.ics)', 'Add to calendar (.ics)')}</button></li>`; }).join('')}</ul>`;
  body.querySelector('[data-on]').addEventListener('change', e => { const c = readCal(); c.on = e.target.checked; jset(K.cal, c); if (c.on) { ensureNotifyPermission(); checkSeasons(); } });
  body.querySelector('[data-days]').addEventListener('change', e => { const c = readCal(); c.daysBefore = Number(e.target.value); c.notified = []; jset(K.cal, c); });
  body.querySelectorAll('[data-ics]').forEach(b => b.addEventListener('click', () => { const s = list[Number(b.dataset.ics)]; download(`${s.key}-${new Date(s.from).getUTCFullYear()}.ics`, seasonIcs(s, readCal().daysBefore, { en: isEn() }), 'text/calendar'); }));
}

// ---- Harcama (44) ----
let spendMonth = '';
async function tabSpend(body) {
  const purchases = readPurchases();
  const now = new Date().toISOString().slice(0, 7);
  if (!spendMonth) spendMonth = now;
  const r = monthReport(purchases, spendMonth);
  const max = Math.max(1, ...r.history.map(h => h.spent));
  const mname = m => new Date(m + '-01T00:00:00Z').toLocaleDateString(isEn() ? 'en-GB' : 'tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const months = r.history.map(h => h.month).reverse();
  body.innerHTML = `<p class="kh-lead">${T('Cüzdan koçuna girdiğin alımlardan aylık özet. Alım eklemek için Kişisel merkez → Bütçe’yi kullan.', 'A monthly summary from the purchases you log in the Wallet coach. Add purchases in Personal hub → Budget.')}</p>
<label class="al-search">${T('Ay', 'Month')}<select data-month>${[...new Set([now, ...months])].map(m => `<option value="${m}" ${m === spendMonth ? 'selected' : ''}>${esc(mname(m))}</option>`).join('')}</select></label>
${purchases.length ? `<div class="al-stats"><div><b>${esc(money(r.spent))}</b><small>${T('harcama', 'spent')}</small></div><div><b>${r.count}</b><small>${T('alım', 'purchases')}</small></div><div><b>${esc(money(r.saved))}</b><small>${T('indirimle tasarruf', 'saved by sales')}${r.savedPct ? ` (%${r.savedPct})` : ''}</small></div><div><b>${r.avg === null ? '—' : esc(money(r.avg))}</b><small>${T('alım başı ortalama', 'average per purchase')}</small></div></div>
<p class="kh-note">${r.change === null ? T('Önceki ayla karşılaştırma için o ayda alım yok.', 'No purchases in the previous month to compare with.') : r.change === 0 ? T('Önceki ayla aynı.', 'Same as last month.') : r.change > 0 ? T(`Önceki aydan %${r.change} fazla.`, `${r.change}% more than last month.`) : T(`Önceki aydan %${-r.change} az.`, `${-r.change}% less than last month.`)}${r.biggest ? ' ' + T(`En büyük alım: ${r.biggest.name} (${money(r.biggest.amount)}).`, `Biggest purchase: ${r.biggest.name} (${money(r.biggest.amount)}).`) : ''}</p>
<div class="al-bars" role="img" aria-label="${T('Son 6 ay harcama', 'Spending, last 6 months')}">${r.history.map(h => `<div class="al-bar${h.month === spendMonth ? ' on' : ''}"><i style="height:${Math.max(3, Math.round((h.spent / max) * 100))}%"></i><span>${esc(h.month.slice(5))}</span><small>${h.spent ? esc(money(h.spent)) : ''}</small></div>`).join('')}</div>
<div class="al-actions"><button type="button" class="kh-btn" data-copy>${T('Özeti kopyala', 'Copy summary')}</button><button type="button" class="kh-btn ghost" data-csv>${T('CSV indir', 'Download CSV')}</button></div>` : empty('Henüz kayıtlı alım yok. Cüzdan koçunda alım ekleyince özet burada görünür.', 'No purchases logged yet. They show up here once you add them in the Wallet coach.')}`;
  body.querySelector('[data-month]').addEventListener('change', e => { spendMonth = e.target.value; tabSpend(body); });
  body.querySelector('[data-copy]')?.addEventListener('click', async () => {
    const t = T(`${mname(r.month)}: ${r.count} alım, ${money(r.spent)} harcandı, indirimle ${money(r.saved)} tasarruf.`, `${mname(r.month)}: ${r.count} purchases, ${money(r.spent)} spent, ${money(r.saved)} saved by sales.`);
    toast((await copyText(t)) ? T('Özet kopyalandı', 'Summary copied') : t);
  });
  body.querySelector('[data-csv]')?.addEventListener('click', () => download('oyun-harcamalarim.csv', purchasesCsv(purchases), 'text/csv'));
}

// ---- Abonelik (45) ----
async function tabSubs(body, alive) {
  const prefs = jget(K.subs, {});
  const sub = SUBSCRIPTIONS.find(s => s.id === prefs.sub) || SUBSCRIPTIONS[0];
  const favs = readFavs().filter(f => (f.status || 'wish') === 'wish' && finite(f.price) && f.price > 0);
  const rates = await getRates().catch(() => null);
  if (!alive()) return;
  const toTry = f => (f.currency === 'USD' ? (rates?.usdTry ? f.price * rates.usdTry : null) : f.currency === 'EUR' ? (rates?.eurTry ? f.price * rates.eurTry : null) : f.price);
  const keys = favs.map(f => normTitle(f.name));
  const ttb = await ttbFor(keys);
  if (!alive()) return;
  const rows = favs.map((f, i) => ({ f, name: f.name, priceTry: toTry(f), hours: hoursOf(ttb[keys[i]]) })).filter(r => r.priceTry && r.hours);
  const inSub = new Set(prefs.inSub || []);
  body.innerHTML = `<p class="kh-lead">${T('Abonelik mi, satın alma mı? Katalog üyeliği bilgisi mağazalardan gelmediği için hangi oyunun abonelikte olduğunu sen işaretlersin; aboneliğin güncel fiyatını da kendin yazarsın.', 'Subscription or buying? Store catalogs do not expose which games are in a subscription, so you tick the games that are, and enter the current fee yourself.')}</p>
<div class="al-row"><label>${T('Abonelik', 'Subscription')}<select data-sub>${SUBSCRIPTIONS.map(s => `<option value="${s.id}" ${s.id === sub.id ? 'selected' : ''}>${esc(T(s.tr, s.en))}</option>`).join('')}</select></label>
<label>${T('Aylık ücret (TL)', 'Monthly fee (TRY)')}<input type="number" min="1" step="any" inputmode="decimal" data-fee value="${esc(prefs.fees?.[sub.id] ?? '')}"></label>
<label>${T('Haftada kaç saat oynarsın', 'Hours you play per week')}<input type="number" min="1" max="100" step="any" inputmode="decimal" data-hpw value="${esc(prefs.hpw ?? 6)}"></label></div>
<p class="kh-note"><a href="${esc(sub.url)}" target="_blank" rel="noopener noreferrer">${T('Güncel ücret ve katalog için resmî sayfa', 'Official page for the current fee and catalog')} ${svg('ext', 12)}</a></p>
${rows.length ? `<ul class="al-list">${rows.map((r, i) => `<li class="al-item"><label class="al-check"><input type="checkbox" data-in="${esc(r.f.id)}" ${inSub.has(r.f.id) ? 'checked' : ''}><span class="al-main"><b>${esc(r.name)}</b><small>${esc(money(r.priceTry))} · ${esc(hoursText(r.hours))}</small></span></label><span class="al-chip" data-res="${i}"></span></li>`).join('')}</ul>
<div class="al-box" data-total></div>` : empty('İstek listende fiyatı ve süresi bilinen oyun yok. Birkaç oyunu istek listene ekleyince burada hesaplanır.', 'No wishlist game has a known price and play time yet. Add a few and the comparison appears here.')}`;
  if (!rows.length) return;
  const calc = () => {
    const fee = Number(body.querySelector('[data-fee]').value), hpw = Number(body.querySelector('[data-hpw]').value);
    const sel = new Set([...body.querySelectorAll('[data-in]:checked')].map(c => c.dataset.in));
    const p = jget(K.subs, {}); p.sub = body.querySelector('[data-sub]').value; p.fees = { ...(p.fees || {}), [p.sub]: fee || '' }; p.hpw = hpw; p.inSub = [...sel]; jset(K.subs, p);
    const plan = subscriptionPlan({ fee, hoursPerWeek: hpw, items: rows.filter(r => sel.has(r.f.id)) });
    body.querySelectorAll('[data-res]').forEach(c => { c.textContent = ''; c.dataset.tone = ''; });
    const box = body.querySelector('[data-total]');
    if (!plan) { box.innerHTML = `<p class="kh-note">${T('Aboneliğin ücretini yaz ve abonelikte olan oyunları işaretle.', 'Enter the fee and tick the games that are in the subscription.')}</p>`; return; }
    for (const pr of plan.rows) { const i = rows.findIndex(r => r.name === pr.name); const c = body.querySelector(`[data-res="${i}"]`); if (c) { c.textContent = pr.cheaper === 'sub' ? T(`Abonelik ${pr.months} ay · ${money(pr.subCost)}`, `Sub ${pr.months} mo · ${money(pr.subCost)}`) : T('Satın al daha ucuz', 'Buying is cheaper'); c.dataset.tone = pr.cheaper === 'sub' ? 'ok' : 'warn'; } }
    box.innerHTML = `<b>${plan.cheaper === 'sub' ? T(`Abonelik ${money(Math.abs(plan.diff))} daha ucuz`, `Subscription is ${money(Math.abs(plan.diff))} cheaper`) : plan.cheaper === 'buy' ? T(`Satın almak ${money(Math.abs(plan.diff))} daha ucuz`, `Buying is ${money(Math.abs(plan.diff))} cheaper`) : T('İkisi aynı', 'Equal')}</b>
<p class="kh-note">${T(`Hepsi satın alınırsa ${money(plan.buyTotal)}; hepsini sırayla oynamak yaklaşık ${plan.months} ay ve ${money(plan.subTotal)} tutar. Ücret ${plan.breakEvenMonths} aydan uzun sürerse satın alma öne geçer. Süreler bitirme süresine göre tahmindir, oyunlar abonelikten çıkabilir.`, `Buying all: ${money(plan.buyTotal)}; playing them back to back takes about ${plan.months} months and ${money(plan.subTotal)}. Past ${plan.breakEvenMonths} months of fees buying wins. Times are completion estimates and games can leave the subscription.`)}</p>`;
  };
  body.querySelectorAll('[data-fee],[data-hpw],[data-in]').forEach(i => i.addEventListener('input', calc));
  body.querySelector('[data-sub]').addEventListener('change', e => { const p = jget(K.subs, {}); p.sub = e.target.value; jset(K.subs, p); tabSubs(body, alive); });
  calc();
}
const hoursText = h => (h < 10 ? (Math.round(h * 2) / 2).toString().replace('.', isEn() ? '.' : ',') : String(Math.round(h))) + T(' sa', ' h');

// ---- Saat başı (46) ----
async function tabCph(body, alive) {
  body.innerHTML = skeleton(6);
  const all = await marketPages({ deals: true, sort: 'score' }, 3);
  const uniq = [...new Map(all.filter(g => !g.dlc && !g.free && g.priceTry > 0).map(g => [g.key, g])).values()];
  const ttb = await ttbFor(uniq.map(g => g.key));
  if (!alive()) return;
  const idx = ownedIndex(readOwned());
  const ranked = rankByCostPerHour(uniq.map(g => ({ g: { ...g, cph: costPerHour(g.priceTry, hoursOf(ttb[g.key])) }, cph: costPerHour(g.priceTry, hoursOf(ttb[g.key])), hours: hoursOf(ttb[g.key]) })).filter(x => x.g.score === null || x.g.score >= 70).filter(x => !ownedMatch(idx, x.g.name)), 24);
  body.innerHTML = `<p class="kh-lead">${T('Fiyat ÷ ortalama bitirme süresi. İndirimdeki ve puanı en az 70 olan oyunlar, saati en ucuzdan sıralı. Süresi bilinmeyen oyun listelenmez.', 'Price ÷ average time to beat. Discounted games scoring 70+, cheapest per hour first. Games without a known length are left out.')}</p>${ranked.length ? `<div class="kh-grid">${ranked.map(x => gameCard(x.g, { why: T(`≈ ${hoursText(x.hours)} · ${TIER_TEXT[costTier(x.cph)][0]}`, `≈ ${hoursText(x.hours)} · ${TIER_TEXT[costTier(x.cph)][1]}`) })).join('')}</div>` : empty('Süresi bilinen indirimli oyun bulunamadı.', 'No discounted games with a known length were found.')}`;
}

// ---- Ortak liste (43) ----
async function tabShared(body) {
  const favs = readFavs().filter(f => (f.status || 'wish') === 'wish');
  const code = encodeWishlist(favs, { by: jget('radar-alim-name', '') });
  const link = code ? location.origin + location.pathname + '?hediye=' + code : '';
  body.innerHTML = `<p class="kh-lead">${T('İstek listeni tek bağlantıyla paylaş; arkadaşın hesap açmadan görür, hediye önerisini kendi bütçesine göre alır. Başka birinin bağlantısını yapıştırırsan ortak oyunlarınızı görürsün.', 'Share your wishlist with one link; a friend sees it without an account and gets gift ideas for their budget. Paste a friend’s link to see the games you both want.')}</p>
<div class="al-box"><h3>${T('Benim listem', 'My list')}</h3>${link ? `<input class="al-link" readonly value="${esc(link)}" data-link><div class="al-actions"><button type="button" class="kh-btn" data-copy>${T('Bağlantıyı kopyala', 'Copy link')}</button>${navigator.share ? `<button type="button" class="kh-btn ghost" data-share>${T('Paylaş…', 'Share…')}</button>` : ''}</div>` : empty('Paylaşılacak istek listesi yok. Oyunları “İstiyorum” olarak işaretle.', 'Nothing to share yet. Mark games as “Want”.')}</div>
<div class="al-box"><h3>${T('Arkadaşımın listesi', 'A friend’s list')}</h3><div class="al-row"><label>${T('Bağlantıyı yapıştır', 'Paste the link')}<input data-friend placeholder="https://…?hediye=…"></label><button type="button" class="kh-btn" data-cmp>${T('Karşılaştır', 'Compare')}</button></div><div data-out></div></div>`;
  body.querySelector('[data-copy]')?.addEventListener('click', async () => toast((await copyText(link)) ? T('Bağlantı kopyalandı', 'Link copied') : T('Kopyalanamadı; bağlantıyı elle seç.', 'Could not copy; select the link by hand.')));
  body.querySelector('[data-share]')?.addEventListener('click', () => navigator.share({ title: T('İstek listem', 'My wishlist'), url: link }).catch(() => {}));
  body.querySelector('[data-cmp]').addEventListener('click', () => {
    const out = body.querySelector('[data-out]');
    let raw = body.querySelector('[data-friend]').value.trim();
    try { raw = new URL(raw).searchParams.get('hediye') || raw; } catch { /* kod doğrudan yapıştırılmış olabilir */ }
    const theirs = decodeWishlist(raw);
    if (!theirs) { out.innerHTML = `<p class="kh-note">${T('Bağlantı okunamadı.', 'Could not read that link.')}</p>`; return; }
    const { common, onlyTheirs } = commonGames(favs, theirs.items);
    out.innerHTML = `<p class="kh-note">${T(`${theirs.by ? theirs.by + ' ile' : 'Arkadaşınla'} ${common.length} ortak oyun var.`, `You share ${common.length} games${theirs.by ? ' with ' + theirs.by : ''}.`)}</p>${common.length ? `<ul class="al-list">${common.map(c => `<li class="al-item"><div class="al-main"><b>${esc(c.name)}</b><small>${T('İkinizin de listesinde — birlikte oynamak için iyi aday', 'On both lists — a good co-op candidate')}</small></div></li>`).join('')}</ul>` : ''}
<a class="kh-btn" href="?hediye=${encodeURIComponent(raw)}" target="_blank" rel="noopener">${T('Hediye önerilerini aç', 'Open gift ideas')} ${svg('ext', 13)}</a>${onlyTheirs.length ? `<details><summary>${T('Yalnız arkadaşında olanlar', 'Only on their list')} (${onlyTheirs.length})</summary><p class="kh-note">${esc(onlyTheirs.map(x => x.name).join(' · '))}</p></details>` : ''}`;
  });
}

// ---- Merkez penceresi ----
const TABS = [
  ['feed', 'Akış', 'Feed'], ['alarms', 'Alarmlar', 'Alerts'], ['import', 'İçe aktar', 'Import'], ['library', 'Kütüphane', 'Library'],
  ['calendar', 'Takvim', 'Calendar'], ['spend', 'Harcama', 'Spending'], ['subs', 'Abonelik', 'Subscriptions'], ['cph', 'Saat başı', 'Per hour'], ['shared', 'Ortak liste', 'Shared list'],
];
let hub = null, hubTab = 'feed', renderToken = 0, lastFocus = null;
function openHub(tab = hubTab) {
  if (!hub) {
    lastFocus = document.activeElement;
    hub = document.createElement('div');
    hub.className = 'kh-overlay al-hub';
    hub.setAttribute('role', 'dialog'); hub.setAttribute('aria-modal', 'true');
    hub.innerHTML = `<div class="kh-sheet"><div class="kh-head"><div class="kh-title"><span class="kh-logo">${svg('guide', 18)}</span><b></b></div><button type="button" class="kh-close">${svg('close', 18)}</button><div class="kh-tabs" role="tablist"></div></div><div class="kh-body" role="tabpanel" tabindex="-1"></div></div>`;
    hub.addEventListener('mousedown', e => { if (e.target === hub) closeHub(); });
    hub.querySelector('.kh-close').addEventListener('click', closeHub);
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(hub);
    document.body.classList.add('kh-lock');
  }
  setTab(tab);
}
function closeHub() {
  if (!hub) return;
  hub.remove(); hub = null;
  document.body.classList.remove('kh-lock');
  document.removeEventListener('keydown', onKey, true);
  lastFocus?.focus?.();
  schedule();
}
function onKey(e) {
  if (!hub) return;
  if (e.key === 'Escape') { e.stopPropagation(); closeHub(); return; }
  if (e.key === 'Tab') {
    const f = [...hub.querySelectorAll('button:not([disabled]),a[href],input:not([hidden]),select,textarea,[tabindex="0"]')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !hub.contains(document.activeElement))) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
}
function paintChrome() {
  if (!hub) return;
  hub.setAttribute('aria-label', T('Alım rehberi', 'Buying guide'));
  hub.querySelector('.kh-title b').textContent = T('Alım rehberi', 'Buying guide');
  hub.querySelector('.kh-close').setAttribute('aria-label', T('Kapat', 'Close'));
  const nav = hub.querySelector('.kh-tabs');
  nav.setAttribute('aria-label', T('Bölümler', 'Sections'));
  nav.innerHTML = TABS.map(([k, tr, en]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === hubTab}" tabindex="${k === hubTab ? 0 : -1}">${T(tr, en)}${k === 'alarms' && readAlarms().length ? ` <i>${readAlarms().length}</i>` : ''}</button>`).join('');
  nav.querySelectorAll('button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  nav.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const bs = [...nav.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    if (i < 0) return;
    const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length];
    n.focus(); n.click(); e.preventDefault();
  });
  nav.querySelector('[aria-selected=true]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
}
function setTab(tab) { hubTab = TABS.some(t => t[0] === tab) ? tab : 'feed'; paintChrome(); renderTab(); }
async function renderTab() {
  if (!hub) return;
  const token = ++renderToken, body = hub.querySelector('.kh-body');
  const alive = () => hub && token === renderToken;
  body.scrollTop = 0;
  const tabs = { feed: tabFeed, alarms: tabAlarms, import: tabImport, library: tabLibrary, calendar: tabCalendar, spend: tabSpend, subs: tabSubs, cph: tabCph, shared: tabShared };
  try { await tabs[hubTab](body, alive); } catch { if (alive()) body.innerHTML = errorBox(); }
}

// ---- Oyun ayrıntısı bölümü ----
const detailState = new WeakMap();
const detailTitle = m => { const h = m.querySelector('h2'); return h ? (h.querySelector('.sr-only')?.textContent || h.childNodes[0]?.textContent || '').trim() : ''; };
const platOf = g => { const k = g.id.indexOf(':'); return k < 0 ? 'playstation' : g.id.slice(0, k); };
const storeIdOf = g => { const k = g.id.indexOf(':'); return k < 0 ? g.id : g.id.slice(k + 1); };
function setupDetail(m) {
  const name = detailTitle(m);
  if (!name || name.length < 2) return;
  const st = { name, el: null, regional: null, bundle: null, open: {} };
  detailState.set(m, st);
  resolveGame(name).then(async g => {
    if (!g || !m.isConnected || detailState.get(m) !== st) return;
    st.game = g;
    const [ttb, hist, check] = await Promise.all([ttbFor([g.key]), lowOf(g), checkGet(g.key, g.platform)]);
    if (!m.isConnected || detailState.get(m) !== st) return;
    st.ttb = ttb[g.key] || null; st.hist = hist; st.check = check;
    st.worth = await fetch(SUPA + '/rest/v1/rpc/worth_get', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ p_key: g.key, p_voter: voterId() }), credentials: 'omit', signal: AbortSignal.timeout(1e4) }).then(r => (r.ok ? r.json() : null)).catch(() => null);
    paintDetail(m, st);
  }).catch(() => {});
}
function scoreCard(g, st) {
  const hours = hoursOf(st.ttb), cph = costPerHour(g.priceTry, hours);
  const w = worthSummary(st.worth || {});
  const nextSale = (() => { const s = seasonsBetween(Date.now(), Date.now() + 400 * DAYMS)[0]; return s ? Math.max(0, Math.round((s.from - Date.now()) / DAYMS)) : null; })();
  const r = buyScore({ priceTry: g.priceTry, lowTry: st.hist?.low, lowDays: st.hist?.days, discount: g.discount, score: g.score, cph, worthPct: w.pct, nextSaleDays: nextSale });
  if (!r) return `<div class="al-score" data-v="none"><div class="al-ring"><b>—</b></div><div><b>${T('Almalı mıyım?', 'Should I buy?')}</b><p class="kh-note">${T('Skor için en az iki veri gerekir (fiyat geçmişi, puan, indirim…). Şu an yeterli veri yok.', 'The score needs at least two signals (price history, score, discount…). Not enough data yet.')}</p></div></div>`;
  return `<div class="al-score" data-v="${r.verdict}"><div class="al-ring" style="--p:${r.total}"><b>${r.total}</b></div><div><b>${T('Almalı mıyım?', 'Should I buy?')} <span class="al-verdict">${esc(T(...VERDICT_TEXT[r.verdict]))}</span></b>
<ul class="al-why">${r.parts.map(p => `<li data-good="${p.value >= 60}">${esc(T(p.tr, p.en))}</li>`).join('')}</ul><p class="kh-note">${T(`${r.known} sinyale dayanır; fiyat tahmini ya da tavsiye değildir.`, `Based on ${r.known} signals; not a price forecast or advice.`)}</p></div></div>`;
}
function offersHtml(g, st) {
  const raws = [g.raw, ...(Array.isArray(g.raw?.offers) ? g.raw.offers : [])].filter(o => o && o.platform);
  const seen = new Set(), rows = [];
  for (const o of raws) { if (seen.has(o.platform)) continue; seen.add(o.platform); rows.push(o); }
  if (rows.length < 2 && !st.check) return '';
  return `<div class="al-sec"><h4>${T('Mağaza güvenilirliği', 'Store trust')}</h4><ul class="al-offers">${rows.map(o => `<li><span>${esc(trustOf(o.platform).name)}</span>${trustChip(o.platform)}</li>`).join('')}</ul><p class="kh-note">${T('Rozetler editör değerlendirmesidir, garanti değildir. Anahtar alırken bölge ve iade koşullarını kontrol et.', 'Badges are editorial judgments, not guarantees. Check region and refund terms when buying keys.')}</p></div>`;
}
function checkHtml(g, st) {
  if (checkMissing || !st.check) return '';
  const c = st.check, total = (c.ok || 0) + (c.wrong || 0), mine = c.mine;
  return `<div class="al-sec"><h4>${T('Bu fiyat doğru mu?', 'Is this price right?')}</h4><div class="kh-d-btns"><button type="button" data-chk="ok" aria-pressed="${mine === 'ok'}">${T('Doğru', 'Correct')} <i>${c.ok || 0}</i></button><button type="button" data-chk="wrong" aria-pressed="${mine === 'wrong'}">${T('Yanlış', 'Wrong')} <i>${c.wrong || 0}</i></button></div><p class="kh-note">${esc(g.store)} · ${esc(money(g.priceTry))} — ${total ? T(`${total} oy`, `${total} votes`) : T('henüz oy yok', 'no votes yet')}${(c.wrong || 0) >= 3 && c.wrong > (c.ok || 0) ? ' · ' + T('Topluluk bu fiyattan şüpheli; mağazada kontrol et.', 'The community doubts this price; check the store.') : ''}</p></div>`;
}
function regionalHtml(g, st) {
  const reg = st.regional;
  if (!reg) return `<div class="al-sec"><h4>${T('Bölgeler arası en ucuz', 'Cheapest region')}</h4><button type="button" class="kh-btn" data-region>${T('Ülke fiyatlarını karşılaştır', 'Compare country prices')}</button></div>`;
  if (reg === 'loading') return `<div class="al-sec"><h4>${T('Bölgeler arası en ucuz', 'Cheapest region')}</h4><p class="kh-note">${T('Mağazalardan okunuyor…', 'Reading the stores…')}</p></div>`;
  if (reg === 'error') return `<div class="al-sec"><h4>${T('Bölgeler arası en ucuz', 'Cheapest region')}</h4><p class="kh-note">${T('Ülke fiyatları şu an alınamadı.', 'Country prices are unavailable right now.')}</p></div>`;
  const c = cheapestRegion(reg.countries, g.priceTry);
  if (!c) return `<div class="al-sec"><h4>${T('Bölgeler arası en ucuz', 'Cheapest region')}</h4><p class="kh-note">${T('Bu oyun için karşılaştırılabilir ülke fiyatı yok.', 'No comparable country prices for this game.')}</p></div>`;
  return `<div class="al-sec"><h4>${T('Bölgeler arası en ucuz', 'Cheapest region')}</h4><p><b>${esc(c.best.name)}</b>: ${esc(money(c.best.price_try))} ${c.worth ? `<span class="al-chip" data-tone="ok">${T(`Türkiye’den %${c.pct} ucuz (${money(c.save)})`, `${c.pct}% cheaper than Türkiye (${money(c.save)})`)}</span>` : `<span class="al-chip">${T('Türkiye fiyatı da makul', 'Türkiye is about as cheap')}</span>`}</p>
<ul class="al-offers">${c.ranked.slice(0, 6).map(x => `<li><span>${esc(x.name)}</span><b>${esc(money(x.price_try))}</b></li>`).join('')}</ul><p class="kh-note">${T('TL karşılığı güncel kurla hesaplanır. Kart komisyonu, ülke kısıtı ve hesap bölgesi şartı dahil değildir.', 'TRY equivalents use the current rate. Card fees, country restrictions and account-region rules are not included.')}</p></div>`;
}
function bundleHtml(g, st) {
  const b = st.bundle;
  if (!b) return `<div class="al-sec"><h4>${T('Ek içerik dahil toplam', 'Total with add-ons')}</h4><button type="button" class="kh-btn" data-bundle>${T('DLC ve paketleri hesapla', 'Work out DLC and bundles')}</button></div>`;
  if (b === 'loading') return `<div class="al-sec"><h4>${T('Ek içerik dahil toplam', 'Total with add-ons')}</h4><p class="kh-note">${T('Aranıyor…', 'Searching…')}</p></div>`;
  if (!b.dlcs.length && !b.edition) return `<div class="al-sec"><h4>${T('Ek içerik dahil toplam', 'Total with add-ons')}</h4><p class="kh-note">${T('Katalogda fiyatı olan ek içerik ya da tam sürüm paketi bulunamadı.', 'No priced add-on or complete edition found in the catalog.')}</p></div>`;
  const picks = dlcPicks(st), t = bundleTotals(g.priceTry, picks, b.edition);
  const v = t.verdict;
  return `<div class="al-sec"><h4>${T('Ek içerik dahil toplam', 'Total with add-ons')}</h4>${b.dlcs.map((d, i) => `<label class="al-check"><input type="checkbox" data-dlc="${i}" ${st.dlcSel?.has(i) ?? true ? 'checked' : ''}><span class="al-main"><b>${esc(d.name)}</b><small>${esc(money(d.priceTry))}</small></span></label>`).join('')}
<p><b>${T('Toplam', 'Total')}: ${esc(money(t.total))}</b> <small>(${esc(money(t.base))} + ${esc(money(t.extras))})</small></p>
${v ? `<p class="kh-note">${v.better === 'edition' ? T(`${v.edition} paketi ${money(v.editionTry)}: ayrı ayrı almaktan ${money(v.diff)} ucuz.`, `${v.edition} at ${money(v.editionTry)} is ${money(v.diff)} cheaper than buying separately.`) : v.better === 'separate' ? T(`Ayrı almak ${money(-v.diff)} daha ucuz (paket ${money(v.editionTry)}).`, `Buying separately is ${money(-v.diff)} cheaper (bundle ${money(v.editionTry)}).`) : T('Paket ve ayrı alım aynı fiyatta.', 'Bundle and separate prices are equal.')}</p>` : b.edition ? `<p class="kh-note">${T(`Tam sürüm: ${b.edition.name} ${money(b.edition.priceTry)}. Paketin içeriği kataloğdan bilinmediği için kıyas yalnız göstergedir.`, `Complete edition: ${b.edition.name} ${money(b.edition.priceTry)}. Contents are not in the catalog, so the comparison is indicative only.`)}</p>` : ''}</div>`;
}
const dlcPicks = st => (st.bundle?.dlcs || []).filter((_, i) => st.dlcSel?.has(i) ?? true);
async function loadBundle(g) {
  const fam = await rest('game_family?select=dlcs&title_key=eq.' + encodeURIComponent(g.key)).catch(() => []);
  const list = (fam[0]?.dlcs || []).slice(0, 12);
  const dlcs = [];
  await Promise.all(list.map(async d => {
    try {
      const { games } = await market({ query: d.n, size: 8, sort: 'default' });
      const hit = games.find(x => baseTitle(x.name) === baseTitle(d.n) && x.key !== g.key);
      if (hit && hit.priceTry > 0) dlcs.push({ name: hit.name, priceTry: hit.priceTry });
    } catch { /* fiyatsız ek içerik toplama girmez */ }
  }));
  const { games } = await market({ query: g.name, size: 20, sort: 'default' }).catch(() => ({ games: [] }));
  const ed = games.filter(x => x.key !== g.key && /complete|ultimate|deluxe|goty|game of the year|definitive|gold|collection|bundle/i.test(x.name) && normTitle(x.name).startsWith(baseTitle(g.name).split(' ').slice(0, 2).join(' '))).sort((a, b) => a.priceTry - b.priceTry)[0];
  return { dlcs, edition: ed ? { name: ed.name, priceTry: ed.priceTry } : null };
}
function ownedBanner(g) {
  const o = ownedMatch(ownedIndex(readOwned()), g.name);
  return o ? `<div class="al-owned" role="status"><b>${T('Bu oyuna zaten sahipsin', 'You already own this game')}</b><small>${esc(o.source === 'steam' ? 'Steam' : T('kütüphanende', 'in your library'))}${o.minutes ? ' · ' + Math.round(o.minutes / 60) + T(' sa oynadın', ' h played') : ''}. ${T('Yinelenen alım yapmadan önce kontrol et.', 'Check before buying a duplicate.')}</small></div>` : '';
}
function alarmHtml(g) {
  const has = readAlarms().filter(r => r.id === g.id);
  return `<div class="al-sec"><h4>${T('Fiyat alarmı', 'Price alert')}</h4><div class="al-quick"><button type="button" class="kh-btn" data-qa="target">${T('Hedef fiyat', 'Target price')}</button><button type="button" class="kh-btn" data-qa="percent">${T('%50 indirim', '50% off')}</button><button type="button" class="kh-btn" data-qa="atl">${T('En düşük fiyat', 'All-time low')}</button></div>${has.length ? `<p class="kh-note">${has.map(r => esc(modeLine(r))).join(' · ')}</p>` : ''}</div>`;
}
function paintDetail(m, st) {
  const g = st.game; if (!g) return;
  let el = st.el;
  if (!el || !el.isConnected) {
    el = document.createElement('section');
    el.className = 'al-detail'; el.dataset.dtOwn = 'al';
    st.el = el;
    const anchor = m.querySelector(':scope>.kh-detail') || m.querySelector(':scope>.pricecompare');
    if (anchor) anchor.after(el); else m.append(el);
  }
  const html = `<h3>${svg('guide', 15)} ${T('Alım rehberi', 'Buying guide')}</h3>${ownedBanner(g)}${scoreCard(g, st)}${alarmHtml(g)}${bundleHtml(g, st)}${regionalHtml(g, st)}${offersHtml(g, st)}${checkHtml(g, st)}`;
  const sig = html + (isEn() ? 'en' : 'tr');
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  el.innerHTML = html;
  const again = () => { delete el.dataset.sig; paintDetail(m, st); };
  el.querySelectorAll('[data-qa]').forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.qa;
    let value = null;
    if (mode === 'target') {
      const raw = prompt?.(T('Hedef fiyat (TL):', 'Target price (TRY):'), String(Math.max(1, Math.floor(g.priceTry * 0.8))));
      value = Number(String(raw || '').replace(',', '.'));
      if (!(value > 0)) return;
    } else if (mode === 'percent') value = 50;
    const rule = cleanRule({ id: g.id, name: g.name, key: g.key, mode, value, base: g.priceTry, created: Date.now() });
    if (!rule) return;
    writeAlarms([rule, ...readAlarms().filter(r => !(r.id === rule.id && r.mode === rule.mode))]);
    ensureNotifyPermission(); toast(T('Alarm kuruldu', 'Alert set'), () => openHub('alarms'));
    again();
  }));
  el.querySelector('[data-region]')?.addEventListener('click', async () => {
    st.regional = 'loading'; again();
    const plat = platOf(g);
    if (!['playstation', 'steam', 'xbox', 'gog', 'epic'].includes(plat) || !/^[A-Za-z0-9_.-]{1,64}$/.test(storeIdOf(g))) { st.regional = 'error'; again(); return; }
    try {
      const q = new URLSearchParams({ platform: plat, id: storeIdOf(g), name: g.name });
      const r = await fetch(SUPA + '/functions/v1/regional-prices?' + q, { headers: { Authorization: 'Bearer ' + KEY }, signal: AbortSignal.timeout(45e3) });
      st.regional = r.ok ? await r.json() : 'error';
    } catch { st.regional = 'error'; }
    if (m.isConnected) again();
  });
  el.querySelector('[data-bundle]')?.addEventListener('click', async () => {
    st.bundle = 'loading'; again();
    st.bundle = await loadBundle(g).catch(() => ({ dlcs: [], edition: null }));
    st.dlcSel = new Set(st.bundle.dlcs.map((_, i) => i));
    if (m.isConnected) again();
  });
  el.querySelectorAll('[data-dlc]').forEach(c => c.addEventListener('change', () => {
    const s = st.dlcSel || new Set(); if (c.checked) s.add(Number(c.dataset.dlc)); else s.delete(Number(c.dataset.dlc)); st.dlcSel = s; again();
  }));
  el.querySelectorAll('[data-chk]').forEach(b => b.addEventListener('click', async () => {
    const next = st.check?.mine === b.dataset.chk ? null : b.dataset.chk;
    b.disabled = true;
    const v = await checkVote(g.key, g.platform, next);
    if (v) st.check = v; else toast(T('Oy şu an kaydedilemedi', 'Could not save your vote right now'));
    again();
  }));
}
function scanDetails() {
  document.querySelectorAll('.modal.game-detail').forEach(m => {
    const name = detailTitle(m), st = detailState.get(m);
    if (!name) return;
    if (!st || st.name !== name) { st?.el?.remove(); setupDetail(m); }
    else if (st.game && (!st.el || !st.el.isConnected)) paintDetail(m, st);
  });
}

// ---- Girişler ----
function placeNav() {
  document.querySelectorAll('header .topbar > nav:not(.bottom-nav)').forEach(nav => {
    let b = nav.querySelector(':scope > .al-nav');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button'; b.className = 'kh-nav al-nav';
      b.addEventListener('click', () => openHub());
      nav.insertBefore(b, nav.querySelector(':scope > .tz-ink') || null);
    }
    const label = T('Alım rehberi', 'Buying guide');
    if (b.dataset.l !== label) { b.dataset.l = label; b.innerHTML = `${svg('guide', 16)}<span>${label}</span>`; }
  });
}
function placeMenu() {
  const panel = document.querySelector('.menu-panel'), grid = panel && panel.querySelector('.menu-grid');
  if (!grid) return;
  let b = grid.querySelector(':scope > .al-menuitem');
  if (!b) {
    b = document.createElement('button');
    b.type = 'button'; b.className = 'kh-menuitem al-menuitem';
    b.addEventListener('click', () => { panel.querySelector('.menu-close')?.click(); setTimeout(() => openHub(), 50); });
    grid.append(b);
  }
  const sig = isEn() ? 'en' : 'tr';
  if (b.dataset.l !== sig) {
    b.dataset.l = sig;
    b.innerHTML = `<i>${svg('guide', 20)}</i><span><b>${T('Alım rehberi', 'Buying guide')}</b><small>${T('Alarm, içe aktarma, kütüphane, takvim, harcama, abonelik', 'Alerts, import, library, calendar, spending, subscriptions')}</small></span>`;
  }
}
let queued = false;
function tick() { queued = false; placeNav(); placeMenu(); scanDetails(); }
function schedule() { if (queued) return; queued = true; requestAnimationFrame(tick); }

export function start() {
  if (!BROWSER || start.done) return;
  start.done = true;
  const boot = () => {
    tick();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(() => {
      document.querySelectorAll('.al-nav,.al-menuitem').forEach(b => { delete b.dataset.l; });
      document.querySelectorAll('.al-detail').forEach(s => { delete s.dataset.sig; });
      if (hub) { paintChrome(); renderTab(); }
      schedule();
    }).observe(root, { attributes: true, attributeFilter: ['lang'] });
    window.addEventListener('alim:owned', () => document.querySelectorAll('.al-detail').forEach(s => { delete s.dataset.sig; schedule(); }));
    // Alarm ve sezon kontrolü: açılıştan 20 sn sonra, sonra 5 dakikada bir.
    const loop = () => { checkAlarms().catch(() => {}); checkSeasons(); };
    setTimeout(loop, 2e4);
    setInterval(loop, 3e5);
    const q = new URLSearchParams(location.search).get('alim');
    if (q !== null) openHub(TABS.some(t => t[0] === q) ? q : 'feed');
  };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot, { once: true });
}
start();
