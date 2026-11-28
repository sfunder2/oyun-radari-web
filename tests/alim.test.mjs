import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normTitle, baseTitle, cleanRule, alarmState, shouldNotify, parseWishlistText, matchName, cleanOwned, ownedIndex, ownedMatch,
  bundleTotals, cheapestRegion, buyScore, seasonIcs, dueSeasonReminders, seasonMark, trustOf, monthReport, purchasesCsv,
  subscriptionPlan, rankByCostPerHour, feedAdjust, commonGames,
} from '../assets/alim-core-20261127.js';

test('titles normalize and drop edition words', () => {
  assert.equal(normTitle('The Witcher® 3: Wild Hunt'), 'the witcher 3 wild hunt');
  assert.equal(baseTitle('Hades Deluxe Edition'), 'hades');
  assert.equal(normTitle("Marvel's Spider-Man"), 'marvels spider man');
});

test('alarm rules validate and evaluate all four modes', () => {
  assert.equal(cleanRule({ id: 'a', name: 'A', mode: 'target', value: 0 }), null);
  assert.equal(cleanRule({ id: 'a', name: 'A', mode: 'drop', value: 20 }), null);
  const t = cleanRule({ id: 'a', name: 'A', mode: 'target', value: 100 });
  assert.equal(alarmState(t, { priceTry: 99 }).state, 'hit');
  assert.equal(alarmState(t, { priceTry: 110 }).state, 'near');
  assert.equal(alarmState(t, { priceTry: 300 }).state, 'waiting');
  assert.equal(alarmState(t, { priceTry: null }).state, 'stale');
  const p = cleanRule({ id: 'a', name: 'A', mode: 'percent', value: 50 });
  assert.equal(alarmState(p, { priceTry: 10, discount: 50 }).state, 'hit');
  assert.equal(alarmState(p, { priceTry: 10, discount: 42 }).state, 'near');
  const d = cleanRule({ id: 'a', name: 'A', mode: 'drop', value: 30, base: 200 });
  assert.equal(alarmState(d, { priceTry: 140 }).state, 'hit');
  assert.equal(alarmState(d, { priceTry: 141 }).state, 'near');
  const l = cleanRule({ id: 'a', name: 'A', mode: 'atl' });
  assert.equal(alarmState(l, { priceTry: 50 }, { low: 50, lowDays: 5 }).state, 'nodata');
  assert.equal(alarmState(l, { priceTry: 50 }, { low: 50, lowDays: 40 }).state, 'hit');
  assert.equal(alarmState(l, { priceTry: 80 }, { low: 50, lowDays: 40 }).state, 'waiting');
  assert.equal(shouldNotify({ firedAt: 0 }, { state: 'hit' }, 1e12), true);
  assert.equal(shouldNotify({ firedAt: 1e12 - 1000 }, { state: 'hit' }, 1e12), false);
});

test('wishlist text: lines, csv, json and prices', () => {
  assert.deepEqual(parseWishlistText('1. Hades\n- Celeste - ₺120\n\nhades\n'), ['Hades', 'Celeste']);
  assert.deepEqual(parseWishlistText('name,price\n"Portal, 2",10\nDoom,5'), ['Portal, 2', 'Doom']);
  assert.deepEqual(parseWishlistText('{"1":{"name":"Hollow Knight"},"2":{"name":"Inside"}}'), ['Hollow Knight', 'Inside']);
  assert.deepEqual(parseWishlistText('["A Way Out", {"title":"Control"}]'), ['A Way Out', 'Control']);
  assert.deepEqual(parseWishlistText(''), []);
});

test('matchName prefers exact, then base, then strong fuzzy, never weak', () => {
  const c = [{ name: 'Hades II' }, { name: 'Hades' }, { name: 'Celeste Deluxe Edition' }, { name: 'The Witcher 3: Wild Hunt Complete Edition' }];
  assert.equal(matchName('Hades', c).game.name, 'Hades');
  assert.equal(matchName('Celeste', c).how, 'base');
  assert.equal(matchName('Witcher 3 Wild Hunt', c).game.name, 'The Witcher 3: Wild Hunt Complete Edition');
  assert.equal(matchName('Doom Eternal', c), null);
});

