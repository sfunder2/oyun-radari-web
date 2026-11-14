// Supabase REST çağrılarını Neon Data API'ye yönlendiren tek geçit.
// Tarayıcı kodu hâlâ DB_URL+'/rest/v1/...' çağırır; bu modül fetch'i sarar, adresi Neon'a çevirir ve
// herkese açık anahtar yerine "anontoken" Function'ından alınan kısa ömürlü jetonu koyar.
// Açma/kapama: NEON_DEFAULT_ON (canlıya geçişte true yapılır) ya da test için ?neon=1 / localStorage.neon='1' (kapatmak için '0').
const SUPABASE_AUTH = 'https://dsosckshigzijnsxmlwh.supabase.co/auth/v1/';
const SUPABASE_REST = 'https://dsosckshigzijnsxmlwh.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
export const NEON_API = 'https://ep-dry-tree-b90vvy12.apirest.c-7.eu-central-1.aws.neon.tech/neondb/rest/v1/';
// Neon Functions ücretsiz kotası dolduğu için jeton Supabase Edge Function'dan gelir (aynı Neon Auth, aynı Data API).
export const NEON_TOKEN_URL = 'https://dsosckshigzijnsxmlwh.supabase.co/functions/v1/anon-token';
export const NEON_AUTH_URL = 'https://dsosckshigzijnsxmlwh.supabase.co/functions/v1/auth-proxy/';
export const NEON_DEFAULT_ON = false;
// ---- Mac mini (Postgres + PostgREST, Tailscale Funnel) ----
// Yalnızca HERKESE AÇIK OKUMALAR (anonim GET/HEAD + search_games/search_market/search_market_v2/title_bundle RPC'leri) buraya gider.
// Giriş yapmış kullanıcı çağrıları, yazmalar, admin RPC'leri, auth ve edge function'lar Supabase'te kalır.
// Tek bayrak: MACMINI_DEFAULT_ON. Geri almak için false yap (ya da bu dosyadaki bloğu sil). Test: ?macmini=1 / ?macmini=0.
export const MACMINI_API = 'https://arif-mac-mini.tail34cd8a.ts.net/rest/v1/';
// Mac mini PostgREST'in herkese açık, SALT-OKUNUR (role=anon) JWT'si; tarayıcıda görünmesi tasarım gereği. Yalnızca Authorization: Bearer gerekir.
// 'REPLACE_' ile başlayan bir değer konursa bayrak ne olursa olsun Mac mini KULLANILMAZ.
export const MACMINI_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6Im95dW5yYWRhci1tYWMiLCJpYXQiOjE3OTQ2MTkzMDAsImV4cCI6NDEwMjQ0NDgwMH0.xIfIiPU80KEPCPGeptc1KjKRMwxGlne7z3bebUzgOLA';
export const MACMINI_DEFAULT_ON = true;
const MACMINI_READ_RPC = new Set(['search_games', 'search_market', 'search_market_v2', 'search_suggestions', 'title_bundle'])
// Kullanıcıların Supabase'e yazdığı sosyal tablolar Mac mini'de bayat kalır; radar_follows ise Supabase'te özeldir (yalnızca sahibi okur) ama Mac anon rolüyle okunabiliyor. Hepsi Supabase'te kalır.
const MACMINI_SKIP_TABLE = /^radar_/;
const SUPABASE_FN = 'https://dsosckshigzijnsxmlwh.supabase.co/functions/v1/';
const fnHost = slug => `https://br-noisy-river-b98v9a79-${slug}.compute.c-7.eu-central-1.aws.neon.tech/`;
// Supabase Edge Function adı -> Neon Function adresi (herkese açık olanlar jeton istemez; Supabase anahtarı gönderilmez).
const NEON_FUNCTIONS = {
  'radar-services': { url: SUPABASE_FN + 'radar-services', user: false, supabase: true },
  'regional-prices': { url: SUPABASE_FN + 'regional-prices', user: false, supabase: true },
  'steam-account': { url: fnHost('steamaccount'), user: true },
  'admin-price-refresh': { url: SUPABASE_FN + 'admin-price-refresh', user: true, supabase: true },
};

