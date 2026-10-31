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
var e = (e = Date.now()) => new Date(e + 108e5).toISOString().slice(0, 10), t = (e, t = 180) => typeof e == "string" ? e.slice(0, t) : "", n = (e) => Number.isFinite(e) && e >= 0 ? e : null, r = (e) => typeof e == "string" && /^https:\/\//.test(e) ? e.slice(0, 2e3) : null, i = (e) => Object.values(e || {}).filter((e) => e.status === "open"), a = (e) => Object.values(e || {}).filter((e) => e.status !== "open").sort((e, t) => t.resolvedAt - e.resolvedAt);
function o(e) {
	let t = a(e), n = t.filter((e) => e.status === "hit").length, r = 0, o = 0;
	for (let e of [...t].reverse()) r = e.status === "hit" ? r + 1 : 0, o = Math.max(o, r);
	return {
		total: Object.keys(e || {}).length,
		open: i(e).length,
		hits: n,
		misses: t.length - n,
		accuracy: t.length ? Math.round(n / t.length * 100) : null,
		bestRun: o
	};
}
function s(i) {
	let a = (i && typeof i == "object" && !Array.isArray(i) ? Object.values(i) : []).filter((e) => e && typeof e.gid == "string" && ["yes", "no"].includes(e.pick) && Number.isFinite(e.at) && Number.isFinite(e.due) && [
		"open",
		"hit",
		"miss"
	].includes(e.status)).map((i) => ({
		key: t(i.key, 220) || i.gid + "@" + e(i.at),
		gid: t(i.gid),
		name: t(i.name),
		image: r(i.image),
		platform: t(i.platform, 20),
		storeId: i.storeId == null ? null : t(String(i.storeId), 120),
		pick: i.pick,
		at: i.at,
		due: i.due,
		price: n(i.price),
		currency: t(i.currency || "TRY", 3),
		status: i.status,
		checked: Math.max(0, Number(i.checked) || 0),
		saleDay: typeof i.saleDay == "string" ? i.saleDay.slice(0, 10) : null,
		salePrice: n(i.salePrice),
		resolvedAt: Math.max(0, Number(i.resolvedAt) || 0)
	}));
	return a.sort((e, t) => t.at - e.at), Object.fromEntries(a.slice(0, 200).map((e) => [e.key, e]));
}
//#endregion
//#region lib/experience.mjs
var c = (e) => Math.min(99, 1 + Math.floor(Math.sqrt(Math.max(0, e) / 25))), l = (e) => Object.values(e.visited || {}), u = (e) => new Date(e + 108e5), d = (e, t) => l(e).filter((e) => e.at && t(u(e.at))).length, f = (e) => (t) => l(t).filter((t) => (t.genres || []).some((t) => e.test(t))).length, p = (e) => (t) => (t.events || []).filter((t) => t.startsWith(e)).length, m = (e) => (t, n) => n.filter((t) => t.status === e).length, h = (e) => (t) => Object.values(t.gameNotes || {}).filter((t) => t && t[e]).length, g = (e) => Object.values(e.hours || {}).filter((e) => e > 0), _ = {
	c: "common",
	r: "rare",
	e: "epic",
	l: "legendary"
}, v = (e, t, n, r, i, a) => a.map(([a, o, s]) => ({
	id: n + "-" + a,
	cat: e,
	icon: t,
	goal: a,
	name: o,
	desc: r.replace("{n}", a),
	tier: _[s],
	have: i
})), y = (e, t, n, r, i) => v("genre", n, "genre-" + e, "{n} " + i + " oyun dosyası aç.", f(t), r);
[
	...v("explore", "compass", "visit", "{n} farklı oyun dosyası aç.", (e) => l(e).length, [
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
	...v("explore", "palette", "genres", "{n} farklı türde oyun dosyası aç.", (e) => new Set(l(e).flatMap((e) => e.genres || [])).size, [
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
	...v("explore", "eye-off", "dismiss", "{n} oyunu \"ilgilenmiyorum\" diye geç.", (e) => e.dismissed.length, [
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
	...v("explore", "moon", "night", "Gece 00.00 ile 05.00 arasında {n} oyun dosyası aç.", (e) => d(e, (e) => e.getUTCHours() < 5), [[
		1,
		"Gece Kuşu",
		"r"
	], [
		10,
		"Gece Bekçisi",
		"e"
	]]),
	...v("explore", "zap", "marathon", "Tek günde {n} oyun dosyası aç.", (e) => Math.max(0, ...Object.values(l(e).reduce((e, t) => {
		if (t.at) {
			let n = u(t.at).toISOString().slice(0, 10);
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
	...v("streak", "flame", "streak", "{n} gün üst üste uğra.", (e) => Math.max(e.bestStreak || 0, e.streak), [
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
	...v("streak", "calendar-check", "days", "Toplam {n} farklı gün uğra.", (e) => Math.max(e.daysVisited || 0, e.bestStreak || 0, e.streak), [
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
	...v("collection", "heart", "fav", "{n} oyunu favorilere ekle.", (e, t) => t.length, [
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
	...v("collection", "heart-handshake", "like", "Toplam {n} kez favoriye kalp bırak.", p("like:"), [
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
	...v("collection", "sparkles", "wish", "İstek listende {n} oyun biriktir.", m("wish"), [
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
	...v("collection", "gamepad", "playing", "Aynı anda {n} oyunu \"oynuyorum\" olarak işaretle.", m("playing"), [
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
	...v("collection", "crown", "top10", "Top 10 rafına {n} oyun koy.", (e) => e.top10.length, [
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
	...v("play", "check", "done", "{n} oyunu bitir.", m("done"), [
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
	...v("play", "hourglass", "hours", "Oyunlarına toplam {n} saat kaydet.", (e) => Math.floor(g(e).reduce((e, t) => e + t, 0)), [
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
	...v("play", "timer", "one-game", "Tek bir oyuna {n} saat kaydet.", (e) => Math.floor(Math.max(0, ...g(e))), [
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
	...v("play", "rocket", "hype", "{n} oyuna heyecan puanı ver.", (e) => Object.values(e.hype || {}).filter((e) => e > 0).length, [
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
	...v("play", "cake", "anniversary", "{n} oyun yıl dönümü kaydet.", (e) => e.anniversaries.length, [[
		1,
		"Yıl Dönümü",
		"r"
	], [
		5,
		"Anı Defteri",
		"e"
	]]),
	...y("action", /aksiyon|action/i, "swords", [
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
	...y("adventure", /macera|adventure/i, "map", [
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
	...y("rpg", /^rpg$|rol yapma|role-playing/i, "dragon", [
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
	...y("strategy", /strateji|strategy/i, "brain", [
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
	...y("sim", /simülasyon|simulation/i, "cpu", [
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
	...y("sports", /^spor|sports?/i, "trophy", [
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
	...y("racing", /yarış|racing/i, "car", [
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
	...y("indie", /bağımsız|indie/i, "sparkles", [
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
	...y("casual", /rahat|casual/i, "leaf", [
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
	...y("mmo", /mmo|massively/i, "users", [
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
	...y("horror", /korku|horror/i, "ghost", [
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
	...y("platformer", /platform/i, "footprints", [
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
	...y("puzzle", /bulmaca|puzzle/i, "puzzle", [
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
	...y("shooter", /nişancı|shooter|fps/i, "crosshair", [
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
	...y("fighting", /dövüş|fighting/i, "fist", [
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
	...y("roguelike", /rogue/i, "dices", [
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
	...v("genre", "ghost", "horror-fav", "{n} korku oyununu favorilere ekle.", (e, t) => t.filter((e) => (e.genres || []).some((e) => /korku|horror/i.test(e))).length, [[
		10,
		"Korkusuz",
		"e"
	]]),
	...v("writing", "pen", "review", "{n} oyun için toplulukta inceleme paylaş.", p("review:"), [
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
	...v("writing", "notebook", "journal", "{n} farklı oyuna günlük notu yaz.", (e) => Object.values(e.journal || {}).filter((e) => e.length).length, [
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
	...v("writing", "scroll", "entries", "Günlüğüne toplam {n} not yaz.", (e) => Object.values(e.journal || {}).reduce((e, t) => e + t.length, 0), [
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
	...v("writing", "newspaper", "read", "{n} haber ya da yazı oku.", p("read:"), [
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
	...v("writing", "tag", "tags", "{n} oyuna etiket ekle.", (e) => Object.values(e.tags || {}).filter((e) => e.length).length, [
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
	...v("writing", "pin", "pins", "Bir oyun haritasına {n} işaret koy.", (e) => Math.max(0, ...Object.values(e.gameNotes || {}).map((e) => e.mapPins?.length || 0)), [
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
	...v("writing", "map", "maps", "{n} oyuna dünya haritası ekle.", h("mapUrl"), [[
		1,
		"Harita Yükleyen",
		"c"
	], [
		5,
		"Atlas Sahibi",
		"r"
	]]),
	...v("price", "bell", "alerts", "{n} fiyat alarmın çalsın.", (e) => e.seenAlerts.length, [
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
	...v("price", "target", "target", "{n} favoriye hedef fiyat koy.", (e, t) => t.filter((e) => Number.isFinite(e.target)).length, [
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
	...v("price", "store", "platforms", "{n} farklı mağazayı gez.", (e) => Object.values(e.platformVisits || {}).filter((e) => e > 0).length, [
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
	...v("price", "telescope", "predict-hit", "{n} fiyat tahminini doğru bil.", (e) => o(e.predictions).hits, [[
		1,
		"İlk Kehanet",
		"c"
	], [
		10,
		"İndirim Kâhini",
		"e"
	]]),
	...v("price", "coins", "currency", "Fiyatları başka para biriminde göster.", (e) => e.currency === "TRY" ? 0 : 1, [[
		1,
		"Döviz Gözlüğü",
		"c"
	]]),
	...v("level", "star", "level", "{n}. seviyeye ulaş.", (e) => c(e.xp), [
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
	...v("level", "shirt", "avatars", "Avatar dükkânında {n} avatarın olsun.", (e) => e.unlocked.length, [
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
	...v("personal", "user", "name", "Oyuncu adını yaz.", (e) => +!!e.name, [[
		1,
		"Adını Koydun",
		"c"
	]]),
	...v("personal", "library", "shelf-name", "Oyun rafına bir ad ver.", (e) => +!!e.collectionName, [[
		1,
		"Raf Sahibi",
		"c"
	]]),
	...v("personal", "map-pin", "city", "Şehrini ekle.", (e) => +!!e.city, [[
		1,
		"Memleket",
		"c"
	]]),
	...v("personal", "heart", "pref-genre", "Sevdiğin türü seç.", (e) => +!!e.preferredGenre, [[
		1,
		"Tür Tercihi",
		"c"
	]]),
	...v("personal", "fingerprint", "persona", "{n} oyuncu kişiliği seç.", (e) => e.personas.length, [[
		1,
		"Oyuncu Kişiliği",
		"c"
	], [
		3,
		"Çok Yüzlü",
		"r"
	]]),
	...v("personal", "eye", "color", "Renk görme modunu ayarla.", (e) => e.colorMode === "default" ? 0 : 1, [[
		1,
		"Renk Ayarı",
		"c"
	]]),
	...v("personal", "leaf", "zen", "Zen görünümünü aç.", (e) => +!!e.zen, [[
		1,
		"Zen Modu",
		"c"
	]]),
	...v("personal", "joystick", "retro", "Retro görünümü aç.", (e) => +!!e.retro, [[
		1,
		"Retro Ruh",
		"r"
	]])
];
//#endregion
//#region lib/ps-supabase.mjs
var b = "https://dsosckshigzijnsxmlwh.supabase.co", x = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO";
async function S(e, t) {
	let n = await fetch(b + "/rest/v1/" + e, {
		headers: {
			apikey: x,
			Authorization: "Bearer " + x,
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
var C = (e) => [
	e.day,
	Number(e.price),
	Number(e.base_price),
	e.low_price == null ? Number(e.price) : Math.min(Number(e.low_price), Number(e.price))
], w = [
	"steam",
	"xbox",
	"switch",
	"epic",
	"gog"
];
function T(e) {
	return e?.platform === "playstation" && e.id ? "ps_price_history?select=day,price,base_price,low_price&order=day.asc&limit=400&product_id=eq." + encodeURIComponent(e.id) : w.includes(e?.platform) && e.storeId ? "offer_price_history?select=day,price,base_price,low_price&order=day.asc&limit=400&platform=eq." + e.platform + "&store_id=eq." + encodeURIComponent(e.storeId) : null;
}
async function E(e) {
	let { rows: t } = await S(e);
	return t.map(C);
}
var D = 864e5, O = (e, t = 180) => typeof e == "string" ? e.slice(0, t) : "", k = (e) => typeof e == "string" && /^https:\/\//.test(e) ? e.slice(0, 2e3) : null, A = (e) => Number(e?.discountPercent) > 0 || Number.isFinite(e?.originalPrice) && Number.isFinite(e?.price) && e.originalPrice > e.price, j = (t, n = Date.now()) => t.id + "@" + e(n), M = (e, t) => i(e).find((e) => e.gid === t) || null;
function N(e, t, n) {
	return n ? !e?.id || !T(e) ? {
		ok: !1,
		reason: "no-history"
	} : !Number.isFinite(e.price) || e.price <= 0 ? {
		ok: !1,
		reason: "no-price"
	} : A(e) ? {
		ok: !1,
		reason: "on-sale"
	} : M(t, e.id) ? {
		ok: !1,
		reason: "active"
	} : i(t).length >= 20 ? {
		ok: !1,
		reason: "limit"
	} : {
		ok: !0,
		reason: ""
	} : {
		ok: !1,
		reason: "login"
	};
}
function P(e, t, n = Date.now()) {
	return {
		key: j(e, n),
		gid: e.id,
		name: O(e.name),
		image: k(e.image),
		platform: O(e.platform, 20),
		storeId: O(String(e.storeId ?? ""), 120) || null,
		pick: t === "yes" ? "yes" : "no",
		at: n,
		due: n + 30 * D,
		price: e.price,
		currency: O(e.currency || "TRY", 3),
		status: "open",
		checked: 0,
		saleDay: null,
		salePrice: null,
		resolvedAt: 0
	};
}
function F(t) {
	let n = T({
		id: t.gid,
		platform: t.platform,
		storeId: t.storeId
	});
	return n ? n.replace("&limit=400", "&limit=60") + "&day=gte." + e(t.at) + "&day=lte." + e(t.due) : null;
}
function I(e, t, n = Date.now()) {
	let r = (t || []).find((e) => Number.isFinite(e[3]) && Number.isFinite(e[2]) && e[3] < e[2] - .005);
	return r ? {
		status: e.pick === "yes" ? "hit" : "miss",
		saleDay: r[0],
		salePrice: r[3]
	} : n >= e.due ? {
		status: e.pick === "no" ? "hit" : "miss",
		saleDay: null,
		salePrice: null
	} : {
		status: "open",
		saleDay: null,
		salePrice: null
	};
}
function L(e, t = Date.now()) {
	return i(e).filter((e) => t - (e.checked || 0) >= 432e5 || t >= e.due && (e.checked || 0) < e.due).sort((e, n) => (n.due <= t) - (e.due <= t) || (e.checked || 0) - (n.checked || 0)).slice(0, 3);
}
async function R(e) {
	let t = F(e);
	return t ? E(t) : null;
}
var z = (e, t = Date.now()) => Math.max(0, Math.ceil((e.due - t) / D)), B = (e) => new Date(typeof e == "number" ? e : e + "T00:00:00").toLocaleDateString("tr-TR", {
	day: "numeric",
	month: "short",
	year: "numeric"
}), V = {
	"no-history": "Bu mağaza için fiyat geçmişi tutulmadığından tahmin açılamaz.",
	"no-price": "Fiyatı olmayan ya da ücretsiz oyunda tahmin yapılmaz.",
	"on-sale": "Oyun şu an indirimde. İndirim bitince yeniden tahmin yapabilirsin.",
	limit: "Aynı anda en çok 20 açık tahminin olabilir."
}, H = (e) => e === "yes" ? "İndirime girer" : "İndirime girmez", U = {
	telescope: [
		"m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44",
		"m13.56 11.747 4.332-.924",
		"m16 21-3.105-6.21",
		"M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z",
		"m6.158 8.633 1.114 4.456",
		"m8 21 3.105-6.21",
		"circle:12:13:2"
	],
	down: ["M16 17h6v-6", "m22 17-8.5-8.5-5 5L2 7"],
	lock: ["rect", "M7 11V7a5 5 0 0 1 10 0v4"],
	check: ["M20 6 9 17l-5-5"],
	x: ["M18 6 6 18", "m6 6 12 12"],
	clock: ["circle:12:12:10", "M12 6v6l4 2"]
}, W = 0, G = !1;
function K(e, { useExperience: t, DisplayPrice: n }) {
	let r = e.createElement, { useEffect: c } = e, l = ({ name: e, size: t = 16 }) => r("svg", {
		width: t,
		height: t,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": !0
	}, ...U[e].map((e, t) => e === "rect" ? r("rect", {
		key: t,
		width: 18,
		height: 11,
		x: 3,
		y: 11,
		rx: 2,
		ry: 2
	}) : e.startsWith("circle:") ? r("circle", {
		key: t,
		cx: +e.split(":")[1],
		cy: +e.split(":")[2],
		r: +e.split(":")[3]
	}) : r("path", {
		key: t,
		d: e
	}))), u = (e) => s(e.state.predictions);
	function d(e, t, n) {
		if (!N(t, u(e), !!e.session).ok) return;
		let r = P(t, n);
		e.patch((e) => ({
			...e,
			predictions: {
				...s(e.predictions),
				[r.key]: r
			}
		})), e.notify(n === "yes" ? `Tahminin kaydedildi: ${t.name} 30 gün içinde indirime girer.` : `Tahminin kaydedildi: ${t.name} 30 gün içinde indirime girmez.`);
	}
	function f(e, t) {
		e.patch((e) => {
			let n = s(e.predictions);
			return n[t]?.status === "open" ? (delete n[t], {
				...e,
				predictions: n
			}) : e;
		});
	}
	async function p(e) {
		if (!e.session || G || Date.now() - W < 6e4) return;
		let t = L(u(e));
		if (t.length) {
			G = !0, W = Date.now();
			try {
				let n = Date.now(), r = [];
				for (let e of t) try {
					let t = await R(e);
					if (!t) continue;
					let i = I(e, t, n);
					r.push(i.status === "open" ? {
						...e,
						checked: n
					} : {
						...e,
						...i,
						checked: n,
						resolvedAt: n
					});
				} catch {}
				if (!r.length) return;
				e.patch((e) => {
					let t = s(e.predictions);
					for (let e of r) t[e.key]?.status === "open" && (t[e.key] = e);
					return {
						...e,
						predictions: t
					};
				});
				let i = r.filter((e) => e.status === "hit"), a = r.filter((e) => e.status === "miss");
				for (let t of i) e.award("predict:" + t.key, 30);
				i.length ? e.notify(`Tahminin tuttu: ${i[0].name} · +30 XP`) : a.length && e.notify(`Tahmin sonuçlandı: ${a[0].name}`);
			} finally {
				G = !1;
			}
		}
	}
	let m = (e) => r("div", { className: "pp-locked" }, r(l, { name: "lock" }), r("p", null, "Tahmin yapmak ve puan toplamak için giriş yap. Tahminlerin hesabına kaydedilir."), r("button", {
		className: "refresh",
		onClick: () => e.setAccount?.("login")
	}, "Giriş yap"));
	function h({ p: e }) {
		return e.status === "open" ? r("span", { className: "pp-chip open" }, r(l, {
			name: "clock",
			size: 13
		}), `${z(e)} gün kaldı`) : r("span", { className: "pp-chip " + e.status }, r(l, {
			name: e.status === "hit" ? "check" : "x",
			size: 13
		}), e.status === "hit" ? "Doğru" : "Yanlış");
	}
	function g({ p: t }) {
		return t.status === "open" ? r("small", null, `Sonuç ${B(t.due)} tarihinde ya da indirim görülünce belli olur.`) : r("small", null, t.saleDay ? `${B(t.saleDay)} tarihinde indirim görüldü` : "30 gün boyunca indirim görülmedi", t.saleDay && t.salePrice != null ? r(e.Fragment, null, " · ", r(n, {
			value: t.salePrice,
			currency: t.currency
		})) : null);
	}
	function _({ item: e }) {
		let n = t(), i = u(n), o = !!n.session, s = M(i, e.id), _ = N(e, i, o), v = a(i).find((t) => t.gid === e.id);
		return c(() => {
			s && p(n);
		}, [e.id, o]), r("section", {
			className: "price-predict",
			"aria-labelledby": "pp-title"
		}, r("div", { className: "pp-head" }, r(l, {
			name: "telescope",
			size: 20
		}), r("div", null, r("span", { className: "eyebrow" }, "FİYAT TAHMİNİ"), r("h3", { id: "pp-title" }, "Bu oyun 30 gün içinde indirime girer mi?"))), s ? r("div", { className: "pp-mine" }, r("p", null, "Tahminin: ", r("strong", null, H(s.pick))), r(h, { p: s }), r(g, { p: s }), r("button", {
			className: "pp-link",
			onClick: () => f(n, s.key)
		}, "Tahmini geri çek")) : o ? _.ok ? r("div", { className: "pp-actions" }, r("button", {
			className: "primary",
			onClick: () => d(n, e, "yes")
		}, r(l, { name: "down" }), "Evet, girer"), r("button", {
			className: "refresh",
			onClick: () => d(n, e, "no")
		}, "Hayır, girmez")) : r("p", { className: "phnote" }, V[_.reason] || "") : m(n), v && !s ? r("p", { className: "phnote" }, `Son tahminin (${B(v.at)}): ${H(v.pick)} · ${v.status === "hit" ? "doğru çıktı" : "yanlış çıktı"}`) : null, r("p", { className: "phnote" }, "Doğru tahmin 30 XP kazandırır. Sonuç, radarın bu mağazada kaydettiği fiyatlara göre belirlenir; fiyat geçmişi yeni başladığından kısa süren bir indirim kaçabilir."));
	}
	function v() {
		let n = t(), s = u(n), d = o(s), f = i(s).sort((e, t) => e.due - t.due), m = a(s).slice(0, 30);
		c(() => {
			p(n);
		}, [!!n.session]);
		let _ = (e) => r("li", { key: e.key }, e.image ? r("img", {
			src: e.image,
			alt: "",
			loading: "lazy",
			width: 48,
			height: 48
		}) : r("span", { className: "pp-blank" }, r(l, {
			name: "telescope",
			size: 18
		})), r("div", null, r("strong", null, e.name), r("p", null, `${H(e.pick)} · ${B(e.at)}`), r(g, { p: e })), r(h, { p: e }));
		return r("section", { className: "prediction-board" }, r("div", { className: "sectionheading" }, r("div", null, r("span", { className: "eyebrow" }, "FİYAT TAHMİN OYUNU"), r("h3", null, "Tahminlerim"))), !n.session && r("div", { className: "pp-locked" }, r(l, { name: "lock" }), r("p", null, "Tahmin oyunu hesaba bağlıdır. Giriş yapınca bir oyunun sayfasından tahmin yapabilirsin."), r("button", {
			className: "refresh",
			onClick: () => n.setAccount?.("login")
		}, "Giriş yap")), r("div", { className: "phstats pp-stats" }, ...[
			["Doğru", d.hits],
			["Yanlış", d.misses],
			["İsabet", d.accuracy == null ? "—" : "%" + d.accuracy],
			["En uzun doğru serisi", d.bestRun]
		].map(([e, t]) => r("div", { key: e }, r("small", null, e), r("strong", null, t)))), r("h4", null, `Açık tahminler (${f.length})`), f.length ? r("ul", { className: "pp-list" }, f.map(_)) : r("p", { className: "phnote" }, "Açık tahminin yok. Bir oyunun sayfasında, fiyat geçmişinin altından tahmin yapabilirsin."), m.length > 0 && r(e.Fragment, null, r("h4", null, "Sonuçlananlar"), r("ul", { className: "pp-list" }, m.map(_))), r("p", { className: "phnote" }, "Kurallar: Şu an indirimde olmayan bir oyun için 30 gün içinde indirime girip girmeyeceğini tahmin edersin. İndirim görülürse \"girer\" diyenler hemen kazanır; 30 gün indirimsiz geçerse \"girmez\" diyenler kazanır. Sonuçlar, bu kartı ya da Tahminlerim'i açtığında fiyat geçmişinden kontrol edilir."));
	}
	return {
		Card: _,
		Board: v,
		BadgeIcon: ({ size: e = 24 }) => r(l, {
			name: "telescope",
			size: e
		})
	};
}
//#endregion
export { K as createPricePrediction };
