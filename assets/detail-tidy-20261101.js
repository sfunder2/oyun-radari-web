// Oyun ayrıntısı düzeni: fiyatlar üstte, geri kalanı sekmelerde.
// React'in düğümleri yerinden oynatılmaz; yalnız data-dt-* öznitelikleri ve CSS order kullanılır.
// Eski düzene dönmek için: ?detay=eski (kalıcı) — geri almak için ?detay=yeni.
const KEY = "radar-detail";
const off = () => {
  try {
    const q = new URLSearchParams(location.search).get("detay");
    if (q === "eski") localStorage.setItem(KEY, "eski");
    if (q === "yeni") localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === "eski";
  } catch { return false; }
};
const en = () => document.documentElement.lang === "en";
const T = {
  price: ["Fiyat analizi", "Price analysis"],
  about: ["Oyun hakkında", "About the game"],
  family: ["Seri ve DLC", "Series and DLC"],
  mine: ["Notlarım", "My notes"],
  more: ["mağaza daha göster", "more stores"],
  less: ["Daha az mağaza göster", "Show fewer stores"],
  tabs: ["Oyun ayrıntısı bölümleri", "Game detail sections"],
};
const t = (k) => T[k][en() ? 1 : 0];
const SHOW = 5;
const TABS = ["price", "about", "family", "mine"];
const state = new WeakMap();

function group(el) {
  const c = el.classList;
  if (el.dataset.dtOwn) return null;
  if (c.contains("close")) return "close";
  if (c.contains("eyebrow") || el.tagName === "H2" || c.contains("ux-detail-meta") || c.contains("life-countdown") || c.contains("metarow")) return "head";
  if (c.contains("pricecompare")) return "price";
  if (c.contains("priceheat")) return "heat";
  if (c.contains("catalognotice")) return "note";
  if (c.contains("price-predict") || c.contains("steamdb-panel")) return "tab-price";
  if (c.contains("detail-disclosure")) {
    if (el.querySelector(".regional, .analysis")) return "tab-price";
    if (el.querySelector(".game-journal, .agenotes")) return "tab-mine";
    if (c.contains("detail-media")) return "tab-about";
    const first = el.children[1];
    if (first && first.tagName === "SECTION") return "tab-price"; // Fiyat geçmişi
    return "tab-about";
  }
  if (c.contains("series") || c.contains("similar") || c.contains("famseries") || c.contains("famdlc")) return "tab-family";
  if (c.contains("radar-feedback") || c.contains("footnote")) return "foot";
  if (c.contains("directstore")) return "store";
  if (c.contains("life-thumb-dock")) return "dock";
  return "tab-about";
}

