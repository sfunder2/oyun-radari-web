//#region lib/igdb-info.mjs
// IGDB çıkış tarihi ve fragman verisi (game_igdb_info, şema v42). Tablo yoksa (404) her şey sessizce kapanır ve
// mağaza verisi olduğu gibi kullanılır.
var SB = "https://dsosckshigzijnsxmlwh.supabase.co", KEY = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO";
var KEY_RE = /^[a-z0-9 ]{1,160}$/, YT_RE = /^[A-Za-z0-9_-]{11}$/, DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
var cache = /* @__PURE__ */ new Map(), queue = /* @__PURE__ */ new Set(), subs = /* @__PURE__ */ new Set(), timer = null, off = !1;
var SELECT = "title_key,release_date,release_precision,platform_dates,trailer_youtube,trailer_name";
var emit = () => {
	for (let e of subs) e();
};
var isEn = () => typeof document < "u" && document.documentElement.lang === "en";
var trToday = (e = Date.now()) => new Date(e + 3 * 36e5).toISOString().slice(0, 10);
var addDays = (e, t) => new Date(Date.parse(e + "T00:00:00Z") + t * 864e5).toISOString().slice(0, 10);
function clean(e) {
	if (!e || typeof e != "object") return null;
	let t = e.platform_dates && typeof e.platform_dates == "object" ? e.platform_dates : {}, n = {};
	for (let [e, r] of Object.entries(t)) DAY_RE.test(String(r)) && (n[e] = r);
	return {
		releaseDate: DAY_RE.test(String(e.release_date || "")) ? e.release_date : null,
		precision: e.release_precision || null,
		platformDates: n,
		trailer: YT_RE.test(String(e.trailer_youtube || "")) ? e.trailer_youtube : null,
		trailerName: typeof e.trailer_name == "string" ? e.trailer_name.slice(0, 120) : null
	};
}
async function fetchKeys(e, t = globalThis.fetch) {
	let n = /* @__PURE__ */ new Map();
	for (let r = 0; r < e.length; r += 100) {
		let i = e.slice(r, r + 100), a = await t(SB + "/rest/v1/game_igdb_info?select=" + SELECT + "&igdb_id=not.is.null&title_key=in.(" + encodeURIComponent(i.map((e) => "\"" + e + "\"").join(",")) + ")", {
			headers: {
				apikey: KEY,
				Authorization: "Bearer " + KEY
			},
			credentials: "omit",
			signal: AbortSignal.timeout(8e3)
		});
		if (a.status === 404) {
			off = !0;
			for (let t of e) cache.set(t, null);
			return n;
		}
		if (!a.ok) throw Error("HTTP " + a.status);
		for (let e of await a.json()) n.set(e.title_key, clean(e));
		for (let e of i) cache.set(e, n.get(e) || null);
	}
	return n;
}
async function flush(e) {
	timer = null;
	let t = [...queue].slice(0, 100);
	for (let e of t) queue.delete(e);
	if (queue.size && (timer = setTimeout(() => flush(e), 0)), !t.length || off) return;
	try {
		await fetchKeys(t, e);
	} catch {
		for (let e of t) cache.delete(e);
	}
	emit();
}
/** Tek başlık anahtarı için bilgi: undefined = yükleniyor, null = yok. */
function infoFor(e, t = globalThis.fetch) {
	if (!e || !KEY_RE.test(e)) return null;
	if (cache.has(e)) return cache.get(e);
	if (off) return null;
	queue.add(e), timer ||= setTimeout(() => flush(t), 30);
}
var MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"], MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** Gün kesinliği olmayan çıkış için okunur metin: "2027", "2027 3. çeyrek" / "Q3 2027", "Mart 2027", "Tarih açıklanmadı". */
function periodText(e, t = isEn()) {
	if (!e) return null;
	if (e.precision === "tbd") return t ? "Release date not announced" : "Çıkış tarihi açıklanmadı";
	if (!e.releaseDate) return null;
	let n = e.releaseDate.slice(0, 4), r = +e.releaseDate.slice(5, 7);
	return e.precision === "year" ? n : e.precision === "quarter" ? t ? "Q" + Math.ceil(r / 3) + " " + n : n + " " + Math.ceil(r / 3) + ". çeyrek" : e.precision === "month" ? (t ? MONTHS_EN : MONTHS_TR)[r - 1] + " " + n : null;
}
var GENERIC = /^(to be announced|coming soon|tba|tbd|yakında|çok yakında|duyurulacak)$/i;
/** Mağazaların "yer tutucu" tarihi: Nintendo yılı belli, günü belli olmayan oyunlara 31 Aralık yazar. */
var isPlaceholder = (e) => (e.platform || "steam") === "switch" && /-12-31$/.test(String(e.releaseDate || ""));
/** Çıkış satırlarını IGDB ile düzeltir (mağaza satırları değişmez, yeni nesne döner):
 *  - Tarihi olmayan satır: aynı platform ailesinin IGDB'deki kesin tarihi varsa o yazılır; yoksa IGDB'nin dönem bilgisi
 *    ("2027 3. çeyrek") mağazanın genel metninin ("To be announced", "Coming soon") yerine geçer.
 *  - Nintendo'nun 31 Aralık yer tutucusu: IGDB'de Switch tarihi varsa o, yoksa tarih kaldırılır ve yalnız yıl gösterilir
 *    (sahte geri sayım başlamasın).
 *  - Xbox satırı: Xbox araması tarih vermediğinde başka mağazanın tarihi kullanılır; IGDB'de Xbox'a özel kesin tarih
 *    varsa o tercih edilir. Steam ve PlayStation'ın kendi tarihleri değiştirilmez.
 *  Düzeltilen satırda dateSource = "igdb", storeDate = mağazanın tarihi olur. */
