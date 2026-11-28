// Erişilebilirlik ve yerelleştirme altyapısı (27 Kasım 2026).
//  1 Ana içeriğe atla bağlantısı, landmark etiketleri, odak halkası (access-20261127.css)
//  2 Adsız simge düğmelerine ve bağlantılarına ekran okuyucu etiketi (title, svg başlığı ya da simge adından)
//  3 Alt metni olmayan kapak görsellerine kart başlığından alt metin; süs görselleri alt=""
//  4 role=button öğelere klavye (Enter/Space) ve odak; sekme listelerinde ok tuşları
//  5 Açık iletişim kutusunda odağın dışarı kaçmasını engelleme
//  6 Çok dilli altyapı: window.radarI18n (register / t / lang) ve Intl tabanlı para, tarih, göreli zaman biçimleri
// Hepsi DOM üzerinden eklenir; React düğümleri silinmez, var olan etiketin üzerine yazılmaz.

// ---------------------------------------------------------------------------------------------
// Saf yardımcılar (tests/access.test.mjs)
// ---------------------------------------------------------------------------------------------
const ICON_LABELS = {
  heart: ['Favori', 'Favorite'], star: ['Yıldız', 'Star'], search: ['Ara', 'Search'], x: ['Kapat', 'Close'], close: ['Kapat', 'Close'],
  menu: ['Menü', 'Menu'], eye: ['Hızlı bakış', 'Quick look'], bell: ['Bildirim', 'Notification'], settings: ['Ayarlar', 'Settings'],
  share: ['Paylaş', 'Share'], trash: ['Sil', 'Delete'], plus: ['Ekle', 'Add'], minus: ['Çıkar', 'Remove'], check: ['Tamam', 'Done'],
  'chevron-left': ['Geri', 'Back'], 'chevron-right': ['İleri', 'Next'], 'arrow-left': ['Geri', 'Back'], 'arrow-right': ['İleri', 'Next'],
  'external-link': ['Yeni sekmede aç', 'Open in new tab'], filter: ['Filtrele', 'Filter'], user: ['Hesap', 'Account'], home: ['Ana sayfa', 'Home'],
  play: ['Oynat', 'Play'], pause: ['Durdur', 'Pause'], 'volume-2': ['Ses', 'Sound'], refresh: ['Yenile', 'Refresh'], 'rotate-cw': ['Yenile', 'Refresh'],
  download: ['İndir', 'Download'], copy: ['Kopyala', 'Copy'], info: ['Bilgi', 'Info'], moon: ['Koyu tema', 'Dark theme'], sun: ['Açık tema', 'Light theme'],
};

/** "lucide lucide-heart size-4" → "heart". Bilinmiyorsa null. */
export function iconName(className) {
  const m = /(?:^|\s)lucide-([a-z0-9-]+)/.exec(String(className || ''));
  if (!m) return null;
  const name = m[1].replace(/-icon$/, '');
  return name in ICON_LABELS ? name : null;
}

export function labelForIcon(className, lang = 'tr') {
  const n = iconName(className);
  return n ? ICON_LABELS[n][lang === 'en' ? 1 : 0] : null;
}

/** Öğenin erişilebilir adı yoksa true. node: {text, ariaLabel, ariaLabelledby, title, imgAlt} */
export function lacksName(node) {
  return !String(node.ariaLabel || '').trim() && !String(node.ariaLabelledby || '').trim() && !String(node.text || '').trim() && !String(node.title || '').trim() && !String(node.imgAlt || '').trim();
}

export function nextTabIndex(key, index, count) {
  if (!count) return -1;
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return -1;
}

const LOCALES = { tr: 'tr-TR', en: 'en-GB', de: 'de-DE', es: 'es-ES' };
export const supportedLangs = () => Object.keys(LOCALES);
export const localeOf = (lang) => LOCALES[lang] || LOCALES.tr;
export const normalizeLang = (v) => { const l = String(v || '').slice(0, 2).toLowerCase(); return l in LOCALES ? l : 'tr'; };

