//#region lib/community.mjs
var e = "https://dsosckshigzijnsxmlwh.supabase.co", t = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO", n = /^[0-9a-f]{32}$/, r = "radar-party-voter", i = "radar-party-lists", a = "radar-party-name", o = {
	login_required: "Ortak liste kurmak için giriş yap.",
	too_many_lists: "En çok 10 ortak listen olabilir. Eskilerden birini silip tekrar dene.",
	list_full: "Listede en çok 30 oyun olabilir.",
	too_many_voters: "Bu listede 20 kişi oy verdi; daha fazla oy alınamıyor.",
	invalid_game: "Bu oyun listede bulunamadı.",
	owner_only: "Bunu yalnız listeyi kuran kişi yapabilir.",
	not_found: "Bu ortak liste bulunamadı. Silinmiş ya da bağlantı eksik kopyalanmış olabilir."
};
function s(e) {
	let t = String(e || "");
	for (let e of Object.keys(o)) if (t.includes(e)) return o[e];
	return "Ortak liste şu an güncellenemedi. Biraz sonra tekrar dene.";
}
async function c(n, r, i) {
	let a = await fetch(e + "/rest/v1/rpc/" + n, {
		method: "POST",
		headers: {
			apikey: t,
			Authorization: "Bearer " + (i?.access_token || "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO"),
			"Content-Type": "application/json"
		},
		body: JSON.stringify(r),
		signal: AbortSignal.timeout(15e3)
	}), o = await a.json().catch(() => null);
	if (!a.ok) throw Error(s(o?.message));
	return o;
}
var l = (e, t) => c("party_get", {
	p_id: e,
	p_voter: x()
}, t), u = (e, t, n) => c("party_create", {
	p_title: e,
	p_games: t.map(p).filter(Boolean)
}, n), d = (e, t, n, r) => c("party_update", {
	p_id: e,
	p_action: t,
	p_voter: x(),
	p_name: S() || null,
	...n
}, r), f = (e) => {
	try {
		let t = new URL(e);
		return t.protocol === "https:" ? t.href : void 0;
	} catch {
		return;
	}
};
function p(e) {
	if (!e || typeof e.id != "string" || !e.id || typeof e.name != "string" || !e.name.trim()) return null;
	let t = {
		id: e.id.slice(0, 160),
		name: e.name.trim().slice(0, 180)
	}, n = f(e.image), r = f(e.url);
	return n && n.length <= 500 && (t.image = n), r && r.length <= 500 && (t.url = r), t;
}
var m = /(^|\.)(steampowered\.com|playstation\.com|xbox\.com|microsoft\.com|nintendo\.com|epicgames\.com|gog\.com)$/;
function h(e) {
	try {
		let t = new URL(e);
		return t.protocol === "https:" && m.test(t.hostname) ? t.href : null;
	} catch {
		return null;
	}
}
function g(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let e of Array.isArray(t) ? t : []) {
		if (!e || typeof e.g != "string") continue;
		let t = n.get(e.g) || {
			count: 0,
			names: []
		};
		t.count++, e.n && t.names.push(String(e.n)), n.set(e.g, t);
	}
	let r = (Array.isArray(e) ? e : []).map((e, t) => ({
		game: e,
		i: t,
		count: n.get(e.id)?.count || 0,
		names: n.get(e.id)?.names || []
	})), i = r.reduce((e, t) => e + t.count, 0), a = r.reduce((e, t) => Math.max(e, t.count), 0);
	return {
		rows: [...r].sort((e, t) => t.count - e.count || e.i - t.i),
		total: i,
		leaders: a ? r.filter((e) => e.count === a).map((e) => e.game) : []
	};
}
function _(e, t) {
	if (!e.length) return null;
	if (e.length === 1) return e[0];
	let n = 2166136261;
	for (let r of String(t) + e.map((e) => e.id).join("|")) n ^= r.charCodeAt(0), n = Math.imul(n, 16777619) >>> 0;
	return e[n % e.length];
}
function v(e, t) {
	let n = new URL(t);
	return n.search = "", n.hash = "", n.searchParams.set("section", "party"), n.searchParams.set("alan", e), n.href;
}
function y(e) {
	let t = new URLSearchParams(e), r = t.get("liste") || (t.get("section") === "party" ? t.get("alan") : "");
	return r && n.test(r) ? r : "";
}
function b() {
	try {
		return typeof localStorage > "u" ? null : localStorage;
	} catch {
		return null;
	}
}
function x() {
	let e = b(), t = "";
	try {
		t = e?.getItem(r) || "";
	} catch {}
	if (n.test(t)) return t;
	let i = new Uint8Array(16);
	crypto.getRandomValues(i), t = [...i].map((e) => e.toString(16).padStart(2, "0")).join("");
	try {
		e?.setItem(r, t);
	} catch {}
	return t;
}
function S() {
	try {
		return (b()?.getItem(a) || "").slice(0, 24);
	} catch {
		return "";
	}
}
function C(e) {
	try {
		b()?.setItem(a, String(e || "").slice(0, 24));
	} catch {}
}
function w() {
	try {
		let e = JSON.parse(b()?.getItem(i) || "[]");
		return Array.isArray(e) ? e.filter((e) => e && n.test(e.id)).slice(0, 20) : [];
	} catch {
		return [];
	}
}
function T(e, t) {
	if (!n.test(e)) return;
	let r = [{
		id: e,
		title: String(t || "").slice(0, 60),
		at: Date.now()
	}, ...w().filter((t) => t.id !== e)].slice(0, 20);
	try {
		b()?.setItem(i, JSON.stringify(r));
	} catch {}
}
function E(e) {
	try {
		b()?.setItem(i, JSON.stringify(w().filter((t) => t.id !== e)));
	} catch {}
}
//#endregion
//#region app/Party.tsx
var D = 2e4, O = "radar-party-pending", k = "radar-fav-v3", A = (e) => window.dispatchEvent(new CustomEvent("radar:navigate", { detail: e })), j = () => typeof document < "u" && document.documentElement.lang === "en", M = {
	"Bu akşam ne oynasak?": "What should we play tonight?",
	"Tüm oylar sıfırlansın mı? Oyunlar listede kalır.": "Reset all votes? The games stay on the list.",
	"Bu ortak liste herkes için silinsin mi? Geri alınamaz.": "Delete this shared list for everyone? This cannot be undone.",
	"listeden çıkarılsın mı? Bu oyuna verilen oylar da silinir.": "be removed from the list? Votes for this game are removed too."
}, N = (e) => j() && M[e] || e, P = (e, t = "") => window.confirm(t ? j() ? "Should " + t + " " + N(e) : t + " " + e : N(e)), F = () => {
	try {
		let e = JSON.parse(localStorage.getItem(k) || "[]");
		return Array.isArray(e) ? e : [];
	} catch {
		return [];
	}
}, I = {
	users: [
		["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
		["path", { d: "M16 3.128a4 4 0 0 1 0 7.744" }],
		["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
		["circle", {
			cx: "9",
			cy: "7",
			r: "4"
		}]
	],
	link: [
		["path", { d: "M9 17H7A5 5 0 0 1 7 7h2" }],
		["path", { d: "M15 7h2a5 5 0 1 1 0 10h-2" }],
		["line", {
			x1: "8",
			x2: "16",
			y1: "12",
			y2: "12"
		}]
	],
	copy: [["rect", {
		width: "14",
		height: "14",
		x: "8",
		y: "8",
		rx: "2",
		ry: "2"
	}], ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]],
	share: [
		["circle", {
			cx: "18",
			cy: "5",
			r: "3"
		}],
		["circle", {
			cx: "6",
			cy: "12",
			r: "3"
		}],
		["circle", {
			cx: "18",
			cy: "19",
			r: "3"
		}],
		["line", {
			x1: "8.59",
			x2: "15.42",
			y1: "13.51",
			y2: "17.49"
		}],
		["line", {
			x1: "15.41",
			x2: "8.59",
			y1: "6.51",
			y2: "10.49"
		}]
	],
	trash: [
		["path", { d: "M10 11v6" }],
		["path", { d: "M14 11v6" }],
		["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }],
		["path", { d: "M3 6h18" }],
		["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]
	],
	plus: [["path", { d: "M5 12h14" }], ["path", { d: "M12 5v14" }]],
	crown: [["path", { d: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" }], ["path", { d: "M5 21h14" }]],
	vote: [
		["path", { d: "m9 12 2 2 4-4" }],
		["path", { d: "M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z" }],
		["path", { d: "M22 19H2" }]
	],
	back: [["path", { d: "m12 19-7-7 7-7" }], ["path", { d: "M19 12H5" }]],
	refresh: [
		["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }],
		["path", { d: "M21 3v5h-5" }],
		["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }],
		["path", { d: "M8 16H3v5" }]
	],
	arrow: [["path", { d: "M7 7h10v10" }], ["path", { d: "M7 17 17 7" }]],
	shuffle: [
		["path", { d: "m18 14 4 4-4 4" }],
		["path", { d: "m18 2 4 4-4 4" }],
		["path", { d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" }],
		["path", { d: "M2 6h1.972a4 4 0 0 1 3.6 2.2" }],
		["path", { d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" }]
	],
	x: [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]]
};
function ee(e, { useExperience: t }) {
	let { useEffect: n, useRef: r, useState: i } = e, a = e.createElement, o = (e) => function({ size: t = 16, ...n }) {
		return a("svg", {
			width: t,
			height: t,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": n["aria-label"] ? void 0 : !0,
			role: n["aria-label"] ? "img" : void 0,
			...n
		}, ...I[e].map(([e, t], n) => a(e, {
			...t,
			key: n
		})));
	}, s = o("users"), c = o("link"), f = o("copy"), m = o("share"), b = o("trash"), x = o("plus"), j = o("crown"), M = o("vote"), ee = o("back"), L = o("refresh"), te = o("arrow"), ne = o("shuffle"), R = o("x");
	function z() {
		let [e, t] = i(F);
		return n(() => {
			let e = (e) => {
				e.key === k && t(F());
			};
			return window.addEventListener("storage", e), () => window.removeEventListener("storage", e);
		}, []), e;
	}
	function B({ title: e, text: t, action: n }) {
		return /* @__PURE__ */ a("div", { className: "party-empty" }, /* @__PURE__ */ a(s, { size: 28 }), /* @__PURE__ */ a("h3", null, e), /* @__PURE__ */ a("p", null, t), n);
	}
	function V() {
		let [e, t] = i(() => typeof window > "u" ? "" : y(location.search));
		n(() => {
			let e = new URL(location.href);
			if (e.searchParams.has("liste")) {
				let t = y(e.search);
				e.searchParams.delete("liste"), e.searchParams.set("section", "party"), t && e.searchParams.set("alan", t), history.replaceState(history.state, "", e);
			}
			let n = () => t(y(location.search));
			return window.addEventListener("popstate", n), window.addEventListener("radar:space-tab", n), () => {
				window.removeEventListener("popstate", n), window.removeEventListener("radar:space-tab", n);
			};
		}, []);
		let r = (e) => {
			let n = new URL(location.href);
			n.searchParams.set("section", "party"), e ? n.searchParams.set("alan", e) : n.searchParams.delete("alan"), history.pushState({ radarTab: "party" }, "", n), t(e), window.scrollTo({
				top: 0,
				behavior: "instant"
			});
		};
		return e ? /* @__PURE__ */ a(U, {
			key: e,
			id: e,
			onBack: () => r("")
		}) : /* @__PURE__ */ a(H, { onOpen: r });
	}
	function H({ onOpen: r }) {
		let o = t(), l = z(), [d, f] = i(""), [m, h] = i([]), [g, _] = i(!1), [v, y] = i(""), [b, S] = i(w);
		n(() => {
			try {
				let e = p(JSON.parse(sessionStorage.getItem(O) || "null"));
				sessionStorage.removeItem(O), e && h([e]);
			} catch {}
		}, []);
		let C = [...m.filter((e) => !l.some((t) => t.id === e.id)), ...l.map(p).filter(Boolean)], D = (e) => m.some((t) => t.id === e);
		async function k() {
			_(!0), y("");
			let e = d.trim() || N("Bu akşam ne oynasak?");
			try {
				let t = await u(e, m, o.session);
				T(t, e), r(t);
			} catch (e) {
				y(e instanceof Error ? e.message : "Liste kurulamadı");
			} finally {
				_(!1);
			}
		}
		return /* @__PURE__ */ a("section", { className: "party" }, /* @__PURE__ */ a("div", { className: "party-intro" }, /* @__PURE__ */ a("span", { className: "eyebrow" }, "ARKADAŞLA ORTAK LİSTE"), /* @__PURE__ */ a("h2", null, "Bu akşam ne oynuyoruz?"), /* @__PURE__ */ a("p", null, "Bir liste kur, bağlantıyı arkadaşlarına gönder. Birlikte oyun ekleyin, herkes bir oy versin; en çok oyu alan oyun kazanır.")), /* @__PURE__ */ a("div", { className: "party-card party-create" }, /* @__PURE__ */ a("h3", null, /* @__PURE__ */ a(x, { size: 18 }), "Yeni ortak liste"), o.session ? /* @__PURE__ */ a(e.Fragment, null, /* @__PURE__ */ a("label", { className: "party-field" }, /* @__PURE__ */ a("span", null, "Listenin adı"), /* @__PURE__ */ a("input", {
			maxLength: 60,
			value: d,
			onChange: (e) => f(e.target.value),
			placeholder: "Bu akşam ne oynasak?"
		})), /* @__PURE__ */ a("fieldset", { className: "party-pick" }, /* @__PURE__ */ a("legend", null, "Başlangıç oyunları ", /* @__PURE__ */ a("small", null, m.length + "/30 · isteğe bağlı")), C.length ? /* @__PURE__ */ a("div", { className: "party-chips" }, C.slice(0, 60).map((e) => /* @__PURE__ */ a("button", {
			type: "button",
			key: e.id,
			"aria-pressed": D(e.id),
			disabled: !D(e.id) && m.length >= 30,
			onClick: () => h((t) => D(e.id) ? t.filter((t) => t.id !== e.id) : [...t, e])
		}, e.image ? /* @__PURE__ */ a("img", {
			src: e.image,
			alt: "",
			loading: "lazy",
			onError: (e) => {
				e.currentTarget.style.visibility = "hidden";
			}
		}) : /* @__PURE__ */ a("i", null), /* @__PURE__ */ a("span", { translate: "no" }, e.name)))) : /* @__PURE__ */ a("p", { className: "party-note" }, "İstek listen boş. Listeyi boş kurup oyunları sonra ekleyebilirsin; oyun ayrıntısındaki \"Ortak listeye ekle\" düğmesi de işe yarar.")), /* @__PURE__ */ a("button", {
			type: "button",
			className: "primary party-go",
			disabled: g,
			onClick: k
		}, /* @__PURE__ */ a(c, { size: 16 }), g ? "Kuruluyor…" : "Listeyi kur ve bağlantıyı al")) : /* @__PURE__ */ a(e.Fragment, null, /* @__PURE__ */ a("p", { className: "party-note" }, "Liste kurmak için giriş yap. Bağlantıyı alan arkadaşların giriş yapmadan oy verebilir ve oyun ekleyebilir."), /* @__PURE__ */ a("button", {
			type: "button",
			className: "primary",
			onClick: () => o.setAccount?.("login")
		}, "Giriş yap")), v && /* @__PURE__ */ a("p", {
			className: "party-msg",
			role: "alert"
		}, v)), b.length > 0 && /* @__PURE__ */ a("div", { className: "party-card" }, /* @__PURE__ */ a("h3", null, /* @__PURE__ */ a(s, { size: 18 }), "Bu cihazda açtığın listeler"), /* @__PURE__ */ a("ul", { className: "party-known" }, b.map((e) => /* @__PURE__ */ a("li", { key: e.id }, /* @__PURE__ */ a("button", {
			type: "button",
			className: "party-open",
			onClick: () => r(e.id)
		}, /* @__PURE__ */ a("b", { translate: "no" }, e.title || "Ortak liste"), /* @__PURE__ */ a("small", null, new Date(e.at).toLocaleDateString("tr-TR", {
			day: "numeric",
			month: "long"
		}))), /* @__PURE__ */ a("button", {
			type: "button",
			className: "party-icon",
			"aria-label": "Bu cihazdan unut",
			"data-tip": "Bu cihazdan unut",
			onClick: () => {
				E(e.id), S(w());
			}
		}, /* @__PURE__ */ a(R, { size: 16 })))))), /* @__PURE__ */ a("p", { className: "party-note party-privacy" }, "Bağlantı tahmin edilemeyen rastgele bir koddur ve listeler hiçbir yerde herkese açık sıralanmaz. Bağlantıyı alan herkes listeyi görür, oyun ekleyip oy verebilir. Hesap bilgin ve e-postan listede görünmez; oyların yanında yalnız yazdığın takma ad görünür. 60 gün kullanılmayan listeler silinir."));
	}
	function U({ id: o, onBack: s }) {
		let c = t(), u = z(), [y, w] = i(null), [O, k] = i("loading"), [A, N] = i(""), [F, I] = i(""), [R, V] = i(S), [H, U] = i(!1), [W, G] = i(""), [K, re] = i(!1), q = r(c.session);
		q.current = c.session;
		async function J(e = !1) {
			try {
				let e = await l(o, q.current);
				if (!e) {
					k("missing"), E(o);
					return;
				}
				w(e), k("ok"), T(o, e.title);
			} catch (t) {
				e || (k((e) => e === "ok" ? e : "error"), N(t instanceof Error ? t.message : ""));
			}
		}
		n(() => {
			J();
			let e, t = () => {
				clearTimeout(e), e = setTimeout(() => {
					document.visibilityState === "visible" ? J(!0).finally(t) : t();
				}, D);
			};
			t();
			let n = () => {
				document.visibilityState === "visible" && J(!0);
			};
			return document.addEventListener("visibilitychange", n), () => {
				clearTimeout(e), document.removeEventListener("visibilitychange", n);
			};
		}, [o, c.session?.user?.id]);
		async function Y(e, t = {}, n = e) {
			I(n), N("");
			try {
				let n = await d(o, e, t, q.current);
				if (e === "delete") {
					E(o), c.notify?.("Ortak liste silindi."), s();
					return;
				}
				w(n), n && T(o, n.title);
			} catch (e) {
				let t = e instanceof Error ? e.message : "Güncellenemedi";
				N(t), /bulunamadı\. Silinmiş/.test(t) && k("missing");
			} finally {
				I("");
			}
		}
		if (O === "loading") return /* @__PURE__ */ a("section", { className: "party" }, /* @__PURE__ */ a("p", {
			className: "party-note",
			role: "status"
		}, /* @__PURE__ */ a(L, {
			size: 14,
			className: "spin"
		}), " Ortak liste açılıyor…"));
		if (O !== "ok" || !y) return /* @__PURE__ */ a("section", { className: "party" }, /* @__PURE__ */ a(B, {
			title: O === "missing" ? "Bu ortak liste bulunamadı" : "Ortak liste açılamadı",
			text: O === "missing" ? "Liste silinmiş, 60 gün kullanılmadığı için kaldırılmış ya da bağlantı eksik kopyalanmış olabilir." : A || "Bağlantını kontrol edip tekrar dene.",
			action: /* @__PURE__ */ a("button", {
				type: "button",
				className: "primary",
				onClick: s
			}, "Ortak listelerim")
		}));
		let X = v(o, location.href), Z = g(y.games, y.votes), Q = _(Z.leaders, o + ":" + Z.total), $ = Z.leaders.length > 1, ie = u.map(p).filter(Boolean).filter((e) => !y.games.some((t) => t.id === e.id));
		async function ae() {
			try {
				await navigator.clipboard.writeText(X), c.notify?.("Bağlantı kopyalandı. Arkadaşına gönderebilirsin.");
			} catch {
				N("Kopyalanamadı; bağlantıyı seçip elle kopyala.");
			}
		}
		async function oe() {
			try {
				await navigator.share({
					title: y.title,
					url: X
				});
			} catch {}
		}
		return /* @__PURE__ */ a("section", { className: "party" }, /* @__PURE__ */ a("button", {
			type: "button",
			className: "party-back",
			onClick: s
		}, /* @__PURE__ */ a(ee, { size: 15 }), "Ortak listelerim"), /* @__PURE__ */ a("div", { className: "party-intro" }, /* @__PURE__ */ a("span", { className: "eyebrow" }, "ORTAK LİSTE · " + y.games.length + " OYUN · " + Z.total + " OY"), H ? /* @__PURE__ */ a("form", {
			className: "party-rename",
			onSubmit: (e) => {
				e.preventDefault(), U(!1), W.trim() && W.trim() !== y.title && Y("rename", { p_title: W.trim() });
			}
		}, /* @__PURE__ */ a("input", {
			"aria-label": "Listenin adı",
			autoFocus: !0,
			maxLength: 60,
			value: W,
			onChange: (e) => G(e.target.value)
		}), /* @__PURE__ */ a("button", { className: "primary" }, "Kaydet"), /* @__PURE__ */ a("button", {
			type: "button",
			className: "refresh",
			onClick: () => U(!1)
		}, "Vazgeç")) : /* @__PURE__ */ a("div", { className: "party-title" }, /* @__PURE__ */ a("h2", { translate: "no" }, y.title), y.owner && /* @__PURE__ */ a("button", {
			type: "button",
			className: "party-edit",
			onClick: () => {
				G(y.title), U(!0);
			}
		}, "Adını değiştir"))), /* @__PURE__ */ a("div", { className: "party-card party-share" }, /* @__PURE__ */ a("label", { className: "party-field" }, /* @__PURE__ */ a("span", null, "Arkadaşına bu bağlantıyı gönder"), /* @__PURE__ */ a("input", {
			readOnly: !0,
			value: X,
			onFocus: (e) => e.currentTarget.select(),
			"aria-label": "Ortak liste bağlantısı",
			translate: "no"
		})), /* @__PURE__ */ a("div", { className: "party-actions" }, /* @__PURE__ */ a("button", {
			type: "button",
			className: "primary",
			onClick: ae
		}, /* @__PURE__ */ a(f, { size: 15 }), "Bağlantıyı kopyala"), typeof navigator < "u" && "share" in navigator && /* @__PURE__ */ a("button", {
			type: "button",
			className: "refresh",
			onClick: oe
		}, /* @__PURE__ */ a(m, { size: 15 }), "Paylaş")), /* @__PURE__ */ a("p", { className: "party-note" }, "Bağlantıyı alan herkes listeyi görür, oyun ekleyip oy verebilir. Giriş gerekmez.")), Z.total > 0 && Q && /* @__PURE__ */ a("div", {
			className: "party-winner" + ($ ? " tied" : ""),
			role: "status"
		}, Q.image ? /* @__PURE__ */ a("img", {
			src: Q.image,
			alt: "",
			onError: (e) => {
				e.currentTarget.style.visibility = "hidden";
			}
		}) : /* @__PURE__ */ a("span", { className: "party-crown" }, /* @__PURE__ */ a(j, { size: 28 })), /* @__PURE__ */ a("div", null, /* @__PURE__ */ a("small", null, $ ? "BERABERLİK · KURA SONUCU" : "BU AKŞAM OYNANACAK"), /* @__PURE__ */ a("strong", { translate: "no" }, Q.name), /* @__PURE__ */ a("span", null, $ ? /* @__PURE__ */ a(e.Fragment, null, /* @__PURE__ */ a(ne, { size: 13 }), Z.leaders.length + " oyun eşit oyda; kura herkese aynı sonucu gösterir.") : Z.rows[0].count + " / " + Z.total + " oy"))), /* @__PURE__ */ a("label", { className: "party-field party-name" }, /* @__PURE__ */ a("span", null, "Takma adın ", /* @__PURE__ */ a("small", null, "oyunun ve eklediğin oyunların yanında görünür · isteğe bağlı")), /* @__PURE__ */ a("input", {
			maxLength: 24,
			value: R,
			placeholder: "ör. Kaptan",
			onChange: (e) => {
				V(e.target.value), C(e.target.value);
			}
		})), A && /* @__PURE__ */ a("p", {
			className: "party-msg",
			role: "alert"
		}, A), y.games.length ? /* @__PURE__ */ a("ol", { className: "party-games" }, Z.rows.map((t) => {
			let n = t.game, r = y.mine === n.id, i = h(n.url), o = Z.total > 0 && Z.leaders.some((e) => e.id === n.id);
			return /* @__PURE__ */ a("li", {
				key: n.id,
				className: (r ? "mine " : "") + (o ? "lead" : "")
			}, n.image ? /* @__PURE__ */ a("img", {
				src: n.image,
				alt: "",
				loading: "lazy",
				onError: (e) => {
					e.currentTarget.style.visibility = "hidden";
				}
			}) : /* @__PURE__ */ a("span", {
				className: "party-ph",
				"aria-hidden": "true"
			}), /* @__PURE__ */ a("div", { className: "party-game" }, /* @__PURE__ */ a("strong", null, /* @__PURE__ */ a("span", { translate: "no" }, n.name), o && /* @__PURE__ */ a(j, {
				size: 15,
				"aria-label": "Önde"
			})), n.by && /* @__PURE__ */ a("small", null, "Ekleyen: ", /* @__PURE__ */ a("span", { translate: "no" }, n.by)), /* @__PURE__ */ a("div", {
				className: "party-bar",
				"aria-hidden": "true"
			}, /* @__PURE__ */ a("i", { style: { width: (Z.total ? t.count / Z.total * 100 : 0) + "%" } })), /* @__PURE__ */ a("small", { className: "party-voters" }, t.count ? /* @__PURE__ */ a(e.Fragment, null, t.count + " oy", t.names.length > 0 && /* @__PURE__ */ a("span", { translate: "no" }, " · " + t.names.join(", "))) : "Henüz oy yok")), /* @__PURE__ */ a("div", { className: "party-row-actions" }, /* @__PURE__ */ a("button", {
				type: "button",
				className: "party-vote" + (r ? " on" : ""),
				"aria-pressed": r,
				disabled: !!F,
				onClick: () => r ? Y("unvote", {}, "v" + n.id) : Y("vote", { p_game_id: n.id }, "v" + n.id)
			}, /* @__PURE__ */ a(M, { size: 15 }), r ? "Oyum bu" : "Bunu oynayalım"), i && /* @__PURE__ */ a("a", {
				className: "party-icon",
				href: i,
				target: "_blank",
				rel: "noreferrer noopener",
				"aria-label": "Mağazada aç",
				"data-tip": "Mağazada aç"
			}, /* @__PURE__ */ a(te, { size: 17 })), /* @__PURE__ */ a("button", {
				type: "button",
				className: "party-icon",
				"aria-label": "Listeden çıkar",
				"data-tip": "Listeden çıkar",
				disabled: !!F,
				onClick: () => {
					P("listeden çıkarılsın mı? Bu oyuna verilen oylar da silinir.", n.name) && Y("remove", { p_game_id: n.id }, "r" + n.id);
				}
			}, /* @__PURE__ */ a(b, { size: 16 }))));
		})) : /* @__PURE__ */ a(B, {
			title: "Liste henüz boş",
			text: "İstek listenden oyun ekle ya da bir oyunun ayrıntısında Ortak listeye ekle düğmesine dokun."
		}), /* @__PURE__ */ a("div", { className: "party-card" }, /* @__PURE__ */ a("button", {
			type: "button",
			className: "party-add-toggle",
			"aria-expanded": K,
			onClick: () => re((e) => !e)
		}, /* @__PURE__ */ a(x, { size: 16 }), "İstek listemden oyun ekle"), K && (ie.length ? /* @__PURE__ */ a("div", { className: "party-chips" }, ie.slice(0, 60).map((e) => /* @__PURE__ */ a("button", {
			type: "button",
			key: e.id,
			disabled: !!F || y.games.length >= 30,
			onClick: () => Y("add", { p_game: e }, "a" + e.id)
		}, e.image ? /* @__PURE__ */ a("img", {
			src: e.image,
			alt: "",
			loading: "lazy",
			onError: (e) => {
				e.currentTarget.style.visibility = "hidden";
			}
		}) : /* @__PURE__ */ a("i", null), /* @__PURE__ */ a("span", { translate: "no" }, e.name), /* @__PURE__ */ a(x, { size: 14 })))) : /* @__PURE__ */ a("p", { className: "party-note" }, u.length ? "İstek listendeki oyunların hepsi zaten listede." : "İstek listen boş. Bir oyunun ayrıntısında Ortak listeye ekle düğmesine dokunarak da ekleyebilirsin."))), /* @__PURE__ */ a("div", { className: "party-foot" }, /* @__PURE__ */ a("button", {
			type: "button",
			className: "refresh",
			disabled: !!F,
			onClick: () => J()
		}, /* @__PURE__ */ a(L, { size: 14 }), "Yenile"), Z.total > 0 && /* @__PURE__ */ a("button", {
			type: "button",
			className: "refresh",
			disabled: !!F,
			onClick: () => {
				P("Tüm oylar sıfırlansın mı? Oyunlar listede kalır.") && Y("reset");
			}
		}, "Oyları sıfırla"), y.owner ? /* @__PURE__ */ a("button", {
			type: "button",
			className: "refresh party-danger",
			disabled: !!F,
			onClick: () => {
				P("Bu ortak liste herkes için silinsin mi? Geri alınamaz.") && Y("delete");
			}
		}, /* @__PURE__ */ a(b, { size: 14 }), "Listeyi sil") : /* @__PURE__ */ a("button", {
			type: "button",
			className: "refresh",
			onClick: () => {
				E(o), s();
			}
		}, "Bu cihazdan unut"), /* @__PURE__ */ a("small", { className: "party-note" }, "Liste açıkken 20 saniyede bir kendiliğinden yenilenir.")));
	}
	function W({ item: e }) {
		let o = t(), [c, l] = i(!1), [u, f] = i([]), [m, h] = i(""), g = r(null);
		n(() => {
			if (!c) return;
			f(w());
			let e = (e) => {
				g.current?.contains(e.target) || l(!1);
			}, t = (e) => {
				e.key === "Escape" && (e.stopPropagation(), l(!1));
			};
			return document.addEventListener("mousedown", e), document.addEventListener("keydown", t, !0), () => {
				document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t, !0);
			};
		}, [c]);
		let _ = p(e);
		if (!_) return null;
		async function v(e) {
			h(e.id);
			try {
				await d(e.id, "add", { p_game: _ }, o.session), T(e.id, e.title), o.notify?.("Ortak listeye eklendi: " + (e.title || "Ortak liste")), l(!1);
			} catch (e) {
				o.notify?.(e instanceof Error ? e.message : "Eklenemedi");
			} finally {
				h("");
			}
		}
		function y() {
			try {
				sessionStorage.setItem(O, JSON.stringify(_));
			} catch {}
			l(!1), window.dispatchEvent(new CustomEvent("radar:close-game")), A("party");
		}
		return /* @__PURE__ */ a("span", {
			className: "party-add",
			ref: g
		}, /* @__PURE__ */ a("button", {
			type: "button",
			className: "party-add-btn",
			"aria-expanded": c,
			"aria-haspopup": "menu",
			"aria-label": "Ortak listeye ekle",
			"data-tip": "Ortak listeye ekle",
			onClick: () => l((e) => !e)
		}, /* @__PURE__ */ a(s, { size: 18 })), c && /* @__PURE__ */ a("span", {
			className: "party-pop",
			role: "menu"
		}, /* @__PURE__ */ a("b", null, "Ortak listeye ekle"), u.map((e) => /* @__PURE__ */ a("button", {
			type: "button",
			role: "menuitem",
			key: e.id,
			disabled: !!m,
			onClick: () => v(e)
		}, /* @__PURE__ */ a("span", { translate: "no" }, e.title || "Ortak liste"), m === e.id && /* @__PURE__ */ a(L, {
			size: 13,
			className: "spin"
		}))), /* @__PURE__ */ a("button", {
			type: "button",
			role: "menuitem",
			className: "party-pop-new",
			onClick: y
		}, /* @__PURE__ */ a(x, { size: 14 }), "Yeni ortak liste kur")));
	}
	return {
		Screen: V,
		Icon: s,
		AddButton: W
	};
}
//#endregion
export { ee as createParty };
