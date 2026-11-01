// Seri ve DLC (kaynak: scripts/family.mjs, tablo: game_family). Oyun ayrıntısında iki bölüm:
//  * Series: "Serideki diğer oyunlar" (IGDB serisi). IGDB verisi yoksa ya da tablo kurulmamışsa eski "Seri zaman çizelgesi" (fallback) görünür.
//  * Dlcs:   "DLC ve genişlemeler". Ana oyunu olan bir DLC açıldığında ana oyun da gösterilir.
// Katalogda bulunan oyunlar (PlayStation ürünleri ya da diğer mağaza teklifleri, başlık anahtarıyla) tıklanınca kendi ayrıntısı açılır.
const SB = "https://dsosckshigzijnsxmlwh.supabase.co", KEY = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO";
const KEY_RE = /^[a-z0-9 ]{1,160}$/, COVER_RE = /^[a-z0-9]{4,40}$/i;
const en = () => typeof document < "u" && document.documentElement.lang === "en";
const EN = {
	"Serideki diğer oyunlar": "Other games in the series",
	"DLC ve genişlemeler": "DLC and expansions",
	"Bu oyun": "This game",
	"Katalogda": "In catalogue",
	"DLC": "DLC",
	"Genişleme": "Expansion",
	"Bağımsız genişleme": "Standalone expansion",
	"Yeniden yapım": "Remake",
	"Remaster": "Remaster",
	"Genişletilmiş sürüm": "Expanded edition",
	"Kaynak": "Source",
	"Bu içerik bir ek paket. Ana oyun:": "This is an add-on. Base game:",
	"Tümünü göster": "Show all",
	"Daha az göster": "Show less",
	"IGDB'de toplam": "IGDB lists",
	"ek içerik var; en yeni": "add-ons in total; the newest",
	"tanesi gösteriliyor.": "are shown.",
	"Ayrıntıyı aç": "Open details",
	"Fiyat yok": "No price",
	"oyun": "games"
};
const tr = (s) => en() && EN[s] || s;
const TYPES = { 1: "DLC", 2: "Genişleme", 4: "Bağımsız genişleme", 8: "Yeniden yapım", 9: "Remaster", 10: "Genişletilmiş sürüm" };
const head = { headers: { apikey: KEY, Authorization: "Bearer " + KEY }, credentials: "omit" };
const inList = (keys) => "in.(" + encodeURIComponent(keys.map((k) => "\"" + k + "\"").join(",")) + ")";

// game_family satırları: başlık anahtarı başına önbellek. Tablo yoksa (404) bir daha sorulmaz.
const rows = new Map(), waiting = new Map();
let missing = false;
export function loadFamily(key, f = globalThis.fetch) {
	if (!key || !KEY_RE.test(key) || missing) return Promise.resolve(null);
	if (rows.has(key)) return Promise.resolve(rows.get(key));
	if (waiting.has(key)) return waiting.get(key);
	const p = f(SB + "/rest/v1/game_family?select=igdb_id,series_name,series,dlcs,dlc_total,parent&title_key=eq." + encodeURIComponent(key), { ...head, signal: AbortSignal.timeout(1e4) }).then(async (r) => {
		if (r.status === 404) { missing = true; return null; }
		if (!r.ok) throw Error("HTTP " + r.status);
		const row = (await r.json())[0] || null;
		rows.set(key, row);
		return row;
	}).catch(() => null).finally(() => waiting.delete(key));
	waiting.set(key, p);
	return p;
}
/** Katalogdaki karşılıklar: başlık anahtarı -> ayrıntısı açılabilen öğe. Önce aynı mağaza, sonra PlayStation, sonra Steam/Xbox/Epic/GOG/Switch. */
const ORDER = ["playstation", "steam", "xbox", "epic", "gog", "switch"];
export async function catalogFor(keys, { rows: fetchRows, toItem }, prefer) {
	const list = [...new Set(keys.filter((k) => k && KEY_RE.test(k)))].slice(0, 120), out = new Map();
	if (!list.length || !fetchRows || !toItem) return out;
	const rank = (p) => p === prefer ? -1 : ORDER.indexOf(p) < 0 ? 9 : ORDER.indexOf(p);
	const found = [];
	for (let i = 0; i < list.length; i += 60) {
		const part = inList(list.slice(i, i + 60));
		const [ps, offers] = await Promise.all([
			fetchRows("library?select=*&title_key=" + part).then((r) => r.rows).catch(() => []),
			fetchRows("store_offers?select=*&title_key=" + part).then((r) => r.rows).catch(() => [])
		]);
		for (const r of ps) found.push({ key: r.title_key, platform: "playstation", row: r });
		for (const r of offers) found.push({ key: r.title_key, platform: r.platform, row: { ...r, id: r.platform + ":" + r.store_id } });
	}
	found.sort((a, b) => rank(a.platform) - rank(b.platform));
	for (const f of found) if (f.key && !out.has(f.key)) try { out.set(f.key, toItem(f.row)); } catch {}
	return out;
}
const yearText = (e) => e?.y ? String(e.y) : "—";
const cover = (c) => c && COVER_RE.test(c) ? "https://images.igdb.com/igdb/image/upload/t_cover_small/" + c + ".jpg" : null;
function money(v, cur) {
	if (typeof v != "number" || !Number.isFinite(v)) return "";
	if (v === 0) return en() ? "Free" : "Ücretsiz";
	try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: cur || "TRY", maximumFractionDigits: v % 1 ? 2 : 0 }).format(v); } catch { return v + " " + (cur || ""); }
}

