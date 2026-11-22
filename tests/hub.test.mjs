import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toTry, bestOffer, normItem, uniqueGames, tasteProfile, matchOf, forYouScore, rankForYou, pickBasket,
  isHiddenGem, rankGems, hoursOf, costPerHour, costTier, worthSummary, encodeWishlist, decodeWishlist,
  giftIdeas, compareRows, MIN_VOTES,
} from '../assets/hub-20261121.js';

const rates = { usdTry: 40, eurTry: 45 };
const game = (o = {}) => ({
  id: 'x:' + (o.key || 'a'), key: 'a', name: 'A', image: '', url: 'https://store.steampowered.com/app/1/', store: 'Steam', platform: 'steam',
  price: 100, currency: 'TRY', priceTry: 100, original: 200, originalTry: 200, discount: 50, score: 85, reviews: 10, genres: ['RPG'], tags: [],
  year: 2022, turkish: false, free: false, dlc: false, ...o,
});

test('toTry converts only with a real rate and never invents one', () => {
  assert.equal(toTry(10, 'USD', rates), 400);
  assert.equal(toTry(10, 'EUR', rates), 450);
  assert.equal(toTry(10, 'USD', null), null);
  assert.equal(toTry(10, 'GBP', rates), null);
  assert.equal(toTry(-1, 'TRY', rates), null);
  assert.equal(toTry('12.5', 'TRY', rates), 12.5);
});

test('bestOffer takes the cheapest official store and ignores key resellers', () => {
  const raw = {
    platform: 'playstation', price: 2099, currency: 'TRY', original_price: null, discount_percent: 0, url: 'https://store.playstation.com/x',
    offers: [
      { platform: 'gamebillet', price: 118, currency: 'TRY', original_price: 1010, discount_percent: 88, url: 'https://gb.example/x' },
      { platform: 'steam', price: 19.99, currency: 'USD', original_price: 39.99, discount_percent: 50, url: 'https://store.steampowered.com/app/1' },
      { platform: 'xbox', price: 1300, currency: 'TRY', original_price: null, discount_percent: 0, url: 'https://www.xbox.com/x' },
    ],
  };
  const b = bestOffer(raw, rates);
  assert.equal(b.platform, 'steam');
  assert.equal(b.priceTry, 799.6);
  assert.equal(b.discount, 50);
  assert.equal(b.original, 39.99);
  // kur yoksa USD teklif atlanır, TL'lilerden en ucuzu seçilir
  assert.equal(bestOffer(raw, null).platform, 'xbox');
  assert.equal(bestOffer({ platform: 'steam', price: 5, currency: 'USD', offers: [] }, null), null);
  assert.equal(bestOffer(null, rates), null);
});

test('normItem builds a game from a PlayStation-style row with scores nested', () => {
  const g = normItem({
    id: 'EP1', platform: 'playstation', name: ' Celeste ', title_key: 'celeste', price: 849, currency: 'TRY', best_score: 92, genres: ['Bağımsız'], tags: ['Pixel Graphics'],
    scores: { opencritic_reviews: 74 }, release_date: '2018-01-25', image: 'https://img/x.png', url: 'https://store.playstation.com/p', turkish: true, offers: [],
  }, rates);
  assert.equal(g.name, 'Celeste');
  assert.equal(g.reviews, 74);
  assert.equal(g.year, 2018);
  assert.equal(g.priceTry, 849);
  assert.equal(g.turkish, true);
  assert.equal(normItem({ name: '', price: 1 }, rates), null);
  assert.equal(normItem({ name: 'X', platform: 'steam', price: 3, currency: 'USD' }, null), null);
  assert.equal(normItem({ name: 'Free', platform: 'steam', price: 0, currency: 'TRY' }, rates).free, true);
});

test('uniqueGames keeps the cheapest row per title', () => {
  const list = uniqueGames([game({ key: 'k', priceTry: 90 }), game({ key: 'k', priceTry: 60 }), game({ key: 'z', priceTry: 5 }), null]);
  assert.equal(list.length, 2);
  assert.equal(list.find(g => g.key === 'k').priceTry, 60);
});

test('tasteProfile merges personas, preferred genre and favourite genres like the site does', () => {
  const p = tasteProfile({ personas: ['story', 'cozy', 'story', 'nope', 'action', 'horror'], preferredGenre: 'Spor' }, [
    { genres: ['Strateji', 'RPG'] }, { genres: ['Strateji'] }, { genres: ['Yarış'] },
  ]);
  assert.deepEqual(p.personas, ['story', 'cozy', 'action']);
  assert.ok(p.genres.includes('Spor') && p.genres.includes('Strateji') && p.genres.includes('Rahat'));
  assert.deepEqual(p.fromFavs, ['Strateji', 'RPG']);
  assert.equal(p.empty, false);
  assert.equal(tasteProfile({}, []).empty, true);
  assert.equal(tasteProfile(null, null).empty, true);
});