test('owned list dedupes by base title and matches editions', () => {
  const owned = cleanOwned([{ name: 'Hades', source: 'steam', minutes: 60 }, { name: 'Hades Deluxe Edition' }, { name: 'X', source: 'bogus' }]);
  assert.equal(owned.length, 2);
  assert.equal(owned[1].source, 'manual');
  const idx = ownedIndex(owned);
  assert.equal(ownedMatch(idx, 'HADES Ultimate Edition').source, 'steam');
  assert.equal(ownedMatch(idx, 'Celeste'), null);
});

test('bundle totals count only priced DLC and compare with the edition', () => {
  assert.equal(bundleTotals(null, [], null), null);
  const r = bundleTotals(500, [{ name: 'a', priceTry: 100 }, { name: 'b', priceTry: 150 }, { name: 'c', priceTry: null }], { name: 'Complete', priceTry: 700 });
  assert.equal(r.total, 750); assert.equal(r.unknown, 1); assert.equal(r.verdict.better, 'edition'); assert.equal(r.verdict.diff, 50);
  assert.equal(bundleTotals(500, [{ name: 'a', priceTry: 100 }], { name: 'C', priceTry: 500 }).verdict.better, 'edition');
  assert.equal(bundleTotals(500, [{ name: 'a', priceTry: 100 }], { name: 'C', priceTry: 700 }).verdict.better, 'separate');
  assert.equal(bundleTotals(500, [], { name: 'C', priceTry: 500 }).verdict, null);
});

test('cheapest region ignores stale rates and small savings', () => {
  const cs = [{ cc: 'TR', status: 'ok', price_try: 1000 }, { cc: 'IN', status: 'ok', price_try: 600 }, { cc: 'BR', status: 'ok', price_try: 100, fx_stale: true }, { cc: 'PL', status: 'error' }];
  const r = cheapestRegion(cs);
  assert.equal(r.best.cc, 'IN'); assert.equal(r.save, 400); assert.equal(r.pct, 40); assert.equal(r.worth, true);
  assert.equal(cheapestRegion([{ cc: 'TR', status: 'ok', price_try: 100 }, { cc: 'PL', status: 'ok', price_try: 95 }]).worth, false);
  assert.equal(cheapestRegion([]), null);
});

test('buy score needs real evidence and weights the low-price signal', () => {
  assert.equal(buyScore({ priceTry: 100 }), null);
  assert.equal(buyScore({ priceTry: 100, score: 90 }), null);
  const great = buyScore({ priceTry: 100, lowTry: 100, lowDays: 60, discount: 60, score: 92, cph: 5, worthPct: 90 });
  assert.equal(great.verdict, 'buy');
  const bad = buyScore({ priceTry: 300, lowTry: 100, lowDays: 60, discount: 0, score: 55 });
  assert.ok(['wait', 'skip'].includes(bad.verdict));
  const noHistory = buyScore({ priceTry: 100, discount: 50, score: 85 });
  assert.ok(noHistory && !noHistory.parts.some(p => p.key === 'low'));
  const short = buyScore({ priceTry: 100, lowTry: 90, lowDays: 5, discount: 50, score: 85 });
  assert.ok(!short.parts.some(p => p.key === 'low'));
  const soon = buyScore({ priceTry: 100, discount: 10, score: 85, nextSaleDays: 4 });
  assert.ok(soon.parts.some(p => p.key === 'sale'));
});

test('ics has a full-day event and an alarm; reminders fire once', () => {
  const s = { key: 'autumn', tr: 'Kara Cuma', en: 'Black Friday', from: Date.UTC(2026, 10, 20), to: Date.UTC(2026, 11, 3) };
  const ics = seasonIcs(s, 3, { now: Date.UTC(2026, 10, 1) });
  assert.match(ics, /DTSTART;VALUE=DATE:20261120\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20261203\r\n/);
  assert.match(ics, /TRIGGER:-P3D/);
  assert.match(ics, /SUMMARY:Kara Cuma \(yaklaşık\)/);
  assert.equal(seasonIcs(null), '');
  const prefs = { on: true, daysBefore: 3, notified: [] };
  assert.equal(dueSeasonReminders([s], prefs, Date.UTC(2026, 10, 10)).length, 0);
  assert.equal(dueSeasonReminders([s], prefs, Date.UTC(2026, 10, 18)).length, 1);
  assert.equal(dueSeasonReminders([s], { ...prefs, notified: [seasonMark(s)] }, Date.UTC(2026, 10, 18)).length, 0);
  assert.equal(dueSeasonReminders([s], { ...prefs, on: false }, Date.UTC(2026, 10, 18)).length, 0);
  assert.equal(dueSeasonReminders([s], prefs, Date.UTC(2026, 11, 5)).length, 0);
});

