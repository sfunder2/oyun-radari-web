// Oyun ayrıntısı yenilemesi (22 Kas 2026). detail-tidy-20261101.js'in düzeni üstüne biner; React'in düğümleri
// yerinden oynatılmaz ya da silinmez. Yalnız data-dx-* öznitelikleri, CSS ve kendi eklediğimiz [data-dt-own] düğümleri.
//  - Üstte büyük kapak, kapaktan taşan bulanık zemin, kapak/fragman geçişi (fragman yalnız tıklayınca yüklenir)
//  - Yapışkan sekmeler (kayınca küçük başlık + en ucuz fiyat) ve yapışkan "satın al" çubuğu
//  - Mağaza fiyatları: yan yana tablo, en ucuz vurgulu
//  - Tek tip dairesel puan göstergeleri
//  - Sistem gereksinimleri: ilerleme çubuklu kısa özet
//  - Benzer oyunlar: yatay kaydırma + ok düğmeleri
//  - Ekran görüntüleri: şerit + tam ekran galeri (game_meta.screenshots; veri yoksa hiçbir şey çizilmez)
// Eski görünüme dönmek için: ?detay=eski (detail-tidy ile aynı anahtar). Yeni görünüm: ?detay=yeni.
const OFF_KEY = "radar-detail";
const SB = "https://dsosckshigzijnsxmlwh.supabase.co", ANON = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO";
const off = () => { try { return localStorage.getItem(OFF_KEY) === "eski"; } catch { return false; } };
const en = () => document.documentElement.lang === "en";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const T = {
  cover: ["Kapak", "Cover"], trailer: ["Fragman", "Trailer"], playTrailer: ["Fragmanı oynat", "Play trailer"],
  store: ["Mağaza", "Store"], price: ["Fiyat", "Price"], off: ["İndirim", "Discount"], diff: ["En ucuza göre", "vs cheapest"],
  cheapest: ["En ucuz", "Cheapest"], tableCap: ["Mağaza fiyatları karşılaştırması", "Store price comparison"],
  buy: ["Mağazada satın al", "Buy at store"], cheapestAt: ["En ucuz", "Cheapest"], open: ["Mağazayı aç", "Open store"],
  reqTitle: ["Kısaca gereksinimler", "Requirements at a glance"], min: ["En düşük", "Minimum"], rec: ["Önerilen", "Recommended"],
  allReq: ["Tüm ayrıntıları göster", "Show all details"], lessReq: ["Ayrıntıları gizle", "Hide details"],
  ram: ["Bellek", "Memory"], disk: ["Depolama", "Storage"], cpu: ["İşlemci", "Processor"], gpu: ["Ekran kartı", "Graphics"], os: ["Sistem", "System"],
  prev: ["Önceki", "Previous"], next: ["Sonraki", "Next"], shots: ["Ekran görüntüleri", "Screenshots"], shot: ["Ekran görüntüsü", "Screenshot"],
  close: ["Kapat", "Close"], of: ["/", "/"], score: ["puan", "score"], none: ["Veri yok", "No data"],
};
const t = (k) => T[k][en() ? 1 : 0];
const state = new WeakMap();

