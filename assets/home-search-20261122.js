// Ana sayfa vitrini ve arama cilası (22 Kasım 2026). home-search-20261122.css ile birlikte.
// Paketin React koduna dokunmaz: açılış sayfasına ve Oyunlar sayfasına DOM üzerinden yeni kardeş düğümler ekler,
// React düğümlerini silmez ya da değiştirmez. Arama vurgusu DOM'a hiçbir şey eklemez (CSS Custom Highlight API).
// Veri yalnız herkese açık okuma kaynaklarından gelir (search_market RPC, upcoming_games, store_offers), 15 dk oturumda saklanır.
// Hareketler prefers-reduced-motion ve html[data-reduce-motion=true] altında kapanır. TR/EN, Klasik/Sade renkleri CSS değişkenlerinden gelir.

// ---------------------------------------------------------------------------------------------
// Saf hesaplar (tests/home-search.test.mjs)
// ---------------------------------------------------------------------------------------------
const DAY = 864e5;
const HOUR = 36e5;
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null));
const https = u => (typeof u === 'string' && /^https:\/\//i.test(u) ? u : '');

/** Türkiye (UTC+3) takvim günü, "YYYY-MM-DD". */
export function istDay(ms = Date.now()) { return new Date(ms + 3 * HOUR).toISOString().slice(0, 10); }
const dayMs = day => Date.parse(day + 'T00:00:00Z');
export const addDays = (day, n) => new Date(dayMs(day) + n * DAY).toISOString().slice(0, 10);
/** Bugüne göre gün farkı: bugün 0, yarın 1, dün -1. */
export function dayGap(day, today) {
  if (typeof day !== 'string' || !/^\d{4}-\d\d-\d\d/.test(day)) return null;
  return Math.round((dayMs(day.slice(0, 10)) - dayMs(today)) / DAY);
}

/* ---- Arama vurgusu: uzunluğu koruyan katlama (ç→c, ğ→g, ı/İ→i, â→a ...) ---- */
const FOLD_SPECIAL = { 'ı': 'i', 'İ': 'i', 'ß': 's', 'ø': 'o', 'Ø': 'o', 'đ': 'd', 'Đ': 'd', 'ł': 'l', 'Ł': 'l' };
export function foldChar(ch) {
  if (FOLD_SPECIAL[ch]) return FOLD_SPECIAL[ch];
  const d = ch.normalize('NFD');
  const base = d.length ? d[0] : ch;
  const low = base.toLowerCase();
  return low.length === 1 ? low : ch.toLowerCase().slice(0, 1);
}
/** Her UTF-16 birimi tek birime katlanır; dizin eşlemesi bozulmaz. */
export function foldText(s) {
  let out = '';
  for (const ch of String(s ?? '')) {
    const f = foldChar(ch);
    out += ch.length === 2 ? f + ' ' : f;
  }
  return out;
}
/** Aranan sözcükler: katlanmış, en az 2 harf, tekrarsız, en çok 6. */
export function queryWords(q) {
  const seen = new Set();
  const out = [];
  for (const w of foldText(q).split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 2 || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= 6) break;
  }
  return out;
}
/** Metinde sözcüklerin geçtiği [başlangıç, bitiş) aralıkları; çakışanlar birleştirilir. */
export function matchRanges(text, words) {
  if (!text || !words || !words.length) return [];
  const f = foldText(text);
  const hits = [];
  for (const w of words) {
    let at = 0;
    while ((at = f.indexOf(w, at)) !== -1) { hits.push([at, at + w.length]); at += w.length; }
  }
  hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  for (const h of hits) {
    const last = out[out.length - 1];
    if (last && h[0] <= last[1]) last[1] = Math.max(last[1], h[1]);
    else out.push([h[0], h[1]]);
  }
  return out;
}

