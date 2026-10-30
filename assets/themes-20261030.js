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
var e = (e) => Object.values(e || {}).filter((e) => e.status === "open"), t = (e) => Object.values(e || {}).filter((e) => e.status !== "open").sort((e, t) => t.resolvedAt - e.resolvedAt);
function n(n) {
	let r = t(n), i = r.filter((e) => e.status === "hit").length, a = 0, o = 0;
	for (let e of [...r].reverse()) a = e.status === "hit" ? a + 1 : 0, o = Math.max(o, a);
	return {
		total: Object.keys(n || {}).length,
		open: e(n).length,
		hits: i,
		misses: r.length - i,
		accuracy: r.length ? Math.round(i / r.length * 100) : null,
		bestRun: o
	};
}
//#endregion
//#region lib/themes.mjs
var r = [
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
], i = [
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
], a = [
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
], o = i.map((e) => e.id), s = a.map((e) => e.id), c = r.map((e) => e.id), l = 864e5, u = (e) => Number(e.slice(0, 4)) * 10 + [
	"spring",
	"summer",
	"autumn",
	"winter"
].indexOf(e.slice(5));
function d(e = Date.now()) {
	let t = y(e), n = Number(t.slice(0, 4)), i = Number(t.slice(5, 7)), a = r.find((e) => e.months.includes(i)), o = i <= 2 ? n - 1 : n, s = a.months[0], c = Date.UTC(s === 12 ? o + 1 : o, (s === 12 ? 0 : s - 1) + 3, 1);
	return {
		...a,
		key: o + "-" + a.id,
		daysLeft: Math.max(1, Math.ceil((c - Date.parse(t + "T00:00:00Z")) / l))
	};
}
function f(e, t = Date.now()) {
	let n = y(t);
	if (e.seasonDay === n) return e;
	let r = d(t), i = { ...e.seasonDays || {} };
	i[r.key] = (i[r.key] || 0) + 1;
	let a = Object.fromEntries(Object.entries(i).sort((e, t) => u(t[0]) - u(e[0])).slice(0, 8)), o = e.seasonThemes || [];
	return {
		...e,
		seasonDay: n,
		seasonDays: a,
		seasonThemes: a[r.key] >= 3 && !o.includes(r.id) ? [...o, r.id] : o
	};
}
function p(e, t = []) {
	let n = t.filter((e) => e.earned);
	return {
		level: b(e.xp || 0),
		badges: n.length,
		streak: Math.max(e.bestStreak || 0, e.streak || 0),
		epic: n.some((e) => e.tier === "epic" || e.tier === "legendary"),
		legendary: n.some((e) => e.tier === "legendary"),
		seasons: e.seasonThemes || []
	};
}
function m(e, t) {
	if (e.level) return {
		open: t.level >= e.level,
		have: Math.min(t.level, e.level),
		goal: e.level,
		label: `${e.level}. seviyede açılır`
	};
	if (e.badges) return {
		open: t.badges >= e.badges,
		have: Math.min(t.badges, e.badges),
		goal: e.badges,
		label: `${e.badges} rozetle açılır`
	};
	if (e.streak) return {
		open: t.streak >= e.streak,
		have: Math.min(t.streak, e.streak),
		goal: e.streak,
		label: `${e.streak} günlük seriyle açılır`
	};
	if (e.tier) {
		let n = e.tier === "legendary" ? t.legendary : t.epic;
		return {
			open: n,
			have: +!!n,
			goal: 1,
			label: e.tier === "legendary" ? "Efsanevi bir rozetle açılır" : "Destansı bir rozetle açılır"
		};
	}
	if (e.season) {
		let n = t.seasons.includes(e.season), i = r.find((t) => t.id === e.season)?.name || "";
		return {
			open: n,
			have: +!!n,
			goal: 1,
			label: `${i} sezonunda 3 gün uğra`
		};
	}
	return {
		open: !0,
		have: 1,
		goal: 1,
		label: ""
	};
}
function h(e, t = []) {
	let n = p(e, t), r = (e) => e.map((e) => ({
		...e,
		...m(e.need, n)
	}));
	return {
		themes: r(i),
		frames: r(a),
		stats: n
	};
}
function g(e, t = []) {
	let { themes: n, frames: r } = h(e, t), i = n.find((t) => t.id === e.siteTheme && t.open), a = r.find((t) => t.id === e.frame && t.open);
	return {
		theme: i ? i.id : "",
		frame: a ? a.id : ""
	};
}
function _(e, t = []) {
	let { themes: n, frames: r } = h(e, t), i = new Set(e.styleSeen || []);
	return [...n.filter((e) => e.id && e.open).map((e) => "theme:" + e.id), ...r.filter((e) => e.id && e.open).map((e) => "frame:" + e.id)].filter((e) => !i.has(e));
}
function v(e) {
	let t = (e) => Array.isArray(e) ? e.filter((e) => typeof e == "string") : [];
	return {
		siteTheme: o.includes(e.siteTheme) ? e.siteTheme : "",
		frame: s.includes(e.frame) ? e.frame : "",
		seasonThemes: [...new Set(t(e.seasonThemes).filter((e) => c.includes(e)))],
		seasonDays: Object.fromEntries(Object.entries(e.seasonDays && typeof e.seasonDays == "object" && !Array.isArray(e.seasonDays) ? e.seasonDays : {}).filter(([e, t]) => /^\d{4}-(winter|spring|summer|autumn)$/.test(e) && Number.isFinite(t)).slice(0, 8).map(([e, t]) => [e, Math.max(0, Math.min(400, Math.floor(t)))])),
		seasonDay: typeof e.seasonDay == "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.seasonDay) ? e.seasonDay : "",
		styleSeen: Array.isArray(e.styleSeen) ? t(e.styleSeen).slice(0, 60) : null
	};
}
//#endregion
//#region lib/experience.mjs
var y = (e = Date.now()) => new Date(e + 108e5).toISOString().slice(0, 10), b = (e) => Math.min(99, 1 + Math.floor(Math.sqrt(Math.max(0, e) / 25))), x = (e) => Object.values(e.visited || {}), S = (e) => new Date(e + 108e5), C = (e, t) => x(e).filter((e) => e.at && t(S(e.at))).length, w = (e) => (t) => x(t).filter((t) => (t.genres || []).some((t) => e.test(t))).length, T = (e) => (t) => (t.events || []).filter((t) => t.startsWith(e)).length, E = (e) => (t, n) => n.filter((t) => t.status === e).length, D = (e) => (t) => Object.values(t.gameNotes || {}).filter((t) => t && t[e]).length, O = (e) => Object.values(e.hours || {}).filter((e) => e > 0), k = {
	c: "common",
	r: "rare",
	e: "epic",
	l: "legendary"
}, A = (e, t, n, r, i, a) => a.map(([a, o, s]) => ({
	id: n + "-" + a,
	cat: e,
	icon: t,
	goal: a,
	name: o,
	desc: r.replace("{n}", a),
	tier: k[s],
	have: i
})), j = (e, t, n, r, i) => A("genre", n, "genre-" + e, "{n} " + i + " oyun dosyası aç.", w(t), r), M = [
	...A("explore", "compass", "visit", "{n} farklı oyun dosyası aç.", (e) => x(e).length, [
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
	...A("explore", "palette", "genres", "{n} farklı türde oyun dosyası aç.", (e) => new Set(x(e).flatMap((e) => e.genres || [])).size, [
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
	...A("explore", "eye-off", "dismiss", "{n} oyunu \"ilgilenmiyorum\" diye geç.", (e) => e.dismissed.length, [
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
	...A("explore", "moon", "night", "Gece 00.00 ile 05.00 arasında {n} oyun dosyası aç.", (e) => C(e, (e) => e.getUTCHours() < 5), [[
		1,
		"Gece Kuşu",
		"r"
	], [
		10,
		"Gece Bekçisi",
		"e"
	]]),
	...A("explore", "zap", "marathon", "Tek günde {n} oyun dosyası aç.", (e) => Math.max(0, ...Object.values(x(e).reduce((e, t) => {
		if (t.at) {
			let n = S(t.at).toISOString().slice(0, 10);
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
	...A("streak", "flame", "streak", "{n} gün üst üste uğra.", (e) => Math.max(e.bestStreak || 0, e.streak), [
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
	...A("streak", "calendar-check", "days", "Toplam {n} farklı gün uğra.", (e) => Math.max(e.daysVisited || 0, e.bestStreak || 0, e.streak), [
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
	...A("collection", "heart", "fav", "{n} oyunu favorilere ekle.", (e, t) => t.length, [
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
	...A("collection", "heart-handshake", "like", "Toplam {n} kez favoriye kalp bırak.", T("like:"), [
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
	...A("collection", "sparkles", "wish", "İstek listende {n} oyun biriktir.", E("wish"), [
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
	...A("collection", "gamepad", "playing", "Aynı anda {n} oyunu \"oynuyorum\" olarak işaretle.", E("playing"), [
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
	...A("collection", "crown", "top10", "Top 10 rafına {n} oyun koy.", (e) => e.top10.length, [
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
	...A("play", "check", "done", "{n} oyunu bitir.", E("done"), [
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
	...A("play", "hourglass", "hours", "Oyunlarına toplam {n} saat kaydet.", (e) => Math.floor(O(e).reduce((e, t) => e + t, 0)), [
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
	...A("play", "timer", "one-game", "Tek bir oyuna {n} saat kaydet.", (e) => Math.floor(Math.max(0, ...O(e))), [
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
	...A("play", "rocket", "hype", "{n} oyuna heyecan puanı ver.", (e) => Object.values(e.hype || {}).filter((e) => e > 0).length, [
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
	...A("play", "cake", "anniversary", "{n} oyun yıl dönümü kaydet.", (e) => e.anniversaries.length, [[
		1,
		"Yıl Dönümü",
		"r"
	], [
		5,
		"Anı Defteri",
		"e"
	]]),
	...j("action", /aksiyon|action/i, "swords", [
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
	...j("adventure", /macera|adventure/i, "map", [
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
	...j("rpg", /^rpg$|rol yapma|role-playing/i, "dragon", [
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
	...j("strategy", /strateji|strategy/i, "brain", [
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
	...j("sim", /simülasyon|simulation/i, "cpu", [
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
	...j("sports", /^spor|sports?/i, "trophy", [
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
	...j("racing", /yarış|racing/i, "car", [
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
	...j("indie", /bağımsız|indie/i, "sparkles", [
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
	...j("casual", /rahat|casual/i, "leaf", [
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
	...j("mmo", /mmo|massively/i, "users", [
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
	...j("horror", /korku|horror/i, "ghost", [
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
	...j("platformer", /platform/i, "footprints", [
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
	...j("puzzle", /bulmaca|puzzle/i, "puzzle", [
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
	...j("shooter", /nişancı|shooter|fps/i, "crosshair", [
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
	...j("fighting", /dövüş|fighting/i, "fist", [
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
	...j("roguelike", /rogue/i, "dices", [
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
	...A("genre", "ghost", "horror-fav", "{n} korku oyununu favorilere ekle.", (e, t) => t.filter((e) => (e.genres || []).some((e) => /korku|horror/i.test(e))).length, [[
		10,
		"Korkusuz",
		"e"
	]]),
	...A("writing", "pen", "review", "{n} oyun için toplulukta inceleme paylaş.", T("review:"), [
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
	...A("writing", "notebook", "journal", "{n} farklı oyuna günlük notu yaz.", (e) => Object.values(e.journal || {}).filter((e) => e.length).length, [
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
	...A("writing", "scroll", "entries", "Günlüğüne toplam {n} not yaz.", (e) => Object.values(e.journal || {}).reduce((e, t) => e + t.length, 0), [
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
	...A("writing", "newspaper", "read", "{n} haber ya da yazı oku.", T("read:"), [
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
	...A("writing", "tag", "tags", "{n} oyuna etiket ekle.", (e) => Object.values(e.tags || {}).filter((e) => e.length).length, [
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
	...A("writing", "pin", "pins", "Bir oyun haritasına {n} işaret koy.", (e) => Math.max(0, ...Object.values(e.gameNotes || {}).map((e) => e.mapPins?.length || 0)), [
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
	...A("writing", "map", "maps", "{n} oyuna dünya haritası ekle.", D("mapUrl"), [[
		1,
		"Harita Yükleyen",
		"c"
	], [
		5,
		"Atlas Sahibi",
		"r"
	]]),
	...A("price", "bell", "alerts", "{n} fiyat alarmın çalsın.", (e) => e.seenAlerts.length, [
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
	...A("price", "target", "target", "{n} favoriye hedef fiyat koy.", (e, t) => t.filter((e) => Number.isFinite(e.target)).length, [
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
	...A("price", "store", "platforms", "{n} farklı mağazayı gez.", (e) => Object.values(e.platformVisits || {}).filter((e) => e > 0).length, [
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
	...A("price", "telescope", "predict-hit", "{n} fiyat tahminini doğru bil.", (e) => n(e.predictions).hits, [[
		1,
		"İlk Kehanet",
		"c"
	], [
		10,
		"İndirim Kâhini",
		"e"
	]]),
	...A("price", "coins", "currency", "Fiyatları başka para biriminde göster.", (e) => e.currency === "TRY" ? 0 : 1, [[
		1,
		"Döviz Gözlüğü",
		"c"
	]]),
	...A("level", "star", "level", "{n}. seviyeye ulaş.", (e) => b(e.xp), [
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
	...A("level", "shirt", "avatars", "Avatar dükkânında {n} avatarın olsun.", (e) => e.unlocked.length, [
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
	...A("personal", "user", "name", "Oyuncu adını yaz.", (e) => +!!e.name, [[
		1,
		"Adını Koydun",
		"c"
	]]),
	...A("personal", "library", "shelf-name", "Oyun rafına bir ad ver.", (e) => +!!e.collectionName, [[
		1,
		"Raf Sahibi",
		"c"
	]]),
	...A("personal", "map-pin", "city", "Şehrini ekle.", (e) => +!!e.city, [[
		1,
		"Memleket",
		"c"
	]]),
	...A("personal", "heart", "pref-genre", "Sevdiğin türü seç.", (e) => +!!e.preferredGenre, [[
		1,
		"Tür Tercihi",
		"c"
	]]),
	...A("personal", "fingerprint", "persona", "{n} oyuncu kişiliği seç.", (e) => e.personas.length, [[
		1,
		"Oyuncu Kişiliği",
		"c"
	], [
		3,
		"Çok Yüzlü",
		"r"
	]]),
	...A("personal", "eye", "color", "Renk görme modunu ayarla.", (e) => e.colorMode === "default" ? 0 : 1, [[
		1,
		"Renk Ayarı",
		"c"
	]]),
	...A("personal", "leaf", "zen", "Zen görünümünü aç.", (e) => +!!e.zen, [[
		1,
		"Zen Modu",
		"c"
	]]),
	...A("personal", "joystick", "retro", "Retro görünümü aç.", (e) => +!!e.retro, [[
		1,
		"Retro Ruh",
		"r"
	]])
];
function N(e, t = []) {
	return M.map((n) => {
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
//#region app/Themes.tsx
function P(e, { useExperience: t, useFavorites: n, PixelAvatar: r }) {
	let { useEffect: o, useMemo: s } = e, c = e.createElement, l = () => /* @__PURE__ */ c("svg", {
		width: "12",
		height: "12",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true"
	}, /* @__PURE__ */ c("rect", {
		x: "3",
		y: "11",
		width: "18",
		height: "11",
		rx: "2"
	}), /* @__PURE__ */ c("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })), u = () => /* @__PURE__ */ c("svg", {
		width: "12",
		height: "12",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2.5",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true"
	}, /* @__PURE__ */ c("path", { d: "M20 6 9 17l-5-5" }));
	function p() {
		let e = t(), r = n(), i = s(() => ({
			...e.state,
			...v(e.state)
		}), [e.state]);
		return {
			e,
			state: i,
			badges: s(() => N(i, r.favs), [i, r.favs])
		};
	}
	let m = () => {
		try {
			sessionStorage.setItem("radar-space-tab", "style");
		} catch {}
		window.dispatchEvent(new CustomEvent("radar:navigate", { detail: "profile" }));
		for (let e of [
			60,
			400,
			1200
		]) setTimeout(() => window.dispatchEvent(new CustomEvent("radar:space-tab", { detail: "style" })), e);
	};
	function y() {
		let { e, state: t, badges: n } = p(), r = g(t, n), s = e.loaded !== !1 && !!e.state.lastDay, c = s ? _(t, n).join("|") : "";
		return o(() => {
			if (!s) return;
			let e = document.documentElement, n = r.theme && t.colorMode === "default" ? r.theme : "";
			n ? e.dataset.siteTheme = n : delete e.dataset.siteTheme, r.frame ? e.dataset.frame = r.frame : delete e.dataset.frame;
			try {
				n ? localStorage.setItem("radar-site-theme", n) : localStorage.removeItem("radar-site-theme");
			} catch {}
		}, [
			s,
			r.theme,
			r.frame,
			t.colorMode
		]), o(() => {
			s && e.patch((e) => {
				let t = f({
					...e,
					...v(e)
				});
				return t.seasonDay === e.seasonDay ? e : t;
			});
		}, [s, t.lastDay]), o(() => {
			if (!c) return;
			let n = c.split("|"), r = t.styleSeen === null;
			if (e.patch((e) => ({
				...e,
				styleSeen: [...new Set([...Array.isArray(e.styleSeen) ? e.styleSeen : [], ...n])].slice(-60)
			})), r) {
				e.notify(`Yeni: ilerlemenle ${n.length} tema ve çerçeve açtın.`, m, "Göster");
				return;
			}
			let [o, s] = n[0].split(":"), l = (o === "theme" ? i : a).find((e) => e.id === s);
			l && e.notify(o === "theme" ? `Yeni tema açıldı: ${l.name}` : `Yeni profil çerçevesi açıldı: ${l.name}`, m, "Göster");
		}, [c]), null;
	}
	function b({ x: e }) {
		return e.open ? null : /* @__PURE__ */ c("span", { className: "style-need" }, /* @__PURE__ */ c(l, null), e.label, e.goal > 1 && /* @__PURE__ */ c("progress", {
			value: e.have,
			max: e.goal
		}));
	}
	function x({ avatar: e }) {
		let { e: t, state: n, badges: i } = p(), a = g(n, i), { themes: o, frames: s, stats: l } = h(n, i), f = d(), m = o.find((e) => e.id === f.id), _ = Math.min(3, n.seasonDays?.[f.key] || 0), v = n.colorMode !== "default", y = [...o, ...s].filter((e) => e.id), x = y.filter((e) => e.open).length;
		return /* @__PURE__ */ c("div", { className: "style-shop" }, /* @__PURE__ */ c("div", { className: "style-head" }, /* @__PURE__ */ c("div", null, /* @__PURE__ */ c("h3", null, "Temalar ve çerçeveler"), /* @__PURE__ */ c("p", null, `${x} / ${y.length} açıldı · ${l.level}. seviye · ${l.badges} rozet`)), /* @__PURE__ */ c("div", { className: "season-card season-" + f.id + (m?.open ? " done" : "") }, /* @__PURE__ */ c("small", { className: "season-label" }, `${f.name} sezonu`), /* @__PURE__ */ c("strong", null, m?.open ? `${m.name} teman açık` : m?.name), !m?.open && /* @__PURE__ */ c("span", { className: "season-count" }, `${_} / 3 gün`), /* @__PURE__ */ c("progress", {
			value: _,
			max: 3
		}), /* @__PURE__ */ c("small", null, m?.open ? `Sezon bitimine ${f.daysLeft} gün. Tema kalıcı olarak senin.` : `Sezon bitmeden 3 farklı gün uğra, tema ve çerçeve kalıcı olarak açılsın. Kalan: ${f.daysLeft} gün.`))), v && /* @__PURE__ */ c("p", { className: "phnote" }, "Renk erişilebilirliği modu açıkken site rengi o moda göre kalır; çerçeveler yine görünür."), /* @__PURE__ */ c("h4", null, "Site rengi"), /* @__PURE__ */ c("div", {
			className: "theme-grid",
			role: "radiogroup",
			"aria-label": "Site rengi"
		}, o.map((e) => /* @__PURE__ */ c("button", {
			key: e.id || "mood",
			type: "button",
			role: "radio",
			"aria-checked": a.theme === e.id,
			disabled: !e.open,
			className: "theme-swatch" + (e.open ? "" : " locked"),
			onClick: () => t.patch({ siteTheme: e.id }),
			style: {
				"--sw1": e.swatch[0],
				"--sw2": e.swatch[1]
			}
		}, /* @__PURE__ */ c("i", { "aria-hidden": "true" }), /* @__PURE__ */ c("strong", null, e.name), /* @__PURE__ */ c("small", null, e.desc), a.theme === e.id ? /* @__PURE__ */ c("b", null, /* @__PURE__ */ c(u, null), "Kullanılıyor") : /* @__PURE__ */ c(b, { x: e })))), /* @__PURE__ */ c("h4", null, "Profil çerçevesi"), /* @__PURE__ */ c("div", {
			className: "frame-grid",
			role: "radiogroup",
			"aria-label": "Profil çerçevesi"
		}, s.map((n) => /* @__PURE__ */ c("button", {
			key: n.id || "none",
			type: "button",
			role: "radio",
			"aria-checked": a.frame === n.id,
			disabled: !n.open,
			className: n.open ? "" : "locked",
			onClick: () => t.patch({ frame: n.id })
		}, /* @__PURE__ */ c("span", {
			className: "pixel-avatar avatar-" + e.id + (n.id ? " has-frame frame-" + n.id : ""),
			style: { color: e.color },
			"aria-hidden": "true"
		}, /* @__PURE__ */ c(r, { kind: e.id })), /* @__PURE__ */ c("strong", null, n.name), a.frame === n.id ? /* @__PURE__ */ c("b", null, /* @__PURE__ */ c(u, null), "Kullanılıyor") : /* @__PURE__ */ c(b, { x: n })))), /* @__PURE__ */ c("p", { className: "phnote" }, "Temalar Sade ve Klasik görünümde kendi renk ayarıyla çalışır. Seçimin hesabınla diğer cihazlarına da taşınır."));
	}
	return {
		SiteStyle: y,
		StyleShop: x
	};
}
//#endregion
export { P as createThemes };