export function formatMoney(amount, currency = 'TRY', lang = 'tr') {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  try { return new Intl.NumberFormat(localeOf(lang), { style: 'currency', currency, maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n); } catch { return String(n); }
}

export function formatDate(value, lang = 'tr', opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(localeOf(lang), { timeZone: 'Europe/Istanbul', ...opts }).format(d);
}

/** "12 dakika önce" / "12 minutes ago". Gelecek için "… sonra". */
export function formatRelative(ms, lang = 'tr', now = Date.now()) {
  const diff = (Number(ms) - now) / 1000;
  if (!Number.isFinite(diff)) return '';
  const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 45) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

/** Sözlük kaydı: t('anahtar', {ad}) → dil → en → tr → anahtarın kendisi. */
export function createI18n(initial = {}) {
  const dicts = { tr: {}, en: {}, ...initial };
  let current = 'tr';
  const api = {
    register(lang, dict) { dicts[lang] = Object.assign(dicts[lang] || {}, dict); },
    setLang(l) { current = normalizeLang(l); return current; },
    lang: () => current,
    has: (key, lang = current) => key in (dicts[lang] || {}),
    t(key, vars = {}, lang = current) {
      const s = dicts[lang]?.[key] ?? dicts.en?.[key] ?? dicts.tr?.[key] ?? key;
      return String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
    },
  };
  return api;
}

// ---------------------------------------------------------------------------------------------
// Tarayıcı kısmı
// ---------------------------------------------------------------------------------------------
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const root = document.documentElement;
  const i18n = createI18n({
    tr: { 'a11y.skip': 'Ana içeriğe geç', 'a11y.nav': 'Ana gezinme', 'a11y.bottomNav': 'Alt gezinme', 'a11y.newTab': '(yeni sekmede açılır)' },
    en: { 'a11y.skip': 'Skip to main content', 'a11y.nav': 'Main navigation', 'a11y.bottomNav': 'Bottom navigation', 'a11y.newTab': '(opens in a new tab)' },
  });
  const detect = () => { try { return normalizeLang(root.lang || localStorage.getItem('radar-lang') || navigator.language); } catch { return 'tr'; } };
  i18n.setLang(detect());
  window.radarI18n = Object.assign(i18n, { formatMoney: (a, c) => formatMoney(a, c, i18n.lang()), formatDate: (v, o) => formatDate(v, i18n.lang(), o), formatRelative: (ms) => formatRelative(ms, i18n.lang()), supportedLangs });
  new MutationObserver(() => { i18n.setLang(detect()); window.dispatchEvent(new CustomEvent('radar:lang', { detail: i18n.lang() })); relabel(); }).observe(root, { attributes: true, attributeFilter: ['lang'] });

  const lang = () => i18n.lang();

  function ensureSkipLink() {
    const main = document.querySelector('main');
    if (!main) return;
    if (!main.id) main.id = 'main-content';
    main.setAttribute('tabindex', '-1');
    let a = document.querySelector('.a11y-skip');
    if (!a) {
      a = document.createElement('a');
      a.className = 'a11y-skip';
      a.addEventListener('click', (e) => { e.preventDefault(); main.focus({ preventScroll: false }); });
      document.body.prepend(a);
    }
    a.href = '#' + main.id;
    a.textContent = i18n.t('a11y.skip');
  }

  function labelControls(scope) {
    for (const n of scope.querySelectorAll('button:not([data-a11y]),a[href]:not([data-a11y]),[role=button]:not([data-a11y])')) {
      const svg = n.querySelector('svg');
      const img = n.querySelector('img[alt]');
      const probe = { text: n.textContent, ariaLabel: n.getAttribute('aria-label'), ariaLabelledby: n.getAttribute('aria-labelledby'), title: n.getAttribute('title'), imgAlt: img?.getAttribute('alt') };
      if (!lacksName(probe)) { n.setAttribute('data-a11y', 'ok'); continue; }
      const label = (svg && (svg.querySelector('title')?.textContent || labelForIcon(svg.getAttribute('class'), lang()))) || null;
      if (label) { n.setAttribute('aria-label', label); n.setAttribute('data-a11y', 'auto'); }
    }
    for (const a of scope.querySelectorAll('a[target=_blank]:not([data-a11y-nt])')) {
      a.setAttribute('data-a11y-nt', '1');
      if (!/noopener/.test(a.rel || '')) a.rel = ((a.rel || '') + ' noopener').trim();
      const name = a.getAttribute('aria-label');
      if (name && !name.includes(i18n.t('a11y.newTab'))) a.setAttribute('aria-label', name + ' ' + i18n.t('a11y.newTab'));
    }
    for (const img of scope.querySelectorAll('img:not([alt])')) {
      // Bağlantı/düğmenin kendi metni varsa görsel süstür; yalnız görselden oluşan bağlantıda kart başlığı kullanılır.
      const ctl = img.closest('a,button');
      const textual = ctl && ctl.textContent.trim().length > 0;
      const name = !textual ? img.closest('article,li,[class*=card],[class*=row]')?.querySelector('h1,h2,h3,h4,b,strong')?.textContent?.trim() : '';
      img.setAttribute('alt', name || '');
    }
    for (const n of scope.querySelectorAll('[role=button]:not([tabindex]),[role=tab]:not([tabindex]):not(button)')) n.setAttribute('tabindex', '0');
    for (const nav of scope.querySelectorAll('nav:not([aria-label])')) nav.setAttribute('aria-label', nav.classList.contains('bottom-nav') ? i18n.t('a11y.bottomNav') : i18n.t('a11y.nav'));
    for (const d of scope.querySelectorAll('[role=dialog]:not([aria-modal])')) d.setAttribute('aria-modal', 'true');
  }

  function relabel() {
    document.querySelectorAll('[data-a11y=auto]').forEach((n) => n.removeAttribute('data-a11y'));
    ensureSkipLink(); labelControls(document);
  }

  document.addEventListener('keydown', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches('[role=button]:not(button):not(a)')) { e.preventDefault(); t.click(); return; }
    const tab = t.closest('[role=tab]');
    if (tab && /^(Arrow(Left|Right|Up|Down)|Home|End)$/.test(e.key)) {
      const tabs = [...tab.closest('[role=tablist]')?.querySelectorAll('[role=tab]:not([disabled])') || []];
      const i = nextTabIndex(e.key, tabs.indexOf(tab), tabs.length);
      if (i >= 0 && tabs[i] !== tab) { e.preventDefault(); tabs[i].focus(); tabs[i].click(); }
    }
  });

  // Açık modal iletişim kutusunun dışına odak kaçarsa içeri al.
  document.addEventListener('focusin', (e) => {
    const modals = document.querySelectorAll('[role=dialog][aria-modal=true]');
    const top = modals[modals.length - 1];
    if (!top || !(e.target instanceof Node) || top.contains(e.target) || e.target.closest?.('.a11y-skip')) return;
    const f = top.querySelector('button:not([disabled]),input:not([disabled]),select,textarea,a[href],[tabindex="0"]');
    f?.focus();
  });

  // <time datetime> ve [data-money] öğelerini seçili dile göre yazar.
  function localizeData(scope) {
    for (const t of scope.querySelectorAll('time[datetime]:not([data-raw])')) {
      const v = formatDate(t.getAttribute('datetime'), lang());
      if (v) t.textContent = v;
    }
    for (const m of scope.querySelectorAll('[data-money]')) {
      const v = formatMoney(m.getAttribute('data-money'), m.getAttribute('data-currency') || 'TRY', lang());
      if (v) m.textContent = v;
    }
  }

  let pending = 0;
  const run = () => { pending = 0; ensureSkipLink(); labelControls(document); localizeData(document); };
  new MutationObserver(() => { if (!pending) pending = requestAnimationFrame(run); }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('radar:lang', run);
  run();
}
