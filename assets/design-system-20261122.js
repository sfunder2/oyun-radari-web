/* Tasarım sistemi denetimleri: tema (Klasik / Gerçek siyah / Sade), yüksek kontrast, büyük yazı ve tek satır altbilgi.
   Bağımlılığı yoktur; React'in çizdiği altbilgiye gözlemciyle bağlanır. */
const KEY = "radar-ds";
const root = document.documentElement;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.reduceMotion === "true";
const en = () => root.lang === "en";
const T = {
  tr: { lang: "Dil", theme: "Tema", a11y: "Erişilebilirlik", contrast: "Yüksek kontrast", large: "Büyük yazı", on: "Açık", off: "Kapalı", dark: "Klasik koyu", oled: "Gerçek siyah", light: "Sade açık", group: "Görünüm" },
  en: { lang: "Language", theme: "Theme", a11y: "Accessibility", contrast: "High contrast", large: "Large text", on: "On", off: "Off", dark: "Classic dark", oled: "True black", light: "Simple light", group: "Appearance" },
};
const t = (k) => T[en() ? "en" : "tr"][k];

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; } };
const write = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };
const prefs = read();

function applyA11y() {
  prefs.contrast ? (root.dataset.contrast = "high") : delete root.dataset.contrast;
  prefs.large ? (root.dataset.text = "large") : delete root.dataset.text;
}
export function currentTheme() {
  if (root.dataset.ui === "sade") return "light";
  return root.dataset.theme === "oled" ? "oled" : "dark";
}
function syncMeta() {
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", { light: "#f6f3ff", oled: "#000000", dark: "#090d12" }[currentTheme()]);
}
function fade() {
  if (reduced()) return;
  root.classList.add("ds-fading");
  clearTimeout(fade.t);
  fade.t = setTimeout(() => root.classList.remove("ds-fading"), 420);
}
export function setTheme(next) {
  fade();
  if (next === "light") {
    window.dispatchEvent(new CustomEvent("radar:ui-set", { detail: "sade" }));
  } else {
    if (root.dataset.ui === "sade") window.dispatchEvent(new CustomEvent("radar:ui-set", { detail: "klasik" }));
    try { next === "oled" ? localStorage.setItem("radar-theme", "oled") : localStorage.removeItem("radar-theme"); } catch {}
    next === "oled" ? (root.dataset.theme = "oled") : delete root.dataset.theme;
  }
  setTimeout(syncMeta, 30);
  paint();
}
const order = ["dark", "oled", "light"];
const icons = {
  dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  oled: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9"/></svg>',
  light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
};
const aa = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 8.5 5 14 18M5 14h7M15 18l3-7 3 7M16 16h4"/></svg>';
const globe = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';

let bar, themeBtn, popWrap, popOpen = false, lastTheme = "";
function el(tag, attrs = {}, html = "") {
  const n = document.createElement(tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  n.setAttribute("translate", "no");
  if (html) n.innerHTML = html;
  return n;
}
function build(footer) {
  bar = el("div", { class: "ds-foot", "data-ds": "1" });
  const lang = el("button", { type: "button", class: "ds-btn ds-lang" });
  lang.addEventListener("click", () => {
    const btn = document.querySelector(".lang-toggle");
    if (btn) return btn.click();
    try { localStorage.setItem("radar-lang", en() ? "tr" : "en"); } catch {}
    location.reload();
  });
  themeBtn = el("button", { type: "button", class: "ds-btn ds-theme" });
  themeBtn.addEventListener("click", () => {
    const cur = currentTheme();
    // Sade açıkken OLED atlanır; döngü: Klasik, Gerçek siyah, Sade.
    setTheme(order[(order.indexOf(cur) + 1) % order.length]);
    themeBtn.classList.remove("ds-spin"); void themeBtn.offsetWidth; themeBtn.classList.add("ds-spin");
  });
  const anchor = el("span", { class: "ds-anchor" });
  const a11y = el("button", { type: "button", class: "ds-btn ds-a11y", "aria-haspopup": "true", "aria-expanded": "false" });
  a11y.addEventListener("click", () => { popOpen = !popOpen; paint(); });
  popWrap = el("div", { class: "ds-pop-slot" });
  anchor.append(a11y, popWrap);
  bar.append(lang, themeBtn, anchor);
  footer.appendChild(bar);
  document.addEventListener("click", (e) => { if (popOpen && !e.composedPath().includes(anchor)) { popOpen = false; paint(); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && popOpen) { popOpen = false; paint(); a11y.focus(); } });
}
function paint() {
  if (!bar || !bar.isConnected) return;
  const cur = currentTheme();
  const lang = bar.querySelector(".ds-lang");
  lang.innerHTML = globe + "<span>" + (en() ? "EN" : "TR") + "</span>";
  lang.setAttribute("aria-label", t("lang"));
  const label = { dark: t("dark"), oled: t("oled"), light: t("light") }[cur];
  if (lastTheme !== cur) { themeBtn.innerHTML = icons[cur]; lastTheme = cur; }
  themeBtn.setAttribute("aria-label", t("theme") + ": " + label);
  themeBtn.title = t("theme") + ": " + label;
  const a11y = bar.querySelector(".ds-a11y");
  a11y.innerHTML = aa;
  a11y.setAttribute("aria-label", t("a11y"));
  a11y.setAttribute("aria-expanded", String(popOpen));
  popWrap.textContent = "";
  if (!popOpen) return;
  const pop = el("div", { class: "ds-pop", role: "group", "aria-label": t("a11y") });
  pop.append(el("h4", {}, t("a11y")));
  for (const [k, lab] of [["contrast", t("contrast")], ["large", t("large")]]) {
    const b = el("button", { type: "button", "aria-pressed": String(!!prefs[k]) }, "<span>" + lab + "</span><i>" + (prefs[k] ? t("on") : t("off")) + "</i>");
    b.addEventListener("click", () => { prefs[k] = !prefs[k]; write(prefs); applyA11y(); paint(); });
    pop.append(b);
  }
  popWrap.append(pop);
}
function ensure() {
  const footer = document.querySelector("footer");
  if (!footer) return;
  if (footer.querySelector("[data-ds]")) return;
  build(footer);
  paint();
}
applyA11y();
syncMeta();
addEventListener("radar:ui", () => { syncMeta(); paint(); });
addEventListener("radar:lang", paint);
new MutationObserver(() => { ensure(); const c = currentTheme(); if (c !== lastTheme && bar) paint(); }).observe(document.body, { childList: true, subtree: true });
new MutationObserver(() => { syncMeta(); paint(); }).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-ui", "lang"] });
ensure();
