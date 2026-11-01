//#region lib/community.mjs
var e = "https://dsosckshigzijnsxmlwh.supabase.co", t = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO", n = [
	"solo",
	"coop",
	"split",
	"multi",
	"mmo",
	"br"
], r = {
	solo: "Tek kişilik",
	coop: "Co-op",
	split: "Bölünmüş ekran",
	multi: "Çok oyunculu",
	mmo: "MMO",
	br: "Battle royale"
}, i = {
	solo: "Single-player",
	coop: "Co-op",
	split: "Split screen",
	multi: "Multiplayer",
	mmo: "MMO",
	br: "Battle royale"
}, a = [
	"openworld",
	"fantasy",
	"scifi",
	"horror",
	"survival",
	"mystery",
	"thriller",
	"historical",
	"warfare",
	"stealth",
	"comedy",
	"drama",
	"romance",
	"sandbox",
	"party",
	"kids",
	"4x",
	"business",
	"educational",
	"nonfiction"
], o = {
	action: "Aksiyon",
	fantasy: "Fantastik",
	scifi: "Bilim kurgu",
	horror: "Korku",
	thriller: "Gerilim",
	survival: "Hayatta kalma",
	historical: "Tarihî",
	stealth: "Gizlilik",
	comedy: "Komedi",
	business: "İşletme",
	drama: "Dram",
	nonfiction: "Gerçek olaylar",
	sandbox: "Sandbox",
	educational: "Eğitici",
	kids: "Çocuklar için",
	openworld: "Açık dünya",
	warfare: "Savaş",
	party: "Parti",
	"4x": "4X",
	mystery: "Gizem",
	romance: "Romantik"
}, s = {
	action: "Action",
	fantasy: "Fantasy",
	scifi: "Sci-fi",
	horror: "Horror",
	thriller: "Thriller",
	survival: "Survival",
	historical: "Historical",
	stealth: "Stealth",
	comedy: "Comedy",
	business: "Business",
	drama: "Drama",
	nonfiction: "Non-fiction",
	sandbox: "Sandbox",
	educational: "Educational",
	kids: "Kids",
	openworld: "Open world",
	warfare: "Warfare",
	party: "Party",
	"4x": "4X",
	mystery: "Mystery",
	romance: "Romance"
}, c = (e, t = !1) => (t ? i : r)[e] || e, l = (e, t = !1) => (t ? s : o)[e] || e, u = (e) => !!e && ((e.modes || []).length > 0 || (e.themes || []).length > 0), d = /^[a-z0-9 ]{1,160}$/, f = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Set(), m = /* @__PURE__ */ new Set(), h = null, g = !1, _ = () => {
	for (let e of m) e();
}, v = (e) => (m.add(e), () => m.delete(e)), y = (e) => f.get(e);
async function b(n, r) {
	let i = n.map((e) => "\"" + e + "\"").join(","), a = await r(e + "/rest/v1/game_modes?select=title_key,modes,themes&title_key=in.(" + encodeURIComponent(i) + ")", {
		headers: {
			apikey: t,
			Authorization: "Bearer " + t
		},
		credentials: "omit",
		signal: AbortSignal.timeout(1e4)
	});
	if (a.status === 404) return g = !0, null;
	if (!a.ok) throw Error("HTTP " + a.status);
	return a.json();
}
async function x(e) {
	h = null;
	let t = [...p].slice(0, 80);
	for (let e of t) p.delete(e);
	if (p.size && (h = setTimeout(() => x(e), 0)), !(!t.length || g)) {
		try {
			let n = await b(t, e), r = new Map((n || []).map((e) => [e.title_key, e]));
			for (let e of t) {
				let t = r.get(e);
				f.set(e, u(t) ? t : null);
			}
		} catch {
			for (let e of t) f.delete(e);
		}
		_();
	}
}
function S(e, t = globalThis.fetch) {
	if (!e || !d.test(e)) return null;
	if (f.has(e)) return f.get(e);
	if (g) return null;
	p.add(e), h ||= setTimeout(() => x(t), 30);
}
async function C(e, t = globalThis.fetch) {
	let n = [...new Set(e)].filter((e) => e && d.test(e)).slice(0, 160), r = /* @__PURE__ */ new Map(), i = [];
	for (let e of n) if (f.has(e)) {
		let t = f.get(e);
		t && r.set(e, t);
	} else i.push(e);
	if (g) return r;
	for (let e = 0; e < i.length; e += 80) {
		let n = i.slice(e, e + 80), a = await b(n, t);
		if (a === null) break;
		let o = new Map(a.map((e) => [e.title_key, e]));
		for (let e of n) {
			let t = o.get(e);
			f.set(e, u(t) ? t : null), u(t) && r.set(e, t);
		}
	}
	return r;
}
function w(e, t) {
	let r = 0, i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
	for (let { key: n, weight: o = 1 } of e) {
		let e = t.get(n);
		if (!(!e || !(o > 0))) {
			r += o;
			for (let t of new Set(e.modes || [])) i.set(t, (i.get(t) || 0) + o);
			for (let t of new Set(e.themes || [])) t !== "action" && a.set(t, (a.get(t) || 0) + o);
		}
	}
	let o = (e) => r > 0 ? Math.round(e / r * 100) : 0, s = n.filter((e) => i.get(e)).map((e) => ({
		id: e,
		percent: o(i.get(e))
	})).filter((e) => e.percent > 0), c = [...a].sort((e, t) => t[1] - e[1] || e[0].localeCompare(t[0])).slice(0, 6).map(([e, t]) => ({
		id: e,
		percent: o(t)
	})).filter((e) => e.percent > 0), l = (i.get("coop") || 0) >= (i.get("multi") || 0) ? "coop" : "multi", u = o(Math.max(i.get("coop") || 0, i.get("multi") || 0));
	return {
		games: e.filter((e) => t.has(e.key)).length,
		modes: s,
		themes: c,
		social: u > 0 ? l : null,
		socialPercent: u,
		soloPercent: o(i.get("solo") || 0)
	};
}
//#endregion
//#region app/playmodes-parts.tsx
var T = () => typeof document < "u" && document.documentElement.lang === "en", E = {
	"Oyun modu": "Game mode",
	Tema: "Theme",
	Hepsi: "Any",
	"Oyun modu ve tema": "Game modes and themes",
	Kaynak: "Source",
	"Nasıl oynuyorsun": "How you play",
	Temaların: "Your themes",
	"Oyunlarının modu henüz bilinmiyor.": "Game modes of your games are not known yet.",
	"Bir moda ya da temaya bas, o oyunlar açılsın.": "Tap a mode or theme to see those games.",
	"Oyun modlarını ve temaları göster": "Show game modes and themes"
}, D = (e) => T() && E[e] || e, O = (e) => T() ? e + "%" : "%" + e;
function k(e, t) {
	let n = T();
	return t ? e === "mode" ? c(t, n) : D("Tema") + ": " + l(t, n) : "";
}
var A = {
	solo: [["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }], ["circle", {
		cx: "12",
		cy: "7",
		r: "4"
	}]],
	coop: [
		["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
		["path", { d: "M16 3.128a4 4 0 0 1 0 7.744" }],
		["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
		["circle", {
			cx: "9",
			cy: "7",
			r: "4"
		}]
	],
	split: [
		["rect", {
			x: "2",
			y: "4",
			width: "20",
			height: "14",
			rx: "2"
		}],
		["path", { d: "M12 4v14" }],
		["path", { d: "M8 21h8" }]
	],
	multi: [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10"
		}],
		["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }],
		["path", { d: "M2 12h20" }]
	],
	mmo: [
		["path", { d: "M18 21a8 8 0 0 0-16 0" }],
		["circle", {
			cx: "10",
			cy: "8",
			r: "5"
		}],
		["path", { d: "M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" }]
	],
	br: [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10"
		}],
		["line", {
			x1: "22",
			x2: "18",
			y1: "12",
			y2: "12"
		}],
		["line", {
			x1: "6",
			x2: "2",
			y1: "12",
			y2: "12"
		}],
		["line", {
			x1: "12",
			x2: "12",
			y1: "6",
			y2: "2"
		}],
		["line", {
			x1: "12",
			x2: "12",
			y1: "22",
			y2: "18"
		}]
	],
	tag: [["path", { d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" }], ["circle", {
		cx: "7.5",
		cy: "7.5",
		r: ".5",
		fill: "currentColor"
	}]]
};
function j(e) {
	let { useEffect: t, useState: r } = e, i = e.createElement, o = ({ name: e, size: t = 13 }) => /* @__PURE__ */ i("svg", {
		width: t,
		height: t,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2.2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true"
	}, (A[e] || A.tag).map(([e, t], n) => i(e, {
		key: n,
		...t
	})));
	function s(e) {
		let [, n] = r(0);
		if (t(() => e ? v(() => n((e) => e + 1)) : void 0, [e]), !e) return null;
		let i = y(e);
		return i === void 0 ? S(e) : i;
	}
	function u({ item: t }) {
		let n = s(t?.titleKey);
		if (!n) return null;
		let r = n.modes || [], a = T(), l = r.includes("coop") ? "coop" : r.includes("br") ? "br" : r.includes("mmo") ? "mmo" : r.includes("multi") ? "multi" : null, u = r.includes("split");
		if (!l && !u) return null;
		let d = r.map((e) => c(e, a)).join(" · ");
		return /* @__PURE__ */ i("span", {
			className: "gmchip " + (l || "split"),
			title: d + " · IGDB"
		}, l && /* @__PURE__ */ i(e.Fragment, null, /* @__PURE__ */ i(o, { name: l }), /* @__PURE__ */ i("b", null, c(l, a))), u && /* @__PURE__ */ i("span", {
			className: "gmsplit",
			"aria-label": c("split", a)
		}, /* @__PURE__ */ i(o, { name: "split" }), !l && /* @__PURE__ */ i("b", null, c("split", a))));
	}
	function d({ item: e, onPick: t }) {
		let n = s(e?.titleKey);
		if (!n) return null;
		let r = T(), a = n.modes || [], u = (n.themes || []).filter((e) => e !== "action" || n.themes.length === 1), d = (e, n, r, a) => t ? /* @__PURE__ */ i("button", {
			type: "button",
			key: e + n,
			className: "gmtag " + e,
			onClick: () => t({ [e]: n }),
			title: D("Oyun modlarını ve temaları göster")
		}, /* @__PURE__ */ i(o, { name: a }), r) : /* @__PURE__ */ i("span", {
			key: e + n,
			className: "gmtag " + e
		}, /* @__PURE__ */ i(o, { name: a }), r);
		return /* @__PURE__ */ i("section", {
			className: "gmpanel",
			"aria-label": D("Oyun modu ve tema")
		}, /* @__PURE__ */ i("div", { className: "gmhead" }, /* @__PURE__ */ i(o, {
			name: "coop",
			size: 16
		}), /* @__PURE__ */ i("strong", null, D("Oyun modu ve tema"))), a.length > 0 && /* @__PURE__ */ i("div", { className: "gmrow" }, a.map((e) => d("gmode", e, c(e, r), e))), u.length > 0 && /* @__PURE__ */ i("div", { className: "gmrow" }, u.map((e) => d("gtheme", e, l(e, r), "tag"))), /* @__PURE__ */ i("p", { className: "gmsource" }, D("Kaynak"), ": ", /* @__PURE__ */ i("a", {
			href: "https://www.igdb.com",
			target: "_blank",
			rel: "noopener noreferrer"
		}, "IGDB")));
	}
	function f({ mode: t, theme: r, onMode: o, onTheme: s }) {
		let u = T();
		return /* @__PURE__ */ i(e.Fragment, null, /* @__PURE__ */ i("label", { className: "gmfilter" }, D("Oyun modu"), /* @__PURE__ */ i("select", {
			value: t,
			onChange: (e) => o(e.target.value)
		}, /* @__PURE__ */ i("option", { value: "" }, D("Hepsi")), n.map((e) => /* @__PURE__ */ i("option", {
			key: e,
			value: e
		}, c(e, u))))), /* @__PURE__ */ i("label", { className: "gmfilter" }, D("Tema"), /* @__PURE__ */ i("select", {
			value: r,
			onChange: (e) => s(e.target.value)
		}, /* @__PURE__ */ i("option", { value: "" }, D("Hepsi")), [...a].sort((e, t) => l(e, u).localeCompare(l(t, u), u ? "en" : "tr")).map((e) => /* @__PURE__ */ i("option", {
			key: e,
			value: e
		}, l(e, u))))));
	}
	let p = (e) => e > 0 ? 1 + Math.min(4, Math.log2(1 + e / 60)) : .25;
	function m({ favKeys: n = [], steam: a = [], meta: s, onPick: u }) {
		let d = [...n.map((e) => ({
			key: e,
			weight: 2
		})), ...a.slice(0, 200).map((e) => ({
			key: s?.bySteam?.[e.appid]?.titleKey || s?.bySteam?.[String(e.appid)]?.titleKey,
			weight: p(e.minutes || 0)
		})).filter((e) => e.key)], f = d.map((e) => e.key).join("|"), [m, h] = r(null);
		if (t(() => {
			let e = !1;
			if (!d.length) {
				h(/* @__PURE__ */ new Map());
				return;
			}
			return C(d.map((e) => e.key)).then((t) => {
				e || h(t);
			}).catch(() => {
				e || h(/* @__PURE__ */ new Map());
			}), () => {
				e = !0;
			};
		}, [f]), !m) return null;
		let g = w(d, m), _ = T();
		if (!g.games) return null;
		let v = (e) => u && u(e);
		return /* @__PURE__ */ i("article", { className: "dna-card gmdna" }, /* @__PURE__ */ i("h4", null, D("Nasıl oynuyorsun")), /* @__PURE__ */ i("ul", { className: "gmbars" }, g.modes.map((e) => /* @__PURE__ */ i("li", { key: e.id }, /* @__PURE__ */ i("button", {
			type: "button",
			onClick: () => v({ gmode: e.id })
		}, /* @__PURE__ */ i(o, {
			name: e.id,
			size: 16
		}), /* @__PURE__ */ i("span", null, c(e.id, _)), /* @__PURE__ */ i("span", { className: "gmmeter" }, /* @__PURE__ */ i("i", {
			className: e.id,
			style: { width: Math.max(4, e.percent) + "%" }
		})), /* @__PURE__ */ i("em", null, O(e.percent)))))), g.themes.length > 0 && /* @__PURE__ */ i(e.Fragment, null, /* @__PURE__ */ i("h4", { className: "gmsub" }, D("Temaların")), /* @__PURE__ */ i("div", { className: "dna-vibes gmthemes" }, g.themes.map((e) => /* @__PURE__ */ i("button", {
			key: e.id,
			type: "button",
			onClick: () => v({ gtheme: e.id })
		}, l(e.id, _), " ", /* @__PURE__ */ i("small", null, O(e.percent)))))), /* @__PURE__ */ i("p", { className: "dna-hint" }, D("Bir moda ya da temaya bas, o oyunlar açılsın.")));
	}
	return {
		Badge: u,
		Panel: d,
		Filters: f,
		DnaCard: m,
		label: k,
		useModes: s
	};
}
//#endregion
export { j as createPlayModes, k as playModeLabel };