/* ---- Günün fırsatı ---- */
const SCORE_KEYS = ['mc_score', 'oc_score', 'metacritic', 'score'];
function scoreOf(r) {
  for (const k of SCORE_KEYS) { const v = num(r?.[k]); if (v !== null && v > 0 && v <= 100) return v; }
  const m = num(r?.scores?.metacritic);
  return m !== null && m > 0 && m <= 100 ? m : null;
}
/** search_market satırından vitrin kartı; eksik/yanlış veri atılır. */
export function normOffer(r) {
  if (!r || typeof r.name !== 'string' || !r.name.trim()) return null;
  const price = num(r.price);
  const original = num(r.original_price);
  let pct = num(r.discount_percent);
  if ((pct === null || pct <= 0) && original && price !== null && original > price) pct = Math.round((1 - price / original) * 100);
  if (price === null || !(original > price) || !(pct > 0)) return null;
  const cover = https(r.image) || https(r.hero_url);
  const hero = https(r.hero_url) || cover;
  if (!cover) return null;
  const ends = typeof r.discount_ends_at === 'string' ? Date.parse(r.discount_ends_at) : NaN;
  return {
    id: String(r.platform || '') + ':' + String(r.store_id ?? r.id ?? r.name),
    name: r.name.trim(), cover, hero, price, original, pct: Math.min(99, Math.round(pct)),
    currency: typeof r.currency === 'string' && /^[A-Z]{3}$/.test(r.currency) ? r.currency : 'TRY',
    platform: String(r.platform || 'playstation'), url: https(r.url), score: scoreOf(r),
    endsAt: Number.isFinite(ends) ? ends : null,
  };
}
/** Vitrin sırası: indirim ve puan birlikte; aynı oyun iki kez girmez. */
export function pickShowcase(rows, n = 5, now = Date.now()) {
  const seen = new Set();
  const list = [];
  for (const r of rows || []) {
    const o = normOffer(r);
    if (!o || o.pct < 25) continue;
    if (o.endsAt !== null && o.endsAt < now) continue;
    const key = foldText(o.name).replace(/[^a-z0-9]+/g, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push({ ...o, value: o.pct * 0.55 + (o.score ?? 60) * 0.45 });
  }
  return list.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)).slice(0, n);
}
/** Kalan süre: { unit: 'd'|'h'|'m', n } ya da null (bitmiş/bilinmiyor). */
export function timeLeft(endsAt, now = Date.now()) {
  if (!Number.isFinite(endsAt) || endsAt <= now) return null;
  const ms = endsAt - now;
  if (ms >= DAY) return { unit: 'd', n: Math.floor(ms / DAY) };
  if (ms >= HOUR) return { unit: 'h', n: Math.floor(ms / HOUR) };
  return { unit: 'm', n: Math.max(1, Math.ceil(ms / 6e4)) };
}
export const nextIndex = (i, n, dir = 1) => (n > 0 ? (((i + dir) % n) + n) % n : 0);

/* ---- Yeni çıkanlar ve yakında ---- */
function releaseCard(r) {
  if (!r || typeof r.name !== 'string' || !r.name.trim() || typeof r.release_date !== 'string') return null;
  const image = https(r.image);
  if (!image) return null;
  const rank = num(r.wishlist_rank);
  return { id: String(r.id ?? r.name), name: r.name.trim(), image, date: r.release_date.slice(0, 10), platform: String(r.platform || ''), url: https(r.url), rank: rank !== null && rank > 0 ? rank : null };
}
/**
 * upcoming_games satırlarından iki şerit. Yeni çıkanlar: son `back` gün (bugün dahil), en yeni başta.
 * Yakında: yarından `ahead` gün sonrasına, en yakın başta. Her şeritte en çok beklenenler (istek listesi sırası) seçilir.
 */
export function releaseStrips(rows, today, { back = 14, ahead = 60, cap = 14 } = {}) {
  const lo = addDays(today, -back);
  const hi = addDays(today, ahead);
  const seen = new Set();
  const fresh = [];
  const soon = [];
  for (const r of rows || []) {
    const c = releaseCard(r);
    if (!c) continue;
    const key = foldText(c.name).replace(/[^a-z0-9]+/g, '');
    if (!key || seen.has(key)) continue;
    if (c.date <= today && c.date >= lo) fresh.push(c);
    else if (c.date > today && c.date <= hi) soon.push(c);
    else continue;
    seen.add(key);
  }
  const rankSort = (a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.name.localeCompare(b.name);
  return {
    fresh: fresh.sort(rankSort).slice(0, cap).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : rankSort(a, b))),
    soon: soon.sort(rankSort).slice(0, cap).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : rankSort(a, b))),
  };
}

/* ---- Tür kartları ---- */
export const GENRES = ['Aksiyon', 'Macera', 'RPG', 'Strateji', 'Simülasyon', 'Spor', 'Yarış', 'Bağımsız', 'Rahat', 'MMO'];
export const GENRE_EN = { Aksiyon: 'Action', Macera: 'Adventure', RPG: 'RPG', Strateji: 'Strategy', 'Simülasyon': 'Simulation', Spor: 'Sports', 'Yarış': 'Racing', 'Bağımsız': 'Indie', Rahat: 'Casual', MMO: 'MMO' };
/** Her tür için en çok indirimli, görseli olan oyun; aynı görsel iki türde kullanılmaz. */
export function genreCovers(rows, genres = GENRES) {
  const used = new Set();
  const out = {};
  const sorted = (rows || []).filter(r => r && https(r.image) && Array.isArray(r.genres)).slice().sort((a, b) => (num(b.discount_percent) || 0) - (num(a.discount_percent) || 0));
  for (const g of genres) {
    const hit = sorted.find(r => r.genres.includes(g) && !used.has(r.image));
    if (hit) { used.add(hit.image); out[g] = { image: hit.image, name: String(hit.name || '') }; }
  }
  return out;
}

