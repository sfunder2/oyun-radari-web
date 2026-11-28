// Touch + PWA layer: theme-color sync, input hints, lazy images, tap tooltips, gallery pinch-zoom,
// Web Share on the game dialog, standalone class, Web Push client (window.radarPush).
const en = () => document.documentElement.lang === 'en';
const T = (tr, e) => (en() ? e : tr);
const root = typeof document !== 'undefined' ? document.documentElement : null;
const standalone = () => matchMedia('(display-mode:standalone)').matches || navigator.standalone === true;

/* ---------- theme-color follows the visible theme (Klasik dark / OLED / Sade light) ---------- */
export function pickThemeColor(bg) {
  const m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(bg || '');
  if (!m) return '#090d12';
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
}
function syncTheme() {
  let meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.append(meta); }
  const bg = getComputedStyle(document.body).backgroundColor;
  if (bg && bg !== 'rgba(0, 0, 0, 0)') meta.content = pickThemeColor(bg);
}

/* ---------- input hints (virtual keyboard) ---------- */
function hintInputs(scope = document) {
  scope.querySelectorAll('input[type=search],input[name=q],input[placeholder*="ara" i],input[placeholder*="search" i]').forEach((i) => {
    if (i.dataset.rxHint) return; i.dataset.rxHint = '1';
    if (!i.hasAttribute('inputmode')) i.setAttribute('inputmode', 'search');
    if (!i.hasAttribute('enterkeyhint')) i.setAttribute('enterkeyhint', 'search');
    i.setAttribute('autocapitalize', 'off'); i.setAttribute('autocorrect', 'off'); i.spellcheck = false;
  });
  scope.querySelectorAll('input[type=number]').forEach((i) => { if (!i.hasAttribute('inputmode')) i.setAttribute('inputmode', i.step && /\./.test(i.step) ? 'decimal' : 'numeric'); });
  scope.querySelectorAll('input[type=email]').forEach((i) => { i.setAttribute('autocapitalize', 'off'); if (!i.hasAttribute('enterkeyhint')) i.setAttribute('enterkeyhint', 'next'); });
}

/* ---------- images: lazy + async decode, first screen eager ---------- */
function tuneImages(scope = document) {
  scope.querySelectorAll('img:not([data-rx-img])').forEach((img) => {
    img.dataset.rxImg = '1';
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
    const r = img.getBoundingClientRect();
    if (!img.hasAttribute('loading') && r.top > innerHeight * 1.2) img.loading = 'lazy';
    if (!img.hasAttribute('alt')) img.alt = '';
  });
}

/* ---------- touch tooltip for title= / data-tip terms ---------- */
let bubble = null, bubbleTimer = 0;
function hideTip() { bubble && bubble.remove(); bubble = null; clearTimeout(bubbleTimer); }
function tipTarget(t) {
  const e = t.closest && t.closest('[data-tip],abbr[title],[title]:not(button):not(a):not(input):not(select):not(iframe):not(svg)');
  if (!e || e.closest('button,a,input,select,label,summary')) return null;
  return e;
}
function showTip(e) {
  const text = e.dataset.tip || e.getAttribute('title');
  if (!text) return;
  if (e.hasAttribute('title')) { e.dataset.tip = text; e.removeAttribute('title'); }
  hideTip();
  bubble = document.createElement('div'); bubble.className = 'tip-bubble'; bubble.setAttribute('role', 'status'); bubble.textContent = text;
  document.body.append(bubble);
  const r = e.getBoundingClientRect(), b = bubble.getBoundingClientRect();
  const left = Math.min(Math.max(12, r.left + r.width / 2 - b.width / 2), innerWidth - b.width - 12);
  const top = r.top - b.height - 8 >= 8 ? r.top - b.height - 8 : r.bottom + 8;
  bubble.style.left = left + 'px'; bubble.style.top = top + 'px';
  bubbleTimer = setTimeout(hideTip, 3500);
}
function setupTips() {
  if (!matchMedia('(hover:none)').matches) return;
  document.addEventListener('click', (ev) => { const e = tipTarget(ev.target); if (e) showTip(e); else hideTip(); }, true);
  addEventListener('scroll', hideTip, { passive: true });
}

