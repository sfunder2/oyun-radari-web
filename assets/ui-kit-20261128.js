// Ortak arayüz takımı (28 Kasım 2026). ui-kit-20261128.css ile birlikte.
//  - Tek SVG ikon seti: radarUI.icon("heart", {fill, size})
//  - Ortak toast / modal / sheet: radarUI.toast / radarUI.modal / radarUI.sheet (odak tuzağı, Esc, odağı geri verme, sürükleyerek kapatma)
//  - İki yazı tipi hiyerarşisi: başlık ve sayılar Space Grotesk, gövde Manrope (yüklenemezse sistem yazısına düşer)
// Paketin React koduna dokunmaz. Hareket azaltılmışsa süreler CSS jetonlarıyla sıfırlanır. Metinler TR/EN.
// Diğer modüller: window.radarUI ya da import { icon, toast, modal, sheet } from "./ui-kit-20261128.js".

// ---- Saf yardımcılar (Node'da sınanır) ----
export const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>',
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  warn: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "arrow-left": '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  "chevron-down": '<path d="M6 9l6 6 6-6"/>',
  "chevron-right": '<path d="M9 6l6 6-6 6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><path d="M7.5 7.5h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  "trend-down": '<path d="M22 17l-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  "trend-up": '<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  wallet: '<path d="M20 7H5a2 2 0 010-4h13v4"/><path d="M3 5v14a2 2 0 002 2h15V7"/><path d="M16 14h.01"/>',
  gift: '<path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7"/><path d="M12 7H8a2.5 2.5 0 010-5c2 0 4 2 4 5zM12 7h4a2.5 2.5 0 000-5c-2 0-4 2-4 5z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
  palette: '<path d="M12 22a10 10 0 110-20c5.5 0 10 3.6 10 8 0 3-2.5 4-5 4h-2a2 2 0 00-1.5 3.3c.8 1 .3 4.7-1.5 4.7z"/><path d="M7.5 11h.01M10 7h.01M15 7h.01"/>',
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0"/><path d="M5 12v8h14v-8"/>',
  gamepad: '<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 00-3.9 3.2L1.6 15a3 3 0 005 2.4L8 16h8l1.4 1.4a3 3 0 005-2.4l-1.2-6.8A4 4 0 0017.3 5z"/>',
  flame: '<path d="M12 2s5 4 5 9a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-5 1-8z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  wifi_off: '<path d="M2 8.8a15 15 0 014-2.6M22 8.8a15 15 0 00-9.5-3.6M5 12.9a10 10 0 015-2.7M19 12.9a10 10 0 00-2.2-1.6M8.5 16.4a5 5 0 017 0M12 20h.01M2 2l20 20"/>',
};
export const iconSvg = (name, { fill = false, size = 0, cls = "" } = {}) => {
  const body = ICONS[name] || ICONS.info;
  const sz = size ? ` style="width:${size}px;height:${size}px"` : "";
  return `<svg class="ui-ico${fill ? " fill" : ""}${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"${sz}>${body}</svg>`;
};
const TOAST_ICON = { good: "check", warn: "warn", bad: "error", info: "info", accent: "star" };
export const toastIcon = (kind) => TOAST_ICON[kind] || "info";

// WCAG 2.1 kontrast oranı (#rgb / #rrggbb)
export const parseHex = (h) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h).trim());
  if (!m) return null;
  const s = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
