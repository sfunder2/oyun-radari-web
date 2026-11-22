import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  foldText, queryWords, matchRanges, normOffer, pickShowcase, timeLeft, nextIndex, dayGap, addDays,
  releaseStrips, genreCovers, recordProgress, ringGradient,
} from '../assets/home-search-20261122.js';

test('foldText keeps length and folds Turkish letters', () => {
  assert.equal(foldText('Şövalye İııÇğ'), 'sovalye iiicg');
  assert.equal(foldText('Kâra').length, 4);
  assert.deepEqual(queryWords('Şö  a Şö vale'), ['so', 'vale']);
});

test('matchRanges is diacritic-insensitive and merges overlaps', () => {
  assert.deepEqual(matchRanges('Şövalye Kâra', queryWords('sovalye kara')), [[0, 7], [8, 12]]);
  assert.deepEqual(matchRanges('Red Dead Redemption', ['red']), [[0, 3], [9, 12]]);
  assert.deepEqual(matchRanges('abcd', ['ab', 'bc']), [[0, 3]]);
  assert.deepEqual(matchRanges('abc', []), []);
});

const row = (o = {}) => ({ platform: 'steam', store_id: '1', name: 'A', image: 'https://x/a.jpg', price: 50, original_price: 100, discount_percent: 50, currency: 'TRY', mc_score: 80, ...o });

test('normOffer rejects bad rows and non-https images', () => {
  assert.equal(normOffer(row()).pct, 50);
  assert.equal(normOffer(row({ image: 'http://x/a.jpg' })), null);
  assert.equal(normOffer(row({ price: 120 })), null);
  assert.equal(normOffer(row({ name: ' ' })), null);
  assert.equal(normOffer(row({ discount_percent: null })).pct, 50);
});

test('pickShowcase ranks by discount and score, drops dupes, expired and small discounts', () => {
  const now = Date.parse('2026-11-22T00:00:00Z');
  const rows = [
    row({ store_id: 'a', name: 'Alpha', discount_percent: 50, mc_score: 90 }),
    row({ store_id: 'b', name: 'Beta', discount_percent: 80, mc_score: 70 }),
    row({ store_id: 'c', name: 'alpha!', discount_percent: 60, mc_score: 95 }),
    row({ store_id: 'd', name: 'Tiny', discount_percent: 10 }),
    row({ store_id: 'e', name: 'Gone', discount_percent: 90, discount_ends_at: '2026-11-21T00:00:00Z' }),
  ];
  const out = pickShowcase(rows, 5, now);
  assert.deepEqual(out.map(o => o.name), ['Beta', 'Alpha']);
  assert.equal(pickShowcase(rows, 1, now).length, 1);
});

test('timeLeft and nextIndex', () => {
  assert.deepEqual(timeLeft(1000 + 2 * 864e5 + 5, 1000), { unit: 'd', n: 2 });
  assert.deepEqual(timeLeft(1000 + 3 * 36e5, 1000), { unit: 'h', n: 3 });
  assert.deepEqual(timeLeft(1000 + 61e3, 1000), { unit: 'm', n: 2 });
  assert.equal(timeLeft(900, 1000), null);
  assert.equal(nextIndex(4, 5, 1), 0);
  assert.equal(nextIndex(0, 5, -1), 4);
  assert.equal(nextIndex(0, 0, 1), 0);
});

test('releaseStrips splits fresh and soon, prefers wanted games, orders by date', () => {
  const today = '2026-11-22';
  const g = (id, date, rank) => ({ id, name: 'G' + id, image: 'https://x/' + id, release_date: date, platform: 'steam', wishlist_rank: rank });
  const rows = [g(1, '2026-11-20', 5), g(2, '2026-11-22', 1), g(3, '2026-10-01', 1), g(4, '2026-11-25', 2), g(5, '2027-03-01', 1), g(6, '2026-11-23', 9),
    { ...g(7, '2026-11-21', 1), image: null }, g(2, '2026-11-24', 3)];
  const { fresh, soon } = releaseStrips(rows, today, { cap: 2 });
  assert.deepEqual(fresh.map(x => x.id), ['2', '1']);
  assert.deepEqual(soon.map(x => x.id), ['6', '4']);
  assert.equal(dayGap('2026-11-23', today), 1);
  assert.equal(dayGap('x', today), null);
  assert.equal(addDays(today, -14), '2026-11-08');
});

test('genreCovers picks the most discounted cover and never reuses an image', () => {
  const rows = [
    { name: 'A', image: 'https://x/a', genres: ['Aksiyon', 'RPG'], discount_percent: 90 },
    { name: 'B', image: 'https://x/b', genres: ['RPG'], discount_percent: 80 },
    { name: 'C', image: 'http://x/c', genres: ['Spor'], discount_percent: 99 },
  ];
  const c = genreCovers(rows, ['Aksiyon', 'RPG', 'Spor']);
  assert.equal(c.Aksiyon.name, 'A');
  assert.equal(c.RPG.name, 'B');
  assert.equal(c.Spor, undefined);
});

test('story progress: max per day, resets on a new day, ignores bad input', () => {
  let st = recordProgress(null, 'new', 1, 5, '2026-11-22');
  assert.deepEqual(st.items.new, { seen: 2, total: 5 });
  assert.equal(recordProgress(st, 'new', 0, 5, '2026-11-22'), st);
  st = recordProgress(st, 'new', 4, 5, '2026-11-22');
  assert.equal(st.items.new.seen, 5);
  assert.deepEqual(recordProgress(st, 'new', 0, 5, '2026-11-23').items, { new: { seen: 1, total: 5 } });
  assert.equal(recordProgress(st, '<b>', 0, 5, '2026-11-22'), st);
  assert.equal(recordProgress(st, 'top', 0, 0, '2026-11-22'), st);
});

test('ringGradient: nothing without a record, dim ring when finished, segments otherwise', () => {
  assert.equal(ringGradient('new', null), null);
  assert.match(ringGradient('new', { seen: 3, total: 3 }), /^conic-gradient\(.*0 360deg\)$/);
  const part = ringGradient('new', { seen: 1, total: 4 });
  assert.match(part, /#[0-9a-f]{6}/);
  assert.equal(ringGradient('nope', { seen: 0, total: 2 }).startsWith('conic-gradient'), true);
});

test('index.html loads the stylesheet and module', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /assets\/home-search-20261122\.css/);
  assert.match(html, /assets\/home-search-20261122\.js/);
});
