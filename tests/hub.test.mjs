import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanHistory, buyAdvice, adviceLabel, adviceLines, alarmStatus, regionalAlert, normalizeFree, dueReminders,
  timeLeftText, buildDigest, makeTopic, cleanTopic, pushMessage, esc,
} from '../assets/hub-20261121.js';

const D = s => Date.parse(s + 'T00:00:00Z');
const NOW = D('2026-10-01'); // Kara Cuma'ya 50 gün var
const hist = (prices, start = '2026-06-01') => prices.map((p, i) => ({ day: new Date(D(start) + i * 864e5).toISOString().slice(0, 10), price: p }));
const flat = (n, p) => Array(n).fill(p);

test('cleanHistory drops junk rows and sorts by day', () => {
  const r = cleanHistory([{ day: '2026-02-02', price: '10' }, { day: 'x', price: 5 }, { day: '2026-02-01', price: 20 }, { day: '2026-02-03', price: null }, null]);
  assert.deepEqual(r.map(x => x.p), [20, 10]);
  assert.deepEqual(cleanHistory(undefined), []);
});

test('buyAdvice needs 14 days and 5 points of history and never guesses', () => {
  assert.equal(buyAdvice(hist([100, 100, 100]), 100, NOW).verdict, 'unknown');
  assert.equal(buyAdvice(hist(flat(10, 100)), 100, NOW).why, 'short');
  assert.equal(buyAdvice([], null, NOW).why, 'noprice');
  assert.equal(buyAdvice([], 0, NOW).verdict, 'buy');
});

test('buyAdvice: at the recorded low is buy; far above is wait; in between is fair', () => {
  const h = hist([...flat(40, 500), ...flat(10, 300), ...flat(40, 500)]);
  assert.equal(buyAdvice(h, 300, NOW).verdict, 'buy');
  assert.equal(buyAdvice(h, 310, NOW).verdict, 'buy');      // dibin %8'i içinde
  assert.equal(buyAdvice(h, 500, NOW).verdict, 'wait');     // dibin %67 üstü
  assert.equal(buyAdvice(h, 340, NOW).verdict, 'fair');     // %13 üstü, büyük indirim uzak
  assert.equal(buyAdvice(h, 250, NOW).verdict, 'buy');      // kaydın altına inmiş
});

test('buyAdvice: a big sale within three weeks turns fair into wait, but never a buy', () => {
  const h = hist([...flat(40, 500), ...flat(10, 300), ...flat(40, 500)]);
  const nearSale = D('2026-11-05'); // Kara Cuma 15 gün sonra
  assert.equal(buyAdvice(h, 340, nearSale).verdict, 'wait');
  assert.equal(buyAdvice(h, 340, nearSale).saleSoon, true);
  assert.equal(buyAdvice(h, 300, nearSale).verdict, 'buy');
});

test('adviceLines explains with evidence and the disclaimer; labels are bilingual', () => {
  const h = hist([...flat(40, 500), ...flat(10, 300), ...flat(40, 500)]);
  const a = buyAdvice(h, 340, D('2026-11-05'));
  const tr = adviceLines(a, 'TRY', false).join(' ');
  assert.match(tr, /%13 üstünde/);
  assert.match(tr, /Kara Cuma/);
  assert.match(tr, /tahmini değildir/);
  assert.match(adviceLines(a, 'TRY', true).join(' '), /not a price prediction/);
  assert.equal(adviceLabel(a, false), 'Bekle');
  assert.equal(adviceLabel(a, true), 'Wait');
  assert.match(adviceLines(buyAdvice(hist(flat(10, 100)), 100, NOW))[0], /en az 14 gün/);
});

