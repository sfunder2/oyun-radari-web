import test from 'node:test';
import assert from 'node:assert/strict';
import {
  istDay, addDays, walletDonut, ringDashes, totalSaved, milestone, countAt, radarAxes, polar,
  parseRemainingMs, ringState, endDayCounts, heatLevel, heatGrid, priceDrops, dropAge, timelineDays,
  packCircles, titleKey, parseMinutes, appIdFromIcon, libraryValue,
} from '../assets/visuals-20261121.js';

test('Istanbul day rolls over at 21:00 UTC', () => {
  assert.equal(istDay(Date.parse('2026-11-21T20:59:00Z')), '2026-11-21');
  assert.equal(istDay(Date.parse('2026-11-21T21:00:00Z')), '2026-11-22');
  assert.equal(addDays('2026-11-30', 2), '2026-12-02');
});

test('walletDonut: month filter, top segments, rest bucket and budget remainder', () => {
  const p = [
    { id: 'a', name: 'A', amount: 400, normal: 600, date: '2026-10-02' },
    { id: 'b', name: 'B', amount: 100, date: '2026-10-03' },
    { id: 'c', name: 'C', amount: 50, date: '2026-10-04' },
    { id: 'd', name: 'D', amount: 30, date: '2026-10-05' },
    { id: 'e', name: 'E', amount: 20, date: '2026-10-06' },
    { id: 'f', name: 'F', amount: 10, date: '2026-10-07' },
    { id: 'g', name: 'G', amount: 5, date: '2026-10-08' },
    { id: 'x', name: 'Old', amount: 999, date: '2026-09-30' },
    { id: 'bad', name: 'Bad', amount: -5, date: '2026-10-09' },
  ];
  const d = walletDonut(p, '2026-10', 1000);
  assert.equal(d.spent, 615);
  assert.equal(d.count, 7);
  assert.equal(d.remaining, 385);
  assert.equal(d.over, 0);
  assert.deepEqual(d.segments.map(x => x.id), ['a', 'b', 'c', 'd', 'e', 'rest']);
  assert.equal(d.segments[5].amount, 15);
  assert.equal(d.segments[5].count, 2);
  assert.equal(d.segments[0].saved, 200);
  const sum = d.segments.reduce((a, x) => a + x.frac, 0) + d.remainingFrac;
  assert.ok(Math.abs(sum - 1) < 1e-9);
  const over = walletDonut(p, '2026-10', 500);
  assert.equal(over.over, 115);
  assert.equal(over.remaining, 0);
  assert.equal(over.remainingFrac, 0);
  assert.ok(Math.abs(over.segments.reduce((a, x) => a + x.frac, 0) - 1) < 1e-9);
  const free = walletDonut(p, '2026-10', undefined);
  assert.equal(free.budget, null);
  assert.equal(free.remaining, null);
  assert.equal(free.used, null);
  assert.equal(walletDonut([], '2026-10', 100).count, 0);
});

test('ringDashes lays slices end to end with a small gap', () => {
  const d = ringDashes([0.5, 0.25], 100);
  assert.deepEqual(d.map(x => x.off), [-0, -50]);
  assert.equal(d[0].len, 48.5);
  assert.equal(d[1].len, 23.5);
  assert.equal(ringDashes([0.01], 100)[0].len, 1);
});

test('savings total, milestones and counter easing', () => {
  const p = [{ amount: 400, normal: 600, date: '2026-10-02' }, { amount: 100, normal: 50, date: '2026-10-02' }, { amount: 100, date: '2026-10-02' }];
  assert.equal(totalSaved(p), 200);
  assert.deepEqual(milestone(0), { prev: 0, next: 100, frac: 0, left: 100, reached: 0 });
  const m = milestone(350);
  assert.deepEqual([m.prev, m.next, m.left, m.reached], [250, 500, 150, 2]);
  assert.equal(m.frac, 0.4);
  assert.equal(milestone(250000).next, null);
  assert.equal(milestone(250000).frac, 1);
  assert.equal(countAt(0, 100, 0), 0);
  assert.equal(countAt(0, 100, 1), 100);
  assert.ok(countAt(0, 100, 0.5) > 50);
  assert.equal(countAt(10, 20, 5), 20);
});

