// KVKK / gizlilik (27 Kasım 2026): çerez-tercih şeridi, gizlilik penceresi, veri dışa aktarma ve veri silme.
// - Gerekli depolama (oturum, favoriler, tema) açık rıza istemez; hata izleme ve analitik varsayılan KAPALI, yalnız onayla açılır.
// - Tercih radar-consent-v1 anahtarında tutulur; değişince "radar:consent" olayı yayılır (telemetry-20261127.js dinler).
// - Dışa aktarma: bu cihazdaki radar-* kayıtları + (girişliyse) hesap verisi (export_my_data RPC, yoksa tablo okumaları).
// - Silme: bu cihazdaki kayıtlar ya da hesap (delete_my_account RPC). Hesap silme geri alınamaz ve yazıyla onay ister.
// Kurulum: supabase/schema-v60-kvkk-gizlilik.sql çalıştırılmadan hesap silme/dışa aktarma sunucu tarafı çalışmaz; hata açıkça gösterilir.
import { CONSENT_KEY, parseConsent } from './telemetry-20261127.js';

const SUPABASE = 'https://dsosckshigzijnsxmlwh.supabase.co';
const ANON = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
const AUTH_KEY = 'radar-auth';
const LOCAL_KEY = /^(radar|oyun-radar)[-_]/i;
const KEEP_ON_CLEAR = new Set([CONSENT_KEY]);
const FALLBACK_TABLES = [
  ['userData', 'radar_user_data', 'user_id'], ['profile', 'radar_profiles', 'user_id'], ['posts', 'radar_posts', 'user_id'],
  ['lists', 'radar_lists', 'user_id'], ['votes', 'radar_votes', 'user_id'], ['tags', 'radar_tags', 'user_id'],
  ['follows', 'radar_follows', 'user_id'], ['partyLists', 'party_lists', 'owner_id'],
];

export const TEXT = {
  tr: {
    title: 'Gizlilik tercihleri', bannerText: 'Siteyi geliştirmek için isteğe bağlı hata izleme ve çerezsiz, anonim kullanım sayacı kullanabiliriz. Varsayılan olarak kapalıdır.',
    accept: 'Kabul et', necessary: 'Yalnız gerekli', settings: 'Ayarlar', save: 'Kaydet', close: 'Kapat',
    necessaryTitle: 'Gerekli depolama', necessaryText: 'Oturum, favoriler, tema ve dil seçimi bu cihazda tutulur. Bunlar olmadan site çalışmaz; kapatılamaz.',
    errorsTitle: 'Hata izleme', errorsText: 'Bir şey bozulduğunda hata metnini (e-posta ve jetonlar silinerek) bize gönderir. Kimlik ve çerez yok.',
    analyticsTitle: 'Anonim kullanım sayacı', analyticsText: 'Hangi sayfaların açıldığını günlük sayaç olarak tutar. Kişi, IP, çerez ya da arama metni saklanmaz.',
    dataTitle: 'Verilerin', exportBtn: 'Verilerimi indir (JSON)', clearLocal: 'Bu cihazdaki kayıtları sil', deleteAccount: 'Hesabımı ve verilerimi sil',
    exporting: 'Hazırlanıyor…', exported: 'Dosya indirildi.', clearConfirm: 'Bu cihazdaki favoriler, günlük ve ayarlar silinsin mi? Hesabın etkilenmez.', cleared: 'Bu cihazdaki kayıtlar silindi.',
    deleteInfo: 'Hesabın, favorilerin, yorumların, listelerin ve tüm hesap verin kalıcı olarak silinir. Bu işlem geri alınamaz. Onaylamak için SİL yaz.',
    deleteWord: 'SİL', deleteGo: 'Kalıcı olarak sil', deleted: 'Hesabın silindi.', needLogin: 'Hesap işlemleri için önce giriş yap.',
    failed: 'İşlem tamamlanamadı: ', footer: 'Gizlilik tercihleri', serverMissing: 'Sunucu tarafı henüz kurulmamış olabilir.',
  },
  en: {
    title: 'Privacy preferences', bannerText: 'To improve the site we can use optional error reporting and a cookie-free, anonymous usage counter. Both are off by default.',
    accept: 'Accept', necessary: 'Necessary only', settings: 'Settings', save: 'Save', close: 'Close',
    necessaryTitle: 'Necessary storage', necessaryText: 'Your session, favorites, theme and language are kept on this device. The site cannot work without them.',
    errorsTitle: 'Error reporting', errorsText: 'When something breaks, sends the error text (emails and tokens removed). No identity, no cookies.',
    analyticsTitle: 'Anonymous usage counter', analyticsText: 'Counts which pages are opened per day. No person, IP, cookie or search text is stored.',
    dataTitle: 'Your data', exportBtn: 'Download my data (JSON)', clearLocal: 'Delete records on this device', deleteAccount: 'Delete my account and data',
    exporting: 'Preparing…', exported: 'File downloaded.', clearConfirm: 'Delete favorites, journal and settings stored on this device? Your account is not affected.', cleared: 'Records on this device were deleted.',
    deleteInfo: 'Your account, favorites, comments, lists and all account data are deleted permanently. This cannot be undone. Type DELETE to confirm.',
    deleteWord: 'DELETE', deleteGo: 'Delete permanently', deleted: 'Your account was deleted.', needLogin: 'Sign in first for account actions.',
    failed: 'Could not finish: ', footer: 'Privacy preferences', serverMissing: 'The server side may not be set up yet.',
  },
};