test('alarmStatus: hit, near, waiting, and stale for old or foreign-currency prices', () => {
  const fav = { id: 'a', target: 300, currency: 'TRY' };
  const cur = p => ({ price: p, currency: 'TRY', checkedAt: new Date(NOW - 36e5).toISOString() });
  assert.equal(alarmStatus(fav, cur(300), NOW).state, 'hit');
  assert.equal(alarmStatus(fav, cur(250), NOW).state, 'hit');
  assert.equal(alarmStatus(fav, cur(330), NOW).state, 'near');
  assert.equal(alarmStatus(fav, cur(500), NOW).state, 'waiting');
  assert.equal(alarmStatus(fav, { ...cur(100), checkedAt: new Date(NOW - 30 * 36e5).toISOString() }, NOW).state, 'stale');
  assert.equal(alarmStatus(fav, { ...cur(100), currency: 'USD' }, NOW).state, 'stale');
  assert.equal(alarmStatus(fav, undefined, NOW).state, 'stale');
  assert.equal(alarmStatus({ id: 'b' }, cur(1), NOW), null);
  assert.equal(alarmStatus({ ...fav, target: 0 }, cur(0), NOW).state, 'hit'); // 0 hedef: ücretsiz olunca
});

test('regionalAlert needs 15% and 20 TRY, ignores stale rates and missing home price', () => {
  const data = { countries: [
    { cc: 'TR', status: 'ok', price_try: 1000, currency: 'TRY', price: 1000 },
    { cc: 'AR', name: 'Arjantin', status: 'ok', price_try: 700, currency: 'ARS', price: 40000, url: 'https://x.test/ar' },
    { cc: 'BR', name: 'Brezilya', status: 'ok', price_try: 800, currency: 'BRL', price: 90 },
    { cc: 'XX', name: 'Eski kur', status: 'ok', price_try: 100, currency: 'XXX', price: 1, fx_stale: true },
    { cc: 'ZZ', status: 'error' },
  ] };
  const a = regionalAlert(data);
  assert.equal(a.cc, 'AR');
  assert.equal(a.savePct, 30);
  assert.equal(a.saveTry, 300);
  assert.equal(a.url, 'https://x.test/ar');
  assert.equal(regionalAlert({ countries: [data.countries[0], { cc: 'BR', status: 'ok', price_try: 900, currency: 'BRL' }] }), null);
  assert.equal(regionalAlert({ countries: [{ cc: 'TR', status: 'ok', price_try: 50 }, { cc: 'BR', status: 'ok', price_try: 35 }] }), null); // 15 TL fark
  assert.equal(regionalAlert({ countries: [{ cc: 'BR', status: 'ok', price_try: 1 }] }), null);
  assert.equal(regionalAlert(null), null);
});

test('normalizeFree keeps live Epic promos and only fresh zero-price offers; no invented end times', () => {
  const now = D('2026-11-21') + 12 * 36e5;
  const iso = ms => new Date(ms).toISOString();
  const free = normalizeFree({
    epic: [{ id: 'e1', name: 'Epic A', end: iso(now + 5 * 36e5), url: 'https://store.epicgames.com/tr/p/a', image: 'https://img.test/a.jpg' }, { id: 'e2', name: 'Old', end: iso(now - 1) }, { id: 'e3', name: 'Later', end: iso(now + 30 * 36e5), url: 'javascript:alert(1)' }],
    offers: [
      { platform: 'steam', store_id: '1', name: 'Steam Free', price: 0, original_price: 100, checked_at: iso(now - 36e5), url: 'https://store.steampowered.com/app/1/' },
      { platform: 'steam', store_id: '2', name: 'Permanent F2P', price: 0, original_price: null, checked_at: iso(now) },
      { platform: 'xbox', store_id: '3', name: 'Stale', price: 0, original_price: 50, checked_at: iso(now - 30 * 36e5) },
      { platform: 'switch', store_id: '4', name: 'Wrong store', price: 0, original_price: 50, checked_at: iso(now) },
    ],
  }, now);
  assert.deepEqual(free.map(g => g.name), ['Epic A', 'Later', 'Steam Free']);
  assert.equal(free[0].endKnown, true);
  assert.equal(free[1].url, null);
  assert.equal(free[2].end, null);
  assert.equal(free[2].endKnown, false);
});

