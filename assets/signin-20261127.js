// Tek dokunuşla giriş (27 Kasım 2026): Google, Apple ve parolasız e-posta bağlantısı.
// Mevcut giriş penceresine (.auth-panel) DOM üzerinden eklenir; parola girişi aynen kalır.
// - Google/Apple: Supabase /auth/v1/authorize yönlendirmesi. Düğmeler yalnız RADAR_CONFIG.googleLogin / appleLogin true ise görünür
//   (önce Supabase panelinde sağlayıcı açılmalı; adımlar PR açıklamasında).
// - E-posta bağlantısı: /auth/v1/otp. Bağlantı #access_token ile döner; uygulamanın mevcut karşılayıcısı oturumu açar.
// - Bu yolla gelen yeni hesaplarda radar_profiles satırı yoksa bir kez oluşturulur (parolayla kayıtta uygulama kendisi yapar).
const SUPABASE = 'https://dsosckshigzijnsxmlwh.supabase.co';
const ANON = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
const AUTH_KEY = 'radar-auth';
const COOLDOWN_MS = 60000;

export const TEXT = {
  tr: {
    or: 'ya da', google: 'Google ile devam et', apple: 'Apple ile devam et', magic: 'Giriş bağlantısı gönder (parolasız)',
    needEmail: 'Önce yukarıdaki e-posta alanını doldur.', sent: 'Giriş bağlantısını e-postana gönderdik. Bağlantıya dokununca otomatik giriş yaparsın.',
    wait: 'Yeni bağlantı için {s} sn bekle.', failed: 'Bağlantı gönderilemedi: ', hint: 'Parolasız giriş: e-postana tek kullanımlık bağlantı gelir.',
  },
  en: {
    or: 'or', google: 'Continue with Google', apple: 'Continue with Apple', magic: 'Email me a sign-in link (no password)',
    needEmail: 'Fill in the email field above first.', sent: 'We sent a sign-in link to your email. Tap it to sign in automatically.',
    wait: 'Wait {s}s for a new link.', failed: 'Could not send the link: ', hint: 'Passwordless: a one-time link arrives in your inbox.',
  },
};

// ---------------------------------------------------------------------------------------------
// Saf yardımcılar (tests/signin.test.mjs)
// ---------------------------------------------------------------------------------------------
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

/** Yalnız https ve bu sitenin adresi kabul edilir; sorgu ve hash atılır. */
export function redirectTarget(loc) {
  return loc.origin + loc.pathname;
}

export function oauthUrl(provider, redirect, base = SUPABASE) {
  if (provider !== 'google' && provider !== 'apple') return null;
  return `${base}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirect)}`;
}

export function otpRequest(email, redirect, base = SUPABASE) {
  return { url: `${base}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, body: JSON.stringify({ email: String(email).trim(), create_user: true }) };
}

/** Görünen adı e-postadan/üst veriden türetir: 2–30 karakter, harf-rakam ve . _ - boşluk. */
export function handleFor(user) {
  const meta = user?.user_metadata || {};
  const raw = meta.display_name || meta.full_name || meta.name || String(user?.email || '').split('@')[0] || '';
  const h = String(raw).replace(/[^\p{L}\p{N}._ -]/gu, '').trim().slice(0, 30);
  return h.length >= 2 ? h : 'oyuncu' + String(user?.id || '').replace(/-/g, '').slice(0, 6);
}

export const cooldownLeft = (last, now = Date.now()) => Math.max(0, Math.ceil((last + COOLDOWN_MS - now) / 1000));

// ---------------------------------------------------------------------------------------------
// Tarayıcı kısmı
// ---------------------------------------------------------------------------------------------
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const root = document.documentElement;
  const tx = () => TEXT[root.lang === 'en' ? 'en' : 'tr'];
  const cfg = () => window.RADAR_CONFIG || {};
  let lastSent = 0;

  const btn = (cls, label, onclick) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'social-btn ' + cls; b.textContent = label; b.addEventListener('click', onclick); return b; };

  function build(panel) {
    const t = tx(), c = cfg();
    const wrap = document.createElement('div');
    wrap.className = 'social-auth';
    wrap.setAttribute('data-lang', root.lang);
    const msg = document.createElement('p');
    msg.className = 'auth-message social-msg'; msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
    const redirect = redirectTarget(location);
    if (c.googleLogin) wrap.append(btn('google', t.google, () => { window.radarTrack?.('login_start', { method: 'google' }); location.assign(oauthUrl('google', redirect)); }));
    if (c.appleLogin) wrap.append(btn('apple', t.apple, () => { window.radarTrack?.('login_start', { method: 'apple' }); location.assign(oauthUrl('apple', redirect)); }));
    if (c.magicLink !== false) {
      const m = btn('magic', t.magic, async () => {
        const email = panel.querySelector('form input[type=email]')?.value || '';
        if (!isEmail(email)) { msg.textContent = t.needEmail; msg.classList.add('error'); panel.querySelector('form input[type=email]')?.focus(); return; }
        const left = cooldownLeft(lastSent);
        if (left) { msg.textContent = t.wait.replace('{s}', left); msg.classList.add('error'); return; }
        m.disabled = true; msg.classList.remove('error');
        try {
          const r = otpRequest(email, redirect);
          const res = await fetch(r.url, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: r.body, signal: AbortSignal.timeout(20000) });
          if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.msg || j.error_description || 'HTTP ' + res.status); }
          lastSent = Date.now(); msg.textContent = t.sent; window.radarTrack?.('login_start', { method: 'magic_link' });
        } catch (e) { msg.textContent = t.failed + (e.message || ''); msg.classList.add('error'); } finally { m.disabled = false; }
      });
      wrap.append(m);
    }
    if (!wrap.children.length) return null;
    const sep = document.createElement('p'); sep.className = 'social-sep'; sep.textContent = '— ' + t.or + ' —';
    wrap.append(msg); wrap.append(sep);
    return wrap;
  }

  function inject() {
    for (const panel of document.querySelectorAll('.auth-panel')) {
      const form = panel.querySelector('form');
      const eyebrow = panel.querySelector('.eyebrow')?.textContent || '';
      const isEntry = !!form && /HESABINA|ARAMIZA|SIGN|JOIN|LOG/i.test(eyebrow) && !!form.querySelector('input[type=email]');
      const existing = panel.querySelector(':scope > .social-auth');
      if (!isEntry) { existing?.remove(); continue; }
      if (existing && existing.getAttribute('data-lang') === root.lang) continue;
      existing?.remove();
      const w = build(panel);
      if (w) form.before(w);
    }
  }

  // OAuth / e-posta bağlantısıyla gelen oturumda profil satırı yoksa bir kez oluştur.
  async function ensureProfile() {
    let s;
    try { s = JSON.parse(localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY) || 'null'); } catch { s = null; }
    if (!s?.access_token || !s.user?.id) return;
    const flag = 'radar-profile-ok-' + s.user.id;
    try { if (localStorage.getItem(flag)) return; } catch { return; }
    try {
      const res = await fetch(SUPABASE + '/rest/v1/radar_profiles?on_conflict=user_id', {
        method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: s.user.id, handle: handleFor(s.user) }), signal: AbortSignal.timeout(15000),
      });
      if (res.ok) localStorage.setItem(flag, '1');
    } catch { /* sonraki açılışta yeniden denenir */ }
  }

  let pending = 0;
  new MutationObserver(() => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; inject(); }); }).observe(document.body, { childList: true, subtree: true });
  inject();
  setTimeout(ensureProfile, 4000);
  window.addEventListener('focus', () => setTimeout(ensureProfile, 1500));
}