/* ---- Hikâye halkası ---- */
export const STORY_COLORS = { deals: ['#f97316', '#ec4899'], foryou: ['#ec4899', '#8b5cf6'], new: ['#06b6d4', '#7c3aed'], top: ['#f59e0b', '#f97316'], soon: ['#10b981', '#06b6d4'] };
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
/** Günlük ilerleme kaydı: { day, items: { id: { seen, total } } }. Gün değişince sıfırlanır. */
export function recordProgress(state, id, index, total, today) {
  const base = state && state.day === today && state.items ? state : { day: today, items: {} };
  if (typeof id !== 'string' || !/^[a-z0-9_-]{1,24}$/i.test(id) || !(total >= 1) || !(index >= 0)) return base;
  const seen = Math.min(total, Math.floor(index) + 1);
  const prev = base.items[id];
  const keep = prev && prev.total === total ? Math.max(prev.seen, seen) : seen;
  if (prev && prev.total === total && prev.seen === keep) return base;
  return { day: today, items: { ...base.items, [id]: { seen: keep, total: Math.floor(total) } } };
}
/**
 * Halka: izlenen kartlar gri, kalanlar hikâyenin renginde; dilimler arasında boşluk. Bitenler tek parça soluk halka.
 * conic-gradient dizgisi döner; kayıt yoksa null (özgün halka kalır).
 */
export function ringGradient(id, rec) {
  if (!rec || !(rec.total >= 1) || !(rec.seen >= 0)) return null;
  const [c1, c2] = STORY_COLORS[id] || STORY_COLORS.deals;
  const dim = 'color-mix(in srgb, var(--ink, #888) 26%, transparent)';
  const n = Math.floor(rec.total);
  if (rec.seen >= n) return `conic-gradient(${dim} 0 360deg)`;
  const gap = n > 1 ? Math.min(8, 90 / n) : 0;
  const arc = 360 / n;
  const stops = [];
  const left = n - rec.seen;
  for (let i = 0; i < n; i++) {
    const a = i * arc + gap / 2, b = (i + 1) * arc - gap / 2;
    const col = i < rec.seen ? dim : mix(c1, c2, left > 1 ? (i - rec.seen) / (left - 1) : 0);
    if (gap) stops.push(`transparent ${(i * arc).toFixed(2)}deg ${a.toFixed(2)}deg`);
    stops.push(`${col} ${a.toFixed(2)}deg ${b.toFixed(2)}deg`);
    if (gap) stops.push(`transparent ${b.toFixed(2)}deg ${((i + 1) * arc).toFixed(2)}deg`);
  }
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
}