test('dueReminders fires the nearest threshold once, only for known end times', () => {
  const now = D('2026-11-21');
  const g = (key, hours, endKnown = true) => ({ key, end: now + hours * 36e5, endKnown });
  const games = [g('epic:a', 20), g('epic:b', 1.5), g('epic:c', 60), g('steam:1', 1, false)];
  const due = dueReminders(games, now, new Set());
  assert.deepEqual(due.map(d => [d.game.key, d.lead]), [['epic:a', 24], ['epic:b', 2]]);
  assert.deepEqual(dueReminders(games, now, new Set(['free:epic:a:24'])).map(d => d.game.key), ['epic:b']);
  assert.deepEqual(dueReminders([g('epic:x', -1)], now, new Set()), []);
});

test('timeLeftText', () => {
  assert.equal(timeLeftText(2 * 864e5 + 3 * 36e5), '2 gün 3 saat kaldı');
  assert.equal(timeLeftText(5 * 36e5, true), '5 h left');
  assert.equal(timeLeftText(90 * 1e3), '2 dakika kaldı');
  assert.equal(timeLeftText(0), 'Bitti');
});

const fav = (id, name, extra = {}) => ({ id, name, status: 'wish', currency: 'TRY', price: 500, ...extra });
const fresh = (price, extra = {}) => ({ price, currency: 'TRY', discountPercent: 0, checkedAt: new Date(NOW - 36e5).toISOString(), ...extra });

test('buildDigest groups news, escapes HTML, and returns null when there is nothing to say', () => {
  assert.equal(buildDigest({ favs: [fav('a', 'A', { target: 100 })], prices: { a: fresh(900) }, now: NOW }), null);
  assert.equal(buildDigest({}), null);
  const d = buildDigest({
    favs: [fav('a', 'Hit <b>Game</b>', { target: 300 }), fav('b', 'Close', { target: 300 }), fav('c', 'Sale', {}), fav('d', 'Done', { status: 'done', target: 999 })],
    prices: { a: fresh(250), b: fresh(330), c: fresh(300, { discountPercent: 40 }), d: fresh(10) },
    advice: { c: { verdict: 'buy' } }, free: [{ key: 'epic:1', store: 'epic', name: 'Free One', end: NOW + 5 * 36e5, endKnown: true }], now: NOW,
  });
  assert.equal(d.sections.map(s => s.title).join('|'), 'Hedef fiyatına ulaşanlar|Hedefe yaklaşanlar|Favorilerinde indirim|Şimdi almak için iyi zaman|Ücretsiz oyunlar');
  assert.match(d.subject, /hedef fiyatına ulaştı/);
  assert.doesNotMatch(d.html, /<b>Game<\/b>/);
  assert.match(d.html, /Hit &lt;b&gt;Game&lt;\/b&gt;/);
  assert.match(d.text, /Free One — Epic Games · 5 saat kaldı/);
  assert.ok(!d.text.includes('Done'), 'oynanmış oyun özete girmez');
  const e = buildDigest({ favs: [fav('a', 'A', { target: 300 })], prices: { a: fresh(250) }, now: NOW, en: true });
  assert.match(e.subject, /reached your target price/);
  assert.match(e.text, /target/);
});

test('buildDigest ignores stale prices', () => {
  const old = { price: 100, currency: 'TRY', discountPercent: 70, checkedAt: new Date(NOW - 5 * 864e5).toISOString() };
  assert.equal(buildDigest({ favs: [fav('a', 'A')], prices: { a: old }, advice: { a: { verdict: 'buy' } }, now: NOW }), null);
});

test('ntfy topics are random-looking, validated and never user supplied text', () => {
  const t = makeTopic(new Uint8Array(12).map((_, i) => i * 17));
  assert.match(t, /^oyunradari-[a-f0-9]{24}$/);
  assert.equal(cleanTopic(t), t);
  assert.equal(cleanTopic('oyunradari-../x'), null);
  assert.equal(cleanTopic('x'), null);
  assert.equal(cleanTopic(null), null);
});

test('pushMessage', () => {
  assert.deepEqual(pushMessage('hit', { name: 'G', price: 250, currency: 'TRY' }).title, 'Hedef fiyata ulaştı');
  assert.match(pushMessage('free', { name: 'F', store: 'epic', endKnown: true, end: 5 * 36e5, now: 0 }, true).body, /5 h left/);
  assert.equal(pushMessage('nope', {}), null);
  assert.equal(esc('<&>"\''), '&lt;&amp;&gt;&quot;&#39;');
});