test('matchOf and rankForYou prefer taste matches, require a discount and skip DLC and free games', () => {
  const profile = tasteProfile({ personas: ['story'] }, []);
  const rpg = game({ key: 'rpg', genres: ['RPG'], tags: ['Story Rich'], score: 80, discount: 40 });
  const sports = game({ key: 'sp', genres: ['Spor'], score: 95, discount: 90 });
  const noSale = game({ key: 'ns', genres: ['RPG'], discount: 0 });
  const dlc = game({ key: 'dlc', genres: ['RPG'], dlc: true });
  const free = game({ key: 'fr', genres: ['RPG'], free: true });
  assert.deepEqual(matchOf(rpg, profile), { genres: ['RPG'], tags: ['Story Rich'] });
  const ranked = rankForYou([sports, rpg, noSale, dlc, free], profile);
  assert.deepEqual(ranked.map(x => x.g.key), ['rpg']);
  assert.ok(forYouScore(rpg, profile) > forYouScore(sports, profile));
  // profil boşken sıralama genel kalır
  const open = rankForYou([sports, rpg], tasteProfile({}, []));
  assert.equal(open.length, 2);
});

test('pickBasket never exceeds the budget or the game limit and maximises value', () => {
  const pool = [
    game({ key: 'a', priceTry: 600, originalTry: 1200, score: 90 }), game({ key: 'b', priceTry: 400, originalTry: 800, score: 88 }), game({ key: 'c', priceTry: 300, score: 70 }),
    game({ key: 'd', priceTry: 100, score: 80 }), game({ key: 'e', priceTry: 5000, score: 99 }), game({ key: 'f', priceTry: 50, score: null }),
    game({ key: 'g', priceTry: 90, dlc: true, score: 99 }), game({ key: 'h', priceTry: 0, free: true, score: 99 }),
  ];
  const r = pickBasket(pool, 1000, { max: 3 });
  assert.ok(r.total <= 1000);
  assert.ok(r.picks.length <= 3);
  assert.deepEqual(r.picks.map(g => g.key).sort(), ['a', 'b']);
  assert.equal(r.total, 1000);
  assert.equal(Math.round((r.total + r.left) * 100) / 100, 1000);
  assert.equal(r.saved, 1000);
  const tight = pickBasket(pool, 120, { max: 5 });
  assert.deepEqual(tight.picks.map(g => g.key), ['d']);
  assert.deepEqual(pickBasket(pool, 20).picks, []);
  assert.deepEqual(pickBasket([], 1000).picks, []);
  assert.deepEqual(pickBasket(pool, NaN).picks, []);
});

test('pickBasket lets taste break near ties', () => {
  const profile = tasteProfile({ personas: ['strategy'] }, []);
  const strat = game({ key: 's', priceTry: 500, score: 80, genres: ['Strateji'], tags: ['Tactical'] });
  const other = game({ key: 'o', priceTry: 500, score: 82, genres: ['Spor'] });
  assert.deepEqual(pickBasket([other, strat], 500, { max: 1, profile }).picks.map(g => g.key), ['s']);
  assert.deepEqual(pickBasket([other, strat], 500, { max: 1 }).picks.map(g => g.key), ['o']);
});

test('hidden gems need a high score, 1–30 reviews and a low price', () => {
  assert.equal(isHiddenGem(game({ score: 85, reviews: 12, priceTry: 200 })), true);
  assert.equal(isHiddenGem(game({ score: 79, reviews: 12 })), false);
  assert.equal(isHiddenGem(game({ reviews: 31 })), false);
  assert.equal(isHiddenGem(game({ reviews: 0 })), false);
  assert.equal(isHiddenGem(game({ reviews: null })), false);
  assert.equal(isHiddenGem(game({ priceTry: 401 })), false);
  assert.equal(isHiddenGem(game({ priceTry: 401 }), { maxPrice: 600 }), true);
  assert.equal(isHiddenGem(game({ free: true, priceTry: 0 })), false);
  const list = rankGems([game({ key: 'a', score: 82, priceTry: 90 }), game({ key: 'b', score: 90, priceTry: 300, genres: ['Rahat'] }), game({ key: 'c', score: 90, priceTry: 100, reviews: 99 })]);
  assert.deepEqual(list.map(g => g.key), ['b', 'a']);
  assert.deepEqual(rankGems(list, { genre: 'Rahat' }).map(g => g.key), ['b']);
});

test('cost per hour uses normal time first and refuses tiny or missing times', () => {
  assert.equal(hoursOf({ normally_min: 600, hastily_min: 300 }), 10);
  assert.equal(hoursOf({ normally_min: null, hastily_min: 120 }), 2);
  assert.equal(hoursOf({ normally_min: 0 }), null);
  assert.equal(hoursOf(null), null);
  assert.equal(costPerHour(500, 10), 50);
  assert.equal(costPerHour(500, 0.2), null);
  assert.equal(costPerHour(0, 10), null);
  assert.equal(costPerHour(500, null), null);
  assert.equal(costTier(5), 'great');
  assert.equal(costTier(20), 'good');
  assert.equal(costTier(50), 'fair');
  assert.equal(costTier(100), 'high');
  assert.equal(costTier(null), null);
});