// ---- yardımcılar ---------------------------------------------------------------------------------
const el = (tag, cls, attrs) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.dataset.dtOwn = "dx";
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};
const svgPlay = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const svgChev = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d > 0 ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}"/></svg>`;
const svgX = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const safeUrl = (u) => { try { const x = new URL(u, location.href); return x.protocol === "https:" ? x.href : null; } catch { return null; } };
const parseTL = (s) => {
  if (!s || !/[₺]|TL/i.test(s)) return null;
  const n = parseFloat(String(s).replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const fmtTL = (n) => "₺" + n.toLocaleString(en() ? "en-US" : "tr-TR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const titleKey = (name) => String(name || "").replace(/[™®©]/g, "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").replace(/\b(?:standard|standart|edition|surum|digital|dijital)\b/g, " ").replace(/\s+/g, " ").trim();
const titleOf = (m) => { const h = m.querySelector(":scope>h2"); const n = h && [...h.childNodes].find((x) => (x.textContent || "").trim()); return (n ? n.textContent : "").trim(); };

// ---- kapak ---------------------------------------------------------------------------------------
function coverSrc(m) {
  const b = m.querySelector(":scope>.detail-backdrop img");
  const c = m.querySelector(".modalhero img");
  return safeUrl((b && b.getAttribute("src")) || (c && c.getAttribute("src")) || "");
}
function trailerOf(m) {
  const yt = m.querySelector(".igdb-poster img")?.getAttribute("src") || "";
  const id = (yt.match(/\/vi\/([A-Za-z0-9_-]{11})\//) || [])[1];
  if (id) return { kind: "yt", id };
  const v = m.querySelector(".modalhero video");
  const src = v && safeUrl(v.currentSrc || v.getAttribute("src") || v.querySelector("source")?.getAttribute("src") || "");
  return src ? { kind: "video", src } : null;
}
function scoresOf(m) {
  const out = [];
  for (const a of m.querySelectorAll(".scores a")) {
    const s = a.querySelector(".score"); const v = parseInt(s && s.textContent, 10);
    const label = a.querySelector("span:not(.score)")?.firstChild?.textContent?.trim();
    if (Number.isFinite(v) && label) out.push({ v, label });
  }
  return out;
}
const tier = (v) => (v >= 75 ? "hi" : v >= 50 ? "mid" : "lo");
function ring(v, label) {
  const r = el("span", "dx-ring", { "data-tier": tier(v), role: "img", "aria-label": `${label} ${v}/100` });
  r.style.setProperty("--p", Math.max(0, Math.min(100, v)));
  r.innerHTML = "<b></b><small></small>";
  r.firstChild.textContent = v;
  r.lastChild.textContent = label;
  return r;
}

function buildHero(m, s) {
  const hero = el("div", "dx-hero");
  hero.innerHTML = '<div class="dx-bg" aria-hidden="true"><img alt=""></div><div class="dx-stage"><img class="dx-cover" alt=""></div>';
  const stage = hero.querySelector(".dx-stage");
  const rings = el("div", "dx-hero-rings");
  const bar = el("div", "dx-hero-bar");
  stage.append(rings, bar);
  s.hero = hero; s.stage = stage; s.rings = rings; s.bar = bar;
  m.append(hero);
}

function stopMedia(s) { s.stage.querySelectorAll("iframe,video").forEach((n) => n.remove()); }
function setMode(m, s, mode, play) {
  s.mode = mode;
  s.hero.dataset.mode = mode;
  stopMedia(s);
  if (mode === "trailer" && s.trailer) {
    let node;
    if (s.trailer.kind === "yt") {
      node = document.createElement("iframe");
      node.src = "https://www.youtube-nocookie.com/embed/" + s.trailer.id + "?rel=0&playsinline=1&modestbranding=1" + (play ? "&autoplay=1" : "");
      node.title = t("trailer");
      node.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      node.allowFullscreen = true;
      node.referrerPolicy = "strict-origin-when-cross-origin";
    } else {
      node = document.createElement("video");
      node.src = s.trailer.src; node.controls = true; node.playsInline = true; node.muted = true; node.autoplay = !!play;
    }
    node.className = "dx-media";
    node.dataset.dtOwn = "dx";
    s.stage.append(node);
  }
  for (const b of s.bar.querySelectorAll("[data-mode]")) b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
}

function refreshHero(m, s) {
  const src = coverSrc(m);
  const trailer = trailerOf(m);
  const sc = scoresOf(m);
  const sig = [src, trailer && (trailer.id || trailer.src), sc.map((x) => x.label + x.v).join(","), en()].join("|");
  if (s.heroSig === sig) return;
  s.heroSig = sig;
  const had = s.trailer && (s.trailer.id || s.trailer.src);
  s.trailer = trailer;
  s.hero.hidden = !src;
  m.toggleAttribute("data-dx-hero", !!src);
  if (src) for (const i of s.hero.querySelectorAll(".dx-bg img,.dx-cover")) if (i.getAttribute("src") !== src) i.src = src;
  // dairesel puanlar
  s.rings.replaceChildren(...sc.slice(0, 3).map((x) => ring(x.v, x.label)));
  // araç çubuğu: kapak/fragman geçişi, oynat düğmesi, küçük resim
  s.bar.replaceChildren();
  s.hero.querySelector(".dx-play")?.remove();
  if (trailer) {
    const seg = el("div", "dx-seg", { role: "group", "aria-label": t("trailer") });
    for (const k of ["cover", "trailer"]) {
      const b = el("button", "", { type: "button", "data-mode": k, "aria-pressed": "false" });
      b.textContent = t(k);
      b.addEventListener("click", () => setMode(m, s, k, k === "trailer"));
      seg.append(b);
    }
    s.bar.append(seg);
    if (trailer.kind === "yt") {
      const th = el("button", "dx-thumb", { type: "button", "aria-label": t("playTrailer") });
      th.innerHTML = '<img alt="" loading="lazy"><span>' + svgPlay + "</span>";
      th.firstChild.src = "https://i.ytimg.com/vi/" + trailer.id + "/hqdefault.jpg";
      th.addEventListener("click", () => setMode(m, s, "trailer", true));
      s.bar.append(th);
    }
    const play = el("button", "dx-play", { type: "button", "aria-label": t("playTrailer") });
    play.innerHTML = svgPlay;
    play.addEventListener("click", () => setMode(m, s, "trailer", true));
    s.stage.append(play);
  }
  if (!trailer || (had && had !== (trailer.id || trailer.src))) { s.mode = "cover"; stopMedia(s); }
  setMode(m, s, s.mode === "trailer" && trailer ? "trailer" : "cover", false);
}

// ---- mağaza tablosu ------------------------------------------------------------------------------
function readRows(pc) {
  return [...pc.querySelectorAll(".pc-list>.pc-row")].map((r) => {
    const a = r.querySelector("a");
    const strong = r.querySelector(".pc-price strong")?.textContent.trim() || "";
    const approx = r.querySelector(".pc-price small")?.textContent || "";
    return {
      href: safeUrl(a && a.getAttribute("href")), store: r.querySelector(".pc-store b")?.textContent.trim() || "",
      region: r.querySelector(".pc-store small")?.textContent.trim() || "", dot: r.querySelector(".pc-store .dot")?.className || "dot",
      price: strong, old: r.querySelector(".pc-price del")?.textContent.trim() || "", off: r.querySelector(".pc-off")?.textContent.trim() || "",
      num: parseTL(strong) ?? parseTL(approx), best: r.classList.contains("best"),
    };
  });
}
function buildTable(rows) {
  const nums = rows.map((r) => r.num).filter((n) => n != null);
  const min = nums.length ? Math.min(...nums) : null;
  const tbl = el("table", "dx-ptable");
  const cap = document.createElement("caption"); cap.className = "dx-sr"; cap.textContent = t("tableCap");
  tbl.append(cap);
  const head = document.createElement("thead");
  head.innerHTML = "<tr><th scope=col></th><th scope=col></th><th scope=col></th><th scope=col></th></tr>";
  [t("store"), t("price"), t("off"), t("diff")].forEach((x, i) => (head.firstChild.children[i].textContent = x));
  tbl.append(head);
  const body = document.createElement("tbody");
  for (const r of rows) {
    const tr = document.createElement("tr");
    const isBest = min != null ? r.num === min : r.best;
    if (isBest) tr.className = "best";
    const c1 = document.createElement("th"); c1.scope = "row";
    const a = document.createElement(r.href ? "a" : "span");
    if (r.href) { a.href = r.href; a.target = "_blank"; a.rel = "noopener noreferrer"; }
    const dot = document.createElement("i"); dot.className = r.dot;
    const nm = document.createElement("b"); nm.textContent = r.store;
    a.append(dot, nm);
    if (r.region) { const sm = document.createElement("small"); sm.textContent = r.region; a.append(sm); }
    c1.append(a);
    const c2 = document.createElement("td"); c2.className = "p";
    if (r.old) { const d = document.createElement("del"); d.textContent = r.old; c2.append(d); }
    const st = document.createElement("strong"); st.textContent = r.price || "—"; c2.append(st);
    const c3 = document.createElement("td"); c3.className = "o";
    if (r.off) { const e = document.createElement("em"); e.textContent = r.off; c3.append(e); } else c3.textContent = "—";
    const c4 = document.createElement("td"); c4.className = "d";
    if (isBest) { const e = document.createElement("em"); e.className = "bestchip"; e.textContent = t("cheapest"); c4.append(e); }
    else if (min != null && r.num != null) {
      const d = r.num - min;
      c4.textContent = "+" + fmtTL(d) + (min > 0 ? " (+%" + Math.round((d / min) * 100) + ")" : "");
    } else c4.textContent = "—";
    tr.append(c1, c2, c3, c4);
    if (r.href) tr.addEventListener("click", (ev) => { if (!ev.target.closest("a")) window.open(r.href, "_blank", "noopener,noreferrer"); });
    body.append(tr);
  }
  tbl.append(body);
  return tbl;
}
function refreshTable(m, s) {
  const pc = m.querySelector(":scope>.pricecompare");
  if (!pc) { s.table?.remove(); s.table = null; s.best = null; s.tableSig = ""; return; }
  const rows = readRows(pc);
  const sig = rows.map((r) => [r.store, r.price, r.old, r.off, r.href].join("~")).join("|") + en();
  if (sig === s.tableSig) return;
  s.tableSig = sig;
  s.table?.remove(); s.table = null;
  const nums = rows.filter((r) => r.num != null);
  const best = nums.length ? nums.reduce((a, b) => (b.num < a.num ? b : a)) : rows.find((r) => r.best) || null;
  s.best = best;
  if (rows.length >= 2) {
    s.table = buildTable(rows);
    const wrap = el("div", "dx-ptable-wrap");
    wrap.append(s.table);
    s.table = wrap;
    pc.querySelector(".pc-list").before(wrap);
    pc.dataset.dxTable = "1";
  } else delete pc.dataset.dxTable;
}

// ---- yapışkan satın al çubuğu -------------------------------------------------------------------
function refreshBuy(m, s) {
  const ds = m.querySelector(":scope>.directstore");
  const best = s.best && s.best.href ? s.best : null;
  const href = best ? best.href : safeUrl(ds && ds.getAttribute("href"));
  if (!href) { s.buy?.remove(); s.buy = null; s.buySig = ""; return; }
  const sig = [href, best && best.price, best && best.store, en()].join("|");
  if (s.buy && s.buySig === sig) return;
  s.buySig = sig;
  if (!s.buy) { s.buy = el("div", "dx-buy"); }
  s.buy.replaceChildren();
  const txt = el("div", "dx-buy-txt");
  if (best) {
    const sm = document.createElement("small"); sm.textContent = t("cheapestAt") + " · " + best.store;
    const b = document.createElement("b"); b.textContent = best.price;
    txt.append(sm, b);
  } else { const b = document.createElement("b"); b.textContent = titleOf(m); txt.append(b); }
  const a = el("a", "dx-buy-btn", { href, target: "_blank", rel: "noopener noreferrer" });
  a.textContent = best ? t("buy") : t("open");
  s.buy.append(txt, a);
  if (s.buy.parentNode !== m) m.append(s.buy);
}

// ---- sekmeler: kayınca küçük başlık --------------------------------------------------------------
function refreshTabs(m, s) {
  const bar = m.querySelector(":scope>.dt-tabs");
  if (!bar) return;
  if (!s.mini) {
    s.mini = el("span", "dx-mini");
    s.mini.innerHTML = "<b></b><small></small>";
    bar.prepend(s.mini);
    bar.addEventListener("click", (e) => {
      if (!e.target.closest("[role=tab]")) return;
      const top = bar.offsetTop - parseFloat(getComputedStyle(m).paddingTop || 0) * 0;
      if (m.scrollTop > top) m.scrollTo({ top, behavior: reduced() ? "auto" : "smooth" });
    });
  } else if (bar.firstChild !== s.mini) bar.prepend(s.mini);
  const name = titleOf(m), price = s.best ? s.best.price : "";
  if (s.mini.firstChild.textContent !== name) s.mini.firstChild.textContent = name;
  if (s.mini.lastChild.textContent !== price) s.mini.lastChild.textContent = price;
  s.tabs = bar;
}
function onScroll(m, s) {
  if (!s.tabs) return;
  const a = s.tabs.getBoundingClientRect().top, b = m.getBoundingClientRect().top;
  const pt = parseFloat(m.style.getPropertyValue("--dx-pt")) || 0;
  const stuck = a <= b + pt + 3 && m.scrollTop > 40;
  if (m.hasAttribute("data-dx-stuck") !== stuck) m.toggleAttribute("data-dx-stuck", stuck);
}

// ---- puan halkaları (mevcut .score düğümleri) ------------------------------------------------------
function refreshScores(m) {
  for (const e of m.querySelectorAll(".scores .score, .scorechips .chip")) {
    const v = parseInt(e.textContent, 10);
    if (!Number.isFinite(v) || v < 0 || v > 100) continue;
    if (e.dataset.dxRing === String(v)) continue;
    e.dataset.dxRing = String(v);
    e.dataset.tier = tier(v);
    e.style.setProperty("--p", v);
    e.classList.add("dx-ringed");
  }
}

// ---- sistem gereksinimleri -----------------------------------------------------------------------
const toGB = (s) => {
  const x = String(s || "").match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)/i);
  if (!x) return null;
  const n = parseFloat(x[1].replace(",", "."));
  const u = x[2].toUpperCase();
  return u === "TB" ? n * 1024 : u === "MB" ? n / 1024 : n;
};
const short = (v) => String(v || "").replace(/\s+/g, " ").replace(/\b(?:Intel\(R\)|AMD|NVIDIA|GeForce|Core\(TM\)|Processor|Graphics|CPU)\b/gi, "").replace(/\s+/g, " ").trim().slice(0, 34);
function refreshReq(m, s) {
  const box = m.querySelector("#game-requirements, :scope>.infoblock");
  const tbl = box && box.querySelector(".reqtable");
  if (!tbl) { s.req?.remove(); s.req = null; s.reqSig = ""; return; }
  const rows = [...tbl.querySelectorAll("tbody>tr")].map((tr) => ({ k: tr.children[0]?.textContent.trim() || "", min: tr.children[1]?.textContent.trim() || "", rec: tr.children[2]?.textContent.trim() || "" }));
  const sig = JSON.stringify(rows) + en();
  if (s.req && s.reqSig === sig && s.req.isConnected) return;
  s.reqSig = sig;
  s.req?.remove();
  const find = (re) => rows.find((r) => re.test(r.k));
  const ram = find(/bellek|memory|ram/i), disk = find(/depolama|storage|disk/i), cpu = find(/işlemci|processor|cpu/i), gpu = find(/ekran|graphics|gpu|video/i), os = find(/işletim|^os|sistem/i);
  const wrap = el("div", "dx-req");
  const h = document.createElement("h4"); h.textContent = t("reqTitle"); wrap.append(h);
  const legend = el("p", "dx-req-legend");
  legend.innerHTML = '<span class="mn"></span><span class="rc"></span>';
  legend.children[0].textContent = t("min"); legend.children[1].textContent = t("rec");
  wrap.append(legend);
  let any = false;
  const meter = (label, row, max) => {
    if (!row) return;
    const a = toGB(row.min), b = toGB(row.rec);
    if (a == null && b == null) return;
    any = true;
    const d = el("div", "dx-meter");
    const l = document.createElement("span"); l.className = "l"; l.textContent = label;
    const track = document.createElement("span"); track.className = "tr";
    for (const [cls, v] of [["mn", a], ["rc", b]]) {
      if (v == null) continue;
      const f = document.createElement("i"); f.className = cls; f.style.setProperty("--w", Math.max(4, Math.min(100, (v / max) * 100)) + "%");
      f.title = (cls === "mn" ? t("min") : t("rec")) + ": " + (cls === "mn" ? row.min : row.rec);
      track.append(f);
    }
    const val = document.createElement("span"); val.className = "v";
    const fmt = (v) => (v == null ? "—" : (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + " GB");
    val.textContent = fmt(a) + (b != null && b !== a ? " → " + fmt(b) : "");
    d.append(l, track, val);
    wrap.append(d);
  };
  meter(t("ram"), ram, 32);
  meter(t("disk"), disk, 150);
  const chips = el("div", "dx-req-chips");
  for (const [label, row] of [[t("cpu"), cpu], [t("gpu"), gpu], [t("os"), os]]) {
    if (!row || (!row.min && !row.rec)) continue;
    any = true;
    const c = document.createElement("div"); c.className = "c";
    const l = document.createElement("small"); l.textContent = label;
    const v = document.createElement("b");
    const a = short(row.min), b = short(row.rec);
    v.textContent = a && b && a !== b ? a + " → " + b : a || b;
    v.title = row.min + (row.rec && row.rec !== row.min ? " → " + row.rec : "");
    c.append(l, v); chips.append(c);
  }
  if (chips.children.length) wrap.append(chips);
  const more = el("button", "dx-req-more", { type: "button", "aria-expanded": String(box.hasAttribute("data-dx-reqopen")) });
  const sync = () => { const o = box.hasAttribute("data-dx-reqopen"); more.setAttribute("aria-expanded", String(o)); more.textContent = o ? t("lessReq") : t("allReq"); };
  more.addEventListener("click", () => { box.toggleAttribute("data-dx-reqopen"); sync(); });
  sync();
  wrap.append(more);
  if (!any) { s.req = null; box.removeAttribute("data-dx-req"); return; }
  box.dataset.dxReq = "1";
  const summary = box.querySelector(":scope>summary");
  (summary || box).after(wrap);
  s.req = wrap;
}

// ---- benzer oyunlar: yatay şerit + oklar ------------------------------------------------------------
function refreshSimilar(m) {
  for (const sec of m.querySelectorAll(".similar")) {
    const ul = sec.querySelector(":scope>ul");
    if (!ul) continue;
    sec.dataset.dxStrip = "1";
    if (sec.querySelector(":scope>.dx-arrow")) continue;
    const mk = (dir) => {
      const b = el("button", "dx-arrow", { type: "button", "data-dir": dir > 0 ? "next" : "prev", "aria-label": dir > 0 ? t("next") : t("prev") });
      b.innerHTML = svgChev(dir);
      b.addEventListener("click", () => ul.scrollBy({ left: dir * Math.max(160, ul.clientWidth * 0.8), behavior: reduced() ? "auto" : "smooth" }));
      return b;
    };
    const prev = mk(-1), next = mk(1);
    const upd = () => {
      const max = ul.scrollWidth - ul.clientWidth - 2;
      prev.disabled = ul.scrollLeft <= 2; next.disabled = ul.scrollLeft >= max;
      sec.toggleAttribute("data-dx-scrollable", max > 0);
    };
    ul.addEventListener("scroll", () => requestAnimationFrame(upd), { passive: true });
    new ResizeObserver(upd).observe(ul);
    sec.append(prev, next);
    requestAnimationFrame(upd);
  }
}

// ---- ekran görüntüleri + tam ekran galeri ------------------------------------------------------------
const metaCache = new Map();
async function loadShots(key) {
  if (!key || !/^[a-z0-9 ]{1,160}$/.test(key)) return [];
  if (metaCache.has(key)) return metaCache.get(key);
  const p = (async () => {
    try {
      const r = await fetch(SB + "/rest/v1/game_meta?select=screenshots&limit=1&title_key=eq." + encodeURIComponent(key), { headers: { apikey: ANON, Authorization: "Bearer " + ANON }, credentials: "omit", signal: AbortSignal.timeout(8000) });
      if (!r.ok) return [];
      const rows = await r.json();
      const list = Array.isArray(rows?.[0]?.screenshots) ? rows[0].screenshots : [];
      return list.map((x) => ({ url: safeUrl(typeof x === "string" ? x : x?.url), thumb: safeUrl(typeof x === "string" ? x : x?.thumbnail || x?.url) })).filter((x) => x.url).slice(0, 16);
    } catch { return []; }
  })();
  metaCache.set(key, p);
  p.then((v) => { if (!v.length) setTimeout(() => metaCache.delete(key), 60000); });
  return p;
}
function refreshShots(m, s) {
  const name = titleOf(m);
  if (!name || s.shotsFor === name) return;
  s.shotsFor = name;
  s.shotsEl?.remove(); s.shotsEl = null;
  const key = titleKey(name);
  loadShots(key).then((list) => {
    if (s.shotsFor !== name || !list.length || !m.isConnected) return;
    const sec = el("section", "dx-shots", { "aria-label": t("shots") });
    sec.dataset.dtG = "tab-about";
    const h = document.createElement("h3"); h.textContent = t("shots");
    const strip = el("div", "dx-shots-strip");
    list.forEach((x, i) => {
      const b = el("button", "", { type: "button", "aria-label": `${t("shot")} ${i + 1}` });
      const img = document.createElement("img"); img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.referrerPolicy = "no-referrer"; img.src = x.thumb || x.url;
      b.append(img);
      b.addEventListener("click", () => openLightbox(list, i, b));
      strip.append(b);
    });
    sec.append(h, strip);
    s.shotsEl = sec;
    const media = m.querySelector(":scope>.detail-media");
    (media || m.querySelector(":scope>.dt-tabs"))?.after(sec);
    if (!sec.isConnected) m.append(sec);
  });
}

let lb = null;
function openLightbox(list, start, opener) {
  if (lb) return;
  let i = start;
  const root = el("div", "dx-lb", { role: "dialog", "aria-modal": "true", "aria-label": t("shots") });
  const img = document.createElement("img"); img.alt = ""; img.referrerPolicy = "no-referrer"; img.draggable = false;
  const mk = (cls, label, html) => { const b = el("button", cls, { type: "button", "aria-label": label }); b.innerHTML = html; return b; };
  const x = mk("dx-lb-x", t("close"), svgX), pv = mk("dx-lb-nav prev", t("prev"), svgChev(-1)), nx = mk("dx-lb-nav next", t("next"), svgChev(1));
  const cnt = el("span", "dx-lb-count");
  const stage = el("div", "dx-lb-stage"); stage.append(img);
  root.append(stage, pv, nx, x, cnt);
  const show = (n) => {
    i = (n + list.length) % list.length;
    img.src = list[i].url;
    cnt.textContent = (i + 1) + " " + t("of") + " " + list.length;
    const pre = new Image(); pre.referrerPolicy = "no-referrer"; pre.src = list[(i + 1) % list.length].url;
    pv.hidden = nx.hidden = list.length < 2;
  };
  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    root.remove(); lb = null;
    document.documentElement.classList.remove("dx-lb-open");
    opener?.isConnected && opener.focus({ preventScroll: true });
  };
  const onKey = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault(); close(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); show(i - 1); }
    else if (e.key === "Tab") { const f = [x, ...(list.length > 1 ? [pv, nx] : [])]; const k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus(); }
  };
  x.addEventListener("click", close);
  pv.addEventListener("click", () => show(i - 1));
  nx.addEventListener("click", () => show(i + 1));
  root.addEventListener("click", (e) => { if (e.target === root || e.target === stage) close(); });
  // kaydırma jesti
  let x0 = null;
  stage.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
  stage.addEventListener("pointerup", (e) => { if (x0 == null) return; const d = e.clientX - x0; x0 = null; if (Math.abs(d) > 50) show(i + (d < 0 ? 1 : -1)); });
  document.addEventListener("keydown", onKey, true);
  document.documentElement.classList.add("dx-lb-open");
  document.body.append(root);
  lb = root;
  show(i);
  x.focus({ preventScroll: true });
}

// ---- kurulum / tarama --------------------------------------------------------------------------------
function setup(m) {
  const s = { mode: "cover", heroSig: "", tableSig: "", buySig: "", reqSig: "", shotsFor: "" };
  state.set(m, s);
  buildHero(m, s);
  let raf = 0;
  m.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; onScroll(m, s); }); }, { passive: true });
  return s;
}
function padVars(m) {
  const cs = getComputedStyle(m);
  m.style.setProperty("--dx-pl", cs.paddingLeft);
  m.style.setProperty("--dx-pr", cs.paddingRight);
  m.style.setProperty("--dx-pt", cs.paddingTop);
  m.style.setProperty("--dx-pb", cs.paddingBottom);
}
function refresh(m) {
  const s = state.get(m) || setup(m);
  m.dataset.dx = "1";
  if (!s.padded) { padVars(m); s.padded = true; }
  refreshHero(m, s);
  refreshTable(m, s);
  refreshBuy(m, s);
  refreshTabs(m, s);
  refreshScores(m);
  refreshReq(m, s);
  refreshSimilar(m);
  refreshShots(m, s);
  onScroll(m, s);
}
function teardown(m) {
  stopMedia(state.get(m) || { stage: m });
  delete m.dataset.dx;
  m.removeAttribute("data-dx-hero"); m.removeAttribute("data-dx-stuck");
  for (const n of m.querySelectorAll("[data-dt-own=dx]")) n.remove();
  for (const n of m.querySelectorAll("[data-dx-table],[data-dx-req],[data-dx-strip],[data-dx-reqopen]")) { delete n.dataset.dxTable; delete n.dataset.dxReq; delete n.dataset.dxStrip; n.removeAttribute("data-dx-reqopen"); }
  for (const n of m.querySelectorAll(".dx-ringed")) { n.classList.remove("dx-ringed"); delete n.dataset.dxRing; }
  state.delete(m);
}
function scan() {
  const disabled = off();
  for (const m of document.querySelectorAll(".modal.game-detail")) {
    if (disabled) { if (state.has(m)) teardown(m); continue; }
    // Başka oyuna geçildiğinde React aynı kutuyu kullanır: başlık değişirse kapak durumunu sıfırla.
    const s = state.get(m);
    if (s && s.name && s.name !== titleOf(m)) { s.mode = "cover"; }
    refresh(m);
    state.get(m).name = titleOf(m);
  }
}
let queued = false;
const q = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; scan(); }); } };
const own = (n) => n.nodeType === 1 && n.dataset?.dtOwn === "dx";
new MutationObserver((muts) => {
  // Yalnız kendi düğümlerimizin içinde ya da kendi düğümlerimizin eklenip çıkmasından doğan değişimler taramayı tetiklemesin.
  if (muts.every((r) => r.target.closest?.("[data-dt-own=dx]") || (r.type === "childList" && r.addedNodes.length + r.removedNodes.length > 0 && [...r.addedNodes, ...r.removedNodes].every(own)))) return;
  q();
}).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
q();
