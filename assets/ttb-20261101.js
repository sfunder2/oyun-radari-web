//#region lib/community.mjs
var e = "https://dsosckshigzijnsxmlwh.supabase.co", t = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO", n = [
	[
		"short",
		0,
		480
	],
	[
		"medium",
		480,
		1200
	],
	[
		"long",
		1200,
		3e3
	],
	[
		"epic",
		3e3,
		Infinity
	]
], r = {
	short: "Kısa",
	medium: "Orta",
	long: "Uzun",
	epic: "Çok uzun"
}, i = {
	short: "8 saate kadar",
	medium: "8–20 saat",
	long: "20–50 saat",
	epic: "50 saatten fazla"
}, a = (e) => {
	let t = e?.normally_min ?? e?.hastily_min;
	return Number.isFinite(t) && t > 0 ? t : null;
};
function o(e) {
	let t = a(e);
	return t == null ? null : n.find(([, e, n], r) => (r === 0 || t > e) && t <= n)?.[0] ?? null;
}
function s(e, t = !1) {
	if (!Number.isFinite(e) || e <= 0) return "";
	if (e < 60) return Math.max(5, Math.round(e / 5) * 5) + (t ? " min" : " dk");
	let n = e / 60, r = n < 10 ? Math.round(n * 2) / 2 : Math.round(n);
	return (t ? String(r) : String(r).replace(".", ",")) + (t ? " h" : " sa");
}
var c = /^[a-z0-9 ]{1,160}$/, l = /* @__PURE__ */ new Map(), u = /* @__PURE__ */ new Set(), d = /* @__PURE__ */ new Set(), f = null, p = !1, m = () => {
	for (let e of d) e();
}, h = (e) => (d.add(e), () => d.delete(e)), g = (e) => l.get(e);
async function _(n) {
	f = null;
	let r = [...u].slice(0, 80);
	for (let e of r) u.delete(e);
	if (u.size && (f = setTimeout(() => _(n), 0)), !(!r.length || p)) {
		try {
			let i = r.map((e) => "\"" + e + "\"").join(","), o = await n(e + "/rest/v1/game_ttb?select=title_key,igdb_id,hastily_min,normally_min,completely_min,votes&title_key=in.(" + encodeURIComponent(i) + ")", {
				headers: {
					apikey: t,
					Authorization: "Bearer " + t
				},
				credentials: "omit",
				signal: AbortSignal.timeout(1e4)
			});
			if (o.status === 404) {
				p = !0;
				for (let e of r) l.set(e, null);
				m();
				return;
			}
			if (!o.ok) throw Error("HTTP " + o.status);
			let s = await o.json(), c = new Map(s.map((e) => [e.title_key, e]));
			for (let e of r) {
				let t = c.get(e);
				l.set(e, t && a(t) != null ? t : null);
			}
		} catch {
			for (let e of r) l.delete(e);
		}
		m();
	}
}
function v(e, t = globalThis.fetch) {
	if (!e || !c.test(e)) return null;
	if (l.has(e)) return l.get(e);
	if (p) return null;
	u.add(e), f ||= setTimeout(() => _(t), 30);
}
//#endregion
//#region app/ttb-parts.tsx
var y = () => typeof document < "u" && document.documentElement.lang === "en", b = {
	Kısa: "Short",
	Orta: "Medium",
	Uzun: "Long",
	"Çok uzun": "Very long",
	"8 saate kadar": "Up to 8 h",
	"8–20 saat": "8–20 h",
	"20–50 saat": "20–50 h",
	"50 saatten fazla": "Over 50 h",
	"Oyun süresi": "Game length",
	Hepsi: "Any",
	"Ana hikâye": "Main story",
	"Ana + yan içerik": "Main + extras",
	Tamamlama: "Completionist",
	Kaynak: "Source",
	oyuncu: "players",
	"Bitirme süresi": "Time to beat"
}, x = (e) => y() && b[e] || e;
function S(e) {
	return e ? x(r[e] || e) + " · " + x(i[e] || "") : "";
}
function C(e) {
	let { useEffect: t, useState: i } = e, c = e.createElement;
	function l(e) {
		let [, n] = i(0);
		return t(() => e ? h(() => n((e) => e + 1)) : void 0, [e]), e ? g(e) === void 0 ? v(e) : g(e) : null;
	}
	let u = ({ size: e = 13 }) => /* @__PURE__ */ c("svg", {
		width: e,
		height: e,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2.2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true"
	}, /* @__PURE__ */ c("circle", {
		cx: "12",
		cy: "12",
		r: "9"
	}), /* @__PURE__ */ c("path", { d: "M12 7v5l3 2" }));
	function d({ item: e }) {
		let t = l(e?.titleKey);
		if (!t) return null;
		let n = y(), r = a(t);
		return /* @__PURE__ */ c("span", {
			className: "ttbchip " + (o(t) || ""),
			title: x("Ana + yan içerik") + ": " + s(r, n) + " · IGDB"
		}, /* @__PURE__ */ c(u, null), /* @__PURE__ */ c("b", null, s(r, n)));
	}
	function f({ item: e }) {
		let t = l(e?.titleKey);
		if (!t) return null;
		let n = y(), i = o(t), a = [
			["Ana hikâye", t.hastily_min],
			["Ana + yan içerik", t.normally_min],
			["Tamamlama", t.completely_min]
		], d = Math.max(...a.map((e) => e[1] || 0)) || 1;
		return /* @__PURE__ */ c("section", {
			className: "ttbpanel " + (i || ""),
			"aria-label": x("Bitirme süresi")
		}, /* @__PURE__ */ c("div", { className: "ttbhead" }, /* @__PURE__ */ c(u, { size: 16 }), /* @__PURE__ */ c("strong", null, x("Bitirme süresi")), i && /* @__PURE__ */ c("span", { className: "ttbtag" }, x(r[i]))), /* @__PURE__ */ c("div", { className: "ttbcols" }, a.map(([e, t]) => /* @__PURE__ */ c("div", {
			key: e,
			className: t ? "" : "none"
		}, /* @__PURE__ */ c("small", null, x(e)), /* @__PURE__ */ c("b", null, t ? s(t, n) : "—"), /* @__PURE__ */ c("i", { style: { width: t ? Math.max(6, Math.round(t / d * 100)) + "%" : "0" } })))), /* @__PURE__ */ c("p", { className: "ttbsource" }, x("Kaynak"), ": ", /* @__PURE__ */ c("a", {
			href: "https://www.igdb.com",
			target: "_blank",
			rel: "noopener noreferrer"
		}, "IGDB"), t.votes > 0 ? " · " + t.votes + " " + x("oyuncu") : ""));
	}
	function p({ value: e, onChange: t }) {
		return /* @__PURE__ */ c("label", { className: "ttbfilter" }, x("Oyun süresi"), /* @__PURE__ */ c("select", {
			value: e,
			onChange: (e) => t(e.target.value)
		}, /* @__PURE__ */ c("option", { value: "" }, x("Hepsi")), n.map(([e]) => /* @__PURE__ */ c("option", {
			key: e,
			value: e
		}, S(e)))));
	}
	return {
		Badge: d,
		Panel: f,
		Filter: p,
		label: S,
		useTtb: l
	};
}
//#endregion
export { C as createTtb, S as ttbLabel };
