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
//#region lib/experience.mjs
var o = (e) => Math.min(99, 1 + Math.floor(Math.sqrt(Math.max(0, e) / 25))), s = (e) => Object.values(e.visited || {}), c = (e) => new Date(e + 108e5), l = (e, t) => s(e).filter((e) => e.at && t(c(e.at))).length, u = (e) => (t) => s(t).filter((t) => (t.genres || []).some((t) => e.test(t))).length, d = (e) => (t) => (t.events || []).filter((t) => t.startsWith(e)).length, f = (e) => (t, n) => n.filter((t) => t.status === e).length, p = (e) => (t) => Object.values(t.gameNotes || {}).filter((t) => t && t[e]).length, m = (e) => Object.values(e.hours || {}).filter((e) => e > 0), h = {
	c: "common",
	r: "rare",
	e: "epic",
	l: "legendary"
}, g = (e, t, n, r, i, a) => a.map(([a, o, s]) => ({
	id: n + "-" + a,
	cat: e,
	icon: t,
	goal: a,
	name: o,
	desc: r.replace("{n}", a),
	tier: h[s],
	have: i
})), _ = (e, t, n, r, i) => g("genre", n, "genre-" + e, "{n} " + i + " oyun dosyası aç.", u(t), r);
[
	...g("explore", "compass", "visit", "{n} farklı oyun dosyası aç.", (e) => s(e).length, [
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
	...g("explore", "palette", "genres", "{n} farklı türde oyun dosyası aç.", (e) => new Set(s(e).flatMap((e) => e.genres || [])).size, [
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
	...g("explore", "eye-off", "dismiss", "{n} oyunu \"ilgilenmiyorum\" diye geç.", (e) => e.dismissed.length, [
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
	...g("explore", "moon", "night", "Gece 00.00 ile 05.00 arasında {n} oyun dosyası aç.", (e) => l(e, (e) => e.getUTCHours() < 5), [[
		1,
		"Gece Kuşu",
		"r"
	], [
		10,
		"Gece Bekçisi",
		"e"
	]]),
	...g("explore", "zap", "marathon", "Tek günde {n} oyun dosyası aç.", (e) => Math.max(0, ...Object.values(s(e).reduce((e, t) => {
		if (t.at) {
			let n = c(t.at).toISOString().slice(0, 10);
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
	...g("streak", "flame", "streak", "{n} gün üst üste uğra.", (e) => Math.max(e.bestStreak || 0, e.streak), [
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
	...g("streak", "calendar-check", "days", "Toplam {n} farklı gün uğra.", (e) => Math.max(e.daysVisited || 0, e.bestStreak || 0, e.streak), [
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
	...g("collection", "heart", "fav", "{n} oyunu favorilere ekle.", (e, t) => t.length, [
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
	...g("collection", "heart-handshake", "like", "Toplam {n} kez favoriye kalp bırak.", d("like:"), [
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
	...g("collection", "sparkles", "wish", "İstek listende {n} oyun biriktir.", f("wish"), [
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
	...g("collection", "gamepad", "playing", "Aynı anda {n} oyunu \"oynuyorum\" olarak işaretle.", f("playing"), [
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
	...g("collection", "crown", "top10", "Top 10 rafına {n} oyun koy.", (e) => e.top10.length, [
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
	...g("play", "check", "done", "{n} oyunu bitir.", f("done"), [
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
	...g("play", "hourglass", "hours", "Oyunlarına toplam {n} saat kaydet.", (e) => Math.floor(m(e).reduce((e, t) => e + t, 0)), [
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
	...g("play", "timer", "one-game", "Tek bir oyuna {n} saat kaydet.", (e) => Math.floor(Math.max(0, ...m(e))), [
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
	...g("play", "rocket", "hype", "{n} oyuna heyecan puanı ver.", (e) => Object.values(e.hype || {}).filter((e) => e > 0).length, [
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
	...g("play", "cake", "anniversary", "{n} oyun yıl dönümü kaydet.", (e) => e.anniversaries.length, [[
		1,
		"Yıl Dönümü",
		"r"
	], [
		5,
		"Anı Defteri",
		"e"
	]]),
	..._("action", /aksiyon|action/i, "swords", [
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
	..._("adventure", /macera|adventure/i, "map", [
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
	..._("rpg", /^rpg$|rol yapma|role-playing/i, "dragon", [
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
	..._("strategy", /strateji|strategy/i, "brain", [
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
	..._("sim", /simülasyon|simulation/i, "cpu", [
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
	..._("sports", /^spor|sports?/i, "trophy", [
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
	..._("racing", /yarış|racing/i, "car", [
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
	..._("indie", /bağımsız|indie/i, "sparkles", [
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
	..._("casual", /rahat|casual/i, "leaf", [
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
	..._("mmo", /mmo|massively/i, "users", [
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
	..._("horror", /korku|horror/i, "ghost", [
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
	..._("platformer", /platform/i, "footprints", [
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
	..._("puzzle", /bulmaca|puzzle/i, "puzzle", [
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
	..._("shooter", /nişancı|shooter|fps/i, "crosshair", [
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
	..._("fighting", /dövüş|fighting/i, "fist", [
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
	..._("roguelike", /rogue/i, "dices", [
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
	...g("genre", "ghost", "horror-fav", "{n} korku oyununu favorilere ekle.", (e, t) => t.filter((e) => (e.genres || []).some((e) => /korku|horror/i.test(e))).length, [[
		10,
		"Korkusuz",
		"e"
	]]),
	...g("writing", "pen", "review", "{n} oyun için toplulukta inceleme paylaş.", d("review:"), [
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
	...g("writing", "notebook", "journal", "{n} farklı oyuna günlük notu yaz.", (e) => Object.values(e.journal || {}).filter((e) => e.length).length, [
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
	...g("writing", "scroll", "entries", "Günlüğüne toplam {n} not yaz.", (e) => Object.values(e.journal || {}).reduce((e, t) => e + t.length, 0), [
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
	...g("writing", "newspaper", "read", "{n} haber ya da yazı oku.", d("read:"), [
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
	...g("writing", "tag", "tags", "{n} oyuna etiket ekle.", (e) => Object.values(e.tags || {}).filter((e) => e.length).length, [
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
	...g("writing", "pin", "pins", "Bir oyun haritasına {n} işaret koy.", (e) => Math.max(0, ...Object.values(e.gameNotes || {}).map((e) => e.mapPins?.length || 0)), [
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
	...g("writing", "map", "maps", "{n} oyuna dünya haritası ekle.", p("mapUrl"), [[
		1,
		"Harita Yükleyen",
		"c"
	], [
		5,
		"Atlas Sahibi",
		"r"
	]]),
	...g("price", "bell", "alerts", "{n} fiyat alarmın çalsın.", (e) => e.seenAlerts.length, [
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
	...g("price", "target", "target", "{n} favoriye hedef fiyat koy.", (e, t) => t.filter((e) => Number.isFinite(e.target)).length, [
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
	...g("price", "store", "platforms", "{n} farklı mağazayı gez.", (e) => Object.values(e.platformVisits || {}).filter((e) => e > 0).length, [
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
	...g("price", "coins", "currency", "Fiyatları başka para biriminde göster.", (e) => e.currency === "TRY" ? 0 : 1, [[
		1,
		"Döviz Gözlüğü",
		"c"
	]]),
	...g("level", "star", "level", "{n}. seviyeye ulaş.", (e) => o(e.xp), [
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
	...g("level", "shirt", "avatars", "Avatar dükkânında {n} avatarın olsun.", (e) => e.unlocked.length, [
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
	...g("personal", "user", "name", "Oyuncu adını yaz.", (e) => +!!e.name, [[
		1,
		"Adını Koydun",
		"c"
	]]),
	...g("personal", "library", "shelf-name", "Oyun rafına bir ad ver.", (e) => +!!e.collectionName, [[
		1,
		"Raf Sahibi",
		"c"
	]]),
	...g("personal", "map-pin", "city", "Şehrini ekle.", (e) => +!!e.city, [[
		1,
		"Memleket",
		"c"
	]]),
	...g("personal", "heart", "pref-genre", "Sevdiğin türü seç.", (e) => +!!e.preferredGenre, [[
		1,
		"Tür Tercihi",
		"c"
	]]),
	...g("personal", "fingerprint", "persona", "{n} oyuncu kişiliği seç.", (e) => e.personas.length, [[
		1,
		"Oyuncu Kişiliği",
		"c"
	], [
		3,
		"Çok Yüzlü",
		"r"
	]]),
	...g("personal", "eye", "color", "Renk görme modunu ayarla.", (e) => e.colorMode === "default" ? 0 : 1, [[
		1,
		"Renk Ayarı",
		"c"
	]]),
	...g("personal", "leaf", "zen", "Zen görünümünü aç.", (e) => +!!e.zen, [[
		1,
		"Zen Modu",
		"c"
	]]),
	...g("personal", "joystick", "retro", "Retro görünümü aç.", (e) => +!!e.retro, [[
		1,
		"Retro Ruh",
		"r"
	]])
];
//#endregion
//#region lib/ps-supabase.mjs
var v = "https://dsosckshigzijnsxmlwh.supabase.co", y = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO", b = 25, x = (e) => String(e || "").replace(/[™®©]/g, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/\s+/g, " ").trim();
async function S(e, t) {
	let n = await fetch(v + "/rest/v1/" + e, {
		headers: {
			apikey: y,
			Authorization: "Bearer " + y,
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
var C = 6e4, w = /* @__PURE__ */ new Map();
function T(e) {
	let t = w.get(e);
	if (t && Date.now() - t.at < C) return t.p;
	let n = S("ps_state?select=value&key=eq." + e).catch(() => (w.delete(e), null));
	return w.set(e, {
		at: Date.now(),
		p: n
	}), n;
}
var E = (e) => e == null ? null : Number(e), D = {
	steam: "TR / MENA",
	xbox: "TR",
	switch: "US",
	epic: "TR",
	gog: "TR"
}, O = (e) => ({
	id: e.platform + ":" + e.store_id,
	storeId: e.store_id,
	platform: e.platform,
	name: e.name,
	image: e.image || void 0,
	price: E(e.price),
	originalPrice: E(e.original_price),
	discountPercent: e.discount_percent || 0,
	currency: e.currency,
	region: D[e.platform] || "",
	url: e.url,
	edition: e.edition,
	checkedAt: e.checked_at
}), k = (e) => ({
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
	price: E(e.price),
	originalPrice: E(e.original_price),
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
	lowestEver: E(e.lowest_ever),
	lowest30d: E(e.lowest_30d),
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
	steamAppid: E(e.steam_appid),
	requirements: e.requirements && typeof e.requirements == "object" ? e.requirements : null,
	dlcCount: e.dlc_count || 0,
	news: Array.isArray(e.news) ? e.news : [],
	bestScore: E(e.best_score),
	offers: Array.isArray(e.offers) ? e.offers.map((t) => ({
		...O(t),
		sourceStatus: e.store_status?.[t.platform]?.status || "unknown",
		purchaseEligible: e.store_status?.[t.platform]?.status !== "unavailable" && Date.now() - Date.parse(t.checked_at) < 864e5
	})) : [],
	scores: e.scores ? {
		metacritic: E(e.scores.metacritic),
		metacriticPlatform: e.scores.metacritic_platform || null,
		metacriticUrl: e.scores.metacritic_url || null,
		opencritic: E(e.scores.opencritic),
		opencriticReviews: E(e.scores.opencritic_reviews),
		opencriticUrl: e.scores.opencritic_url || null
	} : null
});
async function A(e, t, n, r, i, o) {
	let s = await fetch(v + "/rest/v1/rpc/search_games", {
		method: "POST",
		headers: {
			apikey: y,
			Authorization: "Bearer " + y,
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
async function j(e = "", t = 0, n = !1, r = "default", a = {}) {
	return t === 0 ? i(e, "playstation", () => M(e, t, n, r, a)) : M(e, t, n, r, a);
}
async function M(e, t, n, r, i) {
	let [o, s] = await Promise.all([A(e, t, b, n, r, i), T("batch")]), c = s?.rows?.[0]?.value;
	return {
		platform: "playstation",
		items: o.items.map(k),
		total: o.total,
		hasMore: (t + 1) * b < o.total,
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
		expanded: a(e) !== x(e)
	};
}
var N = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
async function ee(e = 45, t = 400) {
	let n = N(), r = new Date(Date.parse(n) + e * 864e5).toISOString().slice(0, 10), i = new URLSearchParams({
		select: "id,name,image,release_text,release_date,url,price,currency,wishlist_rank,platform,title_key",
		limit: String(t),
		order: "release_date.asc,name.asc"
	});
	return i.append("release_date", "gte." + n), i.append("release_date", "lte." + r), (await S("upcoming_games?" + i)).rows.map((e) => ({
		id: e.id,
		name: e.name,
		image: e.image || void 0,
		releaseText: e.release_text,
		releaseDate: e.release_date || null,
		url: e.url,
		price: E(e.price),
		currency: e.currency || null,
		wishlistRank: E(e.wishlist_rank),
		platform: e.platform || "steam",
		titleKey: e.title_key || null
	}));
}
var P = {
	steam: "Steam",
	xbox: "Xbox Store TR",
	switch: "Nintendo eShop (ABD)",
	epic: "Epic Games Store TR",
	gog: "GOG TR"
};
function F(e) {
	if (!e || !e.platform || e.platform === "playstation") return k(e);
	let t = k({
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
		region: D[e.platform] || "",
		sourceKind: "market",
		sourceLabel: P[e.platform] || e.platform,
		steamAppid: e.platform === "steam" ? E(e.store_id) : t.steamAppid
	};
}
async function I(e = "all", t = "", n = 0, r = !1, a = "default", o = {}) {
	return n === 0 ? i(t, e, () => L(e, t, n, r, a, o)) : L(e, t, n, r, a, o);
}
async function L(e, t, n, r, i, o) {
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
	let c = await fetch(v + "/rest/v1/rpc/" + (s.device ? "search_market_v2" : "search_market"), {
		method: "POST",
		headers: {
			apikey: y,
			Authorization: "Bearer " + y,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			market: e,
			query_text: a(t),
			page_number: n,
			page_size: b,
			deals_only: r,
			sort_order: i,
			filter_options: s
		}),
		signal: AbortSignal.timeout(2e4),
		credentials: "omit"
	});
	if (!c.ok) throw Error("Market araması HTTP " + c.status);
	let l = await c.json(), u = await T("market");
	return {
		platform: e,
		items: (l.items || []).map(F),
		total: l.total || 0,
		hasMore: (n + 1) * b < (l.total || 0),
		page: n,
		status: "ok",
		scheduled: !0,
		sourceKind: "market",
		sourceLabel: e === "all" ? "Tüm marketler" : P[e],
		checkedAt: u?.rows?.[0]?.value?.finishedAt,
		query: l.query,
		personalized: !!l.personalized
	};
}
//#endregion
//#region lib/deal-time.mjs
var R = 36e5, z = 24 * R;
6 * R, 2 * z;
var B = (e) => new Date(e).toLocaleString("tr-TR", {
	timeZone: "Europe/Istanbul",
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit"
});
function te(e) {
	if (e < 6e4) return "1 dakikadan az kaldı";
	let t = Math.floor(e / z), n = Math.floor(e % z / R), r = Math.floor(e % R / 6e4);
	return (t ? t + " gün" + (n ? " " + n + " saat" : "") : n ? n + " saat" + (r ? " " + r + " dk" : "") : r + " dk") + " kaldı";
}
var V = (e) => !!e && Number(e.originalPrice) > Number(e.price) && e.discountPercent > 0;
function ne(e, t = Date.now()) {
	if (!V(e)) return null;
	let n = Date.parse(e.discountEndsAt);
	if (!e.discountEndsAt || !Number.isFinite(n)) return {
		known: !1,
		ended: !1,
		ms: null,
		text: "Bitiş tarihi mağazada belirtilmemiş",
		at: null,
		urgent: !1
	};
	let r = n - t;
	return r <= 0 ? {
		known: !0,
		ended: !0,
		ms: 0,
		text: "İndirim süresi doldu · fiyat yenileniyor",
		at: B(n),
		urgent: !1
	} : {
		known: !0,
		ended: !1,
		ms: r,
		text: te(r),
		at: B(n),
		urgent: r <= 2 * z
	};
}
//#endregion
//#region lib/calendar.mjs
function re(e) {
	return x(String(e || "").replace(/[™®©]/g, "").replace(/\(?\s*PS\s?[45]\s*(?:ve|and|und|&|\/|\+|,)?\s*(?:PS\s?[45])?\s*\)?/gi, " ").replace(/\s+/g, " ").trim()).replace(/[^a-z0-9]+/g, " ").replace(/\b(standard|standart|edition|surum|digital|dijital)\b/g, " ").replace(/\s+/g, " ").trim();
}
var ie = /\b(demo|playtest|soundtrack|ost|artbook|wallpapers?|prologue|season pass|expansion pack|dlc)\b|\((?:audio files|images)\)|\bpack$/i, H = (e) => ie.test(String(e || "")), ae = {
	steam: "Steam",
	playstation: "PlayStation",
	xbox: "Xbox",
	switch: "Switch",
	epic: "Epic Games",
	gog: "GOG"
};
function oe(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		let e = n.titleKey || re(n.name) || n.id;
		(t.get(e) || t.set(e, []).get(e)).push(n);
	}
	let n = new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
	return [...t].map(([e, t]) => {
		let r = t.find((e) => (e.platform || "steam") === "steam") || t[0], i = t.map((e) => e.releaseDate).filter(Boolean).sort(), a = i.filter((e) => e >= n), o = t.map((e) => e.wishlistRank).filter((e) => e != null);
		return {
			...r,
			key: e,
			name: String(r.name).replace(/\s*[(\[]?\s*PS\s?[45](?:\s*(?:&|ve|and|\/|\+)\s*PS\s?[45])?\s*[)\]]?\s*$/i, "").trim() || r.name,
			image: r.image || t.find((e) => e.image)?.image,
			releaseDate: a[0] || i[0] || null,
			releaseText: r.releaseText || t.find((e) => e.releaseText)?.releaseText || null,
			wishlistRank: o.length ? Math.min(...o) : null,
			rows: t
		};
	});
}
var U = (e) => (e.platform || "steam") === "steam" && /^\d+$/.test(String(e.id)) ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${e.id}/header.jpg` : e.image || null;
function se(e, t = 12, n = new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10)) {
	let r = new Date(Date.parse(n) + 60 * 864e5).toISOString().slice(0, 10), i = (e) => {
		let t = e.rows || [e], n = new Set(t.map((e) => e.platform || "steam")), i = t.some((e) => e.currency === "TRY" && e.price >= 2e3 || e.currency === "USD" && e.price >= 50);
		return (e.wishlistRank == null ? i ? 85 : 0 : 100 - Math.min(e.wishlistRank, 100) * .8) + n.size * 15 + (n.has("playstation") || n.has("xbox") ? 10 : 0) + (t.some((e) => e.price != null) ? 5 : 0) + (e.image || U(e) ? 5 : -30) + (e.releaseDate && e.releaseDate <= r ? 10 : 0);
	}, a = e.filter((e) => !H(e.name) && (!e.releaseDate || e.releaseDate >= n)).map((e) => ({
		g: e,
		s: i(e)
	})).sort((e, t) => t.s - e.s).map((e) => e.g), o = a.filter((e) => e.releaseDate), s = a.filter((e) => !e.releaseDate), c = Math.min(s.length, Math.max(Math.floor(t / 4), t - o.length));
	return [...o.slice(0, t - c), ...s.slice(0, c)].sort((e, t) => (e.releaseDate || "9999").localeCompare(t.releaseDate || "9999"));
}
var ce = 137.508, W = .3, G = .9, le = .15, K = (e, t, n) => Math.min(n, Math.max(t, e)), q = (e = Date.now()) => new Date(e + 3 * 36e5).toISOString().slice(0, 10), ue = (e, t = q()) => Math.round((Date.parse(e) - Date.parse(t)) / 864e5), de = (e) => V(e) && typeof e.price == "number" && e.price > 0;
function fe(e, t) {
	let n = e.map((e) => (e || []).filter(de).sort((e, t) => t.discountPercent - e.discountPercent)), r = /* @__PURE__ */ new Set(), i = [];
	for (; i.length < t && n.some((e) => e.length);) for (let e of n) {
		let n = e.shift();
		if (!n) continue;
		let a = String(n.titleKey || n.name).toLowerCase();
		if (!r.has(a) && (r.add(a), i.push({
			key: "d:" + n.id,
			kind: "deal",
			name: n.name,
			image: n.image || null,
			store: n.platform || "playstation",
			pct: n.discountPercent,
			price: n.price,
			original: n.originalPrice,
			currency: n.currency || "TRY",
			ends: n.discountEndsAt || null,
			url: n.url || null,
			item: n,
			weight: K((n.discountPercent - 10) / 80, 0, 1)
		}), i.length >= t)) break;
	}
	return i;
}
function pe(e, t, n = q()) {
	let r = new Date(Date.parse(n) + 45 * 864e5).toISOString().slice(0, 10);
	return se(oe((e || []).filter((e) => e.releaseDate && e.releaseDate >= n && e.releaseDate <= r && !H(e.name))), t, n).filter((e) => e.releaseDate).map((e) => {
		let t = ue(e.releaseDate, n), r = (e.rows || [e]).find((e) => typeof e.price == "number" && e.price > 0);
		return {
			key: "r:" + e.key,
			kind: "release",
			name: e.name,
			image: U(e),
			store: e.platform || "steam",
			stores: [...new Set((e.rows || [e]).map((e) => e.platform || "steam"))],
			date: e.releaseDate,
			days: t,
			price: r?.price ?? null,
			currency: r?.currency || null,
			url: e.url || null,
			item: e,
			weight: 1 - K(t / 45, 0, 1)
		};
	});
}
function me(e) {
	let t = [...e].sort((e, t) => t.weight - e.weight), n = [];
	return t.forEach((e, t) => {
		let r = G - (G - W) * e.weight, i = (t * ce + (e.kind === "release" ? 23 : 0)) % 360, a = null;
		for (let e = 0; e < 36; e++) {
			let t = K(r + (e % 2 ? 1 : -1) * Math.floor(e / 6) * .04, W, G), o = (i + e * 10) % 360, s = he(o, t), c = Math.min(Infinity, ...n.map((e) => Math.hypot(e.x - s.x, e.y - s.y)));
			if ((!a || c > a.near) && (a = {
				a: o,
				r: t,
				near: c,
				...s
			}), c >= le) break;
		}
		n.push({
			...e,
			a: Math.round(a.a),
			r: Math.round(a.r * 1e3) / 1e3,
			x: a.x,
			y: a.y
		});
	}), n.sort((e, t) => e.a - t.a);
}
var he = (e, t) => {
	let n = e * Math.PI / 180;
	return {
		x: Math.round(Math.sin(n) * t * 1e3) / 1e3 || 0,
		y: Math.round(-Math.cos(n) * t * 1e3) / 1e3 || 0
	};
}, ge = (e, t, n) => Math.round((e / 360 * t - n % t) * 1e3) / 1e3;
function J(e) {
	return e <= 0 ? "Bugün çıkıyor" : e === 1 ? "Yarın çıkıyor" : e + " gün sonra çıkıyor";
}
//#endregion
//#region app/Radar.tsx
var Y = [
	"playstation",
	"steam",
	"xbox",
	"epic",
	"gog",
	"switch"
], X = "radar-scope-v1", _e = "radar-deals-v1", ve = 10 * 6e4, Z = 4, Q = (e) => {
	try {
		let t = JSON.parse(sessionStorage.getItem(e) || "null");
		return t && Date.now() - t.at < ve ? t : null;
	} catch {
		return null;
	}
}, ye = (e, t) => e === "playstation" ? j("", 0, !0, "discount", { usdTry: t }) : I(e, "", 0, !0, "discount", { usdTry: t }), $ = (e) => ae[e] || e, be = (e) => {
	let t = /* @__PURE__ */ new Date(e + "T12:00:00Z"), n = { timeZone: "UTC" };
	return t.toLocaleDateString("tr-TR", {
		...n,
		weekday: "long"
	}) + ", " + t.toLocaleDateString("tr-TR", {
		...n,
		day: "numeric",
		month: "long"
	});
}, xe = () => typeof window < "u" && window.matchMedia?.("(max-width:640px)").matches, Se = (e) => window.dispatchEvent(new CustomEvent("radar:navigate", { detail: e })), Ce = {
	radar: [
		["path", { d: "M19.07 4.93A10 10 0 0 0 6.99 3.34" }],
		["path", { d: "M4 6h.01" }],
		["path", { d: "M2.29 9.62A10 10 0 1 0 21.31 8.35" }],
		["path", { d: "M16.24 7.76A6 6 0 1 0 8.23 16.67" }],
		["path", { d: "M12 18h.01" }],
		["path", { d: "M17.99 11.66A6 6 0 0 1 15.77 16.67" }],
		["circle", {
			cx: "12",
			cy: "12",
			r: "2"
		}],
		["path", { d: "m13.41 10.59 5.66-5.66" }]
	],
	tag: [["path", { d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" }], ["circle", {
		cx: "7.5",
		cy: "7.5",
		r: ".5",
		fill: "currentColor"
	}]],
	calendar: [
		["path", { d: "M8 2v3" }],
		["path", { d: "M16 2v3" }],
		["rect", {
			x: "3",
			y: "3",
			width: "18",
			height: "18",
			rx: "2"
		}],
		["path", { d: "M3 9h18" }],
		["path", { d: "M8 13h.01" }],
		["path", { d: "M12 13h.01" }],
		["path", { d: "M16 13h.01" }],
		["path", { d: "M8 17h.01" }],
		["path", { d: "M12 17h.01" }],
		["path", { d: "M16 17h.01" }]
	],
	x: [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]],
	arrow: [["path", { d: "M7 7h10v10" }], ["path", { d: "M7 17 17 7" }]],
	dices: [
		["rect", {
			width: "12",
			height: "12",
			x: "2",
			y: "10",
			rx: "2",
			ry: "2"
		}],
		["path", { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" }],
		["path", { d: "M6 18h.01" }],
		["path", { d: "M10 14h.01" }],
		["path", { d: "M15 6h.01" }],
		["path", { d: "M18 9h.01" }]
	],
	chevron: [["path", { d: "m9 18 6-6-6-6" }]],
	rotate: [["path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" }], ["path", { d: "M21 3v5h-5" }]],
	clock: [["circle", {
		cx: "12",
		cy: "12",
		r: "10"
	}], ["path", { d: "M12 6v6l4 2" }]]
};
function we(e, { useExperience: t, DisplayPrice: n }) {
	let { useEffect: r, useMemo: i, useRef: a, useState: o } = e, s = e.createElement, c = (e) => function({ size: t = 16 }) {
		return s("svg", {
			width: t,
			height: t,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": !0
		}, ...Ce[e].map(([e, t], n) => s(e, {
			...t,
			key: n
		})));
	}, l = c("radar"), u = c("tag"), d = c("calendar"), f = c("x"), p = c("arrow"), m = c("dices"), h = c("chevron"), g = c("rotate"), _ = c("clock");
	function v({ fx: e }) {
		let n = t(), [c, u] = o(() => Q(X) || {
			deals: {},
			releases: null,
			at: 0
		}), [d, f] = o(() => !!Q(X)), [p, h] = o(!1), [_, v] = o(0), [b, x] = o("all"), [S, C] = o(null), [w] = o(xe), T = a(performance.now()), E = a(/* @__PURE__ */ new Map()), D = a(null);
		r(() => {
			if (d) return;
			let t = !1;
			return (async () => {
				let n = {
					deals: {},
					releases: null,
					at: 0
				}, r = 0;
				try {
					n.releases = await ee(), r++;
				} catch {
					n.releases = [];
				}
				if (t) return;
				u({ ...n });
				let i = Q(_e);
				if (i?.items) n.deals = i.items, r++;
				else {
					let i = Number(e?.usdTry) || void 0;
					for (let e of Y) {
						if (t) return;
						try {
							let t = await ye(e, i);
							n.deals = {
								...n.deals,
								[e]: t.items || []
							}, r++;
						} catch {}
						t || u({ ...n });
					}
				}
				if (!t) {
					if (!r) {
						h(!0);
						return;
					}
					n.at = Date.now(), u(n), f(!0);
					try {
						sessionStorage.setItem(X, JSON.stringify(n));
					} catch {}
				}
			})(), () => {
				t = !0;
			};
		}, [d, _]);
		let O = i(() => me([...fe(Y.map((e) => c.deals[e] || []), w ? 10 : 16), ...pe(c.releases || [], w ? 6 : 9)]), [c, w]), k = {
			deal: O.filter((e) => e.kind === "deal").length,
			release: O.filter((e) => e.kind === "release").length
		}, A = O.filter((e) => b === "all" || e.kind === b), j = A.find((e) => e.key === S) || null, M = (e) => {
			let t = E.current.get(e.key);
			return t === void 0 && (t = ge(e.a, Z, (performance.now() - T.current) / 1e3), E.current.set(e.key, t)), t;
		}, N = (e) => {
			C(e), e && w && requestAnimationFrame(() => D.current?.scrollIntoView({
				behavior: "smooth",
				block: "nearest"
			}));
		}, P = (e) => {
			A.length && N(A[(A.findIndex((e) => e.key === S) + e + A.length) % A.length].key);
		}, F = () => {
			if (!A.length) return;
			let e = A.filter((e) => e.key !== S);
			N((e[Math.floor(Math.random() * e.length)] || A[0]).key);
		};
		r(() => {
			let e = (e) => {
				e.key === "Escape" && S && C(null);
			};
			return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
		}, [S]);
		let I = !d && !p;
		return /* @__PURE__ */ s("section", { className: "radar-screen" }, /* @__PURE__ */ s("div", { className: "radar-intro" }, /* @__PURE__ */ s("span", { className: "eyebrow" }, /* @__PURE__ */ s(l, { size: 13 }), " OYUN RADARI"), /* @__PURE__ */ s("h1", null, "Radarda ", /* @__PURE__ */ s("span", null, "ne var?")), /* @__PURE__ */ s("p", null, "Her parlayan nokta bir oyun. Yeşil nokta indirimde, mavi nokta yakında çıkıyor. Merkeze yakın olan daha iyi.")), /* @__PURE__ */ s("div", {
			className: "radar-kinds",
			role: "group",
			"aria-label": "Radarda göster"
		}, /* @__PURE__ */ s("button", {
			type: "button",
			"aria-pressed": b === "all",
			onClick: () => x("all")
		}, /* @__PURE__ */ s(l, { size: 17 }), "Hepsi", /* @__PURE__ */ s("em", null, k.deal + k.release)), /* @__PURE__ */ s("button", {
			type: "button",
			className: "k-deal",
			"aria-pressed": b === "deal",
			onClick: () => x("deal")
		}, /* @__PURE__ */ s("i", null), "İndirimler", /* @__PURE__ */ s("em", null, k.deal)), /* @__PURE__ */ s("button", {
			type: "button",
			className: "k-release",
			"aria-pressed": b === "release",
			onClick: () => x("release")
		}, /* @__PURE__ */ s("i", null), "Yeni çıkışlar", /* @__PURE__ */ s("em", null, k.release))), /* @__PURE__ */ s("div", { className: "radar-stage" }, /* @__PURE__ */ s("div", {
			className: "radar-scope",
			style: { "--period": Z + "s" }
		}, /* @__PURE__ */ s("div", {
			className: "radar-rings",
			"aria-hidden": "true"
		}, /* @__PURE__ */ s("i", null), /* @__PURE__ */ s("i", null), /* @__PURE__ */ s("i", null), /* @__PURE__ */ s("b", null), /* @__PURE__ */ s("b", null)), /* @__PURE__ */ s("div", {
			className: "radar-sweep",
			"aria-hidden": "true"
		}), /* @__PURE__ */ s("div", {
			className: "radar-center",
			"aria-hidden": "true"
		}, /* @__PURE__ */ s("span", null, "SEN")), I && !O.length && /* @__PURE__ */ s("p", {
			className: "radar-status",
			role: "status"
		}, "Radar taranıyor…"), p && /* @__PURE__ */ s("div", {
			className: "radar-status",
			role: "alert"
		}, /* @__PURE__ */ s("p", null, "Radar şu an sinyal alamıyor."), /* @__PURE__ */ s("button", {
			type: "button",
			onClick: () => {
				h(!1), f(!1), v((e) => e + 1);
			}
		}, /* @__PURE__ */ s(g, { size: 15 }), "Tekrar tara")), d && !O.length && /* @__PURE__ */ s("p", {
			className: "radar-status",
			role: "status"
		}, "Radarda şu an oyun yok. Biraz sonra yine bak."), /* @__PURE__ */ s("ul", {
			className: "radar-dots",
			"aria-label": "Radardaki oyunlar"
		}, O.map((e) => {
			let t = b === "all" || e.kind === b;
			return /* @__PURE__ */ s("li", {
				key: e.key,
				className: "radar-dot " + e.kind + (e.key === S ? " selected" : "") + (t ? "" : " off"),
				style: {
					left: 50 + e.x * 50 + "%",
					top: 50 + e.y * 50 + "%",
					"--delay": M(e) + "s",
					"--size": (e.kind === "deal" ? 12 + e.weight * 10 : 13) + "px"
				}
			}, /* @__PURE__ */ s("button", {
				type: "button",
				tabIndex: t ? 0 : -1,
				"aria-hidden": !t,
				"aria-pressed": e.key === S,
				"aria-label": e.kind === "deal" ? `${e.name}, yüzde ${e.pct} indirim, ${$(e.store)}` : `${e.name}, ${J(e.days)}`,
				onClick: () => N(e.key === S ? null : e.key)
			}, /* @__PURE__ */ s("i", null)), /* @__PURE__ */ s("span", {
				className: "radar-tag",
				"aria-hidden": "true"
			}, e.kind === "deal" ? "−%" + e.pct : e.days <= 0 ? "Bugün" : e.days === 1 ? "Yarın" : e.days + " gün"));
		}))), /* @__PURE__ */ s("div", {
			ref: D,
			className: "radar-card",
			"aria-live": "polite"
		}, j ? /* @__PURE__ */ s(y, {
			key: j.key,
			d: j,
			onClose: () => C(null),
			onNext: () => P(1),
			onOpen: () => n.open(j.item)
		}) : /* @__PURE__ */ s("div", { className: "radar-help" }, /* @__PURE__ */ s("h2", null, "Nasıl kullanılır?"), /* @__PURE__ */ s("ol", null, /* @__PURE__ */ s("li", null, /* @__PURE__ */ s("b", null, "1"), "Radar döner, oyunları arar."), /* @__PURE__ */ s("li", null, /* @__PURE__ */ s("b", null, "2"), "Parlayan bir noktaya dokun."), /* @__PURE__ */ s("li", null, /* @__PURE__ */ s("b", null, "3"), "Oyunun kartı burada açılır.")), /* @__PURE__ */ s("div", { className: "radar-legend" }, /* @__PURE__ */ s("span", null, /* @__PURE__ */ s("i", { className: "deal" }), k.deal, " oyun indirimde"), /* @__PURE__ */ s("span", null, /* @__PURE__ */ s("i", { className: "release" }), k.release, " oyun yakında çıkıyor")), /* @__PURE__ */ s("button", {
			type: "button",
			className: "radar-lucky",
			disabled: !A.length,
			onClick: F
		}, /* @__PURE__ */ s(m, { size: 18 }), "Benim için bir nokta seç"), I && O.length > 0 && /* @__PURE__ */ s("small", { className: "radar-more" }, "Diğer mağazalar taranıyor…")))));
	}
	function y({ d: t, onClose: r, onNext: i, onOpen: a }) {
		let c = t.kind === "deal" ? ne(t.item) : null, [l, m] = o(!1);
		return /* @__PURE__ */ s("article", { className: "radar-game " + t.kind }, /* @__PURE__ */ s("button", {
			type: "button",
			className: "radar-x",
			"aria-label": "Kartı kapat",
			onClick: r
		}, /* @__PURE__ */ s(f, { size: 18 })), /* @__PURE__ */ s("div", { className: "radar-cover" }, t.image && !l ? /* @__PURE__ */ s("img", {
			src: t.image,
			alt: "",
			onError: () => m(!0)
		}) : /* @__PURE__ */ s("span", { "aria-hidden": "true" }, t.name.slice(0, 1)), /* @__PURE__ */ s("b", { className: "radar-badge" }, t.kind === "deal" ? /* @__PURE__ */ s(e.Fragment, null, /* @__PURE__ */ s(u, { size: 14 }), "−%", t.pct) : /* @__PURE__ */ s(e.Fragment, null, /* @__PURE__ */ s(d, { size: 14 }), t.days <= 0 ? "Bugün" : t.days === 1 ? "Yarın" : t.days + " gün"))), /* @__PURE__ */ s("div", { className: "radar-body" }, /* @__PURE__ */ s("small", { className: "radar-store" }, t.kind === "deal" ? $(t.store) : (t.stores || [t.store]).map($).join(" · ")), /* @__PURE__ */ s("h3", null, t.name), t.kind === "deal" ? /* @__PURE__ */ s("p", { className: "radar-price" }, /* @__PURE__ */ s("strong", null, /* @__PURE__ */ s(n, {
			value: t.price,
			currency: t.currency
		})), typeof t.original == "number" && /* @__PURE__ */ s("s", null, /* @__PURE__ */ s(n, {
			value: t.original,
			currency: t.currency
		}))) : /* @__PURE__ */ s("p", { className: "radar-price" }, /* @__PURE__ */ s("strong", null, J(t.days)), /* @__PURE__ */ s("span", { className: "radar-date" }, be(t.date))), c?.known && !c.ended && /* @__PURE__ */ s("p", { className: "radar-ends" + (c.urgent ? " urgent" : "") }, /* @__PURE__ */ s(_, { size: 14 }), c.text), /* @__PURE__ */ s("div", { className: "radar-actions" }, t.kind === "deal" ? /* @__PURE__ */ s("button", {
			type: "button",
			className: "radar-go",
			onClick: a
		}, "Oyunu aç ", /* @__PURE__ */ s(h, { size: 18 })) : /* @__PURE__ */ s("button", {
			type: "button",
			className: "radar-go",
			onClick: () => Se("calendar")
		}, "Takvimde gör ", /* @__PURE__ */ s(h, { size: 18 })), t.url && /* @__PURE__ */ s("a", {
			href: t.url,
			target: "_blank",
			rel: "noreferrer",
			className: "radar-link"
		}, "Mağazada gör ", /* @__PURE__ */ s(p, { size: 16 })), /* @__PURE__ */ s("button", {
			type: "button",
			className: "radar-next",
			onClick: i
		}, "Sıradaki nokta"))));
	}
	return {
		Screen: v,
		Icon: l
	};
}
//#endregion
export { we as createRadarScreen };