// ---------------------------------------------------------------------------------------------
// Saf yardımcılar (tests/privacy.test.mjs)
// ---------------------------------------------------------------------------------------------
export const isRadarKey = (k) => LOCAL_KEY.test(String(k));

export function serializeConsent(c, now = Date.now()) {
  return JSON.stringify({ v: 1, at: now, errors: c?.errors === true, analytics: c?.analytics === true });
}

/** Bildirim şeridi gerekli mi? Toplanacak bir şey yapılandırılmamışsa ya da tercih verilmişse hayır. */
export function needsBanner(consent, cfg) {
  if (consent) return false;
  return !!(cfg && (cfg.sentryDsn || cfg.analyticsEndpoint));
}

/** Depodaki radar-* kayıtlarını {anahtar: değer} olarak toplar (JSON ise çözülür). Oturum jetonları dışarıda bırakılır. */
export function collectLocalData(storage) {
  const out = {};
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (!isRadarKey(k) || k === AUTH_KEY) continue;
    const raw = storage.getItem(k);
    try { out[k] = JSON.parse(raw); } catch { out[k] = raw; }
  }
  return out;
}

export function buildExport({ local, account, now = new Date() }) {
  return { app: 'oyun-radari', exportedAt: now.toISOString(), device: local || {}, account: account || null };
}

/** Bu cihazdaki radar-* kayıtlarını siler (tercih anahtarı korunur). Silinen anahtar sayısını döndürür. */
export function clearLocalData(storage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (isRadarKey(k) && !KEEP_ON_CLEAR.has(k)) keys.push(k); }
  keys.forEach((k) => storage.removeItem(k));
  return keys.length;
}

export const confirmMatches = (typed, word) => String(typed || '').trim().toLocaleUpperCase('tr-TR') === String(word).toLocaleUpperCase('tr-TR');

// ---------------------------------------------------------------------------------------------
// Tarayıcı kısmı
// ---------------------------------------------------------------------------------------------
function readSession() {
  try {
    const s = JSON.parse(localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY) || 'null');
    return s?.access_token ? s : null;
  } catch { return null; }
}

