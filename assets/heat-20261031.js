var e = (e) => typeof e == "number" && Number.isFinite(e);
function t({ price: t, base: n, lowest: r, lowest30d: i, days: a }) {
	if (!e(t) || t <= 0) return null;
	let o = e(a) ? Math.max(0, Math.floor(a)) : 0;
	if (o < 14 || !e(r) || r <= 0) return {
		level: "collecting",
		fill: 0,
		lowest: null,
		days: o,
		atLow: !1
	};
	let s = Math.min(r, t), c = Math.max(t, e(n) ? n : 0), l = t <= s * 1.005;
	if (c <= s * 1.005) return {
		level: "cold",
		fill: .12,
		lowest: s,
		days: o,
		atLow: !1,
		neverDropped: !0
	};
	let u = Math.min(1, Math.max(0, (c - t) / (c - s))), d = e(i) && t <= i * 1.005 && t < c, f = l || u >= .8 ? "hot" : u >= .35 || d ? "warm" : "cold";
	return {
		level: f,
		fill: f === "hot" ? Math.max(.8, u) : f === "warm" ? Math.min(.62, Math.max(.4, u)) : Math.min(.3, Math.max(.12, u)),
		lowest: s,
		days: o,
		atLow: l
	};
}
function n(e) {
	return !e || e.platform !== "playstation" ? null : t({
		price: e.price,
		base: e.originalPrice,
		lowest: e.lowestEver,
		lowest30d: e.lowest30d,
		days: e.historyDays
	});
}
var r = {
	hot: "Sıcak fırsat",
	warm: "Ilık",
	cold: "Soğuk",
	collecting: "Veri toplanıyor"
}, i = (e, t = "TRY") => new Intl.NumberFormat("tr-TR", {
	style: "currency",
	currency: [
		"TRY",
		"USD",
		"EUR"
	].includes(t) ? t : "TRY",
	maximumFractionDigits: e >= 100 ? 0 : 2
}).format(e);
function a(e, t) {
	return e.level === "collecting" ? `${e.days}/14 gün` : e.level === "hot" ? e.atLow ? "En ucuz hâli" : "En ucuza çok yakın" : e.level === "warm" ? `Daha ucuzu: ${i(e.lowest, t)}` : e.neverDropped ? "Hiç düşmedi" : `Önceden ${i(e.lowest, t)}`;
}
function o(e, t) {
	return e.level === "collecting" ? e.days > 0 ? `Fiyatı ${e.days} gündür izliyoruz; 14 gün dolunca söyleyeceğiz` : "Fiyatı izlemeye yeni başladık" : e.level === "hot" ? e.atLow ? "Şimdiye kadar gördüğümüz en ucuz fiyat" : `En ucuz fiyata çok yakın: ${i(e.lowest, t)}` : e.level === "warm" ? `Daha ucuzu görüldü: ${i(e.lowest, t)}` : e.neverDropped ? "Bu fiyat hiç düşmedi; beklemek iyi olabilir" : `Daha önce ${i(e.lowest, t)} oldu; beklemek iyi olabilir`;
}
function s(e) {
	let t = e.createElement;
	function i({ fill: e, size: n = 24 }) {
		let r = 14 * e;
		return /* @__PURE__ */ t("svg", {
			className: "thermo",
			width: n * .55,
			height: n,
			viewBox: "0 0 12 24",
			"aria-hidden": "true"
		}, /* @__PURE__ */ t("rect", {
			x: "3.5",
			y: "1",
			width: "5",
			height: "17",
			rx: "2.5",
			className: "thermo-tube"
		}), /* @__PURE__ */ t("rect", {
			x: "4.75",
			y: 17 - r,
			width: "2.5",
			height: r + 2,
			rx: "1.25",
			className: "thermo-fill"
		}), /* @__PURE__ */ t("circle", {
			cx: "6",
			cy: "19",
			r: "4",
			className: "thermo-bulb"
		}));
	}
	function s({ heat: e, currency: n = "TRY", detail: s = !1, long: c = !1 }) {
		if (!e) return null;
		let l = r[e.level], u = o(e, n);
		return s ? /* @__PURE__ */ t("div", {
			className: "heatpanel " + e.level,
			role: "group",
			"aria-label": "Fiyat sıcaklığı"
		}, /* @__PURE__ */ t(i, {
			fill: e.level === "collecting" ? 0 : e.fill,
			size: 44
		}), /* @__PURE__ */ t("div", { className: "heatbody" }, /* @__PURE__ */ t("small", null, "Fiyat sıcaklığı"), /* @__PURE__ */ t("strong", null, l), /* @__PURE__ */ t("p", null, u), e.level !== "collecting" && /* @__PURE__ */ t("div", { className: "heatscale" }, /* @__PURE__ */ t("div", { className: "heattrack" }, [
			["cold", "Soğuk"],
			["warm", "Ilık"],
			["hot", "Sıcak"]
		].map(([n, r]) => /* @__PURE__ */ t("span", {
			key: n,
			className: "zone " + n + (n === e.level ? " on" : "")
		}, r))), /* @__PURE__ */ t("i", {
			className: "heatmark",
			style: { left: `${Math.round(Math.min(.95, Math.max(.05, e.fill)) * 100)}%` },
			"aria-hidden": "true"
		})))) : /* @__PURE__ */ t("span", {
			className: "priceheat " + e.level + (c ? " long" : ""),
			title: u
		}, /* @__PURE__ */ t(i, {
			fill: e.level === "collecting" ? 0 : e.fill,
			size: 20
		}), /* @__PURE__ */ t("b", null, l), /* @__PURE__ */ t("span", null, c ? u : a(e, n)));
	}
	function c({ item: e, long: r = !1 }) {
		return /* @__PURE__ */ t(s, {
			heat: n(e),
			currency: e?.currency || "TRY",
			long: r
		});
	}
	return {
		HeatGauge: s,
		PriceHeat: c
	};
}
//#endregion
export { s as createPriceHeat };