test('radarAxes needs three real genres, drops "Diğer", pads to five and keeps a stable order', () => {
  assert.equal(radarAxes([{ name: 'Aksiyon', percent: 60 }, { name: 'RPG', percent: 40 }]), null);
  const r = radarAxes([
    { name: 'RPG', percent: 31, color: '#8b5cf6' }, { name: 'Diğer', percent: 19 }, { name: 'Aksiyon', percent: 26 }, { name: 'Macera', percent: 16 },
  ]);
  assert.deepEqual(r.axes.map(a => a.name), ['Aksiyon', 'Macera', 'RPG', 'Strateji', 'Simülasyon']);
  assert.deepEqual(r.axes.map(a => a.percent), [26, 16, 31, 0, 0]);
  assert.equal(r.max, 40);
  assert.equal(radarAxes([{ name: 'A', percent: 5 }, { name: 'B', percent: 4 }, { name: 'C', percent: 3 }]).max, 20);
  const nine = radarAxes(Array.from({ length: 12 }, (_, i) => ({ name: 'G' + i, percent: 12 - i })));
  assert.equal(nine.axes.length, 8);
  assert.deepEqual(polar(0, 4, 1, 100, 150, 150), [150, 50]);
  assert.deepEqual(polar(1, 4, 0.5, 100, 150, 150), [200, 150]);
});

test('parseRemainingMs reads Turkish and English countdown text', () => {
  assert.equal(parseRemainingMs('İndirim: 1 gün 5 saat kaldı · 24 Eki 19:45'), 29 * 36e5);
  assert.equal(parseRemainingMs('3 saat 59 dk kaldı'), 3 * 36e5 + 59 * 6e4);
  assert.equal(parseRemainingMs('Sale: 4 days 3 hours left'), 4 * 864e5 + 3 * 36e5);
  assert.equal(parseRemainingMs('Sale: 12 minutes left'), 12 * 6e4);
  assert.equal(parseRemainingMs('1 dakikadan az kaldı'), 30e3);
  assert.equal(parseRemainingMs('Bitiş tarihi mağazada belirtilmemiş'), null);
  assert.equal(parseRemainingMs(''), null);
});

test('ringState scales over seven days and flags urgency', () => {
  assert.deepEqual(ringState(7 * 864e5), { frac: 1, tone: 'ok' });
  assert.equal(ringState(30 * 864e5).frac, 1);
  assert.equal(ringState(36e5 * 60).tone, 'ok');
  assert.equal(ringState(36e5 * 40).tone, 'warn');
  assert.equal(ringState(36e5 * 30).tone, 'warn');
  assert.equal(ringState(36e5 * 5).tone, 'hot');
  assert.equal(ringState(36e5).tone, 'crit');
  assert.equal(ringState(-1), null);
  assert.equal(ringState(NaN), null);
});

test('endDayCounts groups by Istanbul day and heatGrid starts on Monday', () => {
  const c = endDayCounts([
    { discount_ends_at: '2026-11-30T23:59:00+00:00' }, // 02:59 Istanbul, 1 Dec
    { discount_ends_at: '2026-12-01T10:00:00+00:00' },
    { discount_ends_at: '2026-11-24T16:00:00+00:00' },
    { discount_ends_at: null }, {},
  ]);
  assert.deepEqual(c, { '2026-12-01': 2, '2026-11-24': 1 });
  assert.equal(heatLevel(0, 10), 0);
  assert.equal(heatLevel(1, 100), 1);
  assert.equal(heatLevel(100, 100), 4);
  assert.equal(heatLevel(25, 100), 3);
  assert.equal(heatLevel(1, 5000), 1);
  assert.equal(heatLevel(10, 5000), 2);
  const g = heatGrid(c, '2026-11-21', 3); // Saturday
  assert.equal(g.weeks.length, 3);
  assert.equal(g.weeks[0][0].day, '2026-11-16');
  assert.equal(g.weeks[0][5].today, true);
  assert.equal(g.weeks[0][4].past, true);
  assert.equal(g.weeks[0][6].past, false);
  assert.equal(g.max, 2);
  const dec1 = g.weeks.flat().find(x => x.day === '2026-12-01');
  assert.equal(dec1.count, 2);
  assert.equal(dec1.level, 4);
});

test('priceDrops reports only real drops against the previous different price', () => {
  const rows = [
    { product_id: 'a', day: '2026-11-10', price: 100, base_price: 100 },
    { product_id: 'a', day: '2026-11-20', price: 60, base_price: 100 },
    { product_id: 'b', day: '2026-11-01', price: 50, base_price: 100 },
    { product_id: 'b', day: '2026-11-20', price: 100, base_price: 100 }, // price rise
    { product_id: 'c', day: '2026-11-20', price: 40, base_price: 100 }, // first sighting
    { product_id: 'd', day: '2026-11-15', price: 90, base_price: 100 },
    { product_id: 'd', day: '2026-11-21', price: 90, base_price: 100 }, // same price again
    { product_id: 'e', day: '2026-11-05', price: 200, base_price: 200 },
    { product_id: 'e', day: '2026-11-21', price: 100, base_price: 200 },
    { product_id: 'f', day: '2026-11-05', price: 100, base_price: 100 },
    { product_id: 'f', day: '2026-11-20', price: 90, base_price: 100 },
    { product_id: 'g', day: '2026-11-05', price: 10, base_price: 10 },
    { product_id: 'g', day: '2026-11-21', price: 0, base_price: 10 }, // free is not a drop here
    null, { product_id: 'h' },
  ];
  const d = priceDrops(rows);
  assert.deepEqual(d.map(x => x.id), ['e', 'a', 'f']);
  assert.deepEqual([d[0].from, d[0].to, d[0].pct], [200, 100, 50]);
  assert.equal(priceDrops(rows, 1).length, 1);
  assert.equal(dropAge('2026-11-19', '2026-11-21'), 2);
  assert.equal(dropAge('2026-11-22', '2026-11-21'), 0);
});

