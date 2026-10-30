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
var e = (e) => Math.min(99, 1 + Math.floor(Math.sqrt(Math.max(0, e) / 25))), t = (e) => Object.values(e.visited || {}), n = (e) => new Date(e + 108e5), r = (e, r) => t(e).filter((e) => e.at && r(n(e.at))).length, i = (e) => (n) => t(n).filter((t) => (t.genres || []).some((t) => e.test(t))).length, a = (e) => (t) => (t.events || []).filter((t) => t.startsWith(e)).length, o = (e) => (t, n) => n.filter((t) => t.status === e).length, s = (e) => (t) => Object.values(t.gameNotes || {}).filter((t) => t && t[e]).length, c = (e) => Object.values(e.hours || {}).filter((e) => e > 0), l = {
	c: "common",
	r: "rare",
	e: "epic",
	l: "legendary"
}, u = (e, t, n, r, i, a) => a.map(([a, o, s]) => ({
	id: n + "-" + a,
	cat: e,
	icon: t,
	goal: a,
	name: o,
	desc: r.replace("{n}", a),
	tier: l[s],
	have: i
})), d = (e, t, n, r, a) => u("genre", n, "genre-" + e, "{n} " + a + " oyun dosyası aç.", i(t), r);
[
	...u("explore", "compass", "visit", "{n} farklı oyun dosyası aç.", (e) => t(e).length, [
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
	...u("explore", "palette", "genres", "{n} farklı türde oyun dosyası aç.", (e) => new Set(t(e).flatMap((e) => e.genres || [])).size, [
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
	...u("explore", "eye-off", "dismiss", "{n} oyunu \"ilgilenmiyorum\" diye geç.", (e) => e.dismissed.length, [
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
	...u("explore", "moon", "night", "Gece 00.00 ile 05.00 arasında {n} oyun dosyası aç.", (e) => r(e, (e) => e.getUTCHours() < 5), [[
		1,
		"Gece Kuşu",
		"r"
	], [
		10,
		"Gece Bekçisi",
		"e"
	]]),
	...u("explore", "zap", "marathon", "Tek günde {n} oyun dosyası aç.", (e) => Math.max(0, ...Object.values(t(e).reduce((e, t) => {
		if (t.at) {
			let r = n(t.at).toISOString().slice(0, 10);
			e[r] = (e[r] || 0) + 1;
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
	...u("streak", "flame", "streak", "{n} gün üst üste uğra.", (e) => Math.max(e.bestStreak || 0, e.streak), [
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
	...u("streak", "calendar-check", "days", "Toplam {n} farklı gün uğra.", (e) => Math.max(e.daysVisited || 0, e.bestStreak || 0, e.streak), [
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
	...u("collection", "heart", "fav", "{n} oyunu favorilere ekle.", (e, t) => t.length, [
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
	...u("collection", "heart-handshake", "like", "Toplam {n} kez favoriye kalp bırak.", a("like:"), [
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
	...u("collection", "sparkles", "wish", "İstek listende {n} oyun biriktir.", o("wish"), [
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
	...u("collection", "gamepad", "playing", "Aynı anda {n} oyunu \"oynuyorum\" olarak işaretle.", o("playing"), [
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
	...u("collection", "crown", "top10", "Top 10 rafına {n} oyun koy.", (e) => e.top10.length, [
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
	...u("play", "check", "done", "{n} oyunu bitir.", o("done"), [
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
	...u("play", "hourglass", "hours", "Oyunlarına toplam {n} saat kaydet.", (e) => Math.floor(c(e).reduce((e, t) => e + t, 0)), [
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
	...u("play", "timer", "one-game", "Tek bir oyuna {n} saat kaydet.", (e) => Math.floor(Math.max(0, ...c(e))), [
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
	...u("play", "rocket", "hype", "{n} oyuna heyecan puanı ver.", (e) => Object.values(e.hype || {}).filter((e) => e > 0).length, [
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
	...u("play", "cake", "anniversary", "{n} oyun yıl dönümü kaydet.", (e) => e.anniversaries.length, [[
		1,
		"Yıl Dönümü",
		"r"
	], [
		5,
		"Anı Defteri",
		"e"
	]]),
	...d("action", /aksiyon|action/i, "swords", [
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
	...d("adventure", /macera|adventure/i, "map", [
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
	...d("rpg", /^rpg$|rol yapma|role-playing/i, "dragon", [
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
	...d("strategy", /strateji|strategy/i, "brain", [
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
	...d("sim", /simülasyon|simulation/i, "cpu", [
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
	...d("sports", /^spor|sports?/i, "trophy", [
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
	...d("racing", /yarış|racing/i, "car", [
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
	...d("indie", /bağımsız|indie/i, "sparkles", [
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
	...d("casual", /rahat|casual/i, "leaf", [
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
	...d("mmo", /mmo|massively/i, "users", [
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
	...d("horror", /korku|horror/i, "ghost", [
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
	...d("platformer", /platform/i, "footprints", [
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
	...d("puzzle", /bulmaca|puzzle/i, "puzzle", [
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
	...d("shooter", /nişancı|shooter|fps/i, "crosshair", [
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
	...d("fighting", /dövüş|fighting/i, "fist", [
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
	...d("roguelike", /rogue/i, "dices", [
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
	...u("genre", "ghost", "horror-fav", "{n} korku oyununu favorilere ekle.", (e, t) => t.filter((e) => (e.genres || []).some((e) => /korku|horror/i.test(e))).length, [[
		10,
		"Korkusuz",
		"e"
	]]),
	...u("writing", "pen", "review", "{n} oyun için toplulukta inceleme paylaş.", a("review:"), [
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
	...u("writing", "notebook", "journal", "{n} farklı oyuna günlük notu yaz.", (e) => Object.values(e.journal || {}).filter((e) => e.length).length, [
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
	...u("writing", "scroll", "entries", "Günlüğüne toplam {n} not yaz.", (e) => Object.values(e.journal || {}).reduce((e, t) => e + t.length, 0), [
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
	...u("writing", "newspaper", "read", "{n} haber ya da yazı oku.", a("read:"), [
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
	...u("writing", "tag", "tags", "{n} oyuna etiket ekle.", (e) => Object.values(e.tags || {}).filter((e) => e.length).length, [
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
	...u("writing", "pin", "pins", "Bir oyun haritasına {n} işaret koy.", (e) => Math.max(0, ...Object.values(e.gameNotes || {}).map((e) => e.mapPins?.length || 0)), [
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
	...u("writing", "map", "maps", "{n} oyuna dünya haritası ekle.", s("mapUrl"), [[
		1,
		"Harita Yükleyen",
		"c"
	], [
		5,
		"Atlas Sahibi",
		"r"
	]]),
	...u("price", "bell", "alerts", "{n} fiyat alarmın çalsın.", (e) => e.seenAlerts.length, [
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
	...u("price", "target", "target", "{n} favoriye hedef fiyat koy.", (e, t) => t.filter((e) => Number.isFinite(e.target)).length, [
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
	...u("price", "store", "platforms", "{n} farklı mağazayı gez.", (e) => Object.values(e.platformVisits || {}).filter((e) => e > 0).length, [
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
	...u("price", "coins", "currency", "Fiyatları başka para biriminde göster.", (e) => e.currency === "TRY" ? 0 : 1, [[
		1,
		"Döviz Gözlüğü",
		"c"
	]]),
	...u("level", "star", "level", "{n}. seviyeye ulaş.", (t) => e(t.xp), [
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
	...u("level", "shirt", "avatars", "Avatar dükkânında {n} avatarın olsun.", (e) => e.unlocked.length, [
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
	...u("personal", "user", "name", "Oyuncu adını yaz.", (e) => +!!e.name, [[
		1,
		"Adını Koydun",
		"c"
	]]),
	...u("personal", "library", "shelf-name", "Oyun rafına bir ad ver.", (e) => +!!e.collectionName, [[
		1,
		"Raf Sahibi",
		"c"
	]]),
	...u("personal", "map-pin", "city", "Şehrini ekle.", (e) => +!!e.city, [[
		1,
		"Memleket",
		"c"
	]]),
	...u("personal", "heart", "pref-genre", "Sevdiğin türü seç.", (e) => +!!e.preferredGenre, [[
		1,
		"Tür Tercihi",
		"c"
	]]),
	...u("personal", "fingerprint", "persona", "{n} oyuncu kişiliği seç.", (e) => e.personas.length, [[
		1,
		"Oyuncu Kişiliği",
		"c"
	], [
		3,
		"Çok Yüzlü",
		"r"
	]]),
	...u("personal", "eye", "color", "Renk görme modunu ayarla.", (e) => e.colorMode === "default" ? 0 : 1, [[
		1,
		"Renk Ayarı",
		"c"
	]]),
	...u("personal", "leaf", "zen", "Zen görünümünü aç.", (e) => +!!e.zen, [[
		1,
		"Zen Modu",
		"c"
	]]),
	...u("personal", "joystick", "retro", "Retro görünümü aç.", (e) => +!!e.retro, [[
		1,
		"Retro Ruh",
		"r"
	]])
];
//#endregion
//#region lib/ps-supabase.mjs
var f = "https://dsosckshigzijnsxmlwh.supabase.co", p = "sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO", m = (e) => String(e || "").replace(/[™®©]/g, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/\s+/g, " ").trim();
async function h(e, t) {
	let n = await fetch(f + "/rest/v1/" + e, {
		headers: {
			apikey: p,
			Authorization: "Bearer " + p,
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
var g = (e) => e == null ? null : Number(e), _ = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
async function v(e = 12, t = !0, n = !1) {
	let r = new URLSearchParams({
		select: "*",
		limit: String(Math.min(e, 1e3)),
		order: "release_date.asc.nullslast,name.asc"
	});
	t ? r.set("release_date", "gte." + _()) : r.set("or", "(release_date.gte." + (/* @__PURE__ */ new Date(Date.parse(_()) - 6 * 864e5)).toISOString().slice(0, 10) + ",release_date.is.null)");
	try {
		let t = [];
		for (let n = 0; n < e; n += 1e3) {
			r.set("offset", String(n)), r.set("limit", String(Math.min(1e3, e - n)));
			let i = (await h("upcoming_games?" + r)).rows;
			if (t.push(...i), i.length < 1e3) break;
		}
		return t.map((e) => ({
			id: e.id,
			name: e.name,
			image: e.image || void 0,
			releaseText: e.release_text,
			releaseDate: e.release_date || null,
			url: e.url,
			price: g(e.price),
			originalPrice: g(e.original_price),
			discountPercent: e.discount_percent || 0,
			currency: e.currency || null,
			wishlistRank: g(e.wishlist_rank),
			platform: e.platform || "steam",
			titleKey: e.title_key || null
		}));
	} catch (e) {
		if (n) throw e;
		return [];
	}
}
//#endregion
//#region lib/calendar.mjs
function y(e) {
	return m(String(e || "").replace(/[™®©]/g, "").replace(/\(?\s*PS\s?[45]\s*(?:ve|and|und|&|\/|\+|,)?\s*(?:PS\s?[45])?\s*\)?/gi, " ").replace(/\s+/g, " ").trim()).replace(/[^a-z0-9]+/g, " ").replace(/\b(standard|standart|edition|surum|digital|dijital)\b/g, " ").replace(/\s+/g, " ").trim();
}
var b = /\b(demo|playtest|soundtrack|ost|artbook|wallpapers?|prologue|season pass|expansion pack|dlc)\b|\((?:audio files|images)\)|\bpack$/i, x = (e) => b.test(String(e || "")), S = {
	steam: "Steam",
	playstation: "PlayStation",
	xbox: "Xbox",
	switch: "Switch",
	epic: "Epic Games",
	gog: "GOG"
};
function C(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		let e = n.titleKey || y(n.name) || n.id;
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
var w = (e) => (e.platform || "steam") === "steam" && /^\d+$/.test(String(e.id)) ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${e.id}/header.jpg` : e.image || null, T = (e = Date.now()) => new Date(e + 3 * 36e5).toISOString().slice(0, 10);
function E(e, t = "today", n = T()) {
	let r = Date.parse(n + "T00:00:00Z"), i = (new Date(r).getUTCDay() + 6) % 7, a = (/* @__PURE__ */ new Date(r - i * 864e5)).toISOString().slice(0, 10), o = new Date(r + (6 - i) * 864e5).toISOString().slice(0, 10), s = (e) => e && (t === "today" ? e === n : t === "week" ? e >= a && e <= o : e > n);
	return e.filter((e) => !x(e.name)).flatMap((e) => {
		let t = (e.rows || [e]).filter((e) => s(e.releaseDate));
		return t.length ? [{
			...e,
			releaseRows: t,
			releaseDate: t.map((e) => e.releaseDate).sort()[0]
		}] : [];
	}).sort((e, t) => e.releaseDate.localeCompare(t.releaseDate) || (e.wishlistRank ?? 1e9) - (t.wishlistRank ?? 1e9) || e.name.localeCompare(t.name));
}
//#endregion
//#region lib/countdown.mjs
var D = 864e5, O = /^\d{4}-\d{2}-\d{2}$/, k = (e) => O.test(String(e || "")) ? Date.parse(e + "T00:00:00+03:00") : NaN, A = (e = Date.now()) => new Date(e + 3 * 36e5).toISOString().slice(0, 10), j = (e, t) => new Date(Date.parse(e + "T00:00:00Z") + t * D).toISOString().slice(0, 10);
function M(e, t = Date.now()) {
	let n = k(e) - t;
	if (!Number.isFinite(n)) return null;
	if (n <= 0) return {
		ms: 0,
		d: 0,
		h: 0,
		m: 0,
		s: 0,
		out: !0
	};
	let r = Math.floor(n / 1e3);
	return {
		ms: n,
		d: Math.floor(r / 86400),
		h: Math.floor(r % 86400 / 3600),
		m: Math.floor(r % 3600 / 60),
		s: r % 60,
		out: !1
	};
}
var N = (e) => typeof e == "string" && /^https:\/\//.test(e) ? e.slice(0, 2e3) : null;
function P(e) {
	let t = String(e?.key || e?.id || "").slice(0, 180), n = typeof e?.name == "string" ? e.name.slice(0, 180) : "";
	return !t || !n ? null : {
		id: t,
		name: n,
		image: N(e.image),
		url: N(e.url),
		releaseDate: O.test(String(e.releaseDate || "")) ? e.releaseDate : null,
		releaseText: typeof e.releaseText == "string" ? e.releaseText.slice(0, 60) : null
	};
}
function F(e, t = A()) {
	let n = j(t, -30), r = /* @__PURE__ */ new Set();
	return (Array.isArray(e) ? e : []).map(P).filter((e) => e && !r.has(e.id) && r.add(e.id) && (!e.releaseDate || e.releaseDate >= n)).slice(-40);
}
var I = (e, t) => {
	let n = String(t?.key || t?.id || "");
	return !!n && (e || []).some((e) => e.id === n);
};
function L(e, t) {
	let n = P(t);
	return n ? I(e, t) ? e.filter((e) => e.id !== n.id) : [...e || [], n].slice(-40) : e || [];
}
function R(e, t = A()) {
	return [...(e || []).filter((e) => e.releaseDate && e.releaseDate >= t).sort((e, t) => e.releaseDate.localeCompare(t.releaseDate) || e.name.localeCompare(t.name, "tr")), ...(e || []).filter((e) => !e.releaseDate)];
}
function z(e, t, n = A()) {
	let r = j(n, 1), i = [];
	for (let a of e || []) {
		let e = a.releaseDate === n ? "today" : a.releaseDate === r ? "tomorrow" : null;
		if (!e) continue;
		let o = "release:" + e + ":" + a.id + ":" + a.releaseDate;
		t.has(o) || i.push({
			key: o,
			id: a.id,
			name: a.name,
			kind: e,
			url: a.url
		});
	}
	return i.sort((e, t) => e.kind === t.kind ? 0 : e.kind === "today" ? -1 : 1);
}
function B(e, t) {
	let n = new Map((t || []).map((e) => [e.key, e])), r = [];
	for (let t of e || []) {
		let e = n.get(t.id);
		e && e.releaseDate && e.releaseDate !== t.releaseDate && r.push({
			id: t.id,
			name: t.name,
			from: t.releaseDate,
			to: e.releaseDate,
			releaseText: e.releaseText || null
		});
	}
	return r;
}
function V(e, t = A()) {
	return (e || []).filter((e) => e.releaseDate && e.releaseDate >= t && e.wishlistRank != null).sort((e, t) => e.wishlistRank - t.wishlistRank).slice(0, 6).sort((e, t) => e.releaseDate.localeCompare(t.releaseDate))[0] || null;
}
var H = (e) => String(e || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"), U = (e) => {
	let t = [], n = "";
	for (let r of e) new TextEncoder().encode(n + r).length > 73 ? (t.push(n), n = " " + r) : n += r;
	return t.push(n), t.join("\r\n");
};
function W(e, t = "tr", n = Date.now()) {
	if (!e?.releaseDate || !O.test(e.releaseDate)) return null;
	let r = e.releaseDate.replace(/-/g, ""), i = j(e.releaseDate, 1).replace(/-/g, ""), a = new Date(n).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z"), o = t === "en", s = o ? e.name + " releases" : e.name + " çıkıyor", c = o ? "Release reminder from Oyun Radarı" : "Oyun Radarı çıkış hatırlatması", l = (e, t) => [
		"BEGIN:VALARM",
		"ACTION:DISPLAY",
		"TRIGGER:" + e,
		"DESCRIPTION:" + H(t),
		"END:VALARM"
	];
	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Oyun Radari//Cikis Takvimi//TR",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		"UID:" + H(e.id).replace(/\s+/g, "-") + "-" + r + "@oyun-radari",
		"DTSTAMP:" + a,
		"DTSTART;VALUE=DATE:" + r,
		"DTEND;VALUE=DATE:" + i,
		"SUMMARY:" + H(s),
		"DESCRIPTION:" + H(c + (e.url ? "\n" + e.url : "")),
		...e.url ? ["URL:" + e.url] : [],
		"TRANSP:TRANSPARENT",
		...l("-PT15H", o ? e.name + " releases tomorrow" : e.name + " yarın çıkıyor"),
		...l("PT10H", o ? e.name + " is out today" : e.name + " bugün çıktı"),
		"END:VEVENT",
		"END:VCALENDAR"
	].map(U).join("\r\n") + "\r\n";
}
//#endregion
//#region app/ReleaseStrip.tsx
function G(e, { useExperience: t, useFavorites: n }) {
	let { useState: r, useEffect: i } = e, a = e.createElement, o = null, s = () => o ||= v(3e3, !1, !0).then(C).catch((e) => {
		throw o = null, e;
	}), c = (e, t) => e === 0 ? "Ücretsiz" : new Intl.NumberFormat("tr-TR", {
		style: "currency",
		currency: t,
		maximumFractionDigits: 2
	}).format(e);
	function l() {
		let [e, t] = r(Date.now());
		return i(() => {
			let e = setInterval(() => t(Date.now()), 6e4);
			return () => clearInterval(e);
		}, []), e;
	}
	function u({ g: e }) {
		let [t, n] = r(w(e));
		return t ? /* @__PURE__ */ a("img", {
			src: t,
			alt: "",
			loading: "lazy",
			onError: () => n(t !== e.image && e.image ? e.image : null)
		}) : /* @__PURE__ */ a("span", { className: "up-ph" }, e.name.slice(0, 1));
	}
	function d({ active: e, onClick: t, name: n }) {
		return /* @__PURE__ */ a("button", {
			type: "button",
			className: "heart" + (e ? " on" : ""),
			"aria-pressed": e,
			"aria-label": (e ? "Favorilerden çıkar: " : "Favorilere ekle: ") + n,
			onClick: t
		}, e ? "♥" : "♡");
	}
	function f() {
		let e = () => typeof document < "u" && document.documentElement.lang === "en" ? "en" : "tr", [t, n] = r(e);
		return i(() => {
			let t = () => n(e());
			return window.addEventListener("radar:lang", t), () => window.removeEventListener("radar:lang", t);
		}, []), t;
	}
	function p(e) {
		let [t, n] = r(Date.now());
		return i(() => {
			if (!e) return;
			let t = setInterval(() => n(Date.now()), 1e3);
			return () => clearInterval(t);
		}, [e]), t;
	}
	let m = ({ on: e }) => /* @__PURE__ */ a("svg", {
		viewBox: "0 0 24 24",
		width: "17",
		height: "17",
		"aria-hidden": "true",
		fill: e ? "currentColor" : "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round"
	}, /* @__PURE__ */ a("path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }), /* @__PURE__ */ a("path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" })), h = (e, t) => (/* @__PURE__ */ new Date(e + "T12:00:00")).toLocaleDateString(t === "en" ? "en-GB" : "tr-TR", {
		day: "numeric",
		month: "long",
		year: "numeric"
	});
	function g(e, t) {
		let n = W(e, t);
		if (!n) return;
		let r = URL.createObjectURL(new Blob([n], { type: "text/calendar;charset=utf-8" })), i = document.createElement("a");
		i.href = r, i.download = (e.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "oyun") + ".ics", document.body.appendChild(i), i.click(), i.remove(), setTimeout(() => URL.revokeObjectURL(r), 1e3);
	}
	function _() {
		let e = t(), n = f(), r = F(e.state?.releaseWatch);
		return {
			list: r,
			toggle: (t) => {
				let i = !I(r, t);
				e.patch((e) => ({
					...e,
					releaseWatch: L(F(e.releaseWatch), t)
				}));
				let a = typeof Notification < "u" ? Notification.permission : "denied", o = n === "en";
				i ? a === "default" ? e.notify(o ? "Countdown started. We will remind you on release day." : "Geri sayım başladı. Çıkış günü hatırlatırız.", () => Notification.requestPermission(), o ? "Allow notifications" : "Bildirime izin ver") : e.notify(o ? "Countdown started. We will remind you on release day." : "Geri sayım başladı. Çıkış günü hatırlatırız.") : e.notify(o ? t.name + " removed from your countdown." : t.name + " geri sayımdan çıkarıldı.");
			},
			lang: n,
			exp: e
		};
	}
	function y(e, t) {
		let { list: n, lang: r, exp: a } = _(), o = n.map((e) => e.id + ":" + e.releaseDate).join("|");
		i(() => {
			if (!a.loaded || !n.length) return;
			let i = setTimeout(() => {
				let i = r === "en", o = e ? B(n, e.filter((e) => e.releaseDate && e.releaseDate >= t).map((e) => ({
					key: e.key,
					releaseDate: e.releaseDate,
					releaseText: e.releaseText
				}))) : [], s = z(n, new Set(a.state.seenAlerts || []), t);
				if (!o.length && !s.length) return;
				let c = new Map(o.map((e) => [e.id, e]));
				a.patch((e) => ({
					...e,
					releaseWatch: F(e.releaseWatch).map((e) => c.has(e.id) ? {
						...e,
						releaseDate: c.get(e.id).to,
						releaseText: c.get(e.id).releaseText || e.releaseText
					} : e),
					seenAlerts: [...new Set([...e.seenAlerts || [], ...s.map((e) => e.key)])].slice(-2e3)
				}));
				let l = s.length ? s[0].kind === "today" ? i ? s[0].name + " is out today!" : s[0].name + " bugün çıktı!" : i ? s[0].name + " releases tomorrow." : s[0].name + " yarın çıkıyor." : i ? o[0].name + " has a new release date: " + h(o[0].to, "en") : o[0].name + " için çıkış tarihi değişti: " + h(o[0].to, "tr");
				if (a.notify(l), s.length && typeof Notification < "u" && Notification.permission === "granted") try {
					new Notification(l, {
						body: i ? "Oyun Radarı release reminder" : "Oyun Radarı çıkış hatırlatması",
						tag: s[0].key
					});
				} catch {}
			}, 1500);
			return () => clearTimeout(i);
		}, [
			a.loaded,
			o,
			e,
			t
		]);
	}
	function b({ groups: e, today: t }) {
		let { list: n, toggle: i, lang: o } = _(), s = o === "en", c = R(n, t), [l, u] = r(null), d = c.length ? null : V(e || [], t), f = c.find((e) => e.id === l) || c[0] || d && {
			id: d.key,
			key: d.key,
			name: d.name,
			image: w(d),
			url: d.url,
			releaseDate: d.releaseDate,
			releaseText: d.releaseText
		}, v = f?.releaseDate ? M(f.releaseDate, Date.now()) : null, y = p(!!v && !v.out), b = f?.releaseDate ? M(f.releaseDate, y) : null;
		if (!f) return null;
		let x = I(n, f), S = s ? [
			"days",
			"hours",
			"min",
			"sec"
		] : [
			"gün",
			"saat",
			"dakika",
			"saniye"
		];
		return /* @__PURE__ */ a("div", {
			className: "release-countdown" + (c.length === 1 ? " solo" : ""),
			"aria-label": s ? "Release countdown" : "Çıkış geri sayımı"
		}, /* @__PURE__ */ a("div", { className: "rc-main" }, /* @__PURE__ */ a("span", { className: "rc-art" }, f.image ? /* @__PURE__ */ a("img", {
			src: f.image,
			alt: "",
			loading: "lazy"
		}) : /* @__PURE__ */ a("span", { className: "up-ph" }, f.name.slice(0, 1))), /* @__PURE__ */ a("div", { className: "rc-info" }, /* @__PURE__ */ a("span", { className: "rc-kicker" }, c.length ? s ? "YOUR COUNTDOWN" : "GERİ SAYIMIN" : s ? "MOST ANTICIPATED" : "EN ÇOK BEKLENEN"), /* @__PURE__ */ a("h3", null, f.url ? /* @__PURE__ */ a("a", {
			href: f.url,
			target: "_blank",
			rel: "noreferrer",
			translate: "no"
		}, f.name) : /* @__PURE__ */ a("span", { translate: "no" }, f.name)), /* @__PURE__ */ a("p", null, f.releaseDate ? h(f.releaseDate, o) : f.releaseText || (s ? "Release date not announced" : "Çıkış tarihi açıklanmadı")))), b ? b.out ? /* @__PURE__ */ a("p", {
			className: "rc-out",
			role: "status"
		}, s ? "Out today! " : "Bugün çıktı! ", f.url && /* @__PURE__ */ a("a", {
			href: f.url,
			target: "_blank",
			rel: "noreferrer"
		}, s ? "Open in store →" : "Mağazada aç →")) : /* @__PURE__ */ a("div", {
			className: "rc-tiles",
			role: "timer",
			"aria-live": "off",
			"aria-label": s ? `${b.d} days ${b.h} hours left` : `${b.d} gün ${b.h} saat kaldı`
		}, [
			b.d,
			b.h,
			b.m,
			b.s
		].map((e, t) => /* @__PURE__ */ a("span", { key: t }, /* @__PURE__ */ a("b", null, t ? String(e).padStart(2, "0") : e), /* @__PURE__ */ a("small", null, S[t])))) : /* @__PURE__ */ a("p", { className: "rc-out" }, s ? "Countdown starts when the date is announced." : "Tarih açıklanınca geri sayım başlar."), /* @__PURE__ */ a("div", { className: "rc-actions" }, /* @__PURE__ */ a("button", {
			type: "button",
			className: "rc-watch" + (x ? " on" : ""),
			"aria-pressed": x,
			onClick: () => i(f)
		}, /* @__PURE__ */ a(m, { on: x }), x ? s ? "Reminder on" : "Hatırlatma açık" : s ? "Remind me" : "Hatırlat"), f.releaseDate && /* @__PURE__ */ a("button", {
			type: "button",
			className: "rc-ics",
			onClick: () => g(f, o),
			title: s ? "Adds an all-day event with alerts to your phone or computer calendar" : "Telefon ya da bilgisayar takvimine uyarılı bir etkinlik ekler"
		}, s ? "Add to calendar" : "Takvimime ekle")), c.length > 1 && /* @__PURE__ */ a("div", {
			className: "rc-queue",
			role: "group",
			"aria-label": s ? "Other games you follow" : "Takip ettiğin diğer oyunlar"
		}, c.map((e) => {
			let t = e.releaseDate ? M(e.releaseDate, y) : null;
			return /* @__PURE__ */ a("button", {
				type: "button",
				key: e.id,
				"aria-pressed": e.id === f.id,
				onClick: () => u(e.id)
			}, /* @__PURE__ */ a("span", { translate: "no" }, e.name), /* @__PURE__ */ a("em", null, t ? t.out ? s ? "Today" : "Bugün" : t.d === 0 ? s ? "Tomorrow" : "Yarın" : s ? t.d + " d" : t.d + " gün" : s ? "TBA" : "Tarih yok"));
		})), !c.length && /* @__PURE__ */ a("p", { className: "rc-hint" }, s ? "Tap the bell on any upcoming game to start your own countdown." : "Yakında sekmesindeki oyunlarda zile dokun, geri sayım burada senin oyununla başlasın."));
	}
	function x({ onAll: e }) {
		let o = t(), f = n(), p = T(l()), h = _(), [g, v] = r(null), [x, C] = r("today"), [D, O] = r(!1), k = () => {
			O(!1), s().then(v).catch(() => O(!0));
		};
		i(() => {
			let e = !1;
			return s().then((t) => {
				e || v(t);
			}).catch(() => {
				e || O(!0);
			}), () => {
				e = !0;
			};
		}, []);
		let A = E(g || [], x, p), j = x === "today" && g !== null && !A.length, M = j ? E(g || [], "week", p) : A;
		return y(g, p), /* @__PURE__ */ a("section", {
			className: "new-releases",
			"aria-labelledby": "new-releases-title",
			"aria-busy": g === null && !D
		}, /* @__PURE__ */ a("div", { className: "new-release-head" }, /* @__PURE__ */ a("div", null, /* @__PURE__ */ a("span", { className: "eyebrow" }, "ÇIKIŞ RADARI"), /* @__PURE__ */ a("h2", { id: "new-releases-title" }, x === "soon" ? "Yakında çıkacak oyunlar" : x === "week" || j ? "Bu haftanın yeni oyunları" : "Bugün çıkan oyunlar"), /* @__PURE__ */ a("p", null, j ? "Bugün için kayıtlı çıkış yok. Bu haftanın oyunlarına göz at." : "Mağazaların bildirdiği çıkışlar · Türkiye tarihi")), /* @__PURE__ */ a("button", {
			className: "linkbtn",
			onClick: e
		}, "Tüm takvim →")), /* @__PURE__ */ a(b, {
			groups: g,
			today: p
		}), /* @__PURE__ */ a("div", {
			className: "release-tabs",
			role: "group",
			"aria-label": "Çıkış dönemi"
		}, [
			["today", "Bugün"],
			["week", "Bu hafta"],
			["soon", "Yakında"]
		].map(([e, t]) => /* @__PURE__ */ a("button", {
			type: "button",
			key: e,
			"aria-pressed": x === e,
			onClick: () => C(e)
		}, t))), D ? /* @__PURE__ */ a("p", { role: "status" }, "Çıkışlar şu anda yüklenemedi. ", /* @__PURE__ */ a("button", {
			className: "linkbtn",
			onClick: k
		}, "Tekrar dene")) : g === null ? /* @__PURE__ */ a("p", { role: "status" }, "Çıkışlar yükleniyor…") : M.length ? /* @__PURE__ */ a("ul", { className: "release-rail" }, M.slice(0, 16).map((e) => {
			let t = e.releaseRows[0], n = {
				...t,
				id: (t.platform || "steam") === "steam" ? "steam:" + t.id : t.id.startsWith("ps:") ? t.id.slice(3) : t.id,
				storeId: (t.id || "").replace(/^(ps|xbox|switch):/, ""),
				titleKey: e.key,
				name: e.name,
				image: w(e),
				platform: t.platform || "steam",
				price: t.price > 0 ? t.price : null,
				currency: t.currency || "TRY"
			}, r = [...new Set(e.releaseRows.map((e) => e.platform || "steam"))];
			return /* @__PURE__ */ a("li", { key: e.key }, /* @__PURE__ */ a("button", {
				className: "release-open",
				onClick: () => o.open(n),
				"aria-label": e.name + " fiyatlarını karşılaştır"
			}, /* @__PURE__ */ a("span", { className: "release-art" }, /* @__PURE__ */ a(u, { g: e }), /* @__PURE__ */ a("em", null, e.releaseDate === p ? "Bugün" : (/* @__PURE__ */ new Date(e.releaseDate + "T12:00:00")).toLocaleDateString("tr-TR", {
				day: "numeric",
				month: "short"
			}))), /* @__PURE__ */ a("strong", null, e.name), /* @__PURE__ */ a("small", null, r.map((e) => S[e] || e).join(" · "), " çıkışı"), /* @__PURE__ */ a("span", { className: "release-price" }, typeof t.price == "number" && t.price > 0 && t.currency ? c(t.price, t.currency) : "Fiyatı mağazada kontrol et")), /* @__PURE__ */ a(d, {
				active: f.has(n.id),
				name: e.name,
				onClick: () => o.favorite(n)
			}), e.releaseDate > p && (() => {
				let n = {
					key: e.key,
					name: e.name,
					image: w(e),
					url: t.url,
					releaseDate: e.releaseDate,
					releaseText: e.releaseText
				}, r = I(h.list, n), i = h.lang === "en";
				return /* @__PURE__ */ a("button", {
					type: "button",
					className: "release-bell" + (r ? " on" : ""),
					"aria-pressed": r,
					"aria-label": (r ? i ? "Stop countdown: " : "Geri sayımdan çıkar: " : i ? "Start countdown: " : "Geri sayım başlat: ") + e.name,
					title: r ? i ? "Reminder on" : "Hatırlatma açık" : i ? "Remind me on release day" : "Çıkış günü hatırlat",
					onClick: () => h.toggle(n)
				}, /* @__PURE__ */ a(m, { on: r }));
			})());
		})) : /* @__PURE__ */ a("p", { className: "muted" }, "Bu dönem için kayıtlı çıkış yok. ", /* @__PURE__ */ a("button", {
			className: "linkbtn",
			onClick: e
		}, "Takvimi incele")), /* @__PURE__ */ a("p", { className: "release-note" }, "Tarihler ilgili mağaza sürümüne aittir; oyunun ilk kez çıktığı tarih olmayabilir. Çıkış saati ve erişim bölgeye göre değişebilir."));
	}
	return x;
}
//#endregion
export { G as createReleaseComponent };
