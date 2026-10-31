//#region lib/sfx.mjs
var e = (e, t, n, r = 1, i = "sine") => ({
	f: e,
	t,
	d: n,
	g: r,
	w: i
}), t = {
	favorite: [e(784, 0, .09), e(1175, .06, .14)],
	unfavorite: [e(587, 0, .08, .7), e(440, .06, .12, .6)],
	alarm: [
		e(1319, 0, .18, .8, "triangle"),
		e(1568, .09, .22, .6, "triangle"),
		e(1319, .2, .26, .5, "triangle")
	],
	done: [e(660, 0, .12), e(990, .07, .16)],
	toggle: [e(880, 0, .07, .6)],
	level: [
		e(523, 0, .1, .8, "square"),
		e(659, .08, .1, .8, "square"),
		e(784, .16, .1, .8, "square"),
		e(1047, .24, .24, .9, "square")
	],
	"badge-common": [e(880, 0, .1), e(1319, .07, .18)],
	"badge-rare": [
		e(784, 0, .1, .9, "triangle"),
		e(988, .07, .1, .9, "triangle"),
		e(1319, .14, .22, .9, "triangle")
	],
	"badge-epic": [
		e(659, 0, .1, .9, "triangle"),
		e(880, .07, .1, .9, "triangle"),
		e(1109, .14, .1, .9, "triangle"),
		e(1319, .21, .3, 1, "triangle")
	],
	"badge-legendary": [
		e(523, 0, .12, .8, "square"),
		e(659, .09, .12, .8, "square"),
		e(784, .18, .12, .8, "square"),
		e(1047, .27, .14, .9, "square"),
		e(1568, .36, .4, .7, "triangle")
	]
}, n = .035;
function r(e) {
	return t[e] || [];
}
var i = {
	common: "badge-common",
	rare: "badge-rare",
	epic: "badge-epic",
	legendary: "badge-legendary"
}, a = (e) => i[e] || "badge-common";
function o(e = globalThis.document, t = globalThis.window) {
	if (!e || e.documentElement?.dataset?.reduceMotion === "true") return !1;
	try {
		return !t?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
	} catch {
		return !0;
	}
}
function s(e, t) {
	if (!Array.isArray(e)) return [];
	let n = new Set(e);
	return t.filter((e) => !n.has(e));
}
var c = [
	"common",
	"rare",
	"epic",
	"legendary"
], l = (e) => e.reduce((e, t) => !e || c.indexOf(t.tier) > c.indexOf(e.tier) ? t : e, null), u = null;
function d(e) {
	let t = r(e);
	if (!t.length || typeof window > "u" || document.visibilityState === "hidden") return !1;
	try {
		let e = window.AudioContext || window.webkitAudioContext;
		if (!e) return !1;
		(!u || u.state === "closed") && (u = new e()), u.state === "suspended" && u.resume().catch(() => {});
		let r = u.currentTime + .01;
		for (let e of t) {
			let t = u.createOscillator(), i = u.createGain(), a = n * e.g * (e.w === "square" ? .45 : 1);
			t.type = e.w, t.frequency.value = e.f, i.gain.setValueAtTime(1e-4, r + e.t), i.gain.exponentialRampToValueAtTime(a, r + e.t + .012), i.gain.exponentialRampToValueAtTime(1e-4, r + e.t + e.d), t.connect(i), i.connect(u.destination), t.start(r + e.t), t.stop(r + e.t + e.d + .02);
		}
		return !0;
	} catch {
		return !1;
	}
}
new Map([
	{
		id: "story",
		label: "Hikâye avcısı",
		text: "Güçlü anlatı, seçimler, unutulmaz karakterler.",
		genres: ["Macera", "RPG"],
		tags: [
			"Story Rich",
			"Choices Matter",
			"Narrative",
			"Great Soundtrack"
		]
	},
	{
		id: "action",
		label: "Aksiyon tutkunu",
		text: "Hızlı tempo, çatışma, refleks.",
		genres: ["Aksiyon"],
		tags: [
			"Shooter",
			"FPS",
			"Hack and Slash",
			"Fast-Paced",
			"Souls-like"
		]
	},
	{
		id: "strategy",
		label: "Stratejist",
		text: "Plan kur, kaynak yönet, kazan.",
		genres: ["Strateji"],
		tags: [
			"Turn-Based Strategy",
			"Tactical",
			"Grand Strategy",
			"RTS",
			"Base Building"
		]
	},
	{
		id: "explorer",
		label: "Kâşif",
		text: "Açık dünyalar, keşif, hayatta kalma.",
		genres: ["Macera"],
		tags: [
			"Open World",
			"Exploration",
			"Survival",
			"Sandbox"
		]
	},
	{
		id: "competitive",
		label: "Rekabetçi",
		text: "Skor tablosu, PvP, bir maç daha.",
		genres: ["Spor", "Yarış"],
		tags: [
			"Competitive",
			"PvP",
			"Esports",
			"Racing"
		]
	},
	{
		id: "cozy",
		label: "Rahat oyuncu",
		text: "Sakin tempo, çiftlik, tatlı dünyalar.",
		genres: ["Rahat", "Simülasyon"],
		tags: [
			"Relaxing",
			"Cozy",
			"Farming Sim",
			"Life Sim",
			"Cute"
		]
	},
	{
		id: "social",
		label: "Birlikte oynayan",
		text: "Arkadaşlarla co-op ve parti oyunları.",
		genres: ["MMO"],
		tags: [
			"Co-op",
			"Online Co-Op",
			"Local Co-Op",
			"Multiplayer",
			"Party Game"
		]
	},
	{
		id: "horror",
		label: "Gerilim seven",
		text: "Karanlık koridorlar, korku, atmosfer.",
		genres: [],
		tags: [
			"Horror",
			"Survival Horror",
			"Psychological Horror",
			"Atmospheric"
		]
	},
	{
		id: "indie",
		label: "Bağımsız ruh",
		text: "Piksel sanat, roguelike, özgün fikirler.",
		genres: ["Bağımsız"],
		tags: [
			"Pixel Graphics",
			"Roguelike",
			"Metroidvania",
			"Platformer",
			"Puzzle"
		]
	}
].map((e) => [e.id, e]));
//#endregion
//#region lib/prediction-state.mjs
var f = (e) => Object.values(e || {}).filter((e) => e.status === "open"), p = (e) => Object.values(e || {}).filter((e) => e.status !== "open").sort((e, t) => t.resolvedAt - e.resolvedAt);
function m(e) {
	let t = p(e), n = t.filter((e) => e.status === "hit").length, r = 0, i = 0;
	for (let e of [...t].reverse()) r = e.status === "hit" ? r + 1 : 0, i = Math.max(i, r);
	return {
		total: Object.keys(e || {}).length,
		open: f(e).length,
		hits: n,
		misses: t.length - n,
		accuracy: t.length ? Math.round(n / t.length * 100) : null,
		bestRun: i
	};
}
[
	{
		id: "",
		name: "Ruh halime göre",
		desc: "Varsayılan: renk seçtiğin ruh haline göre değişir.",
		need: {},
		swatch: ["#c4f85b", "#7c3aed"]
	},
	{
		id: "ocean",
		name: "Derin Okyanus",
		desc: "Serin mavi vurgular.",
		need: { level: 3 },
		swatch: ["#5fd4ff", "#0284c7"]
	},
	{
		id: "sunset",
		name: "Gün Batımı",
		desc: "Sıcak turuncu ve mercan.",
		need: { badges: 10 },
		swatch: ["#ff9f6b", "#ea580c"]
	},
	{
		id: "synth",
		name: "Synthwave",
		desc: "Neon pembe, gece mavisi.",
		need: { level: 8 },
		swatch: ["#ff71ce", "#db2777"]
	},
	{
		id: "ember",
		name: "Kor Ateşi",
		desc: "Destansı bir rozet kazananlara.",
		need: { tier: "epic" },
		swatch: ["#ff7a66", "#dc2626"]
	},
	{
		id: "gold",
		name: "Altın Kupa",
		desc: "Koleksiyoncuların parıltısı.",
		need: { badges: 40 },
		swatch: ["#ffd166", "#b45309"]
	},
	{
		id: "aurora",
		name: "Kutup Işığı",
		desc: "Efsanevi rozet sahiplerine.",
		need: { tier: "legendary" },
		swatch: ["#7dffc4", "#059669"]
	},
	{
		id: "winter",
		name: "Kış Ayazı",
		desc: "Kış sezonunun teması.",
		need: { season: "winter" },
		swatch: ["#a8d8ff", "#2563eb"]
	},
	{
		id: "spring",
		name: "Bahar Çiçeği",
		desc: "Bahar sezonunun teması.",
		need: { season: "spring" },
		swatch: ["#ffb3d9", "#be185d"]
	},
	{
		id: "summer",
		name: "Yaz Güneşi",
		desc: "Yaz sezonunun teması.",
		need: { season: "summer" },
		swatch: ["#ffe066", "#0d9488"]
	},
	{
		id: "autumn",
		name: "Hasat Ayı",
		desc: "Sonbahar sezonunun teması.",
		need: { season: "autumn" },
		swatch: ["#ffa94d", "#c2410c"]
	}
].map((e) => e.id), [
	{
		id: "",
		name: "Çerçevesiz",
		need: {}
	},
	{
		id: "bronze",
		name: "Bronz",
		need: { level: 5 }
	},
	{
		id: "silver",
		name: "Gümüş",
		need: { level: 10 }
	},
	{
		id: "gold",
		name: "Altın",
		need: { level: 20 }
	},
	{
		id: "flame",
		name: "Alev",
		need: { streak: 7 }
	},
	{
		id: "prism",
		name: "Prizma",
		need: { badges: 25 }
	},
	{
		id: "legend",
		name: "Efsane",
		need: { tier: "legendary" }
	},
	{
		id: "winter",
		name: "Kar Kristali",
		need: { season: "winter" }
	},
	{
		id: "spring",
		name: "Sarmaşık",
		need: { season: "spring" }
	},
	{
		id: "summer",
		name: "Güneş Halkası",
		need: { season: "summer" }
	},
	{
		id: "autumn",
		name: "Hasat Yaprağı",
		need: { season: "autumn" }
	}
].map((e) => e.id), [
	{
		id: "winter",
		name: "Kış",
		months: [
			12,
			1,
			2
		]
	},
	{
		id: "spring",
		name: "Bahar",
		months: [
			3,
			4,
			5
		]
	},
	{
		id: "summer",
		name: "Yaz",
		months: [
			6,
			7,
			8
		]
	},
	{
		id: "autumn",
		name: "Sonbahar",
		months: [
			9,
			10,
			11
		]
	}
].map((e) => e.id);
//#endregion
//#region lib/experience.mjs
var h = (e) => Math.min(99, 1 + Math.floor(Math.sqrt(Math.max(0, e) / 25))), g = (e) => e >= 50 ? "Final Boss" : e >= 20 ? "Oyun Ustası" : e >= 10 ? "Kaşif" : e >= 5 ? "Maceracı" : "Çaylak", _ = (e) => Object.values(e.visited || {}), v = (e) => new Date(e + 108e5), y = (e, t) => _(e).filter((e) => e.at && t(v(e.at))).length, b = (e) => (t) => _(t).filter((t) => (t.genres || []).some((t) => e.test(t))).length, x = (e) => (t) => (t.events || []).filter((t) => t.startsWith(e)).length, S = (e) => (t, n) => n.filter((t) => t.status === e).length, C = (e) => (t) => Object.values(t.gameNotes || {}).filter((t) => t && t[e]).length, w = (e) => Object.values(e.hours || {}).filter((e) => e > 0), T = {
	c: "common",
	r: "rare",
	e: "epic",
	l: "legendary"
}, E = (e, t, n, r, i, a) => a.map(([a, o, s]) => ({
	id: n + "-" + a,
	cat: e,
	icon: t,
	goal: a,
	name: o,
	desc: r.replace("{n}", a),
	tier: T[s],
	have: i
})), D = (e, t, n, r, i) => E("genre", n, "genre-" + e, "{n} " + i + " oyun dosyası aç.", b(t), r), O = [
	...E("explore", "compass", "visit", "{n} farklı oyun dosyası aç.", (e) => _(e).length, [
		[
			1,
			"İlk Keşif",
			"c"
		],
		[
			5,
			"Meraklı Bakış",
			"c"
		],
		[
			10,
			"Meraklı Gezgin",
			"c"
		],
		[
			25,
			"Yol Arkadaşı",
			"c"
		],
		[
			50,
			"Arşivci",
			"r"
		],
		[
			100,
			"Kâşif Ruhu",
			"r"
		],
		[
			150,
			"Yaşayan Ansiklopedi",
			"e"
		],
		[
			250,
			"Harita Ustası",
			"e"
		],
		[
			400,
			"Sonsuz Merak",
			"e"
		],
		[
			600,
			"Evrenin Haritası",
			"l"
		]
	]),
	...E("explore", "palette", "genres", "{n} farklı türde oyun dosyası aç.", (e) => new Set(_(e).flatMap((e) => e.genres || [])).size, [
		[
			3,
			"Çok Yönlü",
			"c"
		],
		[
			5,
			"Tür Gezgini",
			"r"
		],
		[
			8,
			"Renk Paleti",
			"e"
		],
		[
			12,
			"Her Telden",
			"l"
		]
	]),
	...E("explore", "eye-off", "dismiss", "{n} oyunu \"ilgilenmiyorum\" diye geç.", (e) => e.dismissed.length, [
		[
			10,
			"Seçici",
			"c"
		],
		[
			50,
			"Keskin Göz",
			"r"
		],
		[
			150,
			"Acımasız Küratör",
			"e"
		]
	]),
	...E("explore", "moon", "night", "Gece 00.00 ile 05.00 arasında {n} oyun dosyası aç.", (e) => y(e, (e) => e.getUTCHours() < 5), [[
		1,
		"Gece Kuşu",
		"r"
	], [
		10,
		"Gece Bekçisi",
		"e"
	]]),
	...E("explore", "zap", "marathon", "Tek günde {n} oyun dosyası aç.", (e) => Math.max(0, ...Object.values(_(e).reduce((e, t) => {
		if (t.at) {
			let n = v(t.at).toISOString().slice(0, 10);
			e[n] = (e[n] || 0) + 1;
		}
		return e;
	}, {}))), [[
		10,
		"Maraton Gezgini",
		"r"
	], [
		30,
		"Bitmeyen Oturum",
		"e"
	]]),
	...E("streak", "flame", "streak", "{n} gün üst üste uğra.", (e) => Math.max(e.bestStreak || 0, e.streak), [
		[
			2,
			"İkinci Gün",
			"c"
		],
		[
			3,
			"Üç Günlük Yolculuk",
			"c"
		],
		[
			5,
			"Beş Günlük Ritim",
			"c"
		],
		[
			7,
			"Haftanın Müdavimi",
			"r"
		],
		[
			10,
			"On Günlük Ateş",
			"r"
		],
		[
			14,
			"İki Haftalık Sadakat",
			"r"
		],
		[
			21,
			"Alışkanlık Ustası",
			"e"
		],
		[
			30,
			"Sönmeyen Ateş",
			"e"
		],
		[
			60,
			"İki Aylık Efsane",
			"e"
		],
		[
			100,
			"Yüz Günlük Yemin",
			"l"
		],
		[
			180,
			"Yarım Yıl Nöbeti",
			"l"
		],
		[
			365,
			"Bir Yıl Hiç Kaçırmadan",
			"l"
		]
	]),
	...E("streak", "calendar-check", "days", "Toplam {n} farklı gün uğra.", (e) => Math.max(e.daysVisited || 0, e.bestStreak || 0, e.streak), [
		[
			10,
			"Düzenli Ziyaretçi",
			"c"
		],
		[
			30,
			"Ev Gibi",
			"r"
		],
		[
			100,
			"Yüzüncü Gün",
			"e"
		],
		[
			250,
			"Sadık Oyuncu",
			"e"
		],
		[
			500,
			"Radar Emektarı",
			"l"
		]
	]),
	...E("collection", "heart", "fav", "{n} oyunu favorilere ekle.", (e, t) => t.length, [
		[
			1,
			"İlk Kalp",
			"c"
		],
		[
			5,
			"Küçük Raf",
			"c"
		],
		[
			10,
			"Raf Kurucu",
			"c"
		],
		[
			25,
			"Koleksiyoncu",
			"r"
		],
		[
			50,
			"Büyük Raf",
			"r"
		],
		[
			100,
			"Dev Arşiv",
			"e"
		],
		[
			200,
			"Müze Müdürü",
			"l"
		]
	]),
	...E("collection", "heart-handshake", "like", "Toplam {n} kez favoriye kalp bırak.", x("like:"), [
		[
			10,
			"Kalp Yağmuru",
			"c"
		],
		[
			50,
			"Cömert Kalp",
			"r"
		],
		[
			150,
			"Sevgi Pıtırcığı",
			"e"
		]
	]),
	...E("collection", "sparkles", "wish", "İstek listende {n} oyun biriktir.", S("wish"), [
		[
			5,
			"Hayalperest",
			"c"
		],
		[
			20,
			"Uzun İstek Listesi",
			"r"
		],
		[
			50,
			"Bitmeyen İstekler",
			"e"
		]
	]),
	...E("collection", "gamepad", "playing", "Aynı anda {n} oyunu \"oynuyorum\" olarak işaretle.", S("playing"), [
		[
			1,
			"Şu An Oynuyor",
			"c"
		],
		[
			3,
			"Çoklu Görev",
			"r"
		],
		[
			5,
			"Paralel Evrenler",
			"e"
		]
	]),
	...E("collection", "crown", "top10", "Top 10 rafına {n} oyun koy.", (e) => e.top10.length, [
		[
			1,
			"İlk Sıra",
			"c"
		],
		[
			5,
			"Yarım Liste",
			"c"
		],
		[
			10,
			"Küratör",
			"r"
		]
	]),
	...E("play", "check", "done", "{n} oyunu bitir.", S("done"), [
		[
			1,
			"Görev Tamam",
			"c"
		],
		[
			3,
			"Üçleme",
			"c"
		],
		[
			5,
			"Seri Bitirici",
			"r"
		],
		[
			10,
			"On Final",
			"r"
		],
		[
			20,
			"Backlog Avcısı",
			"e"
		],
		[
			35,
			"Jenerik Koleksiyoncusu",
			"e"
		],
		[
			50,
			"Final Boss Avcısı",
			"e"
		],
		[
			100,
			"Yüz Final",
			"l"
		]
	]),
	...E("play", "hourglass", "hours", "Oyunlarına toplam {n} saat kaydet.", (e) => Math.floor(w(e).reduce((e, t) => e + t, 0)), [
		[
			10,
			"Isınma Turu",
			"c"
		],
		[
			50,
			"Elli Saat",
			"c"
		],
		[
			100,
			"Yüz Saatlik Sefer",
			"r"
		],
		[
			250,
			"Çeyrek Bin",
			"r"
		],
		[
			500,
			"Beş Yüz Saat",
			"e"
		],
		[
			1e3,
			"Bin Saatlik Efsane",
			"l"
		]
	]),
	...E("play", "timer", "one-game", "Tek bir oyuna {n} saat kaydet.", (e) => Math.floor(Math.max(0, ...w(e))), [
		[
			50,
			"Tek Oyuna Sadık",
			"r"
		],
		[
			100,
			"Saplantı",
			"e"
		],
		[
			300,
			"Ömür Boyu Oyun",
			"l"
		]
	]),
	...E("play", "rocket", "hype", "{n} oyuna heyecan puanı ver.", (e) => Object.values(e.hype || {}).filter((e) => e > 0).length, [
		[
			1,
			"İlk Heyecan",
			"c"
		],
		[
			5,
			"Heyecan Treni",
			"c"
		],
		[
			10,
			"Sabırsız",
			"r"
		],
		[
			25,
			"Hype Makinesi",
			"e"
		]
	]),
	...E("play", "cake", "anniversary", "{n} oyun yıl dönümü kaydet.", (e) => e.anniversaries.length, [[
		1,
		"Yıl Dönümü",
		"r"
	], [
		5,
		"Anı Defteri",
		"e"
	]]),
	...D("action", /aksiyon|action/i, "swords", [
		[
			5,
			"Adrenalin Çırağı",
			"c"
		],
		[
			20,
			"Aksiyon Kahramanı",
			"r"
		],
		[
			50,
			"Patlama Ustası",
			"e"
		],
		[
			100,
			"Aksiyon Efsanesi",
			"l"
		]
	], "aksiyon"),
	...D("adventure", /macera|adventure/i, "map", [
		[
			5,
			"Macera Meraklısı",
			"c"
		],
		[
			20,
			"Hazine Avcısı",
			"r"
		],
		[
			50,
			"Ufuk Kâşifi",
			"e"
		],
		[
			100,
			"Macera Efsanesi",
			"l"
		]
	], "macera"),
	...D("rpg", /^rpg$|rol yapma|role-playing/i, "dragon", [
		[
			5,
			"Zindan Çırağı",
			"c"
		],
		[
			20,
			"Kılıç ve Büyü",
			"r"
		],
		[
			50,
			"Ejderha Eğitmeni",
			"e"
		],
		[
			100,
			"RPG Efsanesi",
			"l"
		]
	], "RPG"),
	...D("strategy", /strateji|strategy/i, "brain", [
		[
			5,
			"Strateji Çırağı",
			"c"
		],
		[
			20,
			"Usta Taktisyen",
			"r"
		],
		[
			50,
			"Savaş Generali",
			"e"
		],
		[
			100,
			"Strateji Dehası",
			"l"
		]
	], "strateji"),
	...D("sim", /simülasyon|simulation/i, "cpu", [
		[
			5,
			"Sanal Hayat",
			"c"
		],
		[
			20,
			"Simülasyon Mimarı",
			"r"
		],
		[
			50,
			"Sistem Ustası",
			"e"
		],
		[
			100,
			"Simülasyon Efsanesi",
			"l"
		]
	], "simülasyon"),
	...D("sports", /^spor|sports?/i, "trophy", [
		[
			5,
			"Taraftar",
			"c"
		],
		[
			20,
			"Takım Kaptanı",
			"r"
		],
		[
			50,
			"Şampiyon",
			"e"
		],
		[
			100,
			"Spor Efsanesi",
			"l"
		]
	], "spor"),
	...D("racing", /yarış|racing/i, "car", [
		[
			5,
			"Pist Çaylağı",
			"c"
		],
		[
			20,
			"Pist Canavarı",
			"r"
		],
		[
			50,
			"Nitro Ustası",
			"e"
		],
		[
			100,
			"Yarış Efsanesi",
			"l"
		]
	], "yarış"),
	...D("indie", /bağımsız|indie/i, "sparkles", [
		[
			5,
			"Gizli Cevher Avcısı",
			"c"
		],
		[
			20,
			"Bağımsız Ruh",
			"r"
		],
		[
			50,
			"Indie Gurusu",
			"e"
		],
		[
			100,
			"Bağımsız Efsane",
			"l"
		]
	], "bağımsız"),
	...D("casual", /rahat|casual/i, "leaf", [
		[
			5,
			"Rahat Koltuk",
			"c"
		],
		[
			20,
			"Huzur Bahçesi",
			"r"
		],
		[
			50,
			"Zen Ustası",
			"e"
		],
		[
			100,
			"Sükûnet Efsanesi",
			"l"
		]
	], "rahat"),
	...D("mmo", /mmo|massively/i, "users", [
		[
			5,
			"Lonca Adayı",
			"c"
		],
		[
			20,
			"Lonca Üyesi",
			"r"
		],
		[
			50,
			"Lonca Lideri",
			"e"
		],
		[
			100,
			"MMO Efsanesi",
			"l"
		]
	], "MMO"),
	...D("horror", /korku|horror/i, "ghost", [
		[
			3,
			"Ürkek Adım",
			"c"
		],
		[
			10,
			"Karanlıkta Yürüyen",
			"r"
		],
		[
			30,
			"Kabus Avcısı",
			"e"
		]
	], "korku"),
	...D("platformer", /platform/i, "footprints", [
		[
			3,
			"Zıplayan Çaylak",
			"c"
		],
		[
			10,
			"Platform Akrobatı",
			"r"
		],
		[
			30,
			"Piksel Ninja",
			"e"
		]
	], "platform"),
	...D("puzzle", /bulmaca|puzzle/i, "puzzle", [
		[
			3,
			"Bulmaca Çırağı",
			"c"
		],
		[
			10,
			"Zekâ Küpü",
			"r"
		],
		[
			30,
			"Bulmaca Dehası",
			"e"
		]
	], "bulmaca"),
	...D("shooter", /nişancı|shooter|fps/i, "crosshair", [
		[
			3,
			"Atış Poligonu",
			"c"
		],
		[
			10,
			"Keskin Nişancı",
			"r"
		],
		[
			30,
			"Tetik Ustası",
			"e"
		]
	], "nişancı"),
	...D("fighting", /dövüş|fighting/i, "fist", [
		[
			3,
			"Ringe Çıkan",
			"c"
		],
		[
			10,
			"Kombo Ustası",
			"r"
		],
		[
			30,
			"Dövüş Şampiyonu",
			"e"
		]
	], "dövüş"),
	...D("roguelike", /rogue/i, "dices", [
		[
			3,
			"Tekrar Dene",
			"c"
		],
		[
			10,
			"Ölümsüz Döngü",
			"r"
		],
		[
			30,
			"Roguelike Ustası",
			"e"
		]
	], "roguelike"),
	...E("genre", "ghost", "horror-fav", "{n} korku oyununu favorilere ekle.", (e, t) => t.filter((e) => (e.genres || []).some((e) => /korku|horror/i.test(e))).length, [[
		10,
		"Korkusuz",
		"e"
	]]),
	...E("writing", "pen", "review", "{n} oyun için toplulukta inceleme paylaş.", x("review:"), [
		[
			1,
			"İlk İnceleme",
			"c"
		],
		[
			3,
			"Söz Sahibi",
			"c"
		],
		[
			5,
			"Eleştirmen",
			"r"
		],
		[
			10,
			"Köşe Yazarı",
			"e"
		],
		[
			25,
			"Baş Editör",
			"l"
		]
	]),
	...E("writing", "notebook", "journal", "{n} farklı oyuna günlük notu yaz.", (e) => Object.values(e.journal || {}).filter((e) => e.length).length, [
		[
			1,
			"İlk Not",
			"c"
		],
		[
			5,
			"Günlük Tutan",
			"c"
		],
		[
			10,
			"Anı Biriktiren",
			"r"
		],
		[
			25,
			"Oyun Tarihçisi",
			"e"
		]
	]),
	...E("writing", "scroll", "entries", "Günlüğüne toplam {n} not yaz.", (e) => Object.values(e.journal || {}).reduce((e, t) => e + t.length, 0), [
		[
			10,
			"Kalemi Sıcak",
			"c"
		],
		[
			50,
			"Kronikçi",
			"r"
		],
		[
			150,
			"Destan Yazarı",
			"e"
		]
	]),
	...E("writing", "newspaper", "read", "{n} haber ya da yazı oku.", x("read:"), [
		[
			1,
			"İlk Okuma",
			"c"
		],
		[
			10,
			"Kitap Kurdu",
			"c"
		],
		[
			25,
			"Haber Avcısı",
			"r"
		],
		[
			50,
			"Gündem Takipçisi",
			"r"
		],
		[
			100,
			"Radar Muhabiri",
			"e"
		]
	]),
	...E("writing", "tag", "tags", "{n} oyuna etiket ekle.", (e) => Object.values(e.tags || {}).filter((e) => e.length).length, [
		[
			1,
			"İlk Etiket",
			"c"
		],
		[
			10,
			"Duygu Etiketçisi",
			"c"
		],
		[
			25,
			"Etiket Ustası",
			"r"
		],
		[
			50,
			"Arşiv Kütüphanecisi",
			"e"
		]
	]),
	...E("writing", "pin", "pins", "Bir oyun haritasına {n} işaret koy.", (e) => Math.max(0, ...Object.values(e.gameNotes || {}).map((e) => e.mapPins?.length || 0)), [
		[
			1,
			"İlk İşaret",
			"c"
		],
		[
			5,
			"Haritacı",
			"r"
		],
		[
			20,
			"Usta Haritacı",
			"e"
		]
	]),
	...E("writing", "map", "maps", "{n} oyuna dünya haritası ekle.", C("mapUrl"), [[
		1,
		"Harita Yükleyen",
		"c"
	], [
		5,
		"Atlas Sahibi",
		"r"
	]]),
	...E("price", "bell", "alerts", "{n} fiyat alarmın çalsın.", (e) => e.seenAlerts.length, [
		[
			1,
			"Fiyat Avcısı",
			"c"
		],
		[
			5,
			"Kazançlı Gün",
			"r"
		],
		[
			20,
			"İndirim Radarı",
			"e"
		],
		[
			50,
			"İndirim Kralı",
			"l"
		]
	]),
	...E("price", "target", "target", "{n} favoriye hedef fiyat koy.", (e, t) => t.filter((e) => Number.isFinite(e.target)).length, [
		[
			1,
			"Hedef Fiyat",
			"c"
		],
		[
			5,
			"Pusu Kuran",
			"r"
		],
		[
			15,
			"Fiyat Bekçisi",
			"e"
		]
	]),
	...E("price", "store", "platforms", "{n} farklı mağazayı gez.", (e) => Object.values(e.platformVisits || {}).filter((e) => e > 0).length, [
		[
			2,
			"İki Dünya",
			"c"
		],
		[
			4,
			"Çok Platformlu",
			"r"
		],
		[
			6,
			"Platform Diplomatı",
			"e"
		]
	]),
	...E("price", "telescope", "predict-hit", "{n} fiyat tahminini doğru bil.", (e) => m(e.predictions).hits, [[
		1,
		"İlk Kehanet",
		"c"
	], [
		10,
		"İndirim Kâhini",
		"e"
	]]),
	...E("price", "coins", "currency", "Fiyatları başka para biriminde göster.", (e) => e.currency === "TRY" ? 0 : 1, [[
		1,
		"Döviz Gözlüğü",
		"c"
	]]),
	...E("level", "star", "level", "{n}. seviyeye ulaş.", (e) => h(e.xp), [
		[
			2,
			"İlk Adım",
			"c"
		],
		[
			5,
			"Maceracı",
			"c"
		],
		[
			10,
			"Kaşif Rütbesi",
			"r"
		],
		[
			15,
			"Deneyimli",
			"r"
		],
		[
			20,
			"Usta Rütbesi",
			"e"
		],
		[
			30,
			"Veteran",
			"e"
		],
		[
			40,
			"Yarı Tanrı",
			"e"
		],
		[
			50,
			"Efsane",
			"l"
		],
		[
			75,
			"Ölümsüz",
			"l"
		],
		[
			99,
			"Son Seviye",
			"l"
		]
	]),
	...E("level", "shirt", "avatars", "Avatar dükkânında {n} avatarın olsun.", (e) => e.unlocked.length, [
		[
			2,
			"Yeni Görünüm",
			"c"
		],
		[
			3,
			"Kostüm Meraklısı",
			"r"
		],
		[
			4,
			"Gardırop Sahibi",
			"e"
		]
	]),
	...E("personal", "user", "name", "Oyuncu adını yaz.", (e) => +!!e.name, [[
		1,
		"Adını Koydun",
		"c"
	]]),
	...E("personal", "library", "shelf-name", "Oyun rafına bir ad ver.", (e) => +!!e.collectionName, [[
		1,
		"Raf Sahibi",
		"c"
	]]),
	...E("personal", "map-pin", "city", "Şehrini ekle.", (e) => +!!e.city, [[
		1,
		"Memleket",
		"c"
	]]),
	...E("personal", "heart", "pref-genre", "Sevdiğin türü seç.", (e) => +!!e.preferredGenre, [[
		1,
		"Tür Tercihi",
		"c"
	]]),
	...E("personal", "fingerprint", "persona", "{n} oyuncu kişiliği seç.", (e) => e.personas.length, [[
		1,
		"Oyuncu Kişiliği",
		"c"
	], [
		3,
		"Çok Yüzlü",
		"r"
	]]),
	...E("personal", "eye", "color", "Renk görme modunu ayarla.", (e) => e.colorMode === "default" ? 0 : 1, [[
		1,
		"Renk Ayarı",
		"c"
	]]),
	...E("personal", "leaf", "zen", "Zen görünümünü aç.", (e) => +!!e.zen, [[
		1,
		"Zen Modu",
		"c"
	]]),
	...E("personal", "joystick", "retro", "Retro görünümü aç.", (e) => +!!e.retro, [[
		1,
		"Retro Ruh",
		"r"
	]])
], k = {
	common: "Yaygın",
	rare: "Nadir",
	epic: "Destansı",
	legendary: "Efsanevi"
};
function A(e, t = []) {
	return O.map((n) => {
		let r = Math.max(0, Number(n.have(e, t || [])) || 0);
		return {
			id: n.id,
			cat: n.cat,
			name: n.name,
			desc: n.desc,
			tier: n.tier,
			icon: n.icon,
			goal: n.goal,
			have: Math.min(r, n.goal),
			earned: r >= n.goal
		};
	});
}
//#endregion
//#region app/sfx-parts.mjs
var j = "radar-experience-v1", M = "radar-fav-v3", N = "radar-badges-seen-v1", P = (e) => {
	try {
		return localStorage.getItem(e);
	} catch {
		return null;
	}
}, F = (e, t) => {
	try {
		return JSON.parse(e) ?? t;
	} catch {
		return t;
	}
}, I = () => F(P(j), {}).sound === !0, L = (e, t = !1) => {
	(t || I()) && d(e);
}, R = () => document.documentElement.lang === "en", z = {
	common: "Common",
	rare: "Rare",
	epic: "Epic",
	legendary: "Legendary"
}, B = {
	Çaylak: "Rookie",
	Maceracı: "Adventurer",
	Kaşif: "Explorer",
	"Oyun Ustası": "Game Master",
	"Final Boss": "Final Boss"
}, V = (e, t, n) => {
	let r = document.createElement(e);
	return t && (r.className = t), n != null && (r.textContent = n), r;
}, H = null, U = 0, W = 0;
function G(e, t, n = "common", r = "") {
	let i = Math.max(0, W - Date.now());
	W = Date.now() + i + 2200, setTimeout(() => {
		H?.remove(), clearTimeout(U), H = V("div", "sfx-toast sfx-" + t + " sfx-t-" + n), H.setAttribute("role", "status");
		let i = V("span", "sfx-toast-icon");
		i.setAttribute("aria-hidden", "true"), i.textContent = t === "level" ? "★" : "✦";
		let s = V("span", "sfx-toast-body");
		r && s.append(V("small", "sfx-toast-eyebrow", r)), s.append(e);
		let c = V("button", "sfx-toast-close", "×");
		c.type = "button", c.setAttribute("aria-label", R() ? "Close notification" : "Bildirimi kapat"), c.onclick = () => H?.remove(), H.append(i, s, c), document.body.append(H);
		let l = window.visualViewport;
		if (l && l.width < innerWidth - 1 && (H.style.right = Math.round(innerWidth - l.offsetLeft - l.width + 12) + "px"), U = setTimeout(() => H?.remove(), 6e3), L(t === "level" ? "level" : a(n)), (t === "level" || n === "epic" || n === "legendary") && o()) {
			let e = V("div", "sfx-confetti");
			e.setAttribute("aria-hidden", "true");
			for (let t = 0; t < 26; t++) {
				let n = V("i");
				n.style.setProperty("--i", t), e.append(n);
			}
			document.body.append(e), setTimeout(() => e.remove(), 1500);
		}
	}, i);
}
var K = "", q = 0;
function J() {
	let e = (P(j) || "") + "|" + (P(M) || "");
	if (e === K) return;
	K = e;
	let t = F(P(j), null);
	if (!t || typeof t != "object") return;
	let n = h(Number(t.xp) || 0);
	q && n > q && n - q <= 2 && G((R() ? "Level " : "Seviye ") + n + ": " + (R() && B[g(n)] || g(n)), "level", "common", R() ? "Level up" : "Seviye atladın"), q = n;
	let r;
	try {
		r = A(t, F(P(M), [])).filter((e) => e.earned);
	} catch {
		return;
	}
	let i = F(P(N), null), a = s(i, r.map((e) => e.id));
	if (!Array.isArray(i) || a.length) try {
		localStorage.setItem(N, JSON.stringify(r.map((e) => e.id)));
	} catch {}
	if (!a.length || a.length > 3) return;
	let o = l(r.filter((e) => a.includes(e.id)));
	{
		let e = a.length - 1;
		G((R() ? "New badge: " : "Yeni rozet: ") + o.name + (e ? R() ? " (+" + e + " more)" : " (+" + e + " rozet daha)" : ""), "badge", o.tier, R() ? z[o.tier] : k[o.tier]);
	}
}
var Y = (e) => e.classList.contains("on") || e.getAttribute("aria-pressed") === "true";
function X(e) {
	let t = e.target instanceof Element ? e.target : null;
	if (!t) return;
	let n = t.closest(".heart");
	if (n) {
		let e = Y(n), t = (n.getAttribute("aria-label") || "").replace(/^[^:]+: /, "");
		if (e) {
			L("unfavorite");
			let e = 0, r = () => {
				let i = n.isConnected ? n : [...document.querySelectorAll(".heart")].find((e) => (e.getAttribute("aria-label") || "").endsWith(": " + t) && !Y(e));
				if (!i) {
					++e < 10 && setTimeout(r, 40);
					return;
				}
				o() && (i.dataset.drop = "1", setTimeout(() => {
					delete i.dataset.drop;
				}, 500));
			};
			setTimeout(r, 30);
		}
		return;
	}
	if (t.closest("button[aria-label=\"Sesleri aç\"],button[aria-label=\"Unmute sounds\"]")) {
		L("toggle", !0);
		return;
	}
	let r = t.closest("input[type=checkbox]");
	r && r.parentElement?.textContent?.trim().match(/^(Kısa etkileşim sesleri|Short interaction sounds)$/) && !r.checked && setTimeout(() => {
		r.checked && d("toggle");
	}, 0);
}
function Z(e) {
	for (let t of e) {
		let e = t instanceof Element ? t.matches(".palert-msg") ? t : t.querySelector(".palert-msg") : null;
		if (!e || !/alarm(ı)? kuruldu|alert(s)? set/i.test(e.textContent || "")) continue;
		L("alarm");
		let n = e.closest(".palert")?.querySelector(".palert-head");
		n && o() && (n.classList.remove("sfx-ring"), n.offsetWidth, n.classList.add("sfx-ring"), setTimeout(() => n.classList.remove("sfx-ring"), 1e3));
	}
}
function Q() {
	window.__radarSfx || (window.__radarSfx = !0, document.addEventListener("click", X, !0), new MutationObserver((e) => {
		for (let t of e) Z(t.addedNodes);
	}).observe(document.body, {
		childList: !0,
		subtree: !0
	}), new MutationObserver((e) => {
		for (let t of e) {
			let e = t.target.parentElement;
			e?.classList?.contains("palert-msg") && Z([e]);
		}
	}).observe(document.body, {
		characterData: !0,
		subtree: !0
	}), setInterval(J, 1e3), window.addEventListener("storage", J), q = h(Number(F(P(j), {}).xp) || 0), J());
}
Q();
//#endregion
export { Q as startSfx };