export function neonEnabled() {
  try {
    if (typeof location !== 'undefined') {
      const q = new URLSearchParams(location.search).get('neon');
      if (q === '1' || q === '0') { localStorage.setItem('neon', q); }
    }
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('neon') : null;
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {}
  return NEON_DEFAULT_ON;
}

export function macminiEnabled() {
  if (!MACMINI_ANON_KEY || MACMINI_ANON_KEY.startsWith('REPLACE_')) return false;
  try {
    if (typeof location !== 'undefined') {
      const q = new URLSearchParams(location.search).get('macmini');
      if (q === '1' || q === '0') localStorage.setItem('macmini', q);
    }
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('macmini') : null;
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {}
  return MACMINI_DEFAULT_ON;
}

// Mac mini'ye gidebilir mi? Yalnızca anonim okuma. Kullanıcı jetonlu (Supabase oturumlu) çağrılar Supabase'te kalır.
function macminiEligible(url, init) {
  if (!url.startsWith(SUPABASE_REST)) return false;
  const auth = String(init?.headers?.Authorization || '');
  if (auth && auth !== 'Bearer ' + SUPABASE_KEY) return false;
  const method = (init?.method || 'GET').toUpperCase();
  const rest = url.slice(SUPABASE_REST.length);
  if (method === 'GET' || method === 'HEAD') return !rest.startsWith('rpc/') && !MACMINI_SKIP_TABLE.test(rest);
  const m = method === 'POST' && rest.match(/^rpc\/([a-z_0-9]+)(?:\?|$)/);
  return !!m && MACMINI_READ_RPC.has(m[1]);
}

async function macminiCall(realFetch, input, url, init) {
  const headers = { ...(init?.headers || {}), Authorization: 'Bearer ' + MACMINI_ANON_KEY };
  delete headers.apikey; // Supabase anahtarı Mac mini'ye gönderilmez
  try {
    const r = await realFetch(MACMINI_API + url.slice(SUPABASE_REST.length), { ...init, headers, credentials: 'omit' });
    if (r.status < 500 && r.status !== 401) return r;
  } catch (e) { if (init?.signal?.aborted) throw e; }
  return null; // Mac mini ulaşılamıyor / anahtar reddedildi: Supabase'e düş
}

let cache = { token: '', exp: 0 }, inflight = null;
async function anonToken(force) {
  if (!force && cache.token && cache.exp - Date.now() > 60000) return cache.token;
  inflight ??= fetch(NEON_TOKEN_URL, { credentials: 'omit', signal: AbortSignal.timeout(15000) })
    .then(async r => { if (!r.ok) throw new Error('token ' + r.status); const d = await r.json(); cache = { token: d.token, exp: d.expires_at }; return d.token; })
    .finally(() => { inflight = null; });
  return inflight;
}

function rewrite(url, init, token) {
  const headers = { ...(init?.headers || {}) };
  delete headers.apikey;
  headers.Authorization = 'Bearer ' + token;
  return [NEON_API + url.slice(SUPABASE_REST.length), { ...init, headers }];
}

// Supabase /auth/v1 çağrılarını authproxy Function'ına çevirir; yanıt Supabase şeklindedir.
async function authCall(realFetch, url, init) {
  const path = url.slice(SUPABASE_AUTH.length), [name, query = ''] = path.split('?');
  const q = new URLSearchParams(query), method = (init?.method || 'GET').toUpperCase();
  const body = init?.body ? JSON.parse(init.body) : {};
  let route, out = body;
  if (name === 'signup') { route = 'signup'; out = { email: body.email, password: body.password, name: body.data?.display_name }; }
  else if (name === 'token' && q.get('grant_type') === 'password') route = 'login';
  else if (name === 'token') route = 'refresh';
  else if (name === 'logout') route = 'logout';
  else if (name === 'recover') {
    // Sıfırlama bağlantısı siteye ?reset=1&token=… ile döner (consumeAuthRedirect bunu okur).
    let back = q.get('redirect_to') || '';
    try { const u = new URL(back || location.href); u.searchParams.set('reset', '1'); back = u.toString(); } catch {}
    route = 'recover'; out = { email: body.email, redirect_to: back };
  }
  else if (name === 'user' && method === 'PUT' && body.reset_token) { route = 'reset'; out = { token: body.reset_token, password: body.password }; }
  else if (name === 'user' && method === 'PUT') { route = 'password'; out = { password: body.password, refresh_token: body.refresh_token, current_password: body.current_password }; }
  else if (name === 'user') {
    // Oturumdaki kullanıcı JWT'den okunur (ağ çağrısı yok).
    try {
      const c = JSON.parse(atob(String(init?.headers?.Authorization || '').slice(7).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (c.exp * 1000 > Date.now()) return new Response(JSON.stringify({ id: c.sub, email: c.email, role: 'authenticated', user_metadata: { display_name: c.name, name: c.name } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch {}
    return new Response('{"msg":"invalid"}', { status: 401 });
  } else return new Response('{"msg":"unsupported"}', { status: 404 });
  return realFetch(NEON_AUTH_URL + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(out), credentials: 'omit', signal: init?.signal });
}

function functionCall(realFetch, url, init) {
  const rest = url.slice(SUPABASE_FN.length), m = rest.match(/^([^/?]+)(.*)$/), fn = NEON_FUNCTIONS[m?.[1]];
  if (!fn) return null;
  const headers = { ...(init?.headers || {}) };
  delete headers.apikey;
  if (!fn.user) delete headers.Authorization;
  if (fn.supabase && !fn.user) { headers.apikey = SUPABASE_KEY; headers.Authorization = 'Bearer ' + SUPABASE_KEY; }
  return realFetch(fn.url.replace(/\/$/, '') + m[2], { ...init, headers, credentials: 'omit' });
}

// Sıfırlama bağlantısı siteye ?reset=1&token=… ile döner. Yayındaki paketin kodu değişmeden, bu geçit kendi küçük formunu gösterir.
function resetOverlay(realFetch) {
  if (typeof document === 'undefined' || typeof location === 'undefined') return;
  const qs = new URLSearchParams(location.search);
  if (qs.get('reset') !== '1' || !(qs.get('token') || qs.get('error'))) return;
  const token = qs.get('token');
  ['reset', 'token', 'error'].forEach(k => qs.delete(k));
  const rest = qs.toString();
  try { history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch {}
  const show = () => {
    const box = document.createElement('div');
    box.setAttribute('role', 'dialog');
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(0,0,0,.6);padding:16px;font:16px system-ui,sans-serif';
    const card = document.createElement('form');
    card.style.cssText = 'background:#fff;color:#111;max-width:380px;width:100%;border-radius:14px;padding:22px;display:grid;gap:12px;box-shadow:0 10px 40px rgba(0,0,0,.4)';
    const h = document.createElement('strong'); h.textContent = 'Yeni parola'; h.style.fontSize = '20px';
    const msg = document.createElement('p'); msg.style.cssText = 'margin:0;font-size:14px;min-height:20px';
    const input = document.createElement('input'); input.type = 'password'; input.minLength = 10; input.required = true; input.autocomplete = 'new-password'; input.placeholder = 'En az 10 karakter';
    input.style.cssText = 'padding:12px;border:1px solid #bbb;border-radius:8px;font-size:16px';
    const btn = document.createElement('button'); btn.textContent = 'Parolayı güncelle';
    btn.style.cssText = 'padding:12px;border:0;border-radius:8px;background:#5b3df5;color:#fff;font-size:16px;cursor:pointer';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Kapat';
    close.style.cssText = 'padding:8px;border:0;background:transparent;color:#555;cursor:pointer'; close.onclick = () => box.remove();
    if (!token) { msg.textContent = 'Bağlantının süresi dolmuş ya da geçersiz. Yeni bir bağlantı iste.'; card.append(h, msg, close); }
    else {
      card.append(h, msg, input, btn, close);
      card.onsubmit = async ev => {
        ev.preventDefault(); btn.disabled = true; msg.textContent = '';
        try {
          const r = await realFetch(NEON_AUTH_URL + 'reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: input.value }), credentials: 'omit' });
          if (!r.ok) throw new Error('bad');
          card.replaceChildren(h, Object.assign(msg, { textContent: 'Parolan güncellendi. Şimdi yeni parolanla giriş yapabilirsin.' }), close);
        } catch { msg.textContent = 'Parola güncellenemedi. Bağlantı süresi dolmuş olabilir; yeni bir bağlantı iste.'; btn.disabled = false; }
      };
    }
    box.append(card); document.body.append(box);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
}

export function install(realFetch = globalThis.fetch) {
  if (!realFetch || realFetch.__neon) return;
  const wrapped = async (input, init) => {
    const url = typeof input === 'string' ? input : '';
    if (macminiEnabled() && macminiEligible(url, init)) { const r = await macminiCall(realFetch, input, url, init); if (r) return r; return realFetch(input, init); }
    if (url.startsWith(SUPABASE_AUTH) && neonEnabled()) return authCall(realFetch, url, init);
    if (url.startsWith(SUPABASE_FN) && neonEnabled()) { const r = functionCall(realFetch, url, init); if (r) return r; }
    if (!url.startsWith(SUPABASE_REST) || !neonEnabled()) return realFetch(input, init);
    const auth = String(init?.headers?.Authorization || '');
    // Geçişten önce Supabase'ten alınmış eski oturum jetonu Neon'da "JWK not found" verir; anonim jetona düşülür.
    let old = false;
    try { old = String(JSON.parse(atob(auth.slice(7).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).iss || '').includes('supabase'); } catch {}
    const anon = !auth || auth === 'Bearer ' + SUPABASE_KEY || old;
    const send = async force => {
      const token = anon ? await anonToken(force) : auth.slice(7);
      return realFetch(...rewrite(url, init, token));
    };
    const r = await send(false);
    if (r.status === 401 && anon) return send(true);
    if (r.status === 401 && !anon) { // kullanıcı jetonu reddedildi (bilinmeyen anahtar/süre): herkese açık okuma yine çalışsın
      const t = await anonToken(false);
      return realFetch(...rewrite(url, init, t));
    }
    return r;
  };
  wrapped.__neon = true;
  globalThis.fetch = wrapped;
  if (neonEnabled()) resetOverlay(realFetch);
}
install();