export const luminance = (hex) => {
  const c = parseHex(hex);
  if (!c) return 0;
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Vurgu zemininde okunur yazı rengi: AA'yı geçen koyu ya da beyaz
export const onColor = (hex) => (contrast(hex, "#0b1118") >= contrast(hex, "#ffffff") ? "#0b1118" : "#ffffff");

// ---- DOM ----
const root = typeof document !== "undefined" ? document.documentElement : { lang: "tr", dataset: {} };
const en = () => root.lang === "en";
const T = (tr, e) => (en() ? e : tr);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.reduceMotion === "true";
const h = (tag, attrs = {}, html = "") => {
  const n = document.createElement(tag);
  for (const k in attrs) if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
  if (html) n.innerHTML = html;
  return n;
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toNode = (c) => (c instanceof Node ? c : h("div", {}, typeof c === "string" ? c : ""));
export const icon = iconSvg;

let live;
function toastHost() {
  if (live && live.isConnected) return live;
  live = h("div", { class: "ui-toasts", role: "status", "aria-live": "polite", "aria-atomic": "false", translate: "no" });
  document.body.appendChild(live);
  return live;
}
// kind: good | warn | bad | info | accent. opts: { title, action:{label,onClick}, duration (ms, 0 = kalıcı) }
export function toast(message, kind = "info", opts = {}) {
  const host = toastHost();
  while (host.children.length >= 3) host.firstChild.remove();
  const box = h("div", { class: "ui-toast " + (kind === "accent" ? "" : kind) });
  const body = h("div");
  if (opts.title) body.appendChild(h("b", {}, esc(opts.title)));
  body.appendChild(document.createTextNode(String(message ?? "")));
  box.append(h("span", {}, iconSvg(toastIcon(kind))), body);
  const tail = h("span", { style: "display:flex;align-items:center" });
  if (opts.action) {
    const a = h("button", { type: "button", class: "ui-toast-act" }, esc(opts.action.label));
    a.addEventListener("click", () => { try { opts.action.onClick && opts.action.onClick(); } finally { close(); } });
    tail.appendChild(a);
  }
  const x = h("button", { type: "button", class: "ui-toast-x", "aria-label": T("Kapat", "Close") }, iconSvg("close"));
  x.addEventListener("click", () => close());
  tail.appendChild(x);
  box.appendChild(tail);
  host.appendChild(box);
  let timer;
  function close() {
    clearTimeout(timer);
    if (!box.isConnected) return;
    if (reduced()) return box.remove();
    box.classList.add("out");
    setTimeout(() => box.remove(), 220);
  }
  const ms = opts.duration ?? (opts.action ? 7000 : 4200);
  if (ms > 0) timer = setTimeout(close, ms);
  return { close };
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let openCount = 0;
function layer(kind, opts = {}) {
  const prev = document.activeElement;
  const scrim = h("div", { class: "ui-scrim" + (kind === "sheet" ? " sheet" : ""), translate: "no" });
  const dlg = h("div", { class: "ui-dialog", role: opts.role || "dialog", "aria-modal": "true", tabindex: "-1" });
  const titleId = "ui-t-" + Math.random().toString(36).slice(2, 7);
  if (kind === "sheet") dlg.appendChild(h("div", { class: "ui-grab", "aria-hidden": "true" }));
  if (opts.title) {
    dlg.setAttribute("aria-labelledby", titleId);
    const head = h("div", { class: "ui-head" });
    head.appendChild(h("h2", { id: titleId }, esc(opts.title)));
    const x = h("button", { type: "button", class: "ui-x", "aria-label": T("Kapat", "Close") }, iconSvg("close"));
    x.addEventListener("click", () => finish(undefined));
    head.appendChild(x);
    dlg.appendChild(head);
  } else if (opts.label) dlg.setAttribute("aria-label", opts.label);
  const body = h("div", { class: "ui-body" });
  if (opts.content != null) body.appendChild(opts.html ? toNode(opts.content) : (opts.content instanceof Node ? opts.content : h("p", {}, esc(opts.content))));
  dlg.appendChild(body);
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  let closed = false;
  function finish(value) {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey, true);
    const end = () => {
      scrim.remove();
      if (--openCount <= 0) { openCount = 0; document.body.classList.remove("ui-locked"); }
      try { prev && prev.focus && prev.focus(); } catch {}
      resolve(value);
    };
    if (reduced()) return end();
    scrim.classList.add("out");
    setTimeout(end, 220);
  }
  if (opts.actions && opts.actions.length) {
    const foot = h("div", { class: "ui-foot" });
    for (const a of opts.actions) {
      const b = h("button", { type: "button", class: "ui-btn " + (a.kind || "") }, esc(a.label));
      b.addEventListener("click", () => finish(a.value !== undefined ? a.value : a.label));
      foot.appendChild(b);
    }
    dlg.appendChild(foot);
  }
  function onKey(e) {
    if (e.key === "Escape" && opts.dismissible !== false) { e.stopPropagation(); finish(undefined); }
    else if (e.key === "Tab") {
      const f = [...dlg.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!f.length) { e.preventDefault(); dlg.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dlg)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener("keydown", onKey, true);
  scrim.addEventListener("pointerdown", (e) => { if (e.target === scrim && opts.dismissible !== false) finish(undefined); });
  if (kind === "sheet") dragToClose(dlg, scrim, () => finish(undefined));
  scrim.appendChild(dlg);
  document.body.appendChild(scrim);
  openCount++;
  document.body.classList.add("ui-locked");
  const autofocus = dlg.querySelector("[autofocus]") || dlg.querySelector(".ui-btn.primary") || dlg.querySelector(FOCUSABLE) || dlg;
  setTimeout(() => autofocus.focus({ preventScroll: true }), 30);
  return { el: dlg, body, close: finish, done };
}
// Tutamaktan aşağı sürükleyince kapanır (eşik: yüksekliğin %30'u ya da hızlı çekiş)
function dragToClose(dlg, scrim, close) {
  const grab = dlg.querySelector(".ui-grab");
  if (!grab) return;
  let y0 = null, dy = 0, t0 = 0;
  grab.addEventListener("pointerdown", (e) => { y0 = e.clientY; t0 = performance.now(); dy = 0; grab.setPointerCapture(e.pointerId); dlg.style.animation = "none"; dlg.style.transition = "none"; });
  grab.addEventListener("pointermove", (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); dlg.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (y0 == null) return;
    const fast = dy / Math.max(1, performance.now() - t0) > 0.6;
    y0 = null;
    if (dy > dlg.offsetHeight * 0.3 || (fast && dy > 24)) return close();
    dlg.style.transition = "transform var(--ui-dur-2) var(--ui-ease)"; dlg.style.transform = "";
  };
  grab.addEventListener("pointerup", end);
  grab.addEventListener("pointercancel", end);
}
// modal({ title, content, html, actions:[{label, value, kind:'primary'|'danger'|'ghost'}] }) -> { el, body, close, done:Promise }
export const modal = (opts) => layer("modal", opts);
export const sheet = (opts) => layer("sheet", opts);
// confirm: Promise<boolean>
export const confirmDialog = ({ title, message, ok = T("Tamam", "OK"), cancel = T("Vazgeç", "Cancel"), danger = false }) =>
  modal({ title, content: message, role: "alertdialog", actions: [{ label: cancel, value: false, kind: "ghost" }, { label: ok, value: true, kind: danger ? "danger" : "primary" }] }).done.then((v) => v === true);

// Space Grotesk: yalnız başlık ve sayılar için, görüntü değiştirme (swap) ile; yüklenemezse sistem yazısı kalır
function loadFont() {
  if (document.querySelector("link[data-ui-font]")) return;
  const l = h("link", { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap", "data-ui-font": "1" });
  document.head.appendChild(l);
}

const api = { icon: iconSvg, ICONS, toast, modal, sheet, confirm: confirmDialog, contrast, onColor };
if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.radarUI = Object.assign(window.radarUI || {}, api);
  loadFont();
  window.dispatchEvent(new CustomEvent("radar:ui-kit"));
}
