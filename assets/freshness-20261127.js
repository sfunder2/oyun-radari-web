// Kullanıcıya açık veri tazelik göstergesi (27 Kasım 2026).
// ps_state tablosundaki herkese açık "batch" (PlayStation fiyatları) ve "market" (diğer mağazalar) kayıtlarının
// finishedAt alanından "Fiyatlar 12 dk önce güncellendi" yazar. Veri okunamazsa gösterge hiç görünmez; tarih uydurulmaz.
import { formatRelative, formatDate } from './access-20261127.js';

const SUPABASE = 'https://dsosckshigzijnsxmlwh.supabase.co';
const ANON = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
export const QUERY = '/rest/v1/ps_state?select=key,finished:value->>finishedAt,status:value->>status,interval:value->>intervalMinutes&key=in.(batch,market)';

export const TEXT = {
  tr: { label: 'Fiyatlar', updated: 'Fiyatlar {ago} güncellendi', stale: 'Fiyatlar uzun süredir güncellenmedi', title: 'Son güncelleme', ps: 'PlayStation', market: 'Diğer mağazalar', never: 'bilinmiyor' },
  en: { label: 'Prices', updated: 'Prices updated {ago}', stale: 'Prices have not been refreshed for a while', title: 'Last update', ps: 'PlayStation', market: 'Other stores', never: 'unknown' },
};

/** Satırlardan {key, at(ms), status, intervalMin} listesi; geçersiz ya da gelecekteki tarihler atılır. */
export function parseRows(rows, now = Date.now()) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({ key: String(r.key), at: Date.parse(r.finished), status: r.status || '', intervalMin: Number(r.interval) || (r.key === 'batch' ? 5 : 60) }))
    .filter((r) => Number.isFinite(r.at) && r.at <= now + 5 * 60000);
}

/** fresh: aralığın 6 katı ya da en çok 3 saat içinde; ok: 12 saat içinde; stale: ötesi. */
export function levelFor(ageMs, intervalMin = 5) {
  const fresh = Math.min(Math.max(intervalMin * 6, 30), 180) * 60000;
  if (ageMs <= fresh) return 'fresh';
  return ageMs <= 12 * 3600000 ? 'ok' : 'stale';
}

/** Tek özet: en yeni kayıt + en kötü tazelik düzeyi. */
export function summarize(rows, now = Date.now()) {
  const list = parseRows(rows, now);
  if (!list.length) return null;
  const newest = list.reduce((a, b) => (b.at > a.at ? b : a));
  const rank = { fresh: 0, ok: 1, stale: 2 };
  const level = list.reduce((w, r) => (rank[levelFor(now - r.at, r.intervalMin)] > rank[w] ? levelFor(now - r.at, r.intervalMin) : w), 'fresh');
  return { newestAt: newest.at, level, sources: list };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const root = document.documentElement;
  const lang = () => (root.lang === 'en' ? 'en' : 'tr');
  let data = null, fetching = null, fetchedAt = 0;

  async function load() {
    if (fetching) return fetching;
    if (Date.now() - fetchedAt < 4 * 60000) return;
    fetching = fetch(SUPABASE + QUERY, { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON }, signal: AbortSignal.timeout(12000) })
      .then((r) => (r.ok ? r.json() : null)).then((rows) => { data = summarize(rows); fetchedAt = Date.now(); render(); })
      .catch(() => {}).finally(() => { fetching = null; });
    return fetching;
  }

  function pill() {
    const t = TEXT[lang()], now = Date.now();
    const span = document.createElement('span');
    span.className = 'fresh-pill fresh-' + data.level;
    span.setAttribute('data-fresh', '1');
    const ago = formatRelative(data.newestAt, lang(), now);
    span.innerHTML = '<i aria-hidden="true"></i>';
    const text = document.createElement('span');
    text.textContent = data.level === 'stale' ? t.stale : t.updated.replace('{ago}', ago);
    span.append(text);
    span.title = t.title + ': ' + data.sources.map((s) => (s.key === 'batch' ? t.ps : t.market) + ' ' + formatDate(s.at, lang(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })).join(' · ');
    span.setAttribute('role', 'status');
    return span;
  }

  function render() {
    for (const old of document.querySelectorAll('[data-fresh]')) old.remove();
    if (!data) return;
    for (const host of document.querySelectorAll('.resultmeta, main > footer, .radar-landing-links')) host.append(pill());
  }

  let pending = 0;
  new MutationObserver((muts) => {
    if (muts.every((m) => [...m.addedNodes, ...m.removedNodes].every((n) => n.nodeType === 1 && n.hasAttribute?.('data-fresh')))) return;
    if (!pending) pending = requestAnimationFrame(() => { pending = 0; if (data && !document.querySelector('[data-fresh]')) render(); else if (data) { for (const h of document.querySelectorAll('.resultmeta, main > footer, .radar-landing-links')) if (!h.querySelector('[data-fresh]')) h.append(pill()); } });
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('radar:lang', render);
  setInterval(() => { if (document.visibilityState === 'visible') { load(); render(); } }, 60000);
  load();
}
