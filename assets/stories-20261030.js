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
var o = new Map([
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
].map((e) => [e.id, e])), s = (e) => [...new Set((Array.isArray(e) ? e : []).filter((e) => typeof e == "string" && o.has(e)))].slice(0, 3);
function c(e, t = []) {
	let n = s(e?.personas).map((e) => o.get(e)), r = new Set(n.flatMap((e) => e.genres)), i = new Set(n.flatMap((e) => e.tags));
	typeof e?.preferredGenre == "string" && e.preferredGenre && r.add(e.preferredGenre);
	let a = /* @__PURE__ */ new Map();
	for (let e of t || []) for (let t of e?.genres || []) typeof t == "string" && a.set(t, (a.get(t) || 0) + 1);
	for (let [e] of [...a].sort((e, t) => t[1] - e[1]).slice(0, 2)) r.add(e);
	let c = (e) => /^[\p{L}\p{N} &'-]{2,40}$/u.test(e);
	return {
		personas: n.map((e) => e.id),
		genres: [...r].filter(c).slice(0, 8),
		tags: [...i].filter(c).slice(0, 16)
	};
}
var l = (e) => !!(e && (e.genres.length || e.tags.length));
function u(e, t) {
	let n = new Set(t?.genres || []), r = new Set((t?.tags || []).map((e) => e.toLowerCase()));
	return {
		genres: (e?.genres || []).filter((e) => n.has(e)).length,
		tags: new Set([...e?.tags || [], ...e?.categories || []].map((e) => String(e).toLowerCase()).filter((e) => r.has(e))).size
	};
}
var d = (e, t) => {
	let n = u(e, t);
	return n.genres + n.tags > 0;
}, f = (e) => Math.min(99, 1 + Math.floor(Math.sqrt(Math.max(0, e) / 25))), p = (e) => Object.values(e.visited || {}), m = (e) => new Date(e + 108e5), h = (e, t) => p(e).filter((e) => e.at && t(m(e.at))).length, g = (e) => (t) => p(t).filter((t) => (t.genres || []).some((t) => e.test(t))).length, _ = (e) => (t) => (t.events || []).filter((t) => t.startsWith(e)).length, v = (e) => (t, n) => n.filter((t) => t.status === e).length, y = (e) => (t) => Object.values(t.gameNotes || {}).filter((t) => t && t[e]).length, b = (e) => Object.values(e.hours || {}).filter((e) => e > 0), x = {
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
var w = (e, t = "TRY") => Number.isFinite(e) ? new Intl.NumberFormat("tr-TR", {
	style: "currency",
	currency: [
		"TRY",
		"USD",
		"EUR"
	].includes(t) ? t : "TRY",
	maximumFractionDigits: 2
}).format(e) : "—", T = "https://dsosckshigzijnsxmlwh.supabase.co", E = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO", D = 25, O = (e) => String(e || "").replace(/[™®©]/g, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/\s+/g, " ").trim();
async function k(e, t) {
	let n = await fetch(T + "/rest/v1/" + e, {
		headers: {
			apikey: E,
			Authorization: "Bearer " + E,
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
var A = 6e4, j = /* @__PURE__ */ new Map();
function M(e) {
	let t = j.get(e);
	if (t && Date.now() - t.at < A) return t.p;
	let n = k("ps_state?select=value&key=eq." + e).catch(() => (j.delete(e), null));
	return j.set(e, {
		at: Date.now(),
		p: n
	}), n;
}
var N = (e) => e == null ? null : Number(e), P = {
	steam: "TR / MENA",
	xbox: "TR",
	switch: "US",
	epic: "TR",
	gog: "TR"
}, F = (e) => ({
	id: e.platform + ":" + e.store_id,
	storeId: e.store_id,
	platform: e.platform,
	name: e.name,
	image: e.image || void 0,
	price: N(e.price),
	originalPrice: N(e.original_price),
	discountPercent: e.discount_percent || 0,
	currency: e.currency,
	region: P[e.platform] || "",
	url: e.url,
	edition: e.edition,
	checkedAt: e.checked_at
}), I = (e) => ({
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
	price: N(e.price),
	originalPrice: N(e.original_price),
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
	lowestEver: N(e.lowest_ever),
	lowest30d: N(e.lowest_30d),
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
	steamAppid: N(e.steam_appid),
	requirements: e.requirements && typeof e.requirements == "object" ? e.requirements : null,
	dlcCount: e.dlc_count || 0,
	news: Array.isArray(e.news) ? e.news : [],
	bestScore: N(e.best_score),
	offers: Array.isArray(e.offers) ? e.offers.map((t) => ({
		...F(t),
		sourceStatus: e.store_status?.[t.platform]?.status || "unknown",
		purchaseEligible: e.store_status?.[t.platform]?.status !== "unavailable" && Date.now() - Date.parse(t.checked_at) < 864e5
	})) : [],
	scores: e.scores ? {
		metacritic: N(e.scores.metacritic),
		metacriticPlatform: e.scores.metacritic_platform || null,
		metacriticUrl: e.scores.metacritic_url || null,
		opencritic: N(e.scores.opencritic),
		opencriticReviews: N(e.scores.opencritic_reviews),
		opencriticUrl: e.scores.opencritic_url || null
	} : null
});
async function L(e, t, n, r, i, o) {
	let s = await fetch(T + "/rest/v1/rpc/search_games", {
		method: "POST",
		headers: {
			apikey: E,
			Authorization: "Bearer " + E,
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
async function R(e = "", t = 0, n = !1, r = "default", a = {}) {
	return t === 0 ? i(e, "playstation", () => z(e, t, n, r, a)) : z(e, t, n, r, a);
}
async function z(e, t, n, r, i) {
	let [o, s] = await Promise.all([L(e, t, D, n, r, i), M("batch")]), c = s?.rows?.[0]?.value;
	return {
		platform: "playstation",
		items: o.items.map(I),
		total: o.total,
		hasMore: (t + 1) * D < o.total,
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
		expanded: a(e) !== O(e)
	};
}
var B = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
async function V(e = 12, t = !0, n = !1) {
	let r = new URLSearchParams({
		select: "*",
		limit: String(Math.min(e, 1e3)),
		order: "release_date.asc.nullslast,name.asc"
	});
	t ? r.set("release_date", "gte." + B()) : r.set("or", "(release_date.gte." + (/* @__PURE__ */ new Date(Date.parse(B()) - 6 * 864e5)).toISOString().slice(0, 10) + ",release_date.is.null)");
	try {
		let t = [];
		for (let n = 0; n < e; n += 1e3) {
			r.set("offset", String(n)), r.set("limit", String(Math.min(1e3, e - n)));
			let i = (await k("upcoming_games?" + r)).rows;
			if (t.push(...i), i.length < 1e3) break;
		}
		return t.map((e) => ({
			id: e.id,
			name: e.name,
			image: e.image || void 0,
			releaseText: e.release_text,
			releaseDate: e.release_date || null,
			url: e.url,
			price: N(e.price),
			originalPrice: N(e.original_price),
			discountPercent: e.discount_percent || 0,
			currency: e.currency || null,
			wishlistRank: N(e.wishlist_rank),
			platform: e.platform || "steam",
			titleKey: e.title_key || null
		}));
	} catch (e) {
		if (n) throw e;
		return [];
	}
}
var H = null;
function ee() {
	if (H && Date.now() - H.at < 10 * 6e4) return H.p;
	let e = k("library?select=*&best_score=gte.75&discount_percent=gt.0&order=discount_percent.desc,best_score.desc.nullslast&limit=30").then((e) => e.rows.map(I));
	return H = {
		at: Date.now(),
		p: e
	}, e.catch(() => {
		H = null;
	}), e;
}
var U = {
	steam: "Steam",
	xbox: "Xbox Store TR",
	switch: "Nintendo eShop (ABD)",
	epic: "Epic Games Store TR",
	gog: "GOG TR"
};
function W(e) {
	if (!e || !e.platform || e.platform === "playstation") return I(e);
	let t = I({
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
		region: P[e.platform] || "",
		sourceKind: "market",
		sourceLabel: U[e.platform] || e.platform,
		steamAppid: e.platform === "steam" ? N(e.store_id) : t.steamAppid
	};
}
async function G(e = "all", t = "", n = 0, r = !1, a = "default", o = {}) {
	return n === 0 ? i(t, e, () => K(e, t, n, r, a, o)) : K(e, t, n, r, a, o);
}
async function K(e, t, n, r, i, o) {
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
	let c = await fetch(T + "/rest/v1/rpc/" + (s.device ? "search_market_v2" : "search_market"), {
		method: "POST",
		headers: {
			apikey: E,
			Authorization: "Bearer " + E,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			market: e,
			query_text: a(t),
			page_number: n,
			page_size: D,
			deals_only: r,
			sort_order: i,
			filter_options: s
		}),
		signal: AbortSignal.timeout(2e4),
		credentials: "omit"
	});
	if (!c.ok) throw Error("Market araması HTTP " + c.status);
	let l = await c.json(), u = await M("market");
	return {
		platform: e,
		items: (l.items || []).map(W),
		total: l.total || 0,
		hasMore: (n + 1) * D < (l.total || 0),
		page: n,
		status: "ok",
		scheduled: !0,
		sourceKind: "market",
		sourceLabel: e === "all" ? "Tüm marketler" : U[e],
		checkedAt: u?.rows?.[0]?.value?.finishedAt,
		query: l.query,
		personalized: !!l.personalized
	};
}
var q = [
	"playstation",
	"steam",
	"xbox",
	"switch",
	"epic",
	"gog"
], te = (e) => e.titleKey || String(e.name || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
function ne(e, t, n = []) {
	let r = /* @__PURE__ */ new Set(), i = new Set(n), a = [], o = e.map((e) => [...e || []]);
	for (; a.length < t && o.some((e) => e.length);) for (let e of o) {
		let n;
		for (; (n = e.shift()) && (i.has(n.id) || r.has(te(n))););
		if (n && (r.add(te(n)), a.push(n), a.length >= t)) break;
	}
	return a;
}
var re = 10 * 6e4, ie = /* @__PURE__ */ new Map(), J = /* @__PURE__ */ new Map();
async function ae(e, t, n) {
	let r = "radar-mix:" + e + ":" + t + ":" + JSON.stringify(n), i = ie.get(r) || (() => {
		try {
			let e = JSON.parse(globalThis.sessionStorage?.getItem(r) || "null");
			return e && Array.isArray(e.items) ? e : null;
		} catch {
			return null;
		}
	})();
	if (i && Date.now() - i.at < re) return i.items;
	if (J.has(r)) return J.get(r);
	let a = (async () => {
		let i = (e === "playstation" ? await R("", 0, !1, t, n) : await G(e, "", 0, !1, t, n)).items, a = {
			at: Date.now(),
			items: i
		};
		ie.set(r, a);
		try {
			globalThis.sessionStorage?.setItem(r, JSON.stringify(a));
		} catch {}
		return i;
	})().finally(() => J.delete(r));
	return J.set(r, a), a;
}
async function Y(e = "score", t = {}, n = 8, r = {}) {
	let i = r.excludeIds || [], a = r.stores || q, o = r.keep || (() => !0), s = [];
	for (let n of a) s.push(await ae(n, e, t).then((e) => e.filter(o)).catch(() => []));
	return ne(s, n, i);
}
var oe = (e) => e.titleKey || String(e.name || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
function se(e, t = 10) {
	let n = /* @__PURE__ */ new Set(), r = [];
	for (let i of e || []) {
		if (!i || !i.name || !(i.heroUrl || i.image)) continue;
		let e = oe(i);
		if (!n.has(e) && (n.add(e), r.push(i), r.length >= t)) break;
	}
	return r;
}
var X = (e) => !!e && typeof e.price == "number" && e.price > 0 && e.discountPercent > 0 && typeof e.originalPrice == "number" && e.originalPrice > e.price, ce = (e = Date.now()) => new Date(e + 3 * 36e5).toISOString().slice(0, 10);
function le(e, t) {
	try {
		let n = JSON.parse(e || "null");
		return n && n.day === t && Array.isArray(n.ids) ? n.ids.filter((e) => typeof e == "string") : [];
	} catch {
		return [];
	}
}
var ue = (e, t) => JSON.stringify({
	day: t,
	ids: [...new Set(e)]
});
function de(e, t, n) {
	let r = e.card + n;
	if (r >= 0 && r < (t[e.story] ?? 0)) return {
		story: e.story,
		card: r
	};
	let i = e.story + n;
	for (; i >= 0 && i < t.length && t[i] === 0;) i += n;
	return i >= t.length ? null : i < 0 ? {
		story: e.story,
		card: 0
	} : {
		story: i,
		card: 0
	};
}
//#endregion
//#region lib/deal-time.mjs
var Z = 36e5, Q = 24 * Z;
6 * Z, 2 * Q;
var fe = (e) => new Date(e).toLocaleString("tr-TR", {
	timeZone: "Europe/Istanbul",
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit"
});
function pe(e) {
	if (e < 6e4) return "1 dakikadan az kaldı";
	let t = Math.floor(e / Q), n = Math.floor(e % Q / Z), r = Math.floor(e % Z / 6e4);
	return (t ? t + " gün" + (n ? " " + n + " saat" : "") : n ? n + " saat" + (r ? " " + r + " dk" : "") : r + " dk") + " kaldı";
}
var me = (e) => !!e && Number(e.originalPrice) > Number(e.price) && e.discountPercent > 0;
function he(e, t = Date.now()) {
	if (!me(e)) return null;
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
		at: fe(n),
		urgent: !1
	} : {
		known: !0,
		ended: !1,
		ms: r,
		text: pe(r),
		at: fe(n),
		urgent: r <= 2 * Q
	};
}
function ge(e, t = !1, n = Date.now(), r = !0) {
	let i = Date.parse(e || "");
	if (!Number.isFinite(i)) return null;
	let a = Math.max(0, Math.floor((n - i) / 6e4)), o = a < 1 ? "az önce" : a < 60 ? a + " dk önce" : a < 1440 ? Math.floor(a / 60) + " saat önce" : Math.floor(a / 1440) + " gün önce", s = t || n - i >= 864e5;
	return {
		old: s,
		text: s ? (r ? "Son bilinen fiyat · " : "Son kontrol · ") + o : o === "az önce" ? "Az önce kontrol edildi" : o + " kontrol edildi",
		title: "Kontrol: " + new Date(i).toLocaleString("tr-TR", {
			timeZone: "Europe/Istanbul",
			dateStyle: "medium",
			timeStyle: "short"
		})
	};
}
//#endregion
//#region app/design.ts
function _e(e, t, n) {
	let r = (r) => {
		let i = (r + e / 30) % 12;
		return n - t * Math.min(n, 1 - n) * Math.max(-1, Math.min(i - 3, 9 - i, 1));
	}, i = (e) => Math.round(e * 255).toString(16).padStart(2, "0");
	return "#" + i(r(0)) + i(r(8)) + i(r(4));
}
function ve(e) {
	let t = e?.accentColor || e?.accent;
	if (typeof t == "string" && /^#[0-9a-f]{6}$/i.test(t)) return t;
	let n = 0;
	for (let t of String(e?.name || "x")) n = (n * 31 + (t.codePointAt(0) || 0)) % 360;
	return _e(n, .7, .62);
}
var ye = (e) => ({
	"--lime": ve(e),
	"--limebg": ve(e) + "26"
}), be = (e, t = 1600) => e?.heroUrl ? e.heroUrl.replace(/\?.*$/, "") + "?w=" + t : e?.image ? String(e.image).replace(/\?.*$/, "") + "?w=" + Math.min(t, 1e3) : null, xe = {
	playstation: "PlayStation",
	steam: "Steam",
	xbox: "Xbox",
	switch: "Nintendo Switch",
	epic: "Epic Games",
	gog: "GOG"
}, Se = "radar-stories-seen", Ce = 6e3, we = 10 * 6e4, $ = /* @__PURE__ */ new Map();
function Te(e, t) {
	let n = $.get(e);
	if (n && Date.now() - n.at < we) return n.p;
	let r = t().then((e) => se(e));
	return $.set(e, {
		at: Date.now(),
		p: r
	}), r.catch(() => $.delete(e)), r;
}
function Ee() {
	try {
		let e = JSON.parse(sessionStorage.getItem("radar-deals-v1") || "null");
		if (e && Date.now() - e.at < we && e.items) return ne(Object.values(e.items).map((e) => (e || []).filter(X)), 30, []);
	} catch {}
	return [];
}
var De = () => typeof window < "u" && window.matchMedia("(prefers-reduced-motion:reduce)").matches, Oe = (e) => {
	let t = /* @__PURE__ */ new Date(e + "T12:00:00Z");
	return Number.isNaN(t.getTime()) ? e : t.toLocaleDateString("tr-TR", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "Europe/Istanbul"
	});
}, ke = (e) => e.scores?.metacritic ? ["Metacritic", e.scores.metacritic] : e.scores?.opencritic ? ["OpenCritic", e.scores.opencritic] : null, Ae = {
	percent: [
		["line", {
			x1: "19",
			x2: "5",
			y1: "5",
			y2: "19"
		}],
		["circle", {
			cx: "6.5",
			cy: "6.5",
			r: "2.5"
		}],
		["circle", {
			cx: "17.5",
			cy: "17.5",
			r: "2.5"
		}]
	],
	sparkles: [
		["path", { d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" }],
		["path", { d: "M20 2v4" }],
		["path", { d: "M22 4h-4" }],
		["circle", {
			cx: "4",
			cy: "20",
			r: "2"
		}]
	],
	star: [["path", { d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" }]],
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
	heart: [["path", { d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" }]],
	x: [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]],
	left: [["path", { d: "m15 18-6-6 6-6" }]],
	right: [["path", { d: "m9 18 6-6-6-6" }]],
	pause: [["rect", {
		x: "14",
		y: "3",
		width: "5",
		height: "18",
		rx: "1"
	}], ["rect", {
		x: "5",
		y: "3",
		width: "5",
		height: "18",
		rx: "1"
	}]],
	play: [["path", { d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" }]],
	refresh: [
		["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }],
		["path", { d: "M21 3v5h-5" }],
		["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }],
		["path", { d: "M8 16H3v5" }]
	],
	clock: [["circle", {
		cx: "12",
		cy: "12",
		r: "10"
	}], ["path", { d: "M12 6v6l4 2" }]]
};
function je(e, { useExperience: t, DisplayPrice: n, createPortal: r }) {
	let { useEffect: i, useMemo: a, useRef: o, useState: s } = e, u = e.createElement, f = (e) => function({ size: t = 16 }) {
		return u("svg", {
			width: t,
			height: t,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": !0
		}, ...Ae[e].map(([e, t], n) => u(e, {
			...t,
			key: n
		})));
	}, p = f("percent"), m = f("sparkles"), h = f("star"), g = f("calendar"), _ = f("heart"), v = f("x"), y = f("left"), b = f("right"), x = f("pause"), S = f("play"), C = f("refresh"), T = f("clock");
	function E() {
		let [e, t] = s(Date.now());
		return i(() => {
			let e = setInterval(() => t(Date.now()), 6e4);
			return () => clearInterval(e);
		}, []), e;
	}
	function D({ item: t }) {
		let n = he(t, E());
		return n ? /* @__PURE__ */ u("p", {
			className: "dealexpires" + (n.urgent ? " urgent" : "") + (n.ended ? " ended" : "") + (n.known ? "" : " unknown"),
			title: n.at ? "İndirim bitişi: " + n.at + " (TSİ)" : void 0
		}, /* @__PURE__ */ u(T, { size: 13 }), /* @__PURE__ */ u("span", null, n.known && !n.ended ? /* @__PURE__ */ u(e.Fragment, null, "İndirim: ", /* @__PURE__ */ u("b", null, n.text)) : n.text)) : null;
	}
	function O({ at: e }) {
		let t = ge(e, !1, E(), !0);
		return t ? /* @__PURE__ */ u("time", {
			className: "checkedat" + (t.old ? " stale" : ""),
			dateTime: new Date(Date.parse(e)).toISOString(),
			title: t.title
		}, t.text) : null;
	}
	function k() {
		let n = t(), f = (e) => n.open(e), v = c(n.state), y = l(v), b = v.genres.join("|") + "#" + v.tags.join("|"), x = a(() => {
			let e = [
				{
					id: "deals",
					title: "İndirimler",
					sub: "Bugünün en büyük indirimleri",
					Icon: p,
					load: async () => {
						let e = Ee();
						return e.length >= 4 ? e : (await ee()).filter(X);
					}
				},
				{
					id: "new",
					title: "Yeni eklenenler",
					sub: "Mağazalara yeni gelenler",
					Icon: m,
					load: async () => (await G("all", "", 0, !1, "default", {})).items
				},
				{
					id: "top",
					title: "Yüksek puan",
					sub: "Puanı 80 ve üzeri",
					Icon: h,
					load: () => Y("score", { minScore: 80 }, 20)
				},
				{
					id: "soon",
					title: "Yakında",
					sub: "Çıkışı yaklaşan oyunlar",
					Icon: g,
					load: () => V(30)
				}
			];
			return y && e.splice(1, 0, {
				id: "foryou",
				title: "Sana göre",
				sub: "Oyuncu tarzına uyanlar",
				Icon: _,
				load: () => Y("foryou", {
					minScore: 75,
					preferGenres: v.genres,
					preferTags: v.tags
				}, 40, { keep: (e) => d(e, v) })
			}), e;
		}, [y, b]), [S, C] = s(null), [w, T] = s([]), E = o(null), D = o(null);
		i(() => {
			try {
				T(le(localStorage.getItem(Se), ce()));
			} catch {}
		}, []), i(() => {
			if (S === null) return;
			let e = () => {
				if (history.state?.radarStory) return;
				C(null);
				let e = D.current;
				D.current = null, e ? setTimeout(e, 0) : E.current?.focus();
			};
			return window.addEventListener("popstate", e), () => window.removeEventListener("popstate", e);
		}, [S]);
		function O(e, t) {
			E.current = t, history.pushState({
				...history.state,
				radarStory: !0
			}, ""), C(e);
		}
		let k = () => {
			history.state?.radarStory ? history.back() : C(null);
		};
		return /* @__PURE__ */ u(e.Fragment, null, /* @__PURE__ */ u("div", {
			className: "story-strip",
			role: "group",
			"aria-label": "Hikâyeler"
		}, /* @__PURE__ */ u("ul", null, x.map((e, t) => /* @__PURE__ */ u("li", { key: e.id }, /* @__PURE__ */ u("button", {
			type: "button",
			className: "story-ring s-" + e.id + (w.includes(e.id) ? " seen" : ""),
			onClick: (e) => O(t, e.currentTarget),
			title: e.sub
		}, /* @__PURE__ */ u("span", { className: "story-avatar" }, /* @__PURE__ */ u("b", null, /* @__PURE__ */ u(e.Icon, { size: 24 }))), /* @__PURE__ */ u("span", { className: "story-name" }, e.title)))))), S !== null && r(/* @__PURE__ */ u(A, {
			stories: x,
			start: S,
			tasteKey: b,
			onClose: k,
			onSeen: (e) => T((t) => {
				if (t.includes(e)) return t;
				let n = [...t, e];
				try {
					localStorage.setItem(Se, ue(n, ce()));
				} catch {}
				return n;
			}),
			onLeave: (e) => {
				D.current = e, k();
			},
			onOpen: f
		}), document.body));
	}
	function A({ stories: e, start: t, tasteKey: n, onClose: r, onSeen: c, onLeave: l, onOpen: d }) {
		let [f, p] = s({
			story: t,
			card: 0
		}), [m, h] = s({}), [g, _] = s(!1), [w, T] = s(!1), [E, D] = s(!1), [O, k] = s(0), [A, M] = s(0), N = a(De, []), P = o(null), F = o(null), I = o(null), L = e[f.story], R = m[L.id], z = Array.isArray(R) ? R : null, B = e.map((e) => {
			let t = m[e.id];
			return Array.isArray(t) ? t.length : t === "error" ? 0 : void 0;
		}), V = (e) => {
			let t = de(f, B, e);
			t ? p(t) : r();
		}, H = o(V);
		H.current = V, i(() => {
			c(L.id), !Array.isArray(m[L.id]) && Te(L.id === "foryou" ? "foryou:" + n : L.id, L.load).then((e) => h((t) => ({
				...t,
				[L.id]: e
			})), () => h((e) => ({
				...e,
				[L.id]: "error"
			})));
		}, [L.id, A]), i(() => {
			P.current?.focus(), document.body.classList.add("story-open");
			let e = () => D(document.hidden);
			return document.addEventListener("visibilitychange", e), () => {
				document.body.classList.remove("story-open"), document.removeEventListener("visibilitychange", e);
			};
		}, []), i(() => {
			let e = (e) => {
				e.key === "Escape" ? (e.stopPropagation(), r()) : e.key === "ArrowRight" ? H.current(1) : e.key === "ArrowLeft" ? H.current(-1) : e.key === " " && !e.target?.closest("button,a") && (e.preventDefault(), _((e) => !e));
			};
			return window.addEventListener("keydown", e, !0), () => window.removeEventListener("keydown", e, !0);
		}, [r]);
		let ee = (e) => !!e?.closest?.("a,button");
		function U(e) {
			e.button !== 0 || ee(e.target) || (F.current = {
				x: e.clientX,
				y: e.clientY,
				t: Date.now(),
				id: e.pointerId
			}, I.current = setTimeout(() => T(!0), 250));
		}
		function W(e) {
			let t = F.current;
			if (!t || t.id !== e.pointerId) return;
			let n = e.clientX - t.x;
			Math.abs(n) > 8 && (clearTimeout(I.current), k(n));
		}
		function G(e) {
			let t = F.current;
			clearTimeout(I.current), F.current = null, k(0);
			let n = w;
			if (T(!1), !t || t.id !== e.pointerId) return;
			let i = e.clientX - t.x, a = e.clientY - t.y;
			if (a > 90 && Math.abs(a) > Math.abs(i)) {
				r();
				return;
			}
			if (Math.abs(i) > 50 && Math.abs(i) > Math.abs(a)) {
				V(i < 0 ? 1 : -1);
				return;
			}
			if (n || Date.now() - t.t > 500 || Math.abs(i) > 8 || Math.abs(a) > 8) return;
			let o = e.currentTarget.getBoundingClientRect();
			V(e.clientX - o.left < o.width * .3 ? -1 : 1);
		}
		let K = () => {
			clearTimeout(I.current), F.current = null, k(0), T(!1);
		}, q = !!z && z.length > 0 && !g && !w && !E && !N;
		return /* @__PURE__ */ u("div", {
			className: "story-overlay",
			onClick: (e) => {
				e.target === e.currentTarget && r();
			}
		}, /* @__PURE__ */ u("button", {
			type: "button",
			className: "story-nav prev",
			"aria-label": "Önceki",
			onClick: () => V(-1)
		}, /* @__PURE__ */ u(y, { size: 26 })), /* @__PURE__ */ u("section", {
			className: "story-viewer",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": L.title,
			style: z?.[f.card] ? ye(z[f.card]) : void 0
		}, /* @__PURE__ */ u("div", {
			className: "story-progress",
			"aria-hidden": "true"
		}, (z && z.length ? z : [null]).map((e, t) => /* @__PURE__ */ u("span", {
			key: L.id + ":" + t,
			className: t < f.card ? "done" : ""
		}, t === f.card && z && z.length > 0 && /* @__PURE__ */ u("i", {
			key: L.id + ":" + f.card,
			className: N ? "still" : "",
			style: {
				animationDuration: Ce + "ms",
				animationPlayState: q ? "running" : "paused"
			},
			onAnimationEnd: () => {
				N || V(1);
			}
		})))), /* @__PURE__ */ u("div", { className: "story-head" }, /* @__PURE__ */ u("span", { className: "story-avatar small s-" + L.id }, /* @__PURE__ */ u(L.Icon, { size: 16 })), /* @__PURE__ */ u("div", null, /* @__PURE__ */ u("strong", null, L.title), /* @__PURE__ */ u("small", null, L.sub)), z && z.length > 0 && /* @__PURE__ */ u("span", { className: "story-count" }, f.card + 1, " / ", z.length), !N && /* @__PURE__ */ u("button", {
			type: "button",
			className: "story-icon",
			"aria-label": g ? "Devam et" : "Duraklat",
			onClick: () => _((e) => !e)
		}, u(g ? S : x, { size: 18 })), /* @__PURE__ */ u("button", {
			ref: P,
			type: "button",
			className: "story-icon",
			"aria-label": "Kapat",
			onClick: r
		}, /* @__PURE__ */ u(v, { size: 20 }))), /* @__PURE__ */ u("div", {
			className: "story-stage",
			onPointerDown: U,
			onPointerMove: W,
			onPointerUp: G,
			onPointerCancel: K,
			onPointerLeave: (e) => {
				F.current && G(e);
			}
		}, R === void 0 ? /* @__PURE__ */ u("div", { className: "story-empty" }, /* @__PURE__ */ u("span", {
			className: "story-spin",
			"aria-hidden": "true"
		}), /* @__PURE__ */ u("p", null, "Hikâye yükleniyor…")) : R === "error" ? /* @__PURE__ */ u("div", { className: "story-empty" }, /* @__PURE__ */ u("p", null, "Bu vitrin şu an okunamadı."), /* @__PURE__ */ u("button", {
			type: "button",
			className: "ghostbtn",
			onClick: () => {
				h((e) => {
					let t = { ...e };
					return delete t[L.id], t;
				}), M((e) => e + 1);
			}
		}, /* @__PURE__ */ u(C, { size: 15 }), "Tekrar dene")) : z.length ? /* @__PURE__ */ u("div", {
			key: L.id,
			className: "story-track",
			style: {
				transform: `translateX(calc(${-f.card * 100}% + ${O}px))`,
				transition: O ? "none" : void 0
			}
		}, z.map((e, t) => /* @__PURE__ */ u(j, {
			key: e.id || t,
			x: e,
			kind: L.id,
			near: Math.abs(t - f.card) <= 1,
			current: t === f.card,
			onLeave: l,
			onOpen: d
		}))) : /* @__PURE__ */ u("div", { className: "story-empty" }, /* @__PURE__ */ u("p", null, "Bu vitrinde şu an oyun yok.")))), /* @__PURE__ */ u("button", {
			type: "button",
			className: "story-nav next",
			"aria-label": "Sonraki",
			onClick: () => V(1)
		}, /* @__PURE__ */ u(b, { size: 26 })));
	}
	function j({ x: e, kind: t, near: r, current: i, onLeave: a, onOpen: o }) {
		let s = r ? be(e, 1e3) : null, c = X(e), l = ke(e), d = xe[e.platform] || "";
		return /* @__PURE__ */ u("article", {
			className: "story-card",
			"aria-hidden": !i,
			inert: i ? void 0 : !0
		}, s && /* @__PURE__ */ u("img", {
			className: "story-bg",
			src: s,
			alt: "",
			"aria-hidden": "true"
		}), /* @__PURE__ */ u("div", { className: "story-cover" }, s && /* @__PURE__ */ u("img", {
			src: s,
			alt: e.name
		})), /* @__PURE__ */ u("div", { className: "story-info" }, d && /* @__PURE__ */ u("span", { className: "story-store" }, /* @__PURE__ */ u("i", { className: "dot " + e.platform }), d), /* @__PURE__ */ u("h3", null, e.name), t === "soon" && (e.releaseText || e.releaseDate) && /* @__PURE__ */ u("p", { className: "story-date" }, /* @__PURE__ */ u(g, { size: 15 }), e.releaseText || Oe(e.releaseDate)), /* @__PURE__ */ u("div", { className: "story-price" }, c && /* @__PURE__ */ u("span", { className: "story-off" }, `%${e.discountPercent} indirim`), typeof e.price == "number" && /* @__PURE__ */ u("strong", null, /* @__PURE__ */ u(n, {
			value: e.price,
			currency: e.currency || "TRY"
		})), c && /* @__PURE__ */ u("del", null, w(e.originalPrice, e.currency || "TRY")), l && /* @__PURE__ */ u("span", { className: "story-score" }, l[0], " ", l[1])), c && t !== "soon" && /* @__PURE__ */ u(D, { item: e }), e.checkedAt && /* @__PURE__ */ u(O, { at: e.checkedAt }), /* @__PURE__ */ u("div", { className: "story-actions" }, t === "soon" ? /* @__PURE__ */ u("button", {
			type: "button",
			className: "primary",
			onClick: () => a(() => window.dispatchEvent(new CustomEvent("radar:navigate", { detail: "calendar" })))
		}, "Takvimde gör") : /* @__PURE__ */ u("button", {
			type: "button",
			className: "primary",
			onClick: () => a(() => o(e))
		}, "Ayrıntıları gör"), e.url && /* @__PURE__ */ u("a", {
			className: "ghostbtn",
			href: e.url,
			target: "_blank",
			rel: "noreferrer"
		}, "Mağazada aç"))));
	}
	return k;
}
//#endregion
export { je as createStoryStrip };
