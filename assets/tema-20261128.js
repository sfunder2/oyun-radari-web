// Renk ve tema katmanı (28 Kasım 2026). tema-20261128.css ile birlikte.
//  1 Vurgu rengi seçici (6 renk; hepsi koyu ve açık zeminde WCAG AA metin kontrastını geçer), seçim cihazda saklanır
//  2 Otomatik gün/gece: sistem koyuysa Klasik, açıksa Sade (isteğe bağlı; elle tema değişince kapanır)
//  3 Oyun ayrıntısında kapaktan/oyun adından türeyen vurgu (--cd-accent), kartlardaki hesapla aynı
// Paketin React koduna dokunmaz; tema geçişi design-system-20261122.js'in kullandığı radar:ui-set olayıyla yapılır.
import { contrast, onColor } from './ui-kit-20261128.js';
import { hueAccent } from './cards-20261122.js';

const KEY = 'radar-tema';
// Her vurgu için koyu (Klasik/OLED) ve açık (Sade) zeminde kullanılan renk. Testte AA (>=4.5) doğrulanır.
export const ACCENTS = {
  lime: { name: ['Limon', 'Lime'], dark: '#c4f35a', light: '#6b30c5' },
  sky: { name: ['Gök', 'Sky'], dark: '#7cc7ff', light: '#0b66b8' },
  violet: { name: ['Mor', 'Violet'], dark: '#b9a1ff', light: '#5b2fb8' },
  amber: { name: ['Kehribar', 'Amber'], dark: '#ffc15a', light: '#8f4f00' },
  rose: { name: ['Gül', 'Rose'], dark: '#ff8fa8', light: '#b4234f' },
  teal: { name: ['Turkuaz', 'Teal'], dark: '#5eead4', light: '#0f766e' },
};
export const BG = { dark: '#090d12', oled: '#000000', light: '#f8f6ff' };
export const accentFor = (key, mode) => (ACCENTS[key] || ACCENTS.lime)[mode === 'light' ? 'light' : 'dark'];
// Sistem tercihi → arayüz: koyu = klasik, açık = sade
export const uiForScheme = (dark) => (dark ? 'klasik' : 'sade');

const root = typeof document !== 'undefined' ? document.documentElement : null;
const en = () => root.lang === 'en';
const T = (tr, e) => (en() ? e : tr);
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const write = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };
let prefs = {};

function applyAccent() {
  const key = prefs.accent && ACCENTS[prefs.accent] && prefs.accent !== 'lime' ? prefs.accent : null;
  const props = ['--lime', '--accent', '--limebg', '--ds-accent', '--ds-on-accent'];
  if (!key) { props.forEach((p) => root.style.removeProperty(p)); root.removeAttribute('data-accent'); return; }
  const c = accentFor(key, root.dataset.ui === 'sade' ? 'light' : 'dark');
  root.style.setProperty('--lime', c);
  root.style.setProperty('--accent', c);
  root.style.setProperty('--ds-accent', c);
  root.style.setProperty('--ds-on-accent', onColor(c));
  root.style.setProperty('--limebg', `color-mix(in srgb, ${c} 14%, transparent)`);
  root.dataset.accent = key;
}

const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
function applyAuto() {
  if (!prefs.auto) return;
  const want = uiForScheme(systemDark());
  if (root.dataset.ui !== want) window.dispatchEvent(new CustomEvent('radar:ui-set', { detail: want }));
}

const palette = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a10 10 0 110-20c5.5 0 10 3.6 10 8 0 3-2.5 4-5 4h-2a2 2 0 00-1.5 3.3c.8 1 .3 4.7-1.5 4.7z"/><path d="M7.5 11h.01M10 7h.01M15 7h.01"/></svg>';
let btn, slot, open = false;
const el = (tag, attrs = {}, html = '') => { const n = document.createElement(tag); for (const k in attrs) n.setAttribute(k, attrs[k]); n.setAttribute('translate', 'no'); if (html) n.innerHTML = html; return n; };

function paint() {
  if (!btn || !btn.isConnected) return;
  btn.setAttribute('aria-label', T('Vurgu rengi ve otomatik tema', 'Accent colour and auto theme'));
  btn.setAttribute('aria-expanded', String(open));
  slot.textContent = '';
  if (!open) return;
  const pop = el('div', { class: 'ds-pop tm-pop', role: 'group', 'aria-label': T('Renk', 'Colour') });
  pop.append(el('h4', {}, T('Vurgu rengi', 'Accent colour')));
  const row = el('div', { class: 'tm-swatches' });
  const mode = root.dataset.ui === 'sade' ? 'light' : 'dark';
  for (const k of Object.keys(ACCENTS)) {
    const on = (prefs.accent || 'lime') === k;
    const s = el('button', { type: 'button', class: 'tm-sw', 'aria-pressed': String(on), 'aria-label': ACCENTS[k].name[en() ? 1 : 0], title: ACCENTS[k].name[en() ? 1 : 0], style: `--sw:${accentFor(k, mode)}` });
    s.addEventListener('click', () => { prefs.accent = k; write(prefs); applyAccent(); paint(); });
    row.append(s);
  }
  pop.append(row);
  const auto = el('button', { type: 'button', 'aria-pressed': String(!!prefs.auto) }, `<span>${T('Otomatik gün/gece', 'Auto day/night')}</span><i>${prefs.auto ? T('Açık', 'On') : T('Kapalı', 'Off')}</i>`);
  auto.addEventListener('click', () => { prefs.auto = !prefs.auto; write(prefs); applyAuto(); paint(); });
  pop.append(auto);
  slot.append(pop);
}
function ensure() {
  const bar = document.querySelector('.ds-foot');
  if (!bar || bar.querySelector('[data-tema]')) return;
  const anchor = el('span', { class: 'ds-anchor', 'data-tema': '1' });
  btn = el('button', { type: 'button', class: 'ds-btn tm-btn', 'aria-haspopup': 'true' }, palette);
  btn.addEventListener('click', () => { open = !open; paint(); });
  slot = el('div', { class: 'ds-pop-slot' });
  anchor.append(btn, slot);
  bar.insertBefore(anchor, bar.querySelector('.ds-theme') || bar.firstChild);
  document.addEventListener('click', (e) => { if (open && !e.composedPath().includes(anchor)) { open = false; paint(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { open = false; paint(); btn.focus(); } });
  paint();
}

// Oyun ayrıntısı: kapak rengi yoksa oyun adından kararlı bir ton (kartlarla aynı hesap)
function tintDetail() {
  const m = document.querySelector('.modal.game-detail');
  if (!m || m.dataset.tmTint) return;
  const title = (m.querySelector('h1,h2')?.textContent || '').trim();
  if (!title) return;
  m.dataset.tmTint = '1';
  m.style.setProperty('--cd-accent', hueAccent(title));
}

if (root) {
  prefs = read();
  applyAccent();
  applyAuto();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyAuto);
  addEventListener('radar:ui', () => { applyAccent(); paint(); });
  new MutationObserver(() => { applyAccent(); paint(); }).observe(root, { attributes: true, attributeFilter: ['data-ui'] });
  new MutationObserver(() => { ensure(); tintDetail(); }).observe(document.body, { childList: true, subtree: true });
  ensure();
}
