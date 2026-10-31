//#region lib/deal-time.mjs
var e = 36e5, t = 24 * e;
6 * e, 2 * t;
var n = (e) => new Date(e).toLocaleString("tr-TR", {
	timeZone: "Europe/Istanbul",
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit"
});
function r(n) {
	if (n < 6e4) return "1 dakikadan az kaldı";
	let r = Math.floor(n / t), i = Math.floor(n % t / e), a = Math.floor(n % e / 6e4);
	return (r ? r + " gün" + (i ? " " + i + " saat" : "") : i ? i + " saat" + (a ? " " + a + " dk" : "") : a + " dk") + " kaldı";
}
var i = (e) => !!e && Number(e.originalPrice) > Number(e.price) && e.discountPercent > 0;
function a(e, a = Date.now()) {
	if (!i(e)) return null;
	let o = Date.parse(e.discountEndsAt);
	if (!e.discountEndsAt || !Number.isFinite(o)) return {
		known: !1,
		ended: !1,
		ms: null,
		text: "Bitiş tarihi mağazada belirtilmemiş",
		at: null,
		urgent: !1
	};
	let s = o - a;
	return s <= 0 ? {
		known: !0,
		ended: !0,
		ms: 0,
		text: "İndirim süresi doldu · fiyat yenileniyor",
		at: n(o),
		urgent: !1
	} : {
		known: !0,
		ended: !1,
		ms: s,
		text: r(s),
		at: n(o),
		urgent: s <= 2 * t
	};
}
//#endregion
//#region lib/shelf.mjs
var o = {
	ending: 0,
	sale: 1,
	drop: 2
};
function s(e, t, n = Date.now()) {
	let r = !!t && t.currency === e.currency && Number.isFinite(t.price), i = r ? t.price : e.price, o = a(t, n);
	if (o && !o.ended) return {
		glow: o.urgent ? "ending" : "sale",
		percent: t.discountPercent,
		price: i,
		original: t.originalPrice,
		live: r,
		endsKnown: o.known
	};
	if (r && e.price > 0 && t.price < e.price) {
		let n = Math.round((1 - t.price / e.price) * 100);
		if (n >= 1) return {
			glow: "drop",
			percent: n,
			price: i,
			original: e.price,
			live: r,
			endsKnown: !1
		};
	}
	return {
		glow: null,
		percent: 0,
		price: i,
		original: null,
		live: r,
		endsKnown: !1
	};
}
function c(e, t, n = Date.now()) {
	return (e || []).map((e, n) => ({
		game: e,
		offer: t?.[e.id],
		i: n
	})).map((e) => ({
		...e,
		state: s(e.game, e.offer, n)
	})).sort((e, t) => (o[e.state.glow] ?? 3) - (o[t.state.glow] ?? 3) || e.i - t.i);
}
var l = (e) => e.filter((e) => e.state.glow).length, u = (e, t = "TRY") => e == null ? "—" : new Intl.NumberFormat("tr-TR", {
	style: "currency",
	currency: t || "TRY",
	maximumFractionDigits: 2
}).format(e), d = {
	ending: "Bitiyor",
	sale: "İndirimde",
	drop: "Ucuzladı"
}, f = "radar-fav-view", p = () => {
	try {
		return localStorage.getItem("radar-fav-view") === "list" ? "list" : "shelf";
	} catch {
		return "shelf";
	}
};
function m(e, { DealEnds: t, useMinute: n }) {
	let { useMemo: r } = e, i = e.createElement, a = (e) => /* @__PURE__ */ i("svg", {
		width: "17",
		height: "17",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true"
	}, e), o = () => a(/* @__PURE__ */ i(e.Fragment, null, /* @__PURE__ */ i("path", { d: "m16 6 4 14" }), /* @__PURE__ */ i("path", { d: "M12 6v14" }), /* @__PURE__ */ i("path", { d: "M8 8v12" }), /* @__PURE__ */ i("path", { d: "M4 4v16" }))), s = () => a(/* @__PURE__ */ i(e.Fragment, null, /* @__PURE__ */ i("path", { d: "M3 5h.01" }), /* @__PURE__ */ i("path", { d: "M3 12h.01" }), /* @__PURE__ */ i("path", { d: "M3 19h.01" }), /* @__PURE__ */ i("path", { d: "M8 5h13" }), /* @__PURE__ */ i("path", { d: "M8 12h13" }), /* @__PURE__ */ i("path", { d: "M8 19h13" }))), p = () => /* @__PURE__ */ i("svg", {
		width: "15",
		height: "15",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true"
	}, /* @__PURE__ */ i("path", { d: "M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z" }), /* @__PURE__ */ i("path", { d: "M19 15v4" }), /* @__PURE__ */ i("path", { d: "M17 17h4" }));
	function m({ view: e, onChange: t }) {
		let n = (e) => {
			try {
				localStorage.setItem(f, e);
			} catch {}
			t(e);
		};
		return /* @__PURE__ */ i("div", {
			className: "viewtoggle favview",
			role: "group",
			"aria-label": "Görünüm"
		}, /* @__PURE__ */ i("button", {
			type: "button",
			className: e === "shelf" ? "active" : "",
			"aria-pressed": e === "shelf",
			"data-tip": "Vitrin görünümü",
			"aria-label": "Vitrin görünümü",
			onClick: () => n("shelf")
		}, /* @__PURE__ */ i(o, null)), /* @__PURE__ */ i("button", {
			type: "button",
			className: e === "list" ? "active" : "",
			"aria-pressed": e === "list",
			"data-tip": "Liste görünümü",
			"aria-label": "Liste görünümü",
			onClick: () => n("list")
		}, /* @__PURE__ */ i(s, null)));
	}
	function h({ list: e, live: a }) {
		let o = n(), s = r(() => c(e, a, o), [
			e,
			a,
			o
		]), f = l(s);
		return /* @__PURE__ */ i("div", { className: "wishshelf-wrap" }, /* @__PURE__ */ i("p", {
			className: "shelfsummary" + (f ? " lit" : ""),
			role: "status"
		}, /* @__PURE__ */ i(p, null), f ? /* @__PURE__ */ i("span", null, "Rafında " + f + " oyun indirimde") : /* @__PURE__ */ i("span", null, "Şu an rafında indirim yok. İndirime giren oyunun rafı parlar.")), /* @__PURE__ */ i("ul", { className: "wishshelf" }, s.map(({ game: e, offer: n, state: r }) => /* @__PURE__ */ i("li", {
			key: e.id,
			className: "shelfitem" + (r.glow ? " glow-" + r.glow : "")
		}, /* @__PURE__ */ i("a", {
			className: "shelfbox",
			href: e.url,
			target: "_blank",
			rel: "noreferrer",
			"aria-label": e.name + " mağazada aç"
		}, e.image ? /* @__PURE__ */ i("img", {
			src: e.image,
			alt: "",
			loading: "lazy"
		}) : /* @__PURE__ */ i("span", {
			className: "shelfph",
			"aria-hidden": "true"
		}, e.name.slice(0, 1)), r.glow && /* @__PURE__ */ i("span", { className: "shelftag" }, d[r.glow] + " −%" + r.percent)), /* @__PURE__ */ i("span", {
			className: "shelfplank",
			"aria-hidden": "true"
		}), /* @__PURE__ */ i("div", { className: "shelflabel" }, /* @__PURE__ */ i("strong", { title: e.name }, e.name), /* @__PURE__ */ i("span", { className: "shelfprice" }, u(r.price, e.currency), r.original > r.price && /* @__PURE__ */ i("s", null, u(r.original, e.currency))), r.glow === "drop" && /* @__PURE__ */ i("small", null, "Eklediğinden beri ucuzladı"), r.endsKnown && /* @__PURE__ */ i(t, {
			item: n,
			compact: !0
		}), !r.live && /* @__PURE__ */ i("small", null, "Eklerken kaydedilen fiyat"))))));
	}
	return {
		WishShelf: h,
		ViewToggle: m
	};
}
//#endregion
export { f as VIEW_KEY, m as createWishShelf, p as readView };
