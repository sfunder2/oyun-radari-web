//#region lib/community.mjs
var e = "https://dsosckshigzijnsxmlwh.supabase.co", t = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO", n = (e) => Number.isFinite(e) && e >= 0 && e <= 100, r = (e) => !!e && (n(e.user_rating) && e.user_votes > 0 || n(e.critic_rating) && e.critic_votes > 0), i = (e) => e && n(e.user_rating) && e.user_votes >= 5 ? Math.round(e.user_rating) : null, a = (e) => Number.isFinite(e) ? e >= 75 ? "hi" : e >= 50 ? "mid" : "lo" : "", o = (e, t = !1) => Number.isFinite(e) ? Math.round(e).toLocaleString(t ? "en-US" : "tr-TR") : "", s = (e) => e?.slug && /^[a-z0-9-]{1,200}$/.test(e.slug) ? "https://www.igdb.com/games/" + e.slug : "https://www.igdb.com", c = /^[a-z0-9 ]{1,160}$/, l = /* @__PURE__ */ new Map(), u = /* @__PURE__ */ new Set(), d = /* @__PURE__ */ new Set(), f = null, p = !1, m = () => {
	for (let e of d) e();
}, h = (e) => (d.add(e), () => d.delete(e)), g = (e) => l.get(e);
async function _(n) {
	f = null;
	let i = [...u].slice(0, 80);
	for (let e of i) u.delete(e);
	if (u.size && (f = setTimeout(() => _(n), 0)), !(!i.length || p)) {
		try {
			let a = i.map((e) => "\"" + e + "\"").join(","), o = await n(e + "/rest/v1/game_igdb_score?select=title_key,slug,user_rating,user_votes,critic_rating,critic_votes&title_key=in.(" + encodeURIComponent(a) + ")", {
				headers: {
					apikey: t,
					Authorization: "Bearer " + t
				},
				credentials: "omit",
				signal: AbortSignal.timeout(1e4)
			});
			if (o.status === 404) {
				p = !0;
				for (let e of i) l.set(e, null);
				m();
				return;
			}
			if (!o.ok) throw Error("HTTP " + o.status);
			let s = await o.json(), c = new Map(s.map((e) => [e.title_key, e]));
			for (let e of i) {
				let t = c.get(e), n = t ? {
					...t,
					user_rating: t.user_rating == null ? null : Number(t.user_rating),
					critic_rating: t.critic_rating == null ? null : Number(t.critic_rating)
				} : null;
				l.set(e, r(n) ? n : null);
			}
		} catch {
			for (let e of i) l.delete(e);
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
//#region app/score-parts.tsx
var y = () => typeof document < "u" && document.documentElement.lang === "en", b = {
	"Oyun puanları": "Game ratings",
	"Oyuncu puanı": "Player rating",
	"Eleştirmen puanı": "Critic rating",
	oy: "votes",
	eleştiri: "reviews",
	"Henüz puan yok": "No rating yet",
	"Az oy, puan değişebilir": "Few votes, may change",
	Kaynak: "Source",
	"IGDB oyuncu puanı": "IGDB player rating"
}, x = (e) => y() && b[e] || e;
function S(e) {
	let { useEffect: t, useState: n } = e, r = e.createElement;
	function c(e) {
		let [, r] = n(0);
		return t(() => e ? h(() => r((e) => e + 1)) : void 0, [e]), e ? g(e) === void 0 ? v(e) : g(e) : null;
	}
	let l = ({ size: e = 13 }) => /* @__PURE__ */ r("svg", {
		width: e,
		height: e,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2.2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true"
	}, /* @__PURE__ */ r("circle", {
		cx: "9",
		cy: "8",
		r: "3.5"
	}), /* @__PURE__ */ r("path", { d: "M2.5 20a6.5 6.5 0 0 1 13 0" }), /* @__PURE__ */ r("path", { d: "M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" })), u = ({ size: e = 16 }) => /* @__PURE__ */ r("svg", {
		width: e,
		height: e,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2.2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true"
	}, /* @__PURE__ */ r("path", { d: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" }));
	function d({ item: e }) {
		let t = c(e?.titleKey), n = i(t);
		if (n == null) return null;
		let s = y();
		return /* @__PURE__ */ r("span", {
			className: "scorechip " + a(n),
			title: x("IGDB oyuncu puanı") + ": " + n + "/100 · " + o(t.user_votes, s) + " " + x("oy")
		}, /* @__PURE__ */ r(l, null), /* @__PURE__ */ r("b", null, n));
	}
	function f({ item: e }) {
		let t = c(e?.titleKey);
		if (!t) return null;
		let n = y(), i = [[
			"Oyuncu puanı",
			t.user_votes > 0 ? t.user_rating : null,
			t.user_votes,
			"oy"
		], [
			"Eleştirmen puanı",
			t.critic_votes > 0 ? t.critic_rating : null,
			t.critic_votes,
			"eleştiri"
		]];
		return /* @__PURE__ */ r("section", {
			className: "scorepanel",
			"aria-label": x("Oyun puanları")
		}, /* @__PURE__ */ r("div", { className: "scorehead" }, /* @__PURE__ */ r(u, null), /* @__PURE__ */ r("strong", null, x("Oyun puanları"))), /* @__PURE__ */ r("div", { className: "scorecols" }, i.map(([e, t, i, s]) => {
			let c = t == null ? null : Math.round(t);
			return /* @__PURE__ */ r("div", {
				key: e,
				className: c == null ? "none" : a(c)
			}, /* @__PURE__ */ r("small", null, x(e)), /* @__PURE__ */ r("b", null, c ?? "—", c != null && /* @__PURE__ */ r("span", null, "/100")), /* @__PURE__ */ r("i", { "aria-hidden": "true" }, /* @__PURE__ */ r("u", { style: { width: c == null ? "0" : Math.max(3, c) + "%" } })), /* @__PURE__ */ r("em", null, c == null ? x("Henüz puan yok") : o(i, n) + " " + x(s) + (s === "oy" && i < 5 ? " · " + x("Az oy, puan değişebilir") : "")));
		})), /* @__PURE__ */ r("p", { className: "scoresource" }, x("Kaynak"), ": ", /* @__PURE__ */ r("a", {
			href: s(t),
			target: "_blank",
			rel: "noopener noreferrer"
		}, "IGDB")));
	}
	return {
		Badge: d,
		Panel: f,
		useScore: c
	};
}
//#endregion
export { S as createScore };
