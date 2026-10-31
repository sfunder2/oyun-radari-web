//#region lib/community.mjs
var e = "https://dsosckshigzijnsxmlwh.supabase.co", t = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO";
//#endregion
//#region lib/search-telemetry.mjs
function n(e, t, n, r, i = !1) {
	let a = String(e || "").trim().slice(0, 80);
	return a.length < 2 || /@|https?:\/\//i.test(a) || !Number.isFinite(r) ? null : {
		p_query: a,
		p_market: t,
		p_total: Math.max(0, Number(n) || 0),
		p_ms: Math.max(0, Math.min(6e4, Math.round(r))),
		p_error: !!i
	};
}
function r(r, i, a, o, s = !1) {
	if (typeof window > "u") return;
	let c = n(r, i, a, o, s);
	c && fetch(e + "/rest/v1/rpc/record_radar_search", {
		method: "POST",
		headers: {
			apikey: t,
			Authorization: "Bearer " + t,
			"Content-Type": "application/json"
		},
		body: JSON.stringify(c),
		signal: AbortSignal.timeout(4e3),
		credentials: "omit"
	}).catch(() => {});
}
async function i(e, t, n) {
	let i = performance.now();
	try {
		let a = await n();
		return r(e, t, a.total, performance.now() - i), a;
	} catch (n) {
		throw r(e, t, 0, performance.now() - i, !0), n;
	}
}
//#endregion
//#region lib/search.mjs
function a(e) {
	let t = String(e || "").replace(/[™®©]/g, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ı/g, "i").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
	return {
		"gta 5": "grand theft auto v",
		gta5: "grand theft auto v",
		"gta v": "grand theft auto v",
		rdr2: "red dead redemption 2",
		"rdr 2": "red dead redemption 2",
		fc27: "fc 27",
		fc26: "fc 26"
	}[t] || t;
}
//#endregion
//#region lib/taste.mjs
var o = [
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
];
new Map(o.map((e) => [e.id, e]));
function s(e, t) {
	let n = new Set(t?.genres || []), r = new Set((t?.tags || []).map((e) => e.toLowerCase()));
	return {
		genres: (e?.genres || []).filter((e) => n.has(e)).length,
		tags: new Set([...e?.tags || [], ...e?.categories || []].map((e) => String(e).toLowerCase()).filter((e) => r.has(e))).size
	};
}
var c = (e, t) => {
	let n = s(e, t);
	return n.genres + n.tags > 0;
}, l = (e) => Object.values(e || {}).filter((e) => e.status === "open"), u = (e) => Object.values(e || {}).filter((e) => e.status !== "open").sort((e, t) => t.resolvedAt - e.resolvedAt);
function d(e) {
	let t = u(e), n = t.filter((e) => e.status === "hit").length, r = 0, i = 0;
	for (let e of [...t].reverse()) r = e.status === "hit" ? r + 1 : 0, i = Math.max(i, r);
	return {
		total: Object.keys(e || {}).length,
		open: l(e).length,
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
var f = (e) => Math.min(99, 1 + Math.floor(Math.sqrt(Math.max(0, e) / 25))), p = (e) => Object.values(e.visited || {}), m = (e) => new Date(e + 108e5), h = (e, t) => p(e).filter((e) => e.at && t(m(e.at))).length, g = (e) => (t) => p(t).filter((t) => (t.genres || []).some((t) => e.test(t))).length, _ = (e) => (t) => (t.events || []).filter((t) => t.startsWith(e)).length, v = (e) => (t, n) => n.filter((t) => t.status === e).length, y = (e) => (t) => Object.values(t.gameNotes || {}).filter((t) => t && t[e]).length, b = (e) => Object.values(e.hours || {}).filter((e) => e > 0), x = {
	c: "common",
	r: "rare",
	e: "epic",
	l: "legendary"
}, S = (e, t, n, r, i, a) => a.map(([a, o, s]) => ({
	id: n + "-" + a,
	cat: e,
	icon: t,
	goal: a,
	name: o,
	desc: r.replace("{n}", a),
	tier: x[s],
	have: i
})), C = (e, t, n, r, i) => S("genre", n, "genre-" + e, "{n} " + i + " oyun dosyası aç.", g(t), r);
[
	...S("explore", "compass", "visit", "{n} farklı oyun dosyası aç.", (e) => p(e).length, [
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
	...S("explore", "palette", "genres", "{n} farklı türde oyun dosyası aç.", (e) => new Set(p(e).flatMap((e) => e.genres || [])).size, [
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
	...S("explore", "eye-off", "dismiss", "{n} oyunu \"ilgilenmiyorum\" diye geç.", (e) => e.dismissed.length, [
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
	...S("explore", "moon", "night", "Gece 00.00 ile 05.00 arasında {n} oyun dosyası aç.", (e) => h(e, (e) => e.getUTCHours() < 5), [[
		1,
		"Gece Kuşu",
		"r"
	], [
		10,
		"Gece Bekçisi",
		"e"
	]]),
	...S("explore", "zap", "marathon", "Tek günde {n} oyun dosyası aç.", (e) => Math.max(0, ...Object.values(p(e).reduce((e, t) => {
		if (t.at) {
			let n = m(t.at).toISOString().slice(0, 10);
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
	...S("streak", "flame", "streak", "{n} gün üst üste uğra.", (e) => Math.max(e.bestStreak || 0, e.streak), [
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
	...S("streak", "calendar-check", "days", "Toplam {n} farklı gün uğra.", (e) => Math.max(e.daysVisited || 0, e.bestStreak || 0, e.streak), [
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
	...S("collection", "heart", "fav", "{n} oyunu favorilere ekle.", (e, t) => t.length, [
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
	...S("collection", "heart-handshake", "like", "Toplam {n} kez favoriye kalp bırak.", _("like:"), [
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
	...S("collection", "sparkles", "wish", "İstek listende {n} oyun biriktir.", v("wish"), [
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
	...S("collection", "gamepad", "playing", "Aynı anda {n} oyunu \"oynuyorum\" olarak işaretle.", v("playing"), [
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
	...S("collection", "crown", "top10", "Top 10 rafına {n} oyun koy.", (e) => e.top10.length, [
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
	...S("play", "check", "done", "{n} oyunu bitir.", v("done"), [
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
	...S("play", "hourglass", "hours", "Oyunlarına toplam {n} saat kaydet.", (e) => Math.floor(b(e).reduce((e, t) => e + t, 0)), [
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
	...S("play", "timer", "one-game", "Tek bir oyuna {n} saat kaydet.", (e) => Math.floor(Math.max(0, ...b(e))), [
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
	...S("play", "rocket", "hype", "{n} oyuna heyecan puanı ver.", (e) => Object.values(e.hype || {}).filter((e) => e > 0).length, [
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
	...S("play", "cake", "anniversary", "{n} oyun yıl dönümü kaydet.", (e) => e.anniversaries.length, [[
		1,
		"Yıl Dönümü",
		"r"
	], [
		5,
		"Anı Defteri",
		"e"
	]]),
	...C("action", /aksiyon|action/i, "swords", [
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
	...C("adventure", /macera|adventure/i, "map", [
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
	...C("rpg", /^rpg$|rol yapma|role-playing/i, "dragon", [
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
	...C("strategy", /strateji|strategy/i, "brain", [
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
	...C("sim", /simülasyon|simulation/i, "cpu", [
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
	...C("sports", /^spor|sports?/i, "trophy", [
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
	...C("racing", /yarış|racing/i, "car", [
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
	...C("indie", /bağımsız|indie/i, "sparkles", [
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
	...C("casual", /rahat|casual/i, "leaf", [
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
	...C("mmo", /mmo|massively/i, "users", [
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
	...C("horror", /korku|horror/i, "ghost", [
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
	...C("platformer", /platform/i, "footprints", [
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
	...C("puzzle", /bulmaca|puzzle/i, "puzzle", [
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
	...C("shooter", /nişancı|shooter|fps/i, "crosshair", [
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
	...C("fighting", /dövüş|fighting/i, "fist", [
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
	...C("roguelike", /rogue/i, "dices", [
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
	...S("genre", "ghost", "horror-fav", "{n} korku oyununu favorilere ekle.", (e, t) => t.filter((e) => (e.genres || []).some((e) => /korku|horror/i.test(e))).length, [[
		10,
		"Korkusuz",
		"e"
	]]),
	...S("writing", "pen", "review", "{n} oyun için toplulukta inceleme paylaş.", _("review:"), [
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
	...S("writing", "notebook", "journal", "{n} farklı oyuna günlük notu yaz.", (e) => Object.values(e.journal || {}).filter((e) => e.length).length, [
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
	...S("writing", "scroll", "entries", "Günlüğüne toplam {n} not yaz.", (e) => Object.values(e.journal || {}).reduce((e, t) => e + t.length, 0), [
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
	...S("writing", "newspaper", "read", "{n} haber ya da yazı oku.", _("read:"), [
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
	...S("writing", "tag", "tags", "{n} oyuna etiket ekle.", (e) => Object.values(e.tags || {}).filter((e) => e.length).length, [
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
	...S("writing", "pin", "pins", "Bir oyun haritasına {n} işaret koy.", (e) => Math.max(0, ...Object.values(e.gameNotes || {}).map((e) => e.mapPins?.length || 0)), [
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
	...S("writing", "map", "maps", "{n} oyuna dünya haritası ekle.", y("mapUrl"), [[
		1,
		"Harita Yükleyen",
		"c"
	], [
		5,
		"Atlas Sahibi",
		"r"
	]]),
	...S("price", "bell", "alerts", "{n} fiyat alarmın çalsın.", (e) => e.seenAlerts.length, [
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
	...S("price", "target", "target", "{n} favoriye hedef fiyat koy.", (e, t) => t.filter((e) => Number.isFinite(e.target)).length, [
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
	...S("price", "store", "platforms", "{n} farklı mağazayı gez.", (e) => Object.values(e.platformVisits || {}).filter((e) => e > 0).length, [
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
	...S("price", "telescope", "predict-hit", "{n} fiyat tahminini doğru bil.", (e) => d(e.predictions).hits, [[
		1,
		"İlk Kehanet",
		"c"
	], [
		10,
		"İndirim Kâhini",
		"e"
	]]),
	...S("price", "coins", "currency", "Fiyatları başka para biriminde göster.", (e) => e.currency === "TRY" ? 0 : 1, [[
		1,
		"Döviz Gözlüğü",
		"c"
	]]),
	...S("level", "star", "level", "{n}. seviyeye ulaş.", (e) => f(e.xp), [
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
	...S("level", "shirt", "avatars", "Avatar dükkânında {n} avatarın olsun.", (e) => e.unlocked.length, [
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
	...S("personal", "user", "name", "Oyuncu adını yaz.", (e) => +!!e.name, [[
		1,
		"Adını Koydun",
		"c"
	]]),
	...S("personal", "library", "shelf-name", "Oyun rafına bir ad ver.", (e) => +!!e.collectionName, [[
		1,
		"Raf Sahibi",
		"c"
	]]),
	...S("personal", "map-pin", "city", "Şehrini ekle.", (e) => +!!e.city, [[
		1,
		"Memleket",
		"c"
	]]),
	...S("personal", "heart", "pref-genre", "Sevdiğin türü seç.", (e) => +!!e.preferredGenre, [[
		1,
		"Tür Tercihi",
		"c"
	]]),
	...S("personal", "fingerprint", "persona", "{n} oyuncu kişiliği seç.", (e) => e.personas.length, [[
		1,
		"Oyuncu Kişiliği",
		"c"
	], [
		3,
		"Çok Yüzlü",
		"r"
	]]),
	...S("personal", "eye", "color", "Renk görme modunu ayarla.", (e) => e.colorMode === "default" ? 0 : 1, [[
		1,
		"Renk Ayarı",
		"c"
	]]),
	...S("personal", "leaf", "zen", "Zen görünümünü aç.", (e) => +!!e.zen, [[
		1,
		"Zen Modu",
		"c"
	]]),
	...S("personal", "joystick", "retro", "Retro görünümü aç.", (e) => +!!e.retro, [[
		1,
		"Retro Ruh",
		"r"
	]])
];
//#endregion
//#region lib/ps-supabase.mjs
var w = "https://dsosckshigzijnsxmlwh.supabase.co", T = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO", E = 25, D = (e) => String(e || "").replace(/[™®©]/g, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/\s+/g, " ").trim();
async function O(e, t) {
	let n = await fetch(w + "/rest/v1/" + e, {
		headers: {
			apikey: T,
			Authorization: "Bearer " + T,
			...t ? { Prefer: "count=exact" } : {}
		},
		credentials: "omit"
	});
	if (!n.ok) throw Error("PlayStation veritabanı HTTP " + n.status);
	let r = n.headers.get("content-range"), i = r && /\/(\d+)$/.test(r) ? Number(r.split("/")[1]) : null;
	return {
		rows: await n.json(),
		total: i
	};
}
var k = 6e4, A = /* @__PURE__ */ new Map();
function j(e) {
	let t = A.get(e);
	if (t && Date.now() - t.at < k) return t.p;
	let n = O("ps_state?select=value&key=eq." + e).catch(() => (A.delete(e), null));
	return A.set(e, {
		at: Date.now(),
		p: n
	}), n;
}
var M = (e) => e == null ? null : Number(e), N = {
	steam: "TR / MENA",
	xbox: "TR",
	switch: "US",
	epic: "TR",
	gog: "TR"
}, P = (e) => ({
	id: e.platform + ":" + e.store_id,
	storeId: e.store_id,
	platform: e.platform,
	name: e.name,
	image: e.image || void 0,
	price: M(e.price),
	originalPrice: M(e.original_price),
	discountPercent: e.discount_percent || 0,
	currency: e.currency,
	region: N[e.platform] || "",
	url: e.url,
	edition: e.edition,
	checkedAt: e.checked_at
}), F = (e) => ({
	id: e.id,
	titleKey: e.title_key || null,
	heroUrl: e.hero_url || null,
	accentColor: e.accent_color || null,
	tags: [...new Set([...Array.isArray(e.tags) ? e.tags : [], ...Array.isArray(e.ps_tags) ? e.ps_tags : []])],
	categories: Array.isArray(e.categories) ? e.categories : [],
	storeId: e.id,
	platform: "playstation",
	name: e.name,
	image: e.image || void 0,
	price: M(e.price),
	originalPrice: M(e.original_price),
	discountPercent: e.discount_percent || 0,
	discountEndsAt: e.discount_ends_at || null,
	currency: e.currency || "TRY",
	region: "TR",
	edition: e.edition,
	url: e.url,
	source: e.url,
	sourceKind: "psstore",
	sourceLabel: "PlayStation Store TR",
	checkedAt: e.checked_at,
	purchaseEligible: !0,
	lowestEver: M(e.lowest_ever),
	lowest30d: M(e.lowest_30d),
	historyDays: e.history_days || 0,
	historicalLow: !!e.historical_low,
	low30d: !!e.low_30d,
	priceRise: e.price_rise || null,
	enriched: !!e.enriched_at,
	storeStatus: e.store_status || {},
	previewUrl: e.preview_url || null,
	genres: Array.isArray(e.genres) ? e.genres : [],
	releaseDate: e.release_date || null,
	developers: Array.isArray(e.developers) ? e.developers : [],
	publishers: Array.isArray(e.publishers) ? e.publishers : [],
	turkish: !!e.turkish,
	turkishAudio: !!e.turkish_audio,
	age: e.age || null,
	ageNotes: Array.isArray(e.age_notes) ? e.age_notes : [],
	steamAppid: M(e.steam_appid),
	requirements: e.requirements && typeof e.requirements == "object" ? e.requirements : null,
	dlcCount: e.dlc_count || 0,
	news: Array.isArray(e.news) ? e.news : [],
	bestScore: M(e.best_score),
	offers: Array.isArray(e.offers) ? e.offers.map((t) => ({
		...P(t),
		sourceStatus: e.store_status?.[t.platform]?.status || "unknown",
		purchaseEligible: e.store_status?.[t.platform]?.status !== "unavailable" && Date.now() - Date.parse(t.checked_at) < 864e5
	})) : [],
	scores: e.scores ? {
		metacritic: M(e.scores.metacritic),
		metacriticPlatform: e.scores.metacritic_platform || null,
		metacriticUrl: e.scores.metacritic_url || null,
		opencritic: M(e.scores.opencritic),
		opencriticReviews: M(e.scores.opencritic_reviews),
		opencriticUrl: e.scores.opencritic_url || null
	} : null
});
async function I(e, t, n, r, i, o) {
	let s = await fetch(w + "/rest/v1/rpc/search_games", {
		method: "POST",
		headers: {
			apikey: T,
			Authorization: "Bearer " + T,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			query_text: a(e),
			page_number: t,
			page_size: n,
			deals_only: r,
			sort_order: i,
			filter_options: o
		}),
		signal: AbortSignal.timeout(2e4),
		credentials: "omit"
	});
	if (!s.ok) throw Error("PlayStation araması HTTP " + s.status);
	return s.json();
}
async function L(e = "", t = 0, n = !1, r = "default", a = {}) {
	return t === 0 ? i(e, "playstation", () => R(e, t, n, r, a)) : R(e, t, n, r, a);
}
async function R(e, t, n, r, i) {
	let [o, s] = await Promise.all([I(e, t, E, n, r, i), j("batch")]), c = s?.rows?.[0]?.value;
	return {
		platform: "playstation",
		items: o.items.map(F),
		total: o.total,
		hasMore: (t + 1) * E < o.total,
		page: t,
		status: "ok",
		scheduled: !0,
		sourceKind: "psstore",
		sourceLabel: "PlayStation Store TR",
		checkedAt: c?.finishedAt,
		batch: c,
		fuzzy: o.fuzzy,
		query: o.query,
		personalized: !!o.personalized,
		expanded: a(e) !== D(e)
	};
}
async function ee(e, t = [], n = 8) {
	let r = [...new Set((e || []).filter((e) => /^[\p{L} ]{2,30}$/u.test(e)))].slice(0, 3);
	if (!r.length) return [];
	let i = new URLSearchParams({
		select: "*",
		limit: "40",
		order: "best_score.desc.nullslast,name.asc",
		genres: "ov.{" + r.join(",") + "}"
	});
	try {
		let e = new Set(t);
		return (await O("library?" + i)).rows.map(F).filter((t) => !e.has(t.id)).slice(0, n);
	} catch {
		return [];
	}
}
var z = {
	steam: "Steam",
	xbox: "Xbox Store TR",
	switch: "Nintendo eShop (ABD)",
	epic: "Epic Games Store TR",
	gog: "GOG TR"
};
function B(e) {
	if (!e || !e.platform || e.platform === "playstation") return F(e);
	let t = F({
		...e,
		scores: e.mc_score || e.oc_score ? {
			metacritic: e.mc_score,
			opencritic: e.oc_score,
			opencritic_reviews: e.opencritic_reviews
		} : null,
		enriched_at: e.checked_at,
		offers: e.offers || []
	});
	return {
		...t,
		storeId: e.store_id,
		platform: e.platform,
		region: N[e.platform] || "",
		sourceKind: "market",
		sourceLabel: z[e.platform] || e.platform,
		steamAppid: e.platform === "steam" ? M(e.store_id) : t.steamAppid
	};
}
var V = (e) => D(String(e || "").replace(/[™®©]/g, "").replace(/\(?\s*PS\s?[45]\s*(?:ve|and|und|&|\/|\+|,)?\s*(?:PS\s?[45])?\s*\)?/gi, " ").replace(/\s+/g, " ").trim()).replace(/[^a-z0-9]+/g, " ").replace(/\b(standard|standart|edition|surum|digital|dijital)\b/g, " ").replace(/\s+/g, " ").trim();
async function H(e = "all", t = "", n = 0, r = !1, a = "default", o = {}) {
	return n === 0 ? i(t, e, () => U(e, t, n, r, a, o)) : U(e, t, n, r, a, o);
}
async function U(e, t, n, r, i, o) {
	let s = {};
	for (let e of [
		"minScore",
		"maxPrice",
		"genre",
		"tag",
		"ids",
		"developer",
		"year",
		"turkish",
		"usdTry",
		"preferGenres",
		"preferTags",
		"device"
	]) o[e] !== void 0 && o[e] !== "" && o[e] !== !1 && o[e] !== 0 && !(Array.isArray(o[e]) && !o[e].length) && (s[e] = o[e]);
	let c = await fetch(w + "/rest/v1/rpc/" + (s.device ? "search_market_v2" : "search_market"), {
		method: "POST",
		headers: {
			apikey: T,
			Authorization: "Bearer " + T,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			market: e,
			query_text: a(t),
			page_number: n,
			page_size: E,
			deals_only: r,
			sort_order: i,
			filter_options: s
		}),
		signal: AbortSignal.timeout(2e4),
		credentials: "omit"
	});
	if (!c.ok) throw Error("Market araması HTTP " + c.status);
	let l = await c.json(), u = await j("market");
	return {
		platform: e,
		items: (l.items || []).map(B),
		total: l.total || 0,
		hasMore: (n + 1) * E < (l.total || 0),
		page: n,
		status: "ok",
		scheduled: !0,
		sourceKind: "market",
		sourceLabel: e === "all" ? "Tüm marketler" : z[e],
		checkedAt: u?.rows?.[0]?.value?.finishedAt,
		query: l.query,
		personalized: !!l.personalized
	};
}
var W = [
	"playstation",
	"steam",
	"xbox",
	"switch",
	"epic",
	"gog"
], G = (e) => e.titleKey || String(e.name || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
function te(e, t, n = []) {
	let r = /* @__PURE__ */ new Set(), i = new Set(n), a = [], o = e.map((e) => [...e || []]);
	for (; a.length < t && o.some((e) => e.length);) for (let e of o) {
		let n;
		for (; (n = e.shift()) && (i.has(n.id) || r.has(G(n))););
		if (n && (r.add(G(n)), a.push(n), a.length >= t)) break;
	}
	return a;
}
var ne = 10 * 6e4, K = /* @__PURE__ */ new Map(), q = /* @__PURE__ */ new Map();
async function re(e, t, n) {
	let r = "radar-mix:" + e + ":" + t + ":" + JSON.stringify(n), i = K.get(r) || (() => {
		try {
			let e = JSON.parse(globalThis.sessionStorage?.getItem(r) || "null");
			return e && Array.isArray(e.items) ? e : null;
		} catch {
			return null;
		}
	})();
	if (i && Date.now() - i.at < ne) return i.items;
	if (q.has(r)) return q.get(r);
	let a = (async () => {
		let i = (e === "playstation" ? await L("", 0, !1, t, n) : await H(e, "", 0, !1, t, n)).items, a = {
			at: Date.now(),
			items: i
		};
		K.set(r, a);
		try {
			globalThis.sessionStorage?.setItem(r, JSON.stringify(a));
		} catch {}
		return i;
	})().finally(() => q.delete(r));
	return q.set(r, a), a;
}
async function ie(e = "score", t = {}, n = 8, r = {}) {
	let i = r.excludeIds || [], a = r.stores || W, o = r.keep || (() => !0), s = [];
	for (let n of a) s.push(await re(n, e, t).then((e) => e.filter(o)).catch(() => []));
	return te(s, n, i);
}
var ae = 24 * 36e5;
async function oe({ appids: e = [], titleKeys: t = [] } = {}) {
	let n = [...new Set(e.filter((e) => Number.isInteger(e) && e > 0))].slice(0, 60), r = [...new Set(t.filter((e) => /^[a-z0-9 ]{1,120}$/.test(e)))].slice(0, 60), i = "radar-dna-meta:" + n.join(",") + "|" + r.join(",");
	try {
		let e = JSON.parse(globalThis.localStorage?.getItem("radar-dna-meta") || "null");
		if (e && e.key === i && Date.now() - e.at < ae) return e.data;
	} catch {}
	let a = (e) => e.map((e) => "\"" + e + "\"").join(","), o = {}, s = {};
	if (n.length) for (let e of (await O("store_offers?select=store_id,title_key,genres,tags&platform=eq.steam&store_id=in.(" + encodeURIComponent(a(n.map(String))) + ")")).rows) o[e.store_id] = {
		titleKey: e.title_key || "",
		genres: e.genres || [],
		tags: e.tags || []
	};
	let c = [...new Set([...r, ...Object.values(o).map((e) => e.titleKey).filter(Boolean)])].slice(0, 120);
	if (c.length) for (let e of (await O("game_meta?select=title_key,genres,tags,release_date&title_key=in.(" + encodeURIComponent(a(c)) + ")")).rows) s[e.title_key] = {
		genres: e.genres || [],
		tags: e.tags || [],
		releaseDate: e.release_date || null
	};
	let l = {
		bySteam: o,
		byKey: s
	};
	try {
		globalThis.localStorage?.setItem("radar-dna-meta", JSON.stringify({
			key: i,
			at: Date.now(),
			data: l
		}));
	} catch {}
	return l;
}
var se = w, ce = T, J = {
	Aksiyon: "#ef4444",
	Macera: "#f97316",
	RPG: "#8b5cf6",
	Strateji: "#3b82f6",
	Simülasyon: "#14b8a6",
	Spor: "#22c55e",
	Yarış: "#eab308",
	Bağımsız: "#ec4899",
	Rahat: "#84cc16",
	MMO: "#06b6d4"
}, le = [
	"#f43f5e",
	"#a855f7",
	"#0ea5e9",
	"#10b981",
	"#f59e0b",
	"#6366f1",
	"#d946ef"
], ue = "#94a3b8";
function de(e) {
	if (J[e]) return J[e];
	let t = 0;
	for (let n of String(e)) t = t * 31 + n.charCodeAt(0) >>> 0;
	return le[t % le.length];
}
var Y = {
	playstation: ["PlayStation", "#2563eb"],
	steam: ["Steam", "#0891b2"],
	xbox: ["Xbox", "#16a34a"],
	switch: ["Switch", "#dc2626"],
	epic: ["Epic", "#525252"],
	gog: ["GOG", "#9333ea"]
}, fe = [
	[
		"old",
		"90'lar ve öncesi",
		"#f59e0b"
	],
	[
		"2000",
		"2000'ler",
		"#ec4899"
	],
	[
		"2010",
		"2010'lar",
		"#8b5cf6"
	],
	[
		"2020",
		"2020'ler",
		"#06b6d4"
	]
], X = {
	"Open World": "Açık dünya",
	"Story Rich": "Güçlü hikâye",
	"Choices Matter": "Seçimlerin önemli",
	"Co-op": "Birlikte oyna",
	"Online Co-Op": "Birlikte oyna",
	"Local Co-Op": "Yan yana oyna",
	Multiplayer: "Çok oyunculu",
	PvP: "Karşılıklı maç",
	Competitive: "Rekabet",
	Horror: "Korku",
	"Survival Horror": "Korku",
	"Psychological Horror": "Korku",
	Puzzle: "Bulmaca",
	"Pixel Graphics": "Piksel sanat",
	Relaxing: "Rahatlatıcı",
	Cozy: "Sıcacık",
	Cute: "Sevimli",
	Funny: "Komik",
	Atmospheric: "Atmosfer",
	Fantasy: "Fantastik",
	"Sci-fi": "Bilim kurgu",
	Space: "Uzay",
	Survival: "Hayatta kalma",
	Exploration: "Keşif",
	Shooter: "Nişancı",
	FPS: "Nişancı",
	Racing: "Yarış",
	Roguelike: "Her seferinde yeni",
	Roguelite: "Her seferinde yeni",
	"Souls-like": "Zorlu dövüş",
	Difficult: "Zorlu",
	Sandbox: "Serbest oyun",
	Building: "İnşa et",
	"Base Building": "İnşa et",
	Crafting: "Üret ve yap",
	Anime: "Anime",
	Platformer: "Zıpla ve koş",
	Metroidvania: "Gizli yollar",
	"Great Soundtrack": "Harika müzik",
	"Turn-Based Strategy": "Sıra tabanlı",
	Tactical: "Taktik",
	"Farming Sim": "Çiftlik",
	"Life Sim": "Hayat simülasyonu",
	"Hack and Slash": "Kılıç ve kalkan",
	Stealth: "Gizlilik",
	"Party Game": "Parti oyunu",
	"Family Friendly": "Aile dostu",
	Retro: "Retro",
	"Post-apocalyptic": "Kıyamet sonrası",
	Cyberpunk: "Cyberpunk",
	Medieval: "Orta Çağ",
	Detective: "Dedektif",
	Mystery: "Gizem"
}, pe = {
	done: 3,
	playing: 3,
	wish: 2,
	dropped: .5
}, me = new Set(Object.keys(Y)), he = (e) => {
	let t = String(e || "").split(":")[0];
	return me.has(t) && String(e).includes(":") ? t : "playstation";
};
function ge(e) {
	let t = Number(String(e || "").slice(0, 4));
	return !Number.isInteger(t) || t < 1970 || t > 2100 ? null : t < 2e3 ? "old" : t < 2010 ? "2000" : t < 2020 ? "2010" : "2020";
}
var _e = (e) => e > 0 ? 1 + Math.min(4, Math.log2(1 + e / 60)) : .25;
function ve(e = [], t = []) {
	return {
		appids: [...t].filter((e) => Number.isInteger(e?.appid) && e.appid > 0).sort((e, t) => (t.minutes || 0) - (e.minutes || 0)).slice(0, 60).map((e) => e.appid),
		titleKeys: [...new Set(e.slice(0, 60).map((e) => V(e?.name)).filter(Boolean))]
	};
}
var Z = (e, t) => [...e].map(([e, n]) => ({
	id: e,
	value: n,
	share: t > 0 ? n / t : 0
})).sort((e, t) => t.value - e.value), Q = (e) => {
	let t = e.map((e) => ({
		...e,
		percent: Math.round(e.share * 100)
	})), n = 100 - t.reduce((e, t) => e + t.percent, 0);
	return t.length && n && Math.abs(n) <= t.length && (t[0].percent += n), t;
};
function ye({ favorites: e = [], steam: t = [], meta: n = {}, personas: r = [] } = {}) {
	let i = n.bySteam || {}, a = n.byKey || {}, s = [], c = /* @__PURE__ */ new Set();
	for (let t of e) {
		if (!t?.id) continue;
		let e = V(t.name), n = a[e] || {};
		c.add(e), s.push({
			w: pe[t.status] ?? 2,
			store: he(t.id),
			genres: (t.genres?.length ? t.genres : n.genres) || [],
			tags: n.tags || [],
			era: ge(n.releaseDate)
		});
	}
	for (let e of t) {
		if (!e?.appid) continue;
		let t = i[e.appid] || {}, n = t.titleKey || V(e.name);
		if (c.has(n)) continue;
		let r = a[n] || {};
		s.push({
			w: _e(e.minutes || 0),
			store: "steam",
			genres: [...new Set([...r.genres || [], ...t.genres || []])],
			tags: [...new Set([...r.tags || [], ...t.tags || []])],
			era: ge(r.releaseDate || t.releaseDate)
		});
	}
	let l = /* @__PURE__ */ new Map(), u = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map(), m = 0, h = 0, g = 0, _ = 0;
	for (let e of s) {
		u.set(e.store, (u.get(e.store) || 0) + e.w), h += e.w;
		let t = e.genres.filter((e) => typeof e == "string" && e);
		if (t.length) {
			_++;
			for (let n of t) l.set(n, (l.get(n) || 0) + e.w / t.length);
			m += e.w;
		}
		e.era && (d.set(e.era, (d.get(e.era) || 0) + e.w), g += e.w);
		for (let t of new Set(e.tags)) X[t] && f.set(t, (f.get(t) || 0) + e.w);
		let n = new Set(t), r = new Set(e.tags);
		for (let t of o) {
			let i = +!!t.genres.some((e) => n.has(e)), a = Math.min(2, t.tags.filter((e) => r.has(e)).length);
			(i || a) && p.set(t.id, (p.get(t.id) || 0) + e.w * (i + .5 * a));
		}
	}
	let v = Z(l, m), y = v.slice(0, 6), b = v.slice(6).reduce((e, t) => e + t.value, 0), x = Q([...y.map((e) => ({
		...e,
		name: e.id,
		color: de(e.id)
	})), ...b > 0 ? [{
		id: "other",
		name: "Diğer",
		value: b,
		share: b / m,
		color: ue
	}] : []]), S = Q(Z(u, h).map((e) => ({
		...e,
		name: Y[e.id][0],
		color: Y[e.id][1]
	}))), C = Q(fe.map(([e, t, n]) => ({
		id: e,
		name: t,
		color: n,
		value: d.get(e) || 0,
		share: g > 0 ? (d.get(e) || 0) / g : 0
	})));
	if (!p.size) for (let e of r) p.set(e, 1);
	let w = [...p].sort((e, t) => t[1] - e[1]).slice(0, 3), T = w.reduce((e, t) => e + t[1], 0), E = Q(Z(new Map(w), T).map((e) => {
		let t = o.find((t) => t.id === e.id);
		return {
			...e,
			name: t.label,
			text: t.text
		};
	})), D = /* @__PURE__ */ new Map();
	for (let [e, t] of f) {
		let n = X[e], r = D.get(n);
		!r || r.w < t ? D.set(n, {
			label: n,
			tag: e,
			w: (r?.w || 0) + t
		}) : r.w += t;
	}
	return {
		genres: x,
		stores: S,
		eras: C,
		personas: E,
		vibes: [...D.values()].sort((e, t) => t.w - e.w).slice(0, 6),
		topEra: C.filter((e) => e.value > 0).sort((e, t) => t.value - e.value)[0] || null,
		counts: {
			favorites: e.length,
			steam: t.length,
			known: _,
			entries: s.length
		},
		empty: !x.length && !E.length
	};
}
function be(e) {
	return {
		genres: (e?.genres || []).filter((e) => e.id !== "other").slice(0, 3).map((e) => e.name),
		tags: [...new Set([...(e?.vibes || []).slice(0, 4).map((e) => e.tag), ...(e?.personas || []).slice(0, 2).flatMap((e) => o.find((t) => t.id === e.id)?.tags.slice(0, 3) || [])])].slice(0, 8)
	};
}
function xe(e, t) {
	let n = new Set(t?.genres || []), r = new Set((t?.tags || []).map((e) => e.toLowerCase())), i = (e?.genres || []).filter((e) => n.has(e)), a = [...new Set([...e?.tags || [], ...e?.categories || []].filter((e) => r.has(String(e).toLowerCase())).map((e) => X[e] || e))];
	return [...i, ...a].slice(0, 3);
}
function Se(e = [], t = []) {
	let n = new Set([...e.map((e) => e.id), ...t.map((e) => "steam:" + e.appid)]), r = new Set([...e, ...t].map((e) => V(e?.name)).filter(Boolean));
	return (e) => !n.has(e?.id) && !r.has(e?.titleKey || V(e?.name));
}
//#endregion
//#region app/GameDna.tsx
var Ce = {
	Dna: [
		["path", { d: "m10 16 1.5 1.5" }],
		["path", { d: "m14 8-1.5-1.5" }],
		["path", { d: "M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" }],
		["path", { d: "m16.5 10.5 1 1" }],
		["path", { d: "m17 6-2.891-2.891" }],
		["path", { d: "M2 15c6.667-6 13.333 0 20-6" }],
		["path", { d: "m20 9 .891.891" }],
		["path", { d: "M3.109 14.109 4 15" }],
		["path", { d: "m6.5 12.5 1 1" }],
		["path", { d: "m7 18 2.891 2.891" }],
		["path", { d: "M9 22c1.798-1.998 2.518-3.995 2.807-5.993" }]
	],
	Gamepad2: [
		["line", {
			x1: "6",
			x2: "10",
			y1: "11",
			y2: "11"
		}],
		["line", {
			x1: "8",
			x2: "8",
			y1: "9",
			y2: "13"
		}],
		["line", {
			x1: "15",
			x2: "15.01",
			y1: "12",
			y2: "12"
		}],
		["line", {
			x1: "18",
			x2: "18.01",
			y1: "10",
			y2: "10"
		}],
		["path", { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" }]
	],
	Heart: [["path", { d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" }]],
	Sparkles: [
		["path", { d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" }],
		["path", { d: "M20 2v4" }],
		["path", { d: "M22 4h-4" }],
		["circle", {
			cx: "4",
			cy: "20",
			r: "2"
		}]
	],
	ArrowRight: [["path", { d: "M5 12h14" }], ["path", { d: "m12 5 7 7-7 7" }]],
	RefreshCw: [
		["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }],
		["path", { d: "M21 3v5h-5" }],
		["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }],
		["path", { d: "M8 16H3v5" }]
	],
	BookOpen: [["path", { d: "M12 5v16" }], ["path", { d: "M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" }]],
	Swords: [
		["polyline", { points: "14.5 17.5 3 6 3 3 6 3 17.5 14.5" }],
		["line", {
			x1: "13",
			x2: "19",
			y1: "19",
			y2: "13"
		}],
		["line", {
			x1: "16",
			x2: "20",
			y1: "16",
			y2: "20"
		}],
		["line", {
			x1: "19",
			x2: "21",
			y1: "21",
			y2: "19"
		}],
		["polyline", { points: "14.5 6.5 18 3 21 3 21 6 17.5 9.5" }],
		["line", {
			x1: "5",
			x2: "9",
			y1: "14",
			y2: "18"
		}],
		["line", {
			x1: "7",
			x2: "4",
			y1: "17",
			y2: "20"
		}],
		["line", {
			x1: "3",
			x2: "5",
			y1: "19",
			y2: "21"
		}]
	],
	Brain: [
		["path", { d: "M12 18V5" }],
		["path", { d: "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" }],
		["path", { d: "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" }],
		["path", { d: "M17.997 5.125a4 4 0 0 1 2.526 5.77" }],
		["path", { d: "M18 18a4 4 0 0 0 2-7.464" }],
		["path", { d: "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" }],
		["path", { d: "M6 18a4 4 0 0 1-2-7.464" }],
		["path", { d: "M6.003 5.125a4 4 0 0 0-2.526 5.77" }]
	],
	Compass: [["circle", {
		cx: "12",
		cy: "12",
		r: "10"
	}], ["path", { d: "m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" }]],
	Trophy: [
		["path", { d: "M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2" }],
		["path", { d: "M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2" }],
		["path", { d: "M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3" }],
		["path", { d: "M4 22h16" }],
		["path", { d: "M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" }],
		["path", { d: "M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" }]
	],
	Leaf: [["path", { d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" }], ["path", { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" }]],
	Users: [
		["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
		["path", { d: "M16 3.128a4 4 0 0 1 0 7.744" }],
		["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
		["circle", {
			cx: "9",
			cy: "7",
			r: "4"
		}]
	],
	Ghost: [
		["path", { d: "M9 10h.01" }],
		["path", { d: "M15 10h.01" }],
		["path", { d: "M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" }]
	]
}, we = 10 * 6e4, $ = (e) => typeof document < "u" && document.documentElement.lang === "en" ? e + "%" : "%" + e;
async function Te(e) {
	let t = await fetch(se + "/functions/v1/steam-account?action=library", {
		headers: {
			apikey: ce,
			Authorization: "Bearer " + e
		},
		signal: AbortSignal.timeout(25e3)
	});
	if (t.status === 404) return { linked: !1 };
	let n = await t.json().catch(() => ({}));
	if (!t.ok) throw Error(n.error || "Steam şu anda yanıt vermiyor.");
	return n;
}
async function Ee(e, t, n) {
	let r = "radar-dna-steam:" + e;
	try {
		let e = JSON.parse(sessionStorage.getItem(r) || "null");
		if (e && Date.now() - e.at < we) return e.v;
	} catch {}
	let i = n ? await n() : await Te(t), a = {
		linked: !!i?.linked,
		visible: !!i?.visible,
		games: (i?.games || []).map((e) => ({
			appid: e.appid,
			name: e.name,
			minutes: e.minutes || 0
		}))
	};
	try {
		sessionStorage.setItem(r, JSON.stringify({
			at: Date.now(),
			v: a
		}));
	} catch {}
	return a;
}
var De = () => {
	try {
		sessionStorage.setItem("radar-space-tab", "steam");
	} catch {}
	window.dispatchEvent(new CustomEvent("radar:navigate", { detail: "profile" }));
	for (let e of [60, 400]) setTimeout(() => window.dispatchEvent(new CustomEvent("radar:space-tab", { detail: "steam" })), e);
};
function Oe(e, { useExperience: t, useFavorites: n, steamLibrary: r }) {
	let { useEffect: i, useMemo: a, useState: o } = e, s = e.createElement, l = (e) => function({ size: t = 18 }) {
		return /* @__PURE__ */ s("svg", {
			width: t,
			height: t,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true"
		}, Ce[e].map(([e, t], n) => s(e, {
			key: n,
			...t
		})));
	}, u = l("Dna"), d = l("Gamepad2"), f = l("Heart"), p = l("Sparkles"), m = l("ArrowRight"), h = l("RefreshCw"), g = {
		story: l("BookOpen"),
		action: l("Swords"),
		strategy: l("Brain"),
		explorer: l("Compass"),
		competitive: l("Trophy"),
		cozy: l("Leaf"),
		social: l("Users"),
		horror: l("Ghost"),
		indie: p
	};
	function _({ genres: e }) {
		let t = [], n = 0;
		for (let r of e) {
			let e = Math.round((n + r.share) * 36) - Math.round(n * 36);
			for (let n = 0; n < e; n++) t.push(r.color);
			n += r.share;
		}
		for (; t.length < 36;) t.push(e[0]?.color || "#94a3b8");
		let r = (e, t) => 80 / 2 + 26 * Math.sin(e / 36 * Math.PI * 4 + t), i = (e) => Array.from({ length: 73 }, (t, n) => (n ? "L" : "M") + (n * 720 / 72).toFixed(1) + " " + r(n / 2, e).toFixed(1)).join(" ");
		return /* @__PURE__ */ s("svg", {
			className: "dna-helix",
			viewBox: "0 0 720 80",
			preserveAspectRatio: "none",
			"aria-hidden": "true"
		}, t.map((e, t) => {
			let n = (t + .5) * 720 / 36;
			return /* @__PURE__ */ s("line", {
				key: t,
				x1: n,
				x2: n,
				y1: r(t + .5, 0),
				y2: r(t + .5, Math.PI),
				stroke: e,
				style: { animationDelay: t * 25 + "ms" }
			});
		}), /* @__PURE__ */ s("path", { d: i(0) }), /* @__PURE__ */ s("path", { d: i(Math.PI) }));
	}
	function v({ genres: t, onPick: n }) {
		let r = Math.max(...t.map((e) => e.share), .01), i = t.map((e, n) => {
			let i = -Math.PI / 2 + 2 * Math.PI * n / t.length;
			return {
				g: e,
				r: 20 + 42 * Math.sqrt(e.share / r),
				x: 220 + Math.cos(i) * 150,
				y: 220 + Math.sin(i) * 150
			};
		});
		return /* @__PURE__ */ s("svg", {
			className: "dna-map",
			viewBox: "0 0 440 440",
			role: "group",
			"aria-label": "Tür haritan"
		}, i.map(({ g: e, x: t, y: n }) => /* @__PURE__ */ s("line", {
			key: "l" + e.id,
			x1: 220,
			y1: 220,
			x2: t,
			y2: n,
			stroke: e.color,
			strokeWidth: 2 + 10 * e.share / r,
			strokeLinecap: "round",
			opacity: ".35"
		})), /* @__PURE__ */ s("circle", {
			cx: 220,
			cy: 220,
			r: "44",
			className: "dna-core"
		}), /* @__PURE__ */ s("text", {
			x: 220,
			y: 226,
			textAnchor: "middle",
			className: "dna-core-label"
		}, "SEN"), i.map(({ g: t, r, x: i, y: a }, o) => {
			let c = r >= 40 && t.name.length * 9 <= 2 * r - 10;
			return /* @__PURE__ */ s("g", {
				key: t.id,
				className: "dna-bubble",
				style: {
					animationDelay: 120 + o * 90 + "ms",
					transformOrigin: `${i}px ${a}px`
				},
				role: "button",
				tabIndex: t.id === "other" ? -1 : 0,
				"aria-label": t.name + " " + $(t.percent),
				onClick: () => t.id !== "other" && n(t),
				onKeyDown: (e) => {
					(e.key === "Enter" || e.key === " ") && t.id !== "other" && (e.preventDefault(), n(t));
				}
			}, /* @__PURE__ */ s("circle", {
				cx: i,
				cy: a,
				r,
				fill: t.color
			}), c ? /* @__PURE__ */ s(e.Fragment, null, /* @__PURE__ */ s("text", {
				x: i,
				y: a - 2,
				textAnchor: "middle",
				className: "dna-bubble-name"
			}, t.name), /* @__PURE__ */ s("text", {
				x: i,
				y: a + 17,
				textAnchor: "middle",
				className: "dna-bubble-pct"
			}, $(t.percent))) : /* @__PURE__ */ s(e.Fragment, null, /* @__PURE__ */ s("text", {
				x: i,
				y: a + 5,
				textAnchor: "middle",
				className: "dna-bubble-pct"
			}, $(t.percent)), /* @__PURE__ */ s("text", {
				x: i,
				y: a + r + 16,
				textAnchor: "middle",
				className: "dna-bubble-out"
			}, t.name)));
		}));
	}
	function y({ list: e, label: t }) {
		return /* @__PURE__ */ s("div", {
			className: "dna-stack",
			role: "img",
			"aria-label": t + ": " + e.filter((e) => e.percent > 0).map((e) => e.name + " " + $(e.percent)).join(", ")
		}, e.filter((e) => e.percent > 0).map((e) => /* @__PURE__ */ s("span", {
			key: e.id,
			style: {
				flexGrow: e.share,
				background: e.color
			}
		})));
	}
	function b() {
		let [, e] = o("");
		i(() => {
			let t = (t) => e(t.detail);
			return window.addEventListener("radar:lang", t), () => window.removeEventListener("radar:lang", t);
		}, []);
		let l = t(), b = n(), x = l.session?.user?.id || "", [S, C] = o(null), [w, T] = o(null), [E, D] = o(null), [O, k] = o(!1), [A, j] = o(0);
		i(() => {
			let e = !1;
			if (C(null), !x) {
				C({
					linked: !1,
					games: []
				});
				return;
			}
			return Ee(x, l.session?.access_token || "", r).then((t) => {
				e || C(t);
			}).catch(() => {
				e || C({
					linked: !1,
					games: [],
					error: !0
				});
			}), () => {
				e = !0;
			};
		}, [x, A]);
		let M = S?.games || [], N = a(() => ve(b.favs, M), [b.favs, S]);
		i(() => {
			if (!S) return;
			let e = !1;
			if (k(!1), !N.appids.length && !N.titleKeys.length) {
				T({});
				return;
			}
			return oe(N).then((t) => {
				e || T(t);
			}).catch(() => {
				e || (T({}), k(!0));
			}), () => {
				e = !0;
			};
		}, [N.appids.join(",") + "|" + N.titleKeys.join(","), !!S]);
		let P = a(() => w ? ye({
			favorites: b.favs,
			steam: M,
			meta: w,
			personas: l.state.personas
		}) : null, [
			w,
			b.favs,
			S,
			l.state.personas
		]), F = a(() => be(P), [P]);
		i(() => {
			if (!P || !F.genres.length && !F.tags.length) {
				D([]);
				return;
			}
			let e = !1;
			D(null);
			let t = Se(b.favs, M);
			return ie("foryou", {
				preferGenres: F.genres,
				preferTags: F.tags
			}, 8, {
				stores: ["all"],
				keep: (e) => t(e) && c(e, F)
			}).then((e) => e.length >= 3 || !F.genres.length ? e : ee(F.genres, [], 12).then((n) => [...e, ...n.filter(t)].slice(0, 8))).then((t) => {
				e || D(t);
			}).catch(() => {
				e || D([]);
			}), () => {
				e = !0;
			};
		}, [
			F.genres.join("|") + "#" + F.tags.join("|"),
			b.favs.length,
			M.length
		]);
		let I = /* @__PURE__ */ s("div", { className: "dna-head" }, /* @__PURE__ */ s("span", { className: "dna-icon" }, /* @__PURE__ */ s(u, { size: 22 })), /* @__PURE__ */ s("div", null, /* @__PURE__ */ s("span", { className: "eyebrow" }, "OYUN DNA'N"), /* @__PURE__ */ s("h3", null, "Oyun zevkinin renkli haritası")));
		if (!S || !w || !P) return /* @__PURE__ */ s("section", {
			className: "game-dna",
			"aria-busy": "true"
		}, I, /* @__PURE__ */ s("p", {
			role: "status",
			className: "dna-loading"
		}, "DNA'n çıkarılıyor…"));
		let L = !S.linked && /* @__PURE__ */ s("div", { className: "dna-cta" }, /* @__PURE__ */ s(d, { size: 18 }), /* @__PURE__ */ s("span", null, x ? "Steam'i bağla, haritan oynadığın oyunlarla daha net olsun." : "Giriş yapıp Steam'i bağlarsan haritan oynadığın oyunlarla dolar."), /* @__PURE__ */ s("button", {
			className: "linkbtn",
			onClick: De
		}, x ? "Steam'i bağla" : "Giriş yap", /* @__PURE__ */ s(m, { size: 14 }))), R = /* @__PURE__ */ s("div", { className: "dna-recs" }, /* @__PURE__ */ s("div", { className: "dna-recs-head" }, /* @__PURE__ */ s("h4", null, /* @__PURE__ */ s(p, { size: 18 }), "DNA'na göre öneriler"), F.genres.length > 0 && /* @__PURE__ */ s("small", { className: "dna-colors" }, /* @__PURE__ */ s("span", null, "Haritandaki renkler:"), F.genres.map((e) => /* @__PURE__ */ s("b", { key: e }, e)))), E === null ? /* @__PURE__ */ s("p", {
			role: "status",
			className: "dna-hint"
		}, "Sana uyan oyunlar aranıyor…") : E.length ? /* @__PURE__ */ s("ul", { className: "dna-rail" }, E.map((e) => {
			let t = xe(e, F);
			return /* @__PURE__ */ s("li", { key: e.id }, /* @__PURE__ */ s("button", { onClick: () => l.open(e) }, e.image ? /* @__PURE__ */ s("img", {
				src: e.image,
				alt: "",
				loading: "lazy"
			}) : /* @__PURE__ */ s("span", { className: "up-ph" }), /* @__PURE__ */ s("strong", null, e.name), t.length > 0 && /* @__PURE__ */ s("span", { className: "dna-why" }, /* @__PURE__ */ s("span", null, "Neden:"), t.map((e) => /* @__PURE__ */ s("i", { key: e }, e)))));
		})) : /* @__PURE__ */ s("p", { className: "dna-hint" }, "Şimdilik haritana uyan yeni oyun bulunamadı."));
		if (P.empty || !P.counts.entries) return /* @__PURE__ */ s("section", { className: "game-dna is-empty" }, I, /* @__PURE__ */ s("div", { className: "dna-empty" }, /* @__PURE__ */ s(_, { genres: [] }), /* @__PURE__ */ s("p", null, "Haritan henüz boş. Sevdiğin oyunlara ", /* @__PURE__ */ s(f, { size: 14 }), " bırak ya da Steam kütüphaneni bağla; renklerin burada belirsin.")), P.personas[0] && /* @__PURE__ */ s("p", { className: "dna-type" }, /* @__PURE__ */ s("span", null, "Oyuncu tipin:"), /* @__PURE__ */ s("b", null, P.personas[0].name)), L, !P.empty && R);
		let [z, B] = P.genres.filter((e) => e.id !== "other"), V = P.personas[0], H = B ? `En çok ${z.name} ve ${B.name} oyunlarını seviyorsun.` : z ? `En çok ${z.name} oyunlarını seviyorsun.` : "", U = P.topEra ? `Oyunlarının çoğu ${P.topEra.name} döneminden.` : "", W = [P.counts.favorites ? `${P.counts.favorites} favori` : "", S.linked && P.counts.steam ? `${P.counts.steam} Steam oyunu` : ""].filter(Boolean).join(" + ");
		return /* @__PURE__ */ s("section", { className: "game-dna" }, I, /* @__PURE__ */ s("div", { className: "dna-summary" }, H && /* @__PURE__ */ s("p", { className: "dna-line" }, H), V && /* @__PURE__ */ s("p", { className: "dna-type" }, /* @__PURE__ */ s("span", null, "Oyuncu tipin:"), /* @__PURE__ */ s("b", null, V.name)), U && /* @__PURE__ */ s("p", null, U), W && /* @__PURE__ */ s("small", null, `Hesaplanan: ${W}`)), /* @__PURE__ */ s(_, { genres: P.genres }), /* @__PURE__ */ s("div", { className: "dna-grid" }, /* @__PURE__ */ s("article", { className: "dna-card dna-card-map" }, /* @__PURE__ */ s("h4", null, "Türlerin"), /* @__PURE__ */ s("p", { className: "dna-hint" }, "Baloncuk ne kadar büyükse o türü o kadar çok seviyorsun. Bir baloncuğa bas, o türde oyunlar açılsın."), P.genres.length ? /* @__PURE__ */ s(v, {
			genres: P.genres,
			onPick: (e) => l.setFilterIntent({
				genre: e.name,
				at: Date.now()
			})
		}) : /* @__PURE__ */ s("p", { className: "dna-hint" }, "Oyunlarının türü henüz bilinmiyor.")), /* @__PURE__ */ s("div", { className: "dna-side" }, P.personas.length > 0 && /* @__PURE__ */ s("article", { className: "dna-card" }, /* @__PURE__ */ s("h4", null, "Oyuncu tipin"), /* @__PURE__ */ s("ul", { className: "dna-personas" }, P.personas.map((e) => {
			let t = g[e.id] || p;
			return /* @__PURE__ */ s("li", { key: e.id }, /* @__PURE__ */ s(t, { size: 20 }), /* @__PURE__ */ s("div", null, /* @__PURE__ */ s("b", null, e.name), /* @__PURE__ */ s("small", null, e.text), /* @__PURE__ */ s("span", { className: "dna-meter" }, /* @__PURE__ */ s("i", { style: { width: e.percent + "%" } }))), /* @__PURE__ */ s("em", null, $(e.percent)));
		}))), /* @__PURE__ */ s("article", { className: "dna-card" }, /* @__PURE__ */ s("h4", null, "Mağazaların"), /* @__PURE__ */ s(y, {
			list: P.stores,
			label: "Mağazaların"
		}), /* @__PURE__ */ s("ul", { className: "dna-legend" }, P.stores.map((e) => /* @__PURE__ */ s("li", { key: e.id }, /* @__PURE__ */ s("i", { style: { background: e.color } }), e.name, /* @__PURE__ */ s("b", null, $(e.percent)))))), /* @__PURE__ */ s("article", { className: "dna-card" }, /* @__PURE__ */ s("h4", null, "Dönemlerin"), P.eras.some((e) => e.value > 0) ? /* @__PURE__ */ s("div", { className: "dna-eras" }, P.eras.map((e) => /* @__PURE__ */ s("div", { key: e.id }, /* @__PURE__ */ s("span", { className: "dna-era-bar" }, /* @__PURE__ */ s("i", { style: {
			height: Math.max(4, e.percent) + "%",
			background: e.color
		} })), /* @__PURE__ */ s("b", null, $(e.percent)), /* @__PURE__ */ s("small", null, e.name)))) : /* @__PURE__ */ s("p", { className: "dna-hint" }, "Çıkış yılları henüz bilinmiyor.")), P.vibes.length > 0 && /* @__PURE__ */ s("article", { className: "dna-card" }, /* @__PURE__ */ s("h4", null, "Sevdiğin oyun hissi"), /* @__PURE__ */ s("div", { className: "dna-vibes" }, P.vibes.map((e) => /* @__PURE__ */ s("button", {
			key: e.label,
			onClick: () => l.setFilterIntent({
				tag: e.tag,
				at: Date.now()
			})
		}, e.label)))))), L, S.linked && !S.visible && /* @__PURE__ */ s("p", { className: "dna-hint" }, "Steam oyun listen gizli olduğu için yalnız favorilerin kullanıldı."), O && /* @__PURE__ */ s("p", { className: "dna-hint" }, /* @__PURE__ */ s("button", {
			className: "linkbtn",
			onClick: () => {
				try {
					localStorage.removeItem("radar-dna-meta");
				} catch {}
				j((e) => e + 1);
			}
		}, /* @__PURE__ */ s(h, { size: 13 }), "Türler okunamadı, tekrar dene")), R);
	}
	return { GameDna: b };
}
//#endregion
export { Oe as createGameDna };