function chip(label, value, target, m) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "dt-chip";
  b.innerHTML = "<small></small><b></b>";
  b.firstChild.textContent = label;
  b.lastChild.textContent = value;
  b.addEventListener("click", () => {
    select(m, "about");
    const el = m.querySelector(target);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  return b;
}

function summary(m, box) {
  const parts = [];
  const sc = m.querySelector(":scope>.scorepanel");
  if (sc) {
    const v = (sc.innerText.match(/(\d{1,3})\s*\/\s*100/) || [])[1];
    if (v) parts.push(chip(en() ? "Score" : "Puan", v + "/100", ":scope>.scorepanel", m));
  }
  const tb = m.querySelector(":scope>.ttbpanel");
  if (tb) {
    const v = (tb.textContent.match(/\d+(?:[.,]\d)?\s?(?:sa|dk|h|min)/) || [])[0];
    if (v) parts.push(chip(en() ? "Main story" : "Ana hikâye", v, ":scope>.ttbpanel", m));
  }
  const gm = m.querySelector(":scope>.gmpanel");
  if (gm) {
    const first = gm.querySelector("li, .gm-chip, span[class*=chip], button, a:not([href*=igdb])");
    const v = first && first.innerText.trim();
    if (v && v.length < 30) parts.push(chip(en() ? "Mode" : "Mod", v, ":scope>.gmpanel", m));
  }
  const sig = parts.map((p) => p.innerText).join("|");
  if (box.dataset.sig === sig) return;
  box.dataset.sig = sig;
  box.replaceChildren(...parts);
  box.hidden = !parts.length;
}

function select(m, tab) {
  const s = state.get(m);
  if (!s) return;
  s.tab = tab;
  m.dataset.dtTab = tab;
  for (const b of s.bar.querySelectorAll("[role=tab]")) {
    const on = b.dataset.tab === tab;
    b.setAttribute("aria-selected", on);
    b.tabIndex = on ? 0 : -1;
  }
  openHistory(m, s);
}

function openHistory(m, s) {
  if (s.tab !== "price" || s.openedHistory) return;
  const h = [...m.querySelectorAll(':scope>[data-dt-g="tab-price"].detail-disclosure')].find((d) => d.children[1]?.tagName === "SECTION");
  if (h) { h.open = true; s.openedHistory = true; }
}

function setup(m) {
  m.dataset.dt = "1";
  const bar = document.createElement("div");
  bar.dataset.dtOwn = "bar";
  bar.className = "dt-tabs";
  bar.setAttribute("role", "tablist");
  bar.setAttribute("aria-label", t("tabs"));
  for (const k of TABS) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.dataset.tab = k;
    b.textContent = t(k);
    b.addEventListener("click", () => select(m, k));
    bar.append(b);
  }
  bar.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const vis = [...bar.querySelectorAll("[role=tab]:not([hidden])")];
    const i = vis.indexOf(document.activeElement);
    if (i < 0) return;
    const n = vis[(i + (e.key === "ArrowRight" ? 1 : vis.length - 1)) % vis.length];
    n.focus(); n.click(); e.preventDefault();
  });
  const sum = document.createElement("div");
  sum.dataset.dtOwn = "sum";
  sum.className = "dt-summary";
  const more = document.createElement("button");
  more.type = "button";
  more.dataset.dtOwn = "more";
  more.className = "dt-more";
  more.addEventListener("click", () => {
    const s = state.get(m);
    s.expanded = !s.expanded;
    refresh(m);
  });
  m.append(sum, bar);
  state.set(m, { bar, sum, more, tab: "price", expanded: false, openedHistory: false });
  select(m, "price");
}

function refresh(m) {
  const s = state.get(m);
  if (!s) return;
  const seen = new Set();
  for (const el of m.children) {
    const g = group(el);
    if (!g) continue;
    if (el.dataset.dtG !== g) el.dataset.dtG = g;
    seen.add(g);
  }
  for (const b of s.bar.querySelectorAll("[role=tab]")) b.hidden = !seen.has("tab-" + b.dataset.tab);
  if (!seen.has("tab-" + s.tab)) {
    const first = TABS.find((k) => seen.has("tab-" + k));
    if (first) select(m, first);
  }
  s.bar.hidden = !TABS.some((k) => seen.has("tab-" + k));
  summary(m, s.sum);
  openHistory(m, s);
  const pc = m.querySelector(":scope>.pricecompare");
  const rows = pc ? pc.querySelectorAll(".pc-list>.pc-row").length : 0;
  const extra = rows - SHOW;
  if (pc) {
    const list = pc.querySelector(":scope>.pc-list");
    if (list && list.nextSibling !== s.more) list.after(s.more);
    const less = extra > 1 && !s.expanded;
    if (less) pc.dataset.dtLess = "1"; else delete pc.dataset.dtLess;
  }
  s.more.hidden = !(extra > 1);
  const label = s.expanded ? t("less") : `+${extra} ${t("more")}`;
  if (s.more.textContent !== label) s.more.textContent = label;
  s.more.setAttribute("aria-expanded", s.expanded);
}

function scan() {
  if (off()) {
    for (const m of document.querySelectorAll(".modal.game-detail[data-dt]")) {
      delete m.dataset.dt;
      delete m.dataset.dtTab;
      for (const el of m.querySelectorAll("[data-dt-g],[data-dt-less]")) { delete el.dataset.dtG; delete el.dataset.dtLess; }
      for (const o of m.querySelectorAll("[data-dt-own]")) o.remove();
      state.delete(m);
    }
    return;
  }
  for (const m of document.querySelectorAll(".modal.game-detail")) {
    if (!state.has(m)) setup(m);
    refresh(m);
  }
}

let queued = false;
const q = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; scan(); }); } };
new MutationObserver(q).observe(document.documentElement, { childList: true, subtree: true });
q();
