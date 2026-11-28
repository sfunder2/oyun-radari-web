// Hata izleme (Sentry uyumlu, SDK'sız) ve gizlilik dostu olay analitiği (27 Kasım 2026).
// - DSN ve toplayıcı adresi assets/radar-config.js içinden gelir; boşsa hiçbir şey gönderilmez.
// - Yalnız kullanıcı gizlilik tercihinde izin verdiyse çalışır (radar-consent-v1: errors / analytics).
// - Çerez, kullanıcı kimliği, IP veya arama metni gönderilmez; adresler sorgu/hash'siz, metinler e-posta ve jetondan arındırılır.
// Dışa açık API: window.radarTrack(name, props), window.radarCaptureError(error, ctx).

export const CONSENT_KEY = 'radar-consent-v1';

/** "https://KEY@o123.ingest.sentry.io/456" → gönderim adresi ve anahtar. Geçersizse null. */
export function parseDsn(dsn) {
  try {
    const u = new URL(String(dsn || ''));
    if (u.protocol !== 'https:' || !u.username) return null;
    const projectId = u.pathname.split('/').filter(Boolean).pop();
    if (!projectId || !/^\d+$/.test(projectId)) return null;
    const prefix = u.pathname.split('/').filter(Boolean).slice(0, -1).join('/');
    return { key: u.username, host: u.host, projectId, envelopeUrl: `https://${u.host}/${prefix ? prefix + '/' : ''}api/${projectId}/envelope/` };
  } catch { return null; }
}

/** E-posta, JWT ve jeton benzeri değerleri siler. */
export function scrubText(s) {
  return String(s ?? '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[eposta]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jeton]')
    .replace(/(access_token|refresh_token|token|apikey|key|password)=([^&\s]+)/gi, '$1=[gizli]')
    .slice(0, 600);
}

/** Adresten sorgu ve hash'i atar; yalnız kaynak + yol kalır. */
export function scrubUrl(u) {
  try { const x = new URL(String(u), 'https://x.invalid'); return (x.origin === 'https://x.invalid' ? '' : x.origin) + x.pathname; } catch { return ''; }
}

/** Sentry olayı: kullanıcı, çerez ve istek gövdesi yok. */
export function buildErrorEvent(err, ctx = {}, now = Date.now()) {
  const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'Bilinmeyen hata');
  const frames = String(e.stack || '').split('\n').slice(1, 12).map((l) => scrubText(l.trim())).filter(Boolean);
  return {
    event_id: (ctx.id || Math.random().toString(16).slice(2).padEnd(32, '0')).slice(0, 32),
    timestamp: now / 1000,
    platform: 'javascript',
    level: ctx.level || 'error',
    release: ctx.release || undefined,
    environment: ctx.environment || 'production',
    exception: { values: [{ type: scrubText(e.name || 'Error').slice(0, 60), value: scrubText(e.message), stacktrace: { frames: frames.map((f) => ({ function: f })).reverse() } }] },
    request: ctx.url ? { url: scrubUrl(ctx.url) } : undefined,
    tags: { lang: ctx.lang || 'tr', ui: ctx.ui || 'klasik', source: ctx.source || 'window' },
  };
}

export function buildEnvelope(dsn, event, now = Date.now()) {
  const header = { event_id: event.event_id, sent_at: new Date(now).toISOString(), dsn };
  return [JSON.stringify(header), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n');
}

/** Aynı hata dakikada bir kez, oturum başına en çok max kez gönderilir. */
export function makeLimiter(max = 10, windowMs = 60000) {
  const seen = new Map();
  let total = 0;
  return (key, now = Date.now()) => {
    if (total >= max) return false;
    const last = seen.get(key);
    if (last != null && now - last < windowMs) return false;
    seen.set(key, now);
    total += 1;
    return true;
  };
}

export function parseConsent(raw) {
  try {
    const c = JSON.parse(raw || 'null');
    if (c && c.v === 1) return { v: 1, at: Number(c.at) || 0, errors: c.errors === true, analytics: c.analytics === true };
  } catch { /* yok say */ }
  return null;
}

export function canTrack(consent, category) {
  return !!consent && consent[category] === true;
}

const PROP_KEY = /^[a-z0-9_]{1,24}$/;
/** Yalnız kısa metin/sayı/mantıksal değerler; e-posta ve jeton benzeri her şey elenir. */
export function cleanProps(props) {
  const out = {};
  if (!props || typeof props !== 'object') return out;
  for (const [k, v] of Object.entries(props).slice(0, 6)) {
    if (!PROP_KEY.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && !/@|eyJ|token/i.test(v)) out[k] = v.slice(0, 60);
  }
  return out;
}

/** "/oyun-radari-web/oyun/123?x=1#a" → "/oyun" (ilk bölüm; kimlikler ve aramalar kaydedilmez). */
export function routeOf(pathname) {
  const p = String(pathname || '/').replace(/^\/oyun-radari-web/, '') || '/';
  const first = p.split('/').filter(Boolean)[0];
  return first ? '/' + first.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30) : '/';
}