/* ---------- gallery: pinch, double-tap, pan ---------- */
export function clampPan(v, size, view, scale) {
  const max = Math.max(0, (size * scale - view) / 2);
  return Math.min(max, Math.max(-max, v));
}
function attachZoom(lbRoot) {
  const stage = lbRoot.querySelector('.dx-lb-stage'), img = stage && stage.querySelector('img');
  if (!stage || !img || lbRoot.dataset.rxZoom) return;
  lbRoot.dataset.rxZoom = '1';
  const pts = new Map();
  let scale = 1, tx = 0, ty = 0, d0 = 0, s0 = 1, last = 0, drag = null;
  const apply = () => {
    const w = img.clientWidth, h = img.clientHeight, sw = stage.clientWidth, sh = stage.clientHeight;
    tx = clampPan(tx, w, sw, scale) ; ty = clampPan(ty, h, sh, scale);
    img.style.transform = scale === 1 ? '' : `translate(${tx}px,${ty}px) scale(${scale})`;
    lbRoot.classList.toggle('is-zoomed', scale > 1.02);
  };
  // transform origin is the image centre for the maths above
  img.style.transformOrigin = '50% 50%';
  const reset = () => { scale = 1; tx = ty = 0; apply(); };
  new MutationObserver(reset).observe(img, { attributes: true, attributeFilter: ['src'] });
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  lbRoot.addEventListener('pointerdown', (e) => {
    if (!stage.contains(e.target)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { d0 = dist(); s0 = scale; e.stopPropagation(); }
    else if (scale > 1) { drag = { x: e.clientX - tx, y: e.clientY - ty }; e.stopPropagation(); }
    const now = Date.now();
    if (e.target === img && pts.size === 1 && now - last < 300) { scale = scale > 1 ? 1 : 2.5; tx = ty = 0; apply(); e.stopPropagation(); }
    last = now;
  }, true);
  lbRoot.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { scale = Math.min(5, Math.max(1, s0 * dist() / d0)); apply(); e.stopPropagation(); }
    else if (drag && scale > 1) { tx = e.clientX - drag.x; ty = e.clientY - drag.y; apply(); e.stopPropagation(); }
  }, true);
  const up = (e) => {
    const was = pts.size; pts.delete(e.pointerId);
    if (was > 1 || scale > 1) e.stopPropagation(); // do not turn a pinch/pan into a swipe-to-next
    if (!pts.size) { drag = null; if (scale < 1.05) reset(); }
  };
  lbRoot.addEventListener('pointerup', up, true); lbRoot.addEventListener('pointercancel', up, true);
}

/* ---------- Web Share in the game dialog ---------- */
function addShare() {
  if (!navigator.share) return;
  document.querySelectorAll('.modal.game-detail .modalactions:not([data-rx-share])').forEach((box) => {
    box.dataset.rxShare = '1';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rx-share'; b.textContent = T('Paylaş', 'Share');
    b.addEventListener('click', () => {
      const m = box.closest('.modal'); const h = m && m.querySelector('h1,h2');
      navigator.share({ title: (h && h.textContent.trim()) || document.title, text: T('Oyun Radarı’nda bu oyuna bak', 'Check this game on Oyun Radarı'), url: location.href }).catch(() => {});
    });
    box.append(b);
  });
}

/* ---------- Web Push client (needs <meta name="radar-vapid-key"> and a server that sends) ---------- */
const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
const vapid = () => document.querySelector('meta[name="radar-vapid-key"]')?.content || '';
if (typeof window !== 'undefined') window.radarPush = {
  get supported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; },
  get configured() { return !!vapid(); },
  async state() {
    if (!this.supported) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    const reg = await navigator.serviceWorker.getRegistration('/oyun-radari-web/');
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub ? 'on' : 'off';
  },
  // Resolves to the PushSubscription JSON; the caller stores it on the server.
  async subscribe() {
    if (!this.supported || !vapid()) throw new Error('push-not-configured');
    if ((await Notification.requestPermission()) !== 'granted') throw new Error('permission-denied');
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(vapid()) }));
    return sub.toJSON();
  },
  async unsubscribe() {
    const reg = await navigator.serviceWorker.getRegistration('/oyun-radari-web/');
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub ? sub.unsubscribe() : true;
  },
};

/* ---------- boot ---------- */
function boot() {
  if (standalone()) root.classList.add('is-standalone');
  matchMedia('(display-mode:standalone)').addEventListener?.('change', (e) => root.classList.toggle('is-standalone', e.matches));
  syncTheme(); hintInputs(); tuneImages(); setupTips(); addShare();
  let q = 0;
  const run = () => { q = 0; hintInputs(); tuneImages(); addShare(); const lb = document.querySelector('.dx-lb'); if (lb) attachZoom(lb); };
  new MutationObserver(() => { q || (q = requestAnimationFrame(run)); }).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ['data-ui', 'data-theme', 'data-site-theme', 'class'] });
}
if (typeof document !== 'undefined') (document.body ? boot() : addEventListener('DOMContentLoaded', boot));