async function api(path, session, init = {}) {
  const res = await fetch(SUPABASE + '/rest/v1/' + path, {
    ...init,
    headers: { apikey: ANON, Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
  return res.status === 204 ? null : res.json().catch(() => null);
}

export async function fetchAccountData(session) {
  try { return await api('rpc/export_my_data', session, { method: 'POST', body: '{}' }); } catch { /* RPC kurulu değilse tablolara düş */ }
  const out = { user: { id: session.user?.id, email: session.user?.email }, note: 'Kısmi dışa aktarma: sunucu işlevi kurulu değil.' };
  const uid = encodeURIComponent(session.user?.id || '');
  await Promise.all(FALLBACK_TABLES.map(async ([name, table, col]) => {
    try { out[name] = await api(`${table}?select=*&${col}=eq.${uid}`, session); } catch (e) { out[name] = { error: String(e.message) }; }
  }));
  return out;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const root = document.documentElement;
  const tx = () => TEXT[root.lang === 'en' ? 'en' : 'tr'];
  const cfg = () => window.RADAR_CONFIG || {};
  const getConsent = () => { try { return parseConsent(localStorage.getItem(CONSENT_KEY)); } catch { return null; } };
  const setConsent = (c) => {
    try { localStorage.setItem(CONSENT_KEY, serializeConsent(c)); } catch { /* yok say */ }
    window.dispatchEvent(new CustomEvent('radar:consent', { detail: getConsent() }));
  };
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v); }
    kids.flat().forEach((c) => n.append(c));
    return n;
  };
  const say = (msg) => {
    let live = document.getElementById('radar-privacy-live');
    if (!live) { live = el('div', { id: 'radar-privacy-live', class: 'rp-live', role: 'status', 'aria-live': 'polite' }); document.body.append(live); }
    live.textContent = msg;
  };

  function download(name, obj) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
    const a = el('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function doExport(statusEl) {
    const t = tx();
    statusEl.textContent = t.exporting;
    try {
      const s = readSession();
      const account = s ? await fetchAccountData(s) : null;
      download('oyun-radari-verilerim.json', buildExport({ local: collectLocalData(localStorage), account }));
      statusEl.textContent = t.exported;
    } catch (e) { statusEl.textContent = t.failed + (e.message || ''); }
  }

  async function doDeleteAccount(statusEl) {
    const t = tx(), s = readSession();
    if (!s) { statusEl.textContent = t.needLogin; return; }
    try {
      await api('rpc/delete_my_account', s, { method: 'POST', body: '{}' });
      clearLocalData(localStorage); localStorage.removeItem(AUTH_KEY); sessionStorage.removeItem(AUTH_KEY);
      statusEl.textContent = t.deleted;
      setTimeout(() => location.assign(location.pathname), 1200);
    } catch (e) { statusEl.textContent = t.failed + (e.status === 404 ? t.serverMissing : e.message || ''); }
  }

  let lastFocus = null;
  function closeDialog() { document.getElementById('radar-privacy-dialog')?.remove(); document.body.classList.remove('rp-open'); lastFocus?.focus?.(); }

  function openDialog() {
    if (document.getElementById('radar-privacy-dialog')) return;
    const t = tx(), c = getConsent() || { errors: false, analytics: false };
    lastFocus = document.activeElement;
    const status = el('p', { class: 'rp-status', role: 'status', 'aria-live': 'polite' });
    const errors = el('input', { type: 'checkbox', id: 'rp-errors', checked: c.errors });
    const analytics = el('input', { type: 'checkbox', id: 'rp-analytics', checked: c.analytics });
    const word = el('input', { type: 'text', id: 'rp-confirm', autocomplete: 'off', 'aria-label': t.deleteWord });
    const delGo = el('button', { class: 'rp-danger', disabled: true, onclick: () => doDeleteAccount(status) }, t.deleteGo);
    word.addEventListener('input', () => { delGo.disabled = !confirmMatches(word.value, t.deleteWord); });
    const delBox = el('div', { class: 'rp-delete', hidden: true }, el('p', {}, t.deleteInfo), word, delGo);
    const box = el('div', { class: 'rp-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rp-title' },
      el('h2', { id: 'rp-title' }, t.title),
      el('section', {}, el('h3', {}, t.necessaryTitle), el('p', {}, t.necessaryText)),
      el('section', {}, el('label', { class: 'rp-row', for: 'rp-errors' }, errors, el('span', {}, el('b', {}, t.errorsTitle), el('small', {}, t.errorsText)))),
      el('section', {}, el('label', { class: 'rp-row', for: 'rp-analytics' }, analytics, el('span', {}, el('b', {}, t.analyticsTitle), el('small', {}, t.analyticsText)))),
      el('div', { class: 'rp-actions' },
        el('button', { class: 'rp-primary', onclick: () => { setConsent({ errors: errors.checked, analytics: analytics.checked }); document.getElementById('radar-privacy-banner')?.remove(); closeDialog(); say(t.save); } }, t.save),
        el('button', { onclick: closeDialog }, t.close)),
      el('section', { class: 'rp-data' }, el('h3', {}, t.dataTitle),
        el('div', { class: 'rp-actions' },
          el('button', { onclick: () => doExport(status) }, t.exportBtn),
          el('button', { onclick: () => { if (confirm(t.clearConfirm)) { clearLocalData(localStorage); status.textContent = t.cleared; } } }, t.clearLocal),
          el('button', { class: 'rp-danger-ghost', onclick: () => { if (!readSession()) { status.textContent = t.needLogin; return; } delBox.hidden = false; word.focus(); } }, t.deleteAccount)),
        delBox, status));
    const overlay = el('div', { id: 'radar-privacy-dialog', class: 'rp-overlay', onclick: (e) => { if (e.target === overlay) closeDialog(); } }, box);
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeDialog(); return; }
      if (e.key !== 'Tab') return;
      const f = [...box.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')].filter((n) => !n.closest('[hidden]'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.body.append(overlay); document.body.classList.add('rp-open');
    errors.focus();
  }
  window.radarOpenPrivacy = openDialog;

  function showBanner() {
    if (document.getElementById('radar-privacy-banner') || !needsBanner(getConsent(), cfg())) return;
    const t = tx();
    const done = (c) => { setConsent(c); document.getElementById('radar-privacy-banner')?.remove(); };
    document.body.append(el('div', { id: 'radar-privacy-banner', class: 'rp-banner', role: 'region', 'aria-label': t.title },
      el('p', {}, t.bannerText),
      el('div', { class: 'rp-actions' },
        el('button', { class: 'rp-primary', onclick: () => done({ errors: true, analytics: true }) }, t.accept),
        el('button', { onclick: () => done({ errors: false, analytics: false }) }, t.necessary),
        el('button', { onclick: openDialog }, t.settings))));
  }

  // Altbilgiye ve açılış sayfası bağlantılarına "Gizlilik tercihleri" düğmesi.
  function ensureLinks() {
    const t = tx();
    for (const host of document.querySelectorAll('main > footer, .radar-landing-links')) {
      const btn = host.querySelector('.rp-footer-link');
      if (btn) { btn.textContent = t.footer; continue; }
      host.append(el('button', { type: 'button', class: 'rp-footer-link', onclick: openDialog }, t.footer));
    }
  }
  let pending = 0;
  new MutationObserver(() => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; ensureLinks(); }); }).observe(document.body, { childList: true, subtree: true });
  ensureLinks();
  setTimeout(showBanner, 1200);
}
