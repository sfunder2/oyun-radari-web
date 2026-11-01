// Benzer oyunlar (IGDB "similar_games"): ayrıntıda "Benzer oyunlar" bölümü ve "Benzer ama daha ucuz" için aday havuzu.
// Veri game_similar tablosundan okunur (supabase/schema-v38-benzer-oyunlar.sql); tablo yoksa ya da satır boşsa hiçbir şey gösterilmez.
var URL_ = "https://dsosckshigzijnsxmlwh.supabase.co", KEY = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO";
var KEY_RE = /^[a-z0-9 ]{1,160}$/, missing = false, keyMemo = new Map(), itemMemo = new Map();
var isEn = () => typeof document < "u" && document.documentElement.lang === "en";
var EN = {
	"Benzer oyunlar": "Similar games",
	"IGDB'nin benzer bulduğu ve katalogda olan oyunlar.": "Games IGDB rates as similar that are in our catalogue.",
	"Kaynak": "Source",
	"Fiyat yok": "No price",
	"puan": "points",
	"Daha fazla göster": "Show more",
	"Daha az göster": "Show less"
};
var tr = (s) => isEn() && EN[s] || s;
function remember(map, key, make) {
	let hit = map.get(key);
	if (hit && Date.now() - hit.at < 6e5) return hit.p;
	let p = make().catch(() => (map.delete(key), []));
	map.size > 40 && map.delete(map.keys().next().value);
	map.set(key, { at: Date.now(), p });
	return p;
}
/** Başlık anahtarı -> IGDB'nin benzer bulduğu katalog anahtarları (IGDB sırasıyla). */
export function similarKeys(titleKey, f = globalThis.fetch) {
	if (missing || !titleKey || !KEY_RE.test(titleKey)) return Promise.resolve([]);
	return remember(keyMemo, titleKey, async () => {
		let r = await f(URL_ + "/rest/v1/game_similar?select=similar_keys&title_key=eq." + encodeURIComponent(titleKey), {
			headers: { apikey: KEY, Authorization: "Bearer " + KEY },
			credentials: "omit",
			signal: AbortSignal.timeout(1e4)
		});
		if (r.status === 404) return missing = !0, [];
		if (!r.ok) throw Error("HTTP " + r.status);
		let rows = await r.json();
		return (rows?.[0]?.similar_keys || []).filter((k) => KEY_RE.test(k));
	});
}
/** Her anahtar için tek katalog kaydı: DLC/deneme değil, fiyatı olan, en yüksek puanlı. */
export function pickPerKey(keys, items) {
	let best = new Map(), rank = (g) => (typeof g.price == "number" && g.price > 0 ? 2 : 0) + (g.image ? 1 : 0);
	for (let g of items || []) {
		if (!g?.titleKey || g.isDlc || g.isTrial) continue;
		let cur = best.get(g.titleKey);
		if (!cur || rank(g) > rank(cur) || rank(g) === rank(cur) && (g.bestScore || 0) > (cur.bestScore || 0)) best.set(g.titleKey, g);
	}
	return keys.map((k, i) => best.has(k) ? { ...best.get(k), _igdb: i } : null).filter(Boolean);
}
export function createSimilar(React, { fetchRows, mapRow, formatPrice, bestDeal }) {
	let { useEffect, useState } = React, h = React.createElement;
	/** Ayrıntıdaki oyuna IGDB'nin benzer bulduğu katalog oyunları. Her biri _igdb (sıra) taşır. */
	function itemsFor(item) {
		let key = item?.titleKey;
		if (!key) return Promise.resolve([]);
		return remember(itemMemo, key, async () => {
			let keys = (await similarKeys(key)).slice(0, 20);
			if (!keys.length) return [];
			let { rows } = await fetchRows("library?select=*&limit=120&title_key=in.(" + encodeURIComponent(keys.map((k) => "\"" + k + "\"").join(",")) + ")");
			return pickPerKey(keys, (rows || []).map(mapRow)).filter((g) => g.id !== item.id && g.titleKey !== key);
		});
	}
	function Section({ item, onOpen, toTRY }) {
		let [list, setList] = useState(null), [more, setMore] = useState(!1);
		useEffect(() => {
			let off = !1;
			setList(null), setMore(!1);
			itemsFor(item).then((l) => { off || setList(l); });
			return () => { off = !0; };
		}, [item?.id]);
		if (!list || !list.length) return null;
		let shown = list.slice(0, more ? 8 : 4);
		return h("section", { className: "similar igdbsim", "aria-label": tr("Benzer oyunlar") },
			h("h3", null, tr("Benzer oyunlar")),
			h("p", { className: "phnote" }, tr("IGDB'nin benzer bulduğu ve katalogda olan oyunlar."), " ", tr("Kaynak"), ": ", h("a", { href: "https://www.igdb.com", target: "_blank", rel: "noopener noreferrer" }, "IGDB")),
			h("ul", null, shown.map((g) => {
				let deal = bestDeal(g, toTRY || ((o) => o.price));
				return h("li", { key: g.id }, h("button", { type: "button", onClick: () => onOpen(g) },
					g.image ? h("img", { src: g.image, alt: "", loading: "lazy" }) : h("span", { className: "sg-ph" }),
					h("strong", null, g.name),
					h("span", null, deal ? formatPrice(deal.price) + " · " + deal.store : tr("Fiyat yok"), g.bestScore ? " · " + g.bestScore + " " + tr("puan") : "")));
			})),
			list.length > 4 && h("button", { type: "button", className: "igdbsim-more", "aria-expanded": more, onClick: () => setMore((v) => !v) }, tr(more ? "Daha az göster" : "Daha fazla göster")));
	}
	return { Section, itemsFor };
}