test('timelineDays dedupes, ranks by wishlist, limits per day and counts the gap', () => {
  const g = (name, date, extra) => ({ name, release_date: date, title_key: name.toLowerCase(), ...extra });
  const list = [
    g('Late', '2026-12-30'), g('Past', '2026-11-20'), g('Far', '2027-03-01'),
    g('B', '2026-11-25', { wishlist_rank: 5 }), g('A', '2026-11-25', { wishlist_rank: 1 }), g('C', '2026-11-25'), g('D', '2026-11-25'), g('E', '2026-11-25'), g('F', '2026-11-25'),
    g('A', '2026-11-25', { platform: 'xbox' }), // duplicate title/day
    g('Today', '2026-11-21'), { name: 'NoDate', release_date: '' }, null,
  ];
  const t = timelineDays(list, '2026-11-21', 60, 4);
  assert.deepEqual(t.map(x => x.date), ['2026-11-21', '2026-11-25', '2026-12-30']);
  assert.deepEqual(t.map(x => x.gap), [0, 4, 39]);
  assert.deepEqual(t[1].games.map(x => x.name), ['A', 'B', 'C', 'D']);
  assert.equal(t[1].more, 2);
  assert.equal(t[1].total, 6);
});

test('packCircles never overlaps and stays inside the box', () => {
  const items = [['Aksiyon', 3562], ['RPG', 1578], ['Bağımsız', 1255], ['Macera', 900], ['Strateji', 400], ['Spor', 120], ['MMO', 40], ['Yarış', 0]].map(([name, count]) => ({ name, count }));
  const out = packCircles(items, 620, 340);
  assert.equal(out.length, 7);
  assert.equal(out[0].name, 'Aksiyon');
  for (const a of out) {
    assert.ok(a.x - a.r >= 0 && a.x + a.r <= 620 && a.y - a.r >= 0 && a.y + a.r <= 340, a.name + ' outside');
    for (const b of out) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r, a.name + ' overlaps ' + b.name);
  }
  assert.ok(out[0].r > out[3].r && out[3].r > out[6].r);
  assert.deepEqual(packCircles([], 100, 100), []);
});

test('library value: appid first, title key second, one dominant currency, unplayed and best value', () => {
  assert.equal(titleKey("Baldur's Gate 3™"), 'baldur s gate 3');
  assert.equal(parseMinutes('42 sa'), 2520);
  assert.equal(parseMinutes('1,5 sa'), 90);
  assert.equal(parseMinutes('1.234 sa'), 74040);
  assert.equal(parseMinutes('30 dk'), 30);
  assert.equal(parseMinutes('12 h'), 720);
  assert.equal(parseMinutes('Hiç oynanmadı'), 0);
  assert.equal(appIdFromIcon('https://media.steampowered.com/steamcommunity/public/images/apps/1145360/abc.jpg'), '1145360');
  assert.equal(appIdFromIcon(''), null);
  const offers = {
    byAppid: { 1145360: { price: 25, currency: 'USD' }, 1086940: { price: 60, currency: 'USD' } },
    byKey: { celeste: { price: 20, currency: 'USD' }, 'euro game': { price: 10, currency: 'EUR' } },
  };
  const rows = [
    { appid: '1145360', name: 'Hades', minutes: 2520 },
    { appid: '1086940', name: "Baldur's Gate 3", minutes: 0 },
    { appid: null, name: 'Celeste', minutes: 30 },
    { appid: null, name: 'Euro Game', minutes: 60 },
    { appid: null, name: 'Unknown', minutes: 60 },
  ];
  const v = libraryValue(rows, offers);
  assert.equal(v.currency, 'USD');
  assert.equal(v.total, 105);
  assert.equal(v.count, 3);
  assert.equal(v.unpriced, 2);
  assert.equal(v.unplayedValue, 60);
  assert.equal(v.unplayedCount, 1);
  assert.equal(v.best.name, 'Hades');
  assert.deepEqual(v.top.map(x => x.name), ["Baldur's Gate 3", 'Hades', 'Celeste']);
  assert.equal(libraryValue([], { byAppid: {}, byKey: {} }).count, 0);
});