export function buildAnalyticsEvent(name, props, ctx = {}) {
  if (!/^[a-z0-9_]{1,40}$/.test(String(name))) return null;
  return {
    name, props: cleanProps(props), route: routeOf(ctx.pathname),
    lang: ctx.lang === 'en' ? 'en' : 'tr', ui: ctx.ui === 'sade' ? 'sade' : 'klasik',
    device: ctx.device === 'mobile' || ctx.device === 'desktop' ? ctx.device : 'unknown',
  };
}

// ---------------------------------------------------------------------------------------------
// Tarayıcıda çalışan kısım
// ---------------------------------------------------------------------------------------------
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const cfg = () => window.RADAR_CONFIG || {};
  const readConsent = () => { try { return parseConsent(localStorage.getItem(CONSENT_KEY)); } catch { return null; } };
  const root = document.documentElement;
  const ctx = () => ({ lang: root.lang === 'en' ? 'en' : 'tr', ui: root.dataset.ui, pathname: location.pathname, url: location.href, device: matchMedia('(max-width:700px)').matches ? 'mobile' : 'desktop' });
  const limiter = makeLimiter(10, 60000);

  function captureError(err, extra = {}) {
    const c = cfg(), dsn = parseDsn(c.sentryDsn);
    if (!dsn || !canTrack(readConsent(), 'errors')) return;
    const x = ctx();
    const ev = buildErrorEvent(err, { ...x, ...extra, release: c.release || undefined, environment: c.sentryEnv });
    if (!limiter(ev.exception.values[0].type + ev.exception.values[0].value)) return;
    const body = buildEnvelope(c.sentryDsn, ev);
    const url = dsn.envelopeUrl + '?sentry_version=7&sentry_key=' + encodeURIComponent(dsn.key) + '&sentry_client=radar-web%2F1';
    try { fetch(url, { method: 'POST', body, keepalive: true, mode: 'cors', credentials: 'omit' }).catch(() => {}); } catch { /* yok say */ }
  }
  window.radarCaptureError = captureError;
  window.addEventListener('error', (e) => { if (e.error || e.message) captureError(e.error || new Error(e.message), { source: 'window' }); });
  window.addEventListener('unhandledrejection', (e) => captureError(e.reason instanceof Error ? e.reason : new Error(String(e.reason)), { source: 'promise' }));

  let queue = [];
  let timer = 0;
  function flush() {
    timer = 0;
    const endpoint = cfg().analyticsEndpoint;
    if (!queue.length || !endpoint || !canTrack(readConsent(), 'analytics')) { queue = []; return; }
    const payload = JSON.stringify({ events: queue.splice(0, 20) });
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon(endpoint, new Blob([payload], { type: 'text/plain' })))) {
        fetch(endpoint, { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'text/plain' }, credentials: 'omit' }).catch(() => {});
      }
    } catch { /* yok say */ }
  }
  function track(name, props) {
    if (!cfg().analyticsEndpoint || !canTrack(readConsent(), 'analytics')) return;
    const ev = buildAnalyticsEvent(name, props, ctx());
    if (!ev) return;
    queue.push(ev);
    if (!timer) timer = setTimeout(flush, 3000);
  }
  window.radarTrack = track;
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  // Sayfa görüntüleme: ilk açılış ve gezinme (history API + popstate). Aynı yol arka arkaya sayılmaz.
  let lastRoute = '';
  function view() {
    const r = routeOf(location.pathname);
    if (r === lastRoute) return;
    lastRoute = r;
    track('page_view', {});
  }
  for (const m of ['pushState', 'replaceState']) {
    const orig = history[m];
    history[m] = function (...a) { const out = orig.apply(this, a); queueMicrotask(view); return out; };
  }
  addEventListener('popstate', view);
  view();

  // [data-track="ad"] ve dış bağlantı tıklamaları (yalnız alan adı).
  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    const tr = t?.closest('[data-track]');
    if (tr) track(tr.getAttribute('data-track'), {});
    const a = t?.closest('a[href]');
    if (a && a.host && a.host !== location.host) track('outbound_click', { host: a.host.slice(0, 40) });
  }, { capture: true, passive: true });

  // Tercih değişince bekleyen kuyruk temizlenir; analitik yeni açıldıysa sayfa görüntülemesi sayılır.
  window.addEventListener('radar:consent', () => { lastRoute = ''; view(); });
}