function applyInfo(e, t, n = trToday(), r = isEn()) {
	let i = addDays(n, -6);
	return e.map((e) => {
		let a = e.titleKey && t.get(e.titleKey);
		if (!a) return e;
		let o = e.platform || "steam", s = a.platformDates[o], c = s && s >= i ? s : null;
		if (!e.releaseDate || isPlaceholder(e)) {
			if (c) return {
				...e,
				releaseDate: c,
				releaseText: null,
				dateSource: "igdb",
				storeDate: e.releaseDate || null
			};
			let t = a.precision && a.precision !== "day" ? periodText(a, r) : null;
			if (isPlaceholder(e)) {
				let n = e.releaseDate.slice(0, 4), r = t && a.releaseDate && a.releaseDate.slice(0, 4) >= n ? t : n;
				return {
					...e,
					releaseDate: null,
					releaseText: r,
					dateSource: "igdb",
					storeDate: e.releaseDate
				};
			}
			return t && (!e.releaseText || GENERIC.test(String(e.releaseText).trim())) ? {
				...e,
				releaseText: t,
				dateSource: "igdb"
			} : e;
		}
		return o === "xbox" && c && c !== e.releaseDate ? {
			...e,
			releaseDate: c,
			releaseText: null,
			dateSource: "igdb",
			storeDate: e.releaseDate
		} : e;
	});
}
async function fixReleases(e, t = globalThis.fetch) {
	if (!Array.isArray(e) || !e.length || off) return e;
	try {
		let n = [...new Set(e.map((e) => e.titleKey).filter((e) => e && KEY_RE.test(e)))], r = n.filter((e) => !cache.has(e));
		r.length && await fetchKeys(r, t);
		let i = new Map(n.map((e) => [e, cache.get(e)]).filter(([, e]) => e));
		return i.size ? applyInfo(e, i) : e;
	} catch {
		return e;
	}
}
//#endregion
//#region app/igdb-parts.tsx
var TXT = {
	"Fragmanı izle": "Watch trailer",
	"Fragmanı kapat": "Close trailer",
	Fragman: "Trailer",
	"Fragman · YouTube": "Trailer · YouTube",
	"Kaynak": "Source",
	"Tarih IGDB'den": "Date from IGDB",
	"Mağazada tarihi olmayan ya da yer tutucu tarih gösteren oyunların tarihi IGDB'den tamamlanır.": "Missing or placeholder store dates are filled in from IGDB."
}, tx = (e) => isEn() && TXT[e] || e;
function createIgdbParts(e) {
	let { useEffect: t, useState: n } = e, r = e.createElement;
	function useInfo(e) {
		let [, r] = n(0);
		return t(() => {
			if (!e) return;
			let t = () => r((e) => e + 1);
			return subs.add(t), () => {
				subs.delete(t);
			};
		}, [e]), e ? cache.has(e) ? cache.get(e) : infoFor(e) : null;
	}
	let a = ({ size: e = 16 }) => /* @__PURE__ */ r("svg", {
		width: e,
		height: e,
		viewBox: "0 0 24 24",
		fill: "currentColor",
		"aria-hidden": "true"
	}, /* @__PURE__ */ r("path", { d: "M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" }));
	/** YouTube oynatıcı: çerezsiz alan adı; yalnız kullanıcı tıklayınca yüklenir. */
	function Player({ id: e, name: t, autoplay: n = !0 }) {
		return /* @__PURE__ */ r("div", { className: "igdb-player" }, /* @__PURE__ */ r("iframe", {
			src: "https://www.youtube-nocookie.com/embed/" + e + "?rel=0&playsinline=1&modestbranding=1" + (n ? "&autoplay=1" : ""),
			title: (t ? t + " — " : "") + tx("Fragman"),
			allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
			allowFullScreen: !0,
			loading: "lazy",
			referrerPolicy: "strict-origin-when-cross-origin"
		}));
	}
	/** Oyun ayrıntısı: mağazanın kendi fragmanı yoksa IGDB'deki YouTube fragmanı (kapak resmi + oynat düğmesi). */
	function Trailer({ item: e }) {
		let i = useInfo(e?.titleKey), [s, o] = n(!1);
		if (t(() => o(!1), [e?.titleKey]), !i?.trailer) return null;
		let c = i;
		return /* @__PURE__ */ r("section", {
			className: "igdb-trailer",
			"aria-label": tx("Fragman")
		}, s ? /* @__PURE__ */ r(Player, {
			id: c.trailer,
			name: e.name
		}) : /* @__PURE__ */ r("button", {
			type: "button",
			className: "igdb-poster",
			onClick: () => o(!0),
			"aria-label": tx("Fragmanı izle") + ": " + (e.name || "")
		}, /* @__PURE__ */ r("img", {
			src: "https://i.ytimg.com/vi/" + c.trailer + "/hqdefault.jpg",
			alt: "",
			loading: "lazy"
		}), /* @__PURE__ */ r("span", { className: "igdb-play" }, /* @__PURE__ */ r(a, { size: 22 })), /* @__PURE__ */ r("span", { className: "igdb-label" }, /* @__PURE__ */ r("b", null, tx("Fragmanı izle")), c.trailerName && /* @__PURE__ */ r("small", null, c.trailerName))), /* @__PURE__ */ r("p", { className: "igdb-source" }, tx("Fragman · YouTube"), " · ", tx("Kaynak"), ": ", /* @__PURE__ */ r("a", {
			href: "https://www.igdb.com",
			target: "_blank",
			rel: "noopener noreferrer"
		}, "IGDB")));
	}
	/** Geri sayım kartı: fragman düğmesi (yalnız fragman varsa görünür). */
	function TrailerToggle({ titleKey: e, open: t, onToggle: n }) {
		let i = useInfo(e);
		return i?.trailer ? /* @__PURE__ */ r("button", {
			type: "button",
			className: "rc-trailer" + (t ? " on" : ""),
			"aria-expanded": t,
			onClick: n
		}, /* @__PURE__ */ r(a, { size: 14 }), tx(t ? "Fragmanı kapat" : "Fragmanı izle")) : null;
	}
	function CountdownPlayer({ titleKey: e, name: t }) {
		let n = useInfo(e);
		return n?.trailer ? /* @__PURE__ */ r("div", { className: "rc-player" }, /* @__PURE__ */ r(Player, {
			id: n.trailer,
			name: t
		})) : null;
	}
	return {
		Trailer,
		TrailerToggle,
		CountdownPlayer,
		useInfo,
		tx
	};
}
//#endregion
export { applyInfo, createIgdbParts, fixReleases, periodText };