test('shop trust never upgrades unknown shops', () => {
  assert.equal(trustOf('Steam').tier, 'official');
  assert.equal(trustOf('gmg').tier, 'authorized');
  assert.equal(trustOf('G2A').tier, 'market');
  assert.equal(trustOf('randomkeys').tier, 'unknown');
});

test('month report totals, change and csv', () => {
  const p = [
    { name: 'A', amount: 100, normal: 200, date: '2026-11-03' }, { name: 'B', amount: 50, date: '2026-11-20' },
    { name: 'C', amount: 100, date: '2026-10-05' }, { name: 'bad', amount: -1, date: '2026-11-01' },
  ];
  const r = monthReport(p, '2026-11');
  assert.equal(r.spent, 150); assert.equal(r.count, 2); assert.equal(r.saved, 100); assert.equal(r.change, 50); assert.equal(r.savedPct, 40);
  assert.equal(r.biggest.name, 'A'); assert.equal(r.history.length, 6); assert.equal(r.history[5].spent, 150); assert.equal(r.history[4].spent, 100);
  assert.equal(monthReport([], '2026-11').change, null);
  assert.equal(purchasesCsv([{ name: 'A "x"', amount: 5, date: '2026-01-01' }]), 'date,name,amount,normal_price\n2026-01-01,"A ""x""",5,');
});

test('subscription plan compares months of play with the buy price', () => {
  assert.equal(subscriptionPlan({ fee: 0, hoursPerWeek: 5, items: [] }), null);
  const plan = subscriptionPlan({ fee: 200, hoursPerWeek: 5, items: [{ name: 'A', priceTry: 1000, hours: 20 }, { name: 'B', priceTry: 300, hours: 40 }, { name: 'C', priceTry: null, hours: 10 }] });
  assert.equal(plan.rows.length, 2);
  assert.equal(plan.rows[0].months, 1); assert.equal(plan.rows[0].cheaper, 'sub');
  assert.equal(plan.rows[1].months, 2); assert.equal(plan.rows[1].cheaper, 'buy');
  assert.equal(plan.months, 3); assert.equal(plan.subTotal, 600); assert.equal(plan.buyTotal, 1300); assert.equal(plan.cheaper, 'sub');
});

test('rank by cost per hour, feed feedback and common games', () => {
  assert.deepEqual(rankByCostPerHour([{ n: 1, cph: 9 }, { n: 2, cph: 3 }, { n: 3, cph: null }]).map(r => r.n), [2, 1]);
  const e = [{ g: { id: 'a', key: 'a', genres: ['RPG'], priceTry: 10 }, s: 50 }, { g: { id: 'b', key: 'b', genres: ['Spor'], priceTry: 10 }, s: 52 }, { g: { id: 'c', key: 'c', genres: [], priceTry: 1 }, s: 99 }];
  const out = feedAdjust(e, { genres: { RPG: 2, Spor: -2 }, hidden: ['c'] });
  assert.deepEqual(out.map(x => x.g.id), ['a', 'b']);
  assert.equal(out[0].liked, true);
  const c = commonGames([{ name: 'Hades' }, { name: 'Celeste' }], [{ name: 'hades deluxe edition' }, { name: 'Inside' }]);
  assert.equal(c.common.length, 1); assert.equal(c.onlyTheirs[0].name, 'Inside');
});

import { parseWishlist, fetchWishlist } from '../scripts/steam-account.mjs';
test('steam wishlist parses appids and treats private profiles as empty', async () => {
  assert.equal(parseWishlist({}), null);
  assert.deepEqual(parseWishlist({ response: { items: [{ appid: 10, date_added: 1700000000, priority: 1 }, { appid: 0 }] } }).map(i => i.appid), [10]);
  const ok = await fetchWishlist('1', 'k', async () => ({ ok: true, status: 200, json: async () => ({ response: { items: [{ appid: 7 }] } }) }));
  assert.equal(ok.items.length, 1);
  const priv = await fetchWishlist('1', 'k', async () => ({ ok: false, status: 403 }));
  assert.deepEqual(priv, { visible: false, items: [] });
});