test('worthSummary hides the percentage until enough votes', () => {
  assert.deepEqual(worthSummary({ yes: 3, no: 1 }), { yes: 3, no: 1, total: 4, pct: null, verdict: null });
  assert.equal(MIN_VOTES, 5);
  assert.equal(worthSummary({ yes: 4, no: 1 }).pct, 80);
  assert.equal(worthSummary({ yes: 4, no: 1 }).verdict, 'yes');
  assert.equal(worthSummary({ yes: 2, no: 3 }).verdict, 'mixed');
  assert.equal(worthSummary({ yes: 1, no: 9 }).verdict, 'no');
  assert.deepEqual(worthSummary(null), { yes: 0, no: 0, total: 0, pct: null, verdict: null });
  assert.equal(worthSummary({ yes: -4, no: 'x' }).total, 0);
});

test('wishlist link round-trips, keeps only wanted valid games and rejects tampering', () => {
  const favs = [
    { id: 'steam:1086940', name: 'Baldur’s Gate 3', status: 'wish' },
    { id: 'EP3383-PPSA14002_00-0872837811678079', name: 'Çılgın Oyun ğüşiöç', status: 'wish' },
    { id: 'steam:9', name: 'Bitti', status: 'done' },
    { id: 'bad id!', name: 'Geçersiz', status: 'wish' },
    { id: 'steam:2', name: '   ', status: 'wish' },
  ];
  const code = encodeWishlist(favs, { by: 'Ayşe <b>' });
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  const back = decodeWishlist(code);
  assert.deepEqual(back.items.map(i => i.id), ['steam:1086940', 'EP3383-PPSA14002_00-0872837811678079']);
  assert.equal(back.items[1].name, 'Çılgın Oyun ğüşiöç');
  assert.equal(back.by, 'Ayşe b');
  assert.equal(encodeWishlist([], {}), '');
  assert.equal(decodeWishlist(''), null);
  assert.equal(decodeWishlist('%%%'), null);
  assert.equal(decodeWishlist('abcd'), null);
  assert.equal(decodeWishlist(btoa(JSON.stringify({ v: 2, i: [['a', 'b']] }))), null);
  assert.equal(decodeWishlist(btoa(JSON.stringify({ v: 1, i: [['<x>', 'b'], [1, 2]] })).replace(/=+$/, '')), null);
  const many = Array.from({ length: 50 }, (_, i) => ({ id: 'steam:' + i, name: 'G' + i, status: 'wish' }));
  assert.equal(decodeWishlist(encodeWishlist(many)).items.length, 30);
  assert.equal(decodeWishlist('A'.repeat(7000)), null);
});

test('giftIdeas puts the friend’s wishlist first, then genre matches within budget', () => {
  const pool = [
    game({ key: 'w', id: 'steam:w', priceTry: 300, score: 70, genres: ['Spor'] }),
    game({ key: 'r', id: 'steam:r', priceTry: 200, score: 90, genres: ['RPG'] }),
    game({ key: 's', id: 'steam:s', priceTry: 150, score: 95, genres: ['Spor'] }),
    game({ key: 'big', id: 'steam:big', priceTry: 900, score: 99, genres: ['RPG'] }),
  ];
  const out = giftIdeas(pool, { budget: 500, genres: ['RPG'], wanted: new Set(['steam:w']) });
  assert.deepEqual(out.map(x => x.g.key), ['w', 'r']);
  assert.equal(out[0].wished, true);
  assert.deepEqual(giftIdeas(pool, { budget: 500, genres: [], wanted: new Set() }).map(x => x.g.key), ['s', 'r', 'w']);
  assert.deepEqual(giftIdeas(pool, { budget: 100, genres: ['RPG'] }), []);
});

test('compareRows marks winners only where at least two games have a value and they differ', () => {
  const a = game({ key: 'a', priceTry: 100, discount: 50, score: 90, year: 2020 });
  const b = game({ key: 'b', priceTry: 300, discount: 50, score: 85, year: null });
  const c = game({ key: 'c', priceTry: 200, discount: 0, score: null, year: 2024 });
  const rows = compareRows([a, b, c], { a: { normally_min: 600 }, b: { normally_min: 1200 } });
  const by = k => rows.find(r => r.key === k);
  assert.deepEqual(by('price').win, [0]);
  assert.deepEqual(by('discount').win, [0, 1]);
  assert.deepEqual(by('score').win, [0]);
  assert.deepEqual(by('hours').win, [1]);
  assert.deepEqual(by('hours').vals, [10, 20, null]);
  assert.deepEqual(by('cph').vals, [10, 15, null]);
  assert.deepEqual(by('cph').win, [0]);
  assert.deepEqual(by('year').win, [2]);
  // eşit değerlerde kazanan yok; tek değerde kazanan yok
  const tie = compareRows([game({ priceTry: 5 }), game({ priceTry: 5 })]);
  assert.deepEqual(tie.find(r => r.key === 'price').win, []);
  const lone = compareRows([game({ score: 80 }), game({ score: null })]);
  assert.deepEqual(lone.find(r => r.key === 'score').win, []);
});