// ---------------------------------------------------------------------------------------------
// Tarayıcı tarafı
// ---------------------------------------------------------------------------------------------
const BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined' && !!document.documentElement;
if (BROWSER) {
  const root = document.documentElement;
  const reduceMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const motionOk = () => !(reduceMq && reduceMq.matches) && root.dataset.reduceMotion !== 'true';
  const isEn = () => root.lang === 'en';
  const T = (tr, en) => (isEn() ? en : tr);
  const lang = () => (isEn() ? 'en' : 'tr');
  const loc = () => (isEn() ? 'en-US' : 'tr-TR');
  const money = (v, cur = 'TRY') => {
    try { return new Intl.NumberFormat(loc(), { style: 'currency', currency: cur, maximumFractionDigits: v >= 100 ? 0 : 2 }).format(v); }
    catch { return String(v); }
  };
  const genreName = g => (isEn() ? GENRE_EN[g] : g) || g;
  const PLAT = { steam: 'Steam', playstation: 'PlayStation', xbox: 'Xbox', xboxpc: 'Xbox PC', switch: 'Switch', epic: 'Epic', gog: 'GOG' };
  const platName = p => PLAT[p] || (p ? p.charAt(0).toUpperCase() + p.slice(1) : '');
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* özel pencere */ } };
  const cache = {
    get(k, ttl) { try { const o = JSON.parse(sessionStorage.getItem(k) || 'null'); return o && Date.now() - o.t < ttl ? o.v : null; } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify({ t: Date.now(), v })); } catch { /* dolu ya da kapalı */ } },
  };

  const SVGNS = 'http://www.w3.org/2000/svg';
  function build(ns, tag, props, kids) {
    const el = ns ? document.createElementNS(SVGNS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk, String(sv));
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

  /* ---- Açık okuma (Mac mini geçidi Supabase adresini yönlendirir) ---- */
  const SUPA = 'https://dsosckshigzijnsxmlwh.supabase.co';
  const KEY = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
  const hdr = extra => ({ apikey: KEY, Authorization: 'Bearer ' + KEY, ...(extra || {}) });
  async function getRows(path) {
    const res = await fetch(SUPA + '/rest/v1/' + path, { headers: hdr(), credentials: 'omit', signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    return Array.isArray(j) ? j : [];
  }
  const q = v => encodeURIComponent(v);
  const remember = (key, ttl, load) => {
    const hit = cache.get(key, ttl);
    if (hit) return Promise.resolve(hit);
    return load().then(v => { cache.set(key, v); return v; });
  };
  const loadDeals = () => remember('hs-deals', 15 * 60e3, async () => {
    const res = await fetch(SUPA + '/rest/v1/rpc/search_market', {
      method: 'POST', headers: hdr({ 'Content-Type': 'application/json' }), credentials: 'omit', signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ market: 'all', query_text: '', page_number: 0, page_size: 40, deals_only: true, sort_order: 'score', filter_options: { minScore: 70 } }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    return Array.isArray(j?.items) ? j.items : [];
  });
  const loadReleases = () => remember('hs-releases-' + istDay(), 30 * 60e3, () => {
    const today = istDay();
    return getRows(`upcoming_games?select=id,name,image,release_date,platform,url,wishlist_rank&release_date=gte.${addDays(today, -14)}&release_date=lte.${addDays(today, 60)}&order=release_date.asc&limit=600`);
  });
  const loadCovers = () => remember('hs-genre-covers', 30 * 60e3, async () => {
    const rows = await getRows('store_offers?select=name,image,genres,discount_percent&discount_percent=gt.0&image=not.is.null&order=discount_percent.desc&limit=400');
    return genreCovers(rows);
  });

  const skeleton = cls => h('div', { class: 'hs-skel ' + (cls || ''), 'aria-hidden': 'true' }, h('span', null, T('Yükleniyor…', 'Loading…')));

  /* ---- Yardımcılar: sayfa yönlendirme ---- */
  const nativeSet = (el, value) => {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  };
  function waitFor(fn, ms = 6000) {
    return new Promise(resolve => {
      const t0 = Date.now();
      const tick = () => {
        let v = null;
        try { v = fn(); } catch { /* sayfa değişiyor */ }
        if (v) resolve(v);
        else if (Date.now() - t0 > ms) resolve(null);
        else setTimeout(tick, 80);
      };
      tick();
    });
  }
  const genreSelect = () => [...document.querySelectorAll('.storebrowser select')].find(el => [...el.options].some(o => o.value === 'Aksiyon'));
  function applyGenre(name) {
    const sel = genreSelect();
    if (!sel) return false;
    nativeSet(sel, name);
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  const onLanding = () => !!document.querySelector('main.radar-landing');
  async function openGenre(name) {
    if (onLanding()) {
      const go = document.querySelector('.radar-landing-links button');
      if (!go) return;
      go.click();
      const sel = await waitFor(genreSelect);
      if (!sel) return;
    }
    if (applyGenre(name)) {
      const target = document.querySelector('.storebrowser .deal-list, .storebrowser .cataloggrid, .storebrowser .resultmeta');
      target?.scrollIntoView({ behavior: motionOk() ? 'smooth' : 'auto', block: 'start' });
    }
  }
  /** Oyunu adıyla aratır; sonuçta aynı adlı satırı bulursa ayrıntısını açar. */
  async function openGame(name) {
    let input = document.querySelector('.csearch input');
    if (onLanding() && input) {
      nativeSet(input, name);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.form?.requestSubmit();
    } else if (input) {
      nativeSet(input, name);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.form?.requestSubmit();
    } else return;
    const want = foldText(name);
    const hit = await waitFor(() => {
      const titles = [...document.querySelectorAll('.storebrowser .deal-game b, .storebrowser .catalogcard h3')];
      const t = titles.find(el => foldText(el.textContent) === want);
      return t ? (t.closest('.deal-game') || t.closest('article')) : null;
    }, 8000);
    hit?.click();
  }

  /* =========================================================================================
     1. Açılış sayfası: günün fırsatı, tür kartları, yeni çıkanlar, yakında
     ========================================================================================= */
  const ICON = {
    Aksiyon: 'M13 2 4 14h7l-1 8 9-12h-7z',
    Macera: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm4 5-2 6-6 2 2-6z',
    RPG: 'M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z',
    Strateji: 'M4 21h16M6 21V10l3 2V7l3 2 3-2v5l3-2v11',
    'Simülasyon': 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
    Spor: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    'Yarış': 'M5 21V4M5 4h13l-2 4 2 4H5',
    'Bağımsız': 'M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7z',
    Rahat: 'M5 11h12v4a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 12h1.5a2.5 2.5 0 0 1 0 5H17M8 3v4M12 3v4',
    MMO: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 4 5.8 4 9s-1.5 6.3-4 9c-2.5-2.7-4-5.8-4-9s1.5-6.3 4-9',
  };
  const TINT = { Aksiyon: '#ef4444', Macera: '#f59e0b', RPG: '#8b5cf6', Strateji: '#0ea5e9', 'Simülasyon': '#14b8a6', Spor: '#22c55e', 'Yarış': '#f97316', 'Bağımsız': '#ec4899', Rahat: '#a3e635', MMO: '#6366f1' };
  const icon = (g, size = 20) => s('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, s('path', { d: ICON[g] || ICON.Aksiyon }));
  const glyph = (name, size = 18) => s('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    ...({ prev: ['m15 18-6-6 6-6'], next: ['m9 18 6-6-6-6'], pause: ['M8 5v14', 'M16 5v14'], play: ['M7 4l13 8-13 8z'], ext: ['M7 17 17 7', 'M8 7h9v9'] }[name] || []).map(d => s('path', { d })));

  function head(kind, title, sub) {
    return h('div', { class: 'hs-head' }, h('span', { class: 'hs-dot', 'aria-hidden': 'true' }), h('div', null, h('h2', null, title), sub ? h('p', null, sub) : null));
  }

  /* ---- Günün fırsatı: kaydırmalı büyük vitrin ---- */
  const leftText = o => {
    const t = timeLeft(o.endsAt);
    if (!t) return '';
    return t.unit === 'd' ? T(`${t.n} gün kaldı`, `${t.n} d left`) : t.unit === 'h' ? T(`${t.n} saat kaldı`, `${t.n} h left`) : T(`${t.n} dk kaldı`, `${t.n} min left`);
  };
  function showcaseSlide(o, i, n) {
    const left = leftText(o);
    return h('article', { class: 'hs-slide', role: 'group', 'aria-roledescription': T('slayt', 'slide'), 'aria-label': `${i + 1} / ${n}: ${o.name}`, 'data-i': i },
      h('div', { class: 'hs-slide-bg', style: { 'background-image': `url("${o.hero.replace(/"/g, '%22')}")` }, 'aria-hidden': 'true' }),
      h('div', { class: 'hs-slide-body' },
        h('div', { class: 'hs-slide-text' },
          h('span', { class: 'hs-tag' }, i === 0 ? T('Günün fırsatı', "Today's deal") : T('Öne çıkan fırsat', 'Featured deal')),
          h('h3', null, o.name),
          h('p', { class: 'hs-slide-meta' }, [platName(o.platform), o.score ? `${T('Puan', 'Score')} ${o.score}` : '', left].filter(Boolean).join(' · ')),
          h('div', { class: 'hs-price' }, h('b', { class: 'hs-pct' }, '−%' + o.pct), h('del', null, money(o.original, o.currency)), h('strong', null, money(o.price, o.currency))),
          h('div', { class: 'hs-actions' },
            h('button', { type: 'button', class: 'hs-btn primary', onclick: () => openGame(o.name) }, T('Ayrıntıyı aç', 'See details')),
            o.url ? h('a', { class: 'hs-btn', href: o.url, target: '_blank', rel: 'noopener noreferrer' }, T('Mağazada aç', 'Open store'), glyph('ext', 14)) : null)),
        h('img', { class: 'hs-slide-cover', src: o.cover, alt: '', loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' })));
  }
  function showcaseNode(deals) {
    const n = deals.length;
    const track = h('div', { class: 'hs-track', tabindex: '0', 'aria-live': 'off' }, ...deals.map((o, i) => showcaseSlide(o, i, n)));
    const dots = h('div', { class: 'hs-dots', role: 'group', 'aria-label': T('Slayt seç', 'Choose slide') },
      ...deals.map((o, i) => h('button', { type: 'button', class: 'hs-dotbtn', 'aria-label': `${i + 1} / ${n}: ${o.name}`, 'aria-current': i === 0 ? 'true' : 'false', 'data-i': i })));
    let cur = 0, timer = 0, paused = !motionOk(), hover = false, visible = true;
    const pauseBtn = h('button', { type: 'button', class: 'hs-icon', 'aria-label': paused ? T('Otomatik geçişi başlat', 'Start auto-advance') : T('Otomatik geçişi durdur', 'Pause auto-advance') });
    const paintPause = () => { pauseBtn.replaceChildren(glyph(paused ? 'play' : 'pause', 16)); pauseBtn.setAttribute('aria-label', paused ? T('Otomatik geçişi başlat', 'Start auto-advance') : T('Otomatik geçişi durdur', 'Pause auto-advance')); };
    paintPause();
    const go = (i, smooth = true) => {
      cur = nextIndex(i, n, 0);
      const slide = track.children[cur];
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: smooth && motionOk() ? 'smooth' : 'auto' });
    };
    const paint = () => [...dots.children].forEach((b, i) => b.setAttribute('aria-current', i === cur ? 'true' : 'false'));
    let raf = 0;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = track.clientWidth || 1;
        const i = Math.max(0, Math.min(n - 1, Math.round(track.scrollLeft / w)));
        if (i !== cur) { cur = i; paint(); }
      });
    }, { passive: true });
    dots.addEventListener('click', e => { const b = e.target.closest('.hs-dotbtn'); if (b) go(Number(b.dataset.i)); });
    const arrows = n > 1 ? [
      h('button', { type: 'button', class: 'hs-arrow prev', 'aria-label': T('Önceki fırsat', 'Previous deal'), onclick: () => go(cur - 1) }, glyph('prev', 22)),
      h('button', { type: 'button', class: 'hs-arrow next', 'aria-label': T('Sonraki fırsat', 'Next deal'), onclick: () => go(cur + 1) }, glyph('next', 22)),
    ] : [];
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { go(cur + 1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { go(cur - 1); e.preventDefault(); }
    });
    const stop = () => { clearInterval(timer); timer = 0; };
    const start = () => {
      stop();
      if (n < 2 || paused || hover || !visible || document.hidden || !motionOk()) return;
      timer = setInterval(() => { if (!wrap.isConnected) { stop(); return; } go(cur + 1); }, 6500);
    };
    pauseBtn.addEventListener('click', () => { paused = !paused; paintPause(); start(); });
    const wrap = h('div', { class: 'hs-showcase', role: 'region', 'aria-roledescription': T('döner vitrin', 'carousel'), 'aria-label': T('Günün fırsatları', "Today's deals") }, track, ...arrows,
      n > 1 ? h('div', { class: 'hs-controls' }, pauseBtn, dots) : null);
    wrap.addEventListener('pointerenter', () => { hover = true; start(); });
    wrap.addEventListener('pointerleave', () => { hover = false; start(); });
    wrap.addEventListener('focusin', () => { hover = true; start(); });
    wrap.addEventListener('focusout', () => { hover = false; start(); });
    document.addEventListener('visibilitychange', start);
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(wrap);
    reduceMq?.addEventListener?.('change', () => { paused = !motionOk(); paintPause(); start(); });
    queueMicrotask(start);
    return wrap;
  }

  /* ---- Tür kartları ---- */
  function genreCard(g, cover, onPick, variant) {
    const tint = TINT[g] || '#6366f1';
    const btn = h('button', { type: 'button', class: 'hs-genre', 'data-genre': g, 'aria-pressed': 'false', style: { '--tint': tint }, onclick: () => onPick(g) },
      cover ? h('img', { src: cover.image, alt: '', loading: 'lazy', decoding: 'async', onerror: e => e.target.remove() }) : null,
      h('span', { class: 'hs-genre-shade', 'aria-hidden': 'true' }),
      h('span', { class: 'hs-genre-ico', 'aria-hidden': 'true' }, icon(g, variant === 'row' ? 18 : 22)),
      h('span', { class: 'hs-genre-name' }, genreName(g)));
    if (cover?.name) btn.title = `${genreName(g)} · ${cover.name}`;
    return btn;
  }
  function genreGrid(covers, onPick, variant) {
    return h('div', { class: 'hs-genres' + (variant === 'row' ? ' row' : ''), role: 'group', 'aria-label': T('Türler', 'Genres') }, ...GENRES.map(g => genreCard(g, covers[g], onPick, variant)));
  }

  /* ---- Renk kodlu çıkış şeritleri ---- */
  function dateChip(kind, c, today) {
    const gap = dayGap(c.date, today);
    if (gap === null) return '';
    if (gap === 0) return T('Bugün', 'Today');
    if (kind === 'fresh') return gap === -1 ? T('Dün', 'Yesterday') : T(`${-gap} gün önce`, `${-gap} days ago`);
    return gap === 1 ? T('Yarın', 'Tomorrow') : T(`${gap} gün sonra`, `in ${gap} days`);
  }
  function releaseStrip(kind, list, today) {
    const fresh = kind === 'fresh';
    const title = fresh ? T('Yeni çıkanlar', 'Just released') : T('Yakında', 'Coming soon');
    const sub = fresh ? T('Son iki haftada çıkan, en çok beklenenler', 'Most wanted games from the last two weeks') : T('Önümüzdeki iki ayda çıkacaklar', 'Releasing in the next two months');
    const cards = list.map((c, i) => {
      const day = new Date(dayMs(c.date)).toLocaleDateString(loc(), { timeZone: 'UTC', day: 'numeric', month: 'short' });
      const inner = [
        h('span', { class: 'hs-rel-art' }, h('img', { src: c.image, alt: '', loading: 'lazy', decoding: 'async', width: 460, height: 215 }), h('span', { class: 'hs-rel-chip' }, dateChip(kind, c, today))),
        h('span', { class: 'hs-rel-text' }, h('b', null, c.name), h('small', null, [day, platName(c.platform)].filter(Boolean).join(' · '))),
      ];
      const style = { '--i': i };
      return c.url ? h('a', { class: 'hs-rel', href: c.url, target: '_blank', rel: 'noopener noreferrer', style }, ...inner) : h('div', { class: 'hs-rel', style }, ...inner);
    });
    return h('section', { class: 'hs-sec hs-strip ' + kind, 'data-hs': kind, 'data-lang': lang(), 'aria-label': title },
      h('div', { class: 'hs-head' }, h('span', { class: 'hs-dot', 'aria-hidden': 'true' }), h('div', null, h('h2', null, title), h('p', null, sub))),
      h('div', { class: 'hs-rail' }, ...cards));
  }

  /* ---- Açılış sayfasına bağlama ---- */
  function mountHome() {
    const inner = document.querySelector('main.radar-landing .radar-landing-inner');
    const have = document.querySelector('.hs-home');
    if (!inner) { have && have.remove(); return; }
    if (have && have.dataset.lang === lang() && inner.contains(have)) return;
    have && have.remove();
    const box = h('div', { class: 'hs-home', 'data-hs': '', 'data-lang': lang() });
    const links = inner.querySelector('.radar-landing-links');
    links ? links.after(box) : inner.append(box);
    const slot = (cls) => { const el = h('section', { class: 'hs-sec ' + cls, 'data-lang': lang() }); box.append(el); return el; };
    const dealsSec = slot('hs-deals');
    const genreSec = slot('hs-genre-sec');
    const freshSlot = h('div', { class: 'hs-slot' });
    const soonSlot = h('div', { class: 'hs-slot' });
    box.append(freshSlot, soonSlot);
    dealsSec.append(head('deal', T('Günün fırsatı', "Today's deal"), T('İndirimi ve puanı en iyi oyunlar', 'Best discount and score right now')), skeleton('hs-skel-big'));
    genreSec.append(head('genre', T('Tür seç', 'Pick a genre'), T('Bir türe bas, indirimli oyunlar o türe daralsın', 'Tap a genre to narrow the list')));
    const covers = {};
    const grid = genreGrid(covers, openGenre, 'grid');
    genreSec.append(grid);
    loadCovers().then(c => {
      if (!genreSec.isConnected) return;
      const fresh = genreGrid(c, openGenre, 'grid');
      grid.replaceWith(fresh);
    }).catch(() => { /* resimsiz kartlar kalır */ });
    loadDeals().then(rows => {
      if (!dealsSec.isConnected) return;
      const deals = pickShowcase(rows, 5);
      if (!deals.length) { dealsSec.remove(); return; }
      dealsSec.replaceChildren(head('deal', T('Günün fırsatı', "Today's deal"), T('İndirimi ve puanı en iyi oyunlar', 'Best discount and score right now')), showcaseNode(deals));
    }).catch(() => dealsSec.remove());
    loadReleases().then(rows => {
      if (!box.isConnected) return;
      const today = istDay();
      const { fresh, soon } = releaseStrips(rows, today);
      if (fresh.length) freshSlot.replaceWith(releaseStrip('fresh', fresh, today));
      else freshSlot.remove();
      if (soon.length) soonSlot.replaceWith(releaseStrip('soon', soon, today));
      else soonSlot.remove();
    }).catch(() => { freshSlot.remove(); soonSlot.remove(); });
  }

  /* ---- Oyunlar sayfası: tür kartları şeridi (Tür açılır kutusuyla eşleşik) ---- */
  function mountGenreRow() {
    const onAll = new URLSearchParams(location.search).get('section') === 'all';
    const sec = document.querySelector('.storebrowser.simple-home');
    const have = document.querySelector('.hs-genre-row');
    if (!onAll || !sec) { have && have.remove(); return; }
    const filters = sec.querySelector(':scope > .simple-primary-filters');
    if (have && have.dataset.lang === lang() && sec.contains(have)) {
      const sel = genreSelect();
      const cur = sel ? sel.value : '';
      have.querySelectorAll('.hs-genre').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.genre === cur)));
      if (filters && have.nextElementSibling !== filters) filters.before(have);
      return;
    }
    have && have.remove();
    const box = h('div', { class: 'hs-genre-row', 'data-hs': '', 'data-lang': lang() });
    const pick = g => {
      const sel = genreSelect();
      const on = sel && sel.value === g;
      applyGenre(on ? '' : g);
    };
    const set = covers => box.replaceChildren(genreGrid(covers, pick, 'row'));
    set({});
    filters ? filters.before(box) : sec.prepend(box);
    loadCovers().then(c => { if (box.isConnected) set(c); }).catch(() => {});
  }

  /* =========================================================================================
     2. Hikâye halkası: ilerleme ve izlenenleri soluklaştırma
     ========================================================================================= */
  const PROGRESS_KEY = 'radar-story-progress-v1';
  const readProgress = () => { try { return JSON.parse(lsGet(PROGRESS_KEY) || 'null') || { day: '', items: {} }; } catch { return { day: '', items: {} }; } };
  function trackStory() {
    const overlay = document.querySelector('.story-overlay');
    if (!overlay) return;
    const av = overlay.querySelector('.story-head .story-avatar');
    const id = av && [...av.classList].map(c => /^s-([a-z0-9_-]+)$/i.exec(c)).filter(Boolean).map(m => m[1])[0];
    const spans = [...overlay.querySelectorAll('.story-progress span')];
    if (!id || !spans.length || !overlay.querySelector('.story-track')) return; // kartlar yüklenmeden sayılmaz
    let idx = spans.findIndex(sp => sp.querySelector('i'));
    if (idx < 0) idx = spans.filter(sp => sp.classList.contains('done')).length;
    if (idx >= spans.length) idx = spans.length - 1;
    const cur = readProgress();
    const next = recordProgress(cur, id, idx, spans.length, istDay());
    if (next !== cur) lsSet(PROGRESS_KEY, JSON.stringify(next));
  }
  function paintStories() {
    const rings = document.querySelectorAll('.story-strip .story-ring');
    if (!rings.length) return;
    const st = readProgress();
    const today = istDay();
    rings.forEach(btn => {
      const m = [...btn.classList].map(c => /^s-([a-z0-9_-]+)$/i.exec(c)).find(Boolean);
      const id = m && m[1];
      const rec = id && st.day === today ? st.items[id] : null;
      const grad = id ? ringGradient(id, rec) : null;
      const avatar = btn.querySelector('.story-avatar');
      if (!avatar) return;
      if (grad) {
        if (avatar.style.getPropertyValue('--hs-ring') !== grad) avatar.style.setProperty('--hs-ring', grad);
        const done = rec.seen >= rec.total;
        btn.dataset.hsState = done ? 'done' : 'part';
        btn.dataset.hsProgress = `${rec.seen}/${rec.total}`;
      } else if (btn.dataset.hsState) {
        avatar.style.removeProperty('--hs-ring');
        delete btn.dataset.hsState;
        delete btn.dataset.hsProgress;
      }
    });
  }

  /* =========================================================================================
     3. Arama vurgusu (CSS Custom Highlight API: DOM'a dokunmaz)
     ========================================================================================= */
  const canHighlight = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function';
  let lastSig = '';
  function paintMatches() {
    if (!canHighlight) return;
    const input = document.querySelector('.csearch input');
    const words = input ? queryWords(input.value) : [];
    const targets = words.length
      ? [...document.querySelectorAll('.storebrowser .deal-game b, .storebrowser .catalogcard h3, .storebrowser .gamecard h3, .csearch-pop .csearch-name b')]
      : [];
    const sig = words.join(' ') + '|' + targets.length + '|' + targets.map(t => t.textContent).join('\u0001').length + '|' + (targets[0]?.textContent || '') + (targets[targets.length - 1]?.textContent || '');
    if (sig === lastSig) return;
    lastSig = sig;
    const ranges = [];
    for (const el of targets) {
      if (el.querySelector('mark')) continue; // uygulamanın kendi vurgusu varsa çiftleme
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        for (const [a, b] of matchRanges(n.data, words)) {
          const r = new Range();
          r.setStart(n, a);
          r.setEnd(n, b);
          ranges.push(r);
        }
      }
    }
    if (ranges.length) CSS.highlights.set('hs-match', new Highlight(...ranges));
    else CSS.highlights.delete('hs-match');
  }

  /* ---- Tek döngü: sayfa değiştikçe hafifçe uyarla ---- */
  let queued = false;
  const run = () => {
    queued = false;
    try { mountHome(); } catch { /* sayfa hâlâ kuruluyor */ }
    try { mountGenreRow(); } catch { /* sayfa hâlâ kuruluyor */ }
    try { paintStories(); trackStory(); } catch { /* hikâye yok */ }
    try { paintMatches(); } catch { /* vurgu desteklenmiyor */ }
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
  const start = () => {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('input', e => { if (e.target?.closest?.('.csearch')) { lastSig = ''; schedule(); } }, true);
    document.addEventListener('change', e => { if (e.target instanceof HTMLSelectElement) schedule(); }, true);
    window.addEventListener('popstate', schedule);
    schedule();
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
}