export function createFamily(React, deps = {}) {
	const { useEffect, useState, createElement: h, Fragment } = React;
	function useFamily(item) {
		const key = item?.titleKey || null;
		const [state, setState] = useState({ key: null, row: null, cat: new Map(), done: false });
		useEffect(() => {
			let off = false;
			setState({ key, row: null, cat: new Map(), done: !key });
			if (!key) return;
			loadFamily(key).then(async (row) => {
				if (off) return;
				if (!row || (!row.series?.length && !row.dlcs?.length && !row.parent)) { setState({ key, row: null, cat: new Map(), done: true }); return; }
				setState({ key, row, cat: new Map(), done: true });
				const keys = [...(row.series || []), ...(row.dlcs || []), row.parent].filter(Boolean).map((e) => e.k).filter((k) => k && k !== key);
				const cat = await catalogFor(keys, deps, item?.platform).catch(() => new Map());
				if (!off) setState({ key, row, cat, done: true });
			});
			return () => { off = true; };
		}, [key]);
		return state.key === key ? state : { key, row: null, cat: new Map(), done: false };
	}
	const Thumb = ({ e, item }) => {
		const src = item?.image || cover(e.c);
		return src ? h("img", { src, alt: "", loading: "lazy", decoding: "async" }) : h("span", { className: "fam-ph", "aria-hidden": "true" });
	};
	const Price = ({ item }) => item ? h("span", { className: "fam-price" }, typeof item.price == "number" ? money(item.price, item.currency) : tr("Fiyat yok")) : null;

	/** Serideki diğer oyunlar. IGDB verisi gelene kadar ve yoksa `fallback` (eski seri zaman çizelgesi) gösterilir. */
	function Series({ item, onOpen, fallback = null }) {
		const { row, cat, done } = useFamily(item);
		const list = row?.series || [];
		if (!done) return null;
		if (list.length < 2) return fallback;
		const self = row.igdb_id;
		return h("section", { className: "series famseries", "aria-label": tr("Serideki diğer oyunlar") },
			h("div", { className: "fam-head" }, h("h3", null, tr("Serideki diğer oyunlar")), row.series_name && h("span", { className: "fam-tag" }, row.series_name + " · " + list.length + " " + (en() ? "games" : "oyun"))),
			h("ol", null, list.map((e) => {
				const current = e.id === self || e.k && e.k === item?.titleKey, it = current ? null : cat.get(e.k), type = TYPES[e.t];
				const body = h(Fragment, null,
					h(Thumb, { e, item: it }),
					h("span", { className: "fam-text" }, h("b", null, e.n), h("small", null, [current ? tr("Bu oyun") : null, type ? tr(type) : null].filter(Boolean).join(" · ") || " ")),
					h(Price, { item: it }));
				return h("li", { key: e.id, className: (current ? "current " : "") + (it ? "have" : "") },
					h("span", { className: "yr" }, yearText(e)),
					it ? h("button", { type: "button", className: "fam-card", onClick: () => onOpen?.(it), title: tr("Ayrıntıyı aç") }, body)
						: h("div", { className: "fam-card", "aria-current": current ? "true" : undefined }, body));
			})),
			h(Source));
	}
	const Source = () => h("p", { className: "phnote fam-source" }, tr("Kaynak"), ": ", h("a", { href: "https://www.igdb.com", target: "_blank", rel: "noopener noreferrer" }, "IGDB"));

	/** DLC ve genişlemeler (ve bir ek paketse ana oyunu). */
	function Dlcs({ item, onOpen }) {
		const { row, cat } = useFamily(item);
		const [open, setOpen] = useState(false);
		useEffect(() => setOpen(false), [item?.titleKey]);
		if (!row) return null;
		const list = row.dlcs || [], parent = row.parent, base = parent && cat.get(parent.k);
		if (!list.length && !parent) return null;
		const shown = open ? list : list.slice(0, 6), more = list.length - shown.length, total = Math.max(row.dlc_total || 0, list.length);
		return h("section", { className: "series famdlc", "aria-label": tr("DLC ve genişlemeler") },
			h("div", { className: "fam-head" }, h("h3", null, tr("DLC ve genişlemeler")), list.length > 0 && h("span", { className: "fam-tag" }, String(total))),
			parent && h("p", { className: "fam-parent" }, tr("Bu içerik bir ek paket. Ana oyun:"), " ",
				base ? h("button", { type: "button", onClick: () => onOpen?.(base) }, parent.n) : h("b", null, parent.n), parent.y ? " (" + parent.y + ")" : ""),
			list.length > 0 && h("ul", null, shown.map((e) => {
				const it = cat.get(e.k), type = TYPES[e.t] || "DLC";
				const body = h(Fragment, null,
					h(Thumb, { e, item: it }),
					h("span", { className: "fam-text" }, h("b", null, e.n), h("small", null, h("em", { className: "fam-kind t" + (e.t || 1) }, tr(type)), e.y ? " · " + e.y : "")),
					h(Price, { item: it }));
				return h("li", { key: e.id, className: it ? "have" : "" },
					it ? h("button", { type: "button", className: "fam-card", onClick: () => onOpen?.(it), title: tr("Ayrıntıyı aç") }, body) : h("div", { className: "fam-card" }, body));
			})),
			(more > 0 || open && list.length > 6) && h("button", { type: "button", className: "fam-more", "aria-expanded": open, onClick: () => setOpen(!open) }, open ? tr("Daha az göster") : tr("Tümünü göster") + " (" + list.length + ")"),
			total > list.length && h("p", { className: "phnote" }, tr("IGDB'de toplam"), " ", total, " ", tr("ek içerik var; en yeni"), " ", list.length, " ", tr("tanesi gösteriliyor.")),
			h(Source));
	}
	return { Series, Dlcs, useFamily };
}
