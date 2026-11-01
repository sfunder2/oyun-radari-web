// Şu an Twitch'te en çok izlenenler: Keşfet'te yatay şerit ve katalog kartlarında canlı izleyici rozeti.
// Veri: twitch_top_games (scripts/twitch-run.mjs, 30 dakikada bir). Tablo kurulu değilse ya da veri 6 saatten eskiyse hiçbir şey görünmez.
var SB = "https://dsosckshigzijnsxmlwh.supabase.co", KEY = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO";
var STALE = 6 * 36e5, REFRESH = 5 * 6e4;
var state = { rows: null, byKey: new Map(), at: 0, off: false, busy: null }, subs = new Set();
var emit = () => { for (let f of subs) f(); };
function load(f = globalThis.fetch) {
	if (state.off || state.busy || Date.now() - state.at < REFRESH) return state.busy;
	state.busy = f(SB + "/rest/v1/twitch_top_games?select=twitch_id,rank,name,box_art,viewers,streams,title_key,item,updated_at&item=not.is.null&order=viewers.desc&limit=30", {
		headers: { apikey: KEY, Authorization: "Bearer " + KEY },
		credentials: "omit",
		signal: AbortSignal.timeout(1e4)
	}).then(async (r) => {
		if (r.status === 404) { state.off = true; state.rows = []; return; }
		if (!r.ok) throw Error("HTTP " + r.status);
		let rows = (await r.json()).filter((x) => x && x.item && typeof x.item.id === "string" && Date.now() - Date.parse(x.updated_at) < STALE);
		state.rows = rows;
		state.byKey = new Map(rows.filter((x) => x.title_key).map((x, i) => [x.title_key, { ...x, place: i + 1 }]));
	}).catch(() => { if (state.rows === null) state.rows = []; }).finally(() => { state.at = Date.now(); state.busy = null; emit(); });
	return state.busy;
}
var isEn = () => typeof document < "u" && document.documentElement.lang === "en";
function viewers(n, en) {
	return new Intl.NumberFormat(en ? "en-US" : "tr-TR", { notation: "compact", maximumFractionDigits: n < 1e5 ? 1 : 0 }).format(n);
}
function ago(iso, en) {
	let m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 6e4));
	return m < 60 ? (en ? m + " min ago" : m + " dk önce") : (en ? Math.round(m / 60) + " h ago" : Math.round(m / 60) + " sa önce");
}
function price(it, en) {
	if (typeof it.price != "number") return en ? "Check price in store" : "Fiyatı mağazada gör";
	if (it.price === 0) return en ? "Free" : "Ücretsiz";
	try { return new Intl.NumberFormat(en ? "en-US" : "tr-TR", { style: "currency", currency: it.currency || "TRY", maximumFractionDigits: 2 }).format(it.price); }
	catch { return String(it.price); }
}
var STORE = { steam: "Steam", playstation: "PlayStation", xbox: "Xbox", epic: "Epic", gog: "GOG", switch: "Nintendo" };
function createTwitchTop(React, { useExperience }) {
	let { useState, useEffect } = React, h = React.createElement;
	// Yalnız şerit 5 dakikada bir yeniler; kart rozetleri aynı belleği okur, kendi zamanlayıcısı yoktur.
	function useData(poll) {
		let [, tick] = useState(0);
		useEffect(() => {
			let f = () => tick((x) => x + 1);
			subs.add(f); window.addEventListener("radar:lang", f); load();
			let t = poll ? setInterval(() => document.visibilityState === "visible" && load(), REFRESH) : 0;
			return () => { subs.delete(f); window.removeEventListener("radar:lang", f); clearInterval(t); };
		}, []);
		return state;
	}
	let Live = () => h("i", { className: "tw-dot", "aria-hidden": "true" });
	function Art({ row }) {
		let first = row.item.image || row.box_art, [src, setSrc] = useState(first);
		return src ? h("img", { src, alt: "", loading: "lazy", onError: () => setSrc(src !== row.box_art && row.box_art ? row.box_art : null) }) : h("span", { className: "tw-ph" }, row.name.slice(0, 1));
	}
	function Strip() {
		let s = useData(!0), exp = useExperience(), en = isEn();
		if (!s.rows || !s.rows.length) return null;
		let total = s.rows.reduce((a, r) => a + r.viewers, 0);
		return h("section", { className: "twitch-top", "aria-labelledby": "twitch-top-title" },
			h("div", { className: "tw-head" },
				h("div", null,
					h("span", { className: "tw-eyebrow" }, h(Live), en ? "LIVE ON TWITCH" : "TWITCH'TE CANLI"),
					h("h2", { id: "twitch-top-title" }, en ? "Most watched on Twitch right now" : "Şu an Twitch'te en çok izlenenler"),
					h("p", null, (en ? "Live viewers across all streams · updated " : "Tüm canlı yayınlardaki izleyici · ") + ago(s.rows[0].updated_at, en) + (en ? "" : " güncellendi"))),
				h("span", { className: "tw-total", title: en ? "Total viewers of the games below" : "Aşağıdaki oyunların toplam izleyicisi" }, viewers(total, en), h("small", null, en ? "watching" : "izleyici"))),
			h("ol", { className: "tw-rail" }, s.rows.slice(0, 20).map((r, i) => {
				let label = r.viewers.toLocaleString(en ? "en-US" : "tr-TR");
				return h("li", { key: r.twitch_id },
					h("button", { type: "button", className: "tw-open", onClick: () => exp.open(r.item), "aria-label": (i + 1) + ". " + r.item.name + " · " + label + (en ? " viewers" : " izleyici") },
						h("span", { className: "tw-art" },
							h(Art, { row: r }),
							h("b", { className: "tw-rank" }, i + 1),
							h("em", { className: "tw-viewers", title: label + (en ? " live viewers on " : " canlı izleyici · ") + r.streams.toLocaleString(en ? "en-US" : "tr-TR") + (en ? " streams" : " yayın") }, h(Live), viewers(r.viewers, en))),
						h("strong", { translate: "no" }, r.item.name),
						h("small", null, STORE[r.item.platform] || r.item.platform),
						h("span", { className: "tw-price" }, r.item.discountPercent > 0 && h("mark", null, "-%" + r.item.discountPercent), price(r.item, en))));
			})),
			h("p", { className: "tw-note" }, en ? "Source: " : "Kaynak: ", h("a", { href: "https://www.twitch.tv/directory", target: "_blank", rel: "noopener noreferrer" }, "Twitch"), en ? ". Only games in our catalog are listed." : ". Yalnız kataloğumuzdaki oyunlar listelenir."));
	}
	function Badge({ item }) {
		let s = useData(!1), r = item?.titleKey ? s.byKey.get(item.titleKey) : null;
		if (!r) return null;
		let en = isEn(), full = r.viewers.toLocaleString(en ? "en-US" : "tr-TR");
		return h("span", { className: "twchip", title: en ? `#${r.place} on Twitch now · ${full} live viewers` : `Twitch'te şu an #${r.place} · ${full} canlı izleyici` }, h(Live), h("b", null, viewers(r.viewers, en)), en ? " watching" : " izliyor");
	}
	return { Strip, Badge };
}
export { createTwitchTop, load as loadTwitchTop };
