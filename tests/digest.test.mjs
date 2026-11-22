import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runWeekly, runPush, parseEpicFree, loadAdvice, historyPath, resendMailer, ntfySender } from '../scripts/digest.mjs';

const D = s => Date.parse(s + 'T00:00:00Z');
const NOW = D('2026-11-21') + 10 * 36e5;
const iso = ms => new Date(ms).toISOString();
const TOPIC = 'oyunradari-0123456789abcdef01234567';

// Küçük sahte veritabanı: radar_digest, radar_user_data, ps_products, store_offers, ps_price_history.
function fakeSb({ digest = [], data = {}, prices = {}, offers = [], history = {} } = {}) {
  const calls = [];
  return {
    calls,
    async select(path) {
      calls.push(['select', path]);
      if (path.startsWith('radar_digest')) return digest;
      if (path.startsWith('radar_user_data')) { const id = decodeURIComponent(path.split('user_id=eq.')[1]); return data[id] ? [{ favorites: data[id] }] : []; }
      if (path.startsWith('ps_products')) return Object.entries(prices).map(([id, p]) => ({ id, ...p }));
      if (path.startsWith('store_offers')) return offers;
      if (path.startsWith('ps_price_history')) return history[decodeURIComponent(path.split('product_id=eq.')[1])] || [];
      return [];
    },
    async patch(path, body) { calls.push(['patch', path, body]); },
  };
}
const get = async () => ({ data: { Catalog: { searchStore: { elements: [] } } } });
const freshPrice = (price, extra = {}) => ({ price, currency: 'TRY', original_price: null, discount_percent: 0, checked_at: iso(NOW - 36e5), ...extra });
const favs = [{ id: 'PS1', name: 'Hit Game', status: 'wish', currency: 'TRY', price: 500, target: 300 }];

test('runWeekly sends one digest, records it, and does not repeat inside 6.5 days', async () => {
  const sb = fakeSb({ digest: [{ user_id: 'u1', email: 'a@example.com', lang: 'tr', last_digest_at: null }], data: { u1: favs }, prices: { PS1: freshPrice(250) } });
  const sent = [];
  const r = await runWeekly({ sb, get, mail: async m => sent.push(m), now: NOW });
  assert.deepEqual(r, { users: 1, sent: 1, skipped: 0 });
  assert.equal(sent[0].to, 'a@example.com');
  assert.match(sent[0].subject, /Hit Game/);
  const patch = sb.calls.find(c => c[0] === 'patch');
  assert.equal(patch[2].last_digest_at, iso(NOW));

  const again = fakeSb({ digest: [{ user_id: 'u1', email: 'a@example.com', lang: 'tr', last_digest_at: iso(NOW - 3 * 864e5) }], data: { u1: favs }, prices: { PS1: freshPrice(250) } });
  const none = [];
  const r2 = await runWeekly({ sb: again, get, mail: async m => none.push(m), now: NOW });
  assert.equal(r2.skipped, 1);
  assert.equal(none.length, 0);
});

test('runWeekly sends nothing when there is no news, and nothing in dry mode', async () => {
  const quiet = fakeSb({ digest: [{ user_id: 'u1', email: 'a@example.com', lang: 'en', last_digest_at: null }], data: { u1: favs }, prices: { PS1: freshPrice(900) } });
  const sent = [];
  const r = await runWeekly({ sb: quiet, get, mail: async m => sent.push(m), now: NOW });
  assert.equal(r.sent, 0);
  assert.equal(sent.length, 0);
  assert.ok(!quiet.calls.some(c => c[0] === 'patch'));
  const dry = fakeSb({ digest: [{ user_id: 'u1', email: 'a@example.com', lang: 'tr', last_digest_at: null }], data: { u1: favs }, prices: { PS1: freshPrice(250) } });
  const logs = [];
  await runWeekly({ sb: dry, get, mail: async () => { throw new Error('must not send'); }, now: NOW, dry: true, log: m => logs.push(m) });
  assert.ok(!dry.calls.some(c => c[0] === 'patch'));
  assert.match(logs[0], /\[dry\]/);
});

test('runWeekly keeps going when one user fails', async () => {
  const sb = fakeSb({ digest: [{ user_id: 'bad', email: 'b@example.com', lang: 'tr' }, { user_id: 'u1', email: 'a@example.com', lang: 'tr' }], data: { u1: favs }, prices: { PS1: freshPrice(250) } });
  const sent = [];
  const logs = [];
  const r = await runWeekly({ sb, get, mail: async m => { if (m.to === 'b@example.com') throw new Error('boom'); sent.push(m); }, now: NOW, log: m => logs.push(m) });
  assert.equal(r.sent, 1);
  assert.equal(sent.length, 1);
});

test('runPush: target hit once per day, free-game reminders once per threshold, bad topics ignored', async () => {
  const epic = async () => ({ data: { Catalog: { searchStore: { elements: [{
    id: 'e1', title: 'Epic Free', price: { totalPrice: { discountPrice: 0, originalPrice: 500 } }, productSlug: 'epic-free',
    keyImages: [{ type: 'Thumbnail', url: 'https://img.test/e.jpg' }],
    promotions: { promotionalOffers: [{ promotionalOffers: [{ startDate: iso(NOW - 864e5), endDate: iso(NOW + 5 * 36e5) }] }] },
  }] } } } });
  const sb = fakeSb({ digest: [{ user_id: 'u1', lang: 'tr', ntfy_topic: TOPIC, pushed: [] }, { user_id: 'u2', lang: 'tr', ntfy_topic: '../evil', pushed: [] }], data: { u1: favs }, prices: { PS1: freshPrice(250) } });
  const out = [];
  const r = await runPush({ sb, get: epic, ntfy: async m => out.push(m), now: NOW });
  assert.equal(r.users, 1);
  assert.equal(r.sent, 2);
  assert.deepEqual(out.map(m => m.topic), [TOPIC, TOPIC]);
  assert.match(out[0].title, /Ücretsiz oyun/);
  assert.match(out[0].message, /Epic Free · Epic Games · 5 saat kaldı/);
  assert.match(out[1].title, /Hedef fiyata ulaştı/);
  const saved = sb.calls.find(c => c[0] === 'patch')[2].pushed;
  assert.ok(saved.includes('free:epic:e1:24') && saved.includes('hit:PS1:2026-11-21'));

  const sb2 = fakeSb({ digest: [{ user_id: 'u1', lang: 'tr', ntfy_topic: TOPIC, pushed: saved }], data: { u1: favs }, prices: { PS1: freshPrice(250) } });
  const out2 = [];
  await runPush({ sb: sb2, get: epic, ntfy: async m => out2.push(m), now: NOW });
  assert.equal(out2.length, 0, 'aynı olay ikinci kez gitmez');
  const out3 = [];
  await runPush({ sb: sb2, get: epic, ntfy: async m => out3.push(m), now: NOW + 4 * 36e5 });
  assert.equal(out3.length, 1, 'bitişe 1 saat kala 2 saatlik eşik yeni bir hatırlatma verir');
  assert.match(out3[0].message, /dakika kaldı|1 saat kaldı/);
});

test('parseEpicFree only takes live, fully discounted promos', () => {
  const el = (over = {}) => ({ id: 'x', title: 'T', price: { totalPrice: { discountPrice: 0, originalPrice: 100 } }, productSlug: 's', promotions: { promotionalOffers: [{ promotionalOffers: [{ startDate: iso(NOW - 1e6), endDate: iso(NOW + 1e6) }] }] }, ...over });
  const mk = els => ({ data: { Catalog: { searchStore: { elements: els } } } });
  assert.equal(parseEpicFree(mk([el()]), NOW).length, 1);
  assert.equal(parseEpicFree(mk([el({ price: { totalPrice: { discountPrice: 50, originalPrice: 100 } } })]), NOW).length, 0);
  assert.equal(parseEpicFree(mk([el({ promotions: { promotionalOffers: [] } })]), NOW).length, 0);
  assert.equal(parseEpicFree(mk([el({ productSlug: '../x?y' })]), NOW).length, 0);
  assert.equal(parseEpicFree(null, NOW).length, 0);
});

test('loadAdvice reads history only for fresh, priced wishlist games and stays in budget', async () => {
  const hist = Array.from({ length: 40 }, (_, i) => ({ day: iso(D('2026-09-01') + i * 864e5).slice(0, 10), price: i < 20 ? 500 : 300 }));
  const sb = fakeSb({ history: { PS1: hist, PS2: hist } });
  const list = [{ id: 'PS1', status: 'wish' }, { id: 'PS2', status: 'done' }, { id: 'PS3', status: 'wish' }];
  const prices = { PS1: { price: 305, checkedAt: iso(NOW - 36e5) }, PS2: { price: 305, checkedAt: iso(NOW) }, PS3: { price: 305, checkedAt: iso(NOW - 9 * 864e5) } };
  const a = await loadAdvice(sb, list, prices, NOW);
  assert.deepEqual(Object.keys(a), ['PS1']);
  assert.equal(a.PS1.verdict, 'buy');
  assert.equal(historyPath({ id: 'steam:42' }).startsWith('offer_price_history'), true);
  assert.equal(historyPath({ id: 'bad id!' }), null);
});

test('mail and ntfy senders post the right payloads and surface failures', async () => {
  const seen = [];
  const f = async (url, init) => { seen.push([url, JSON.parse(init.body), init.headers]); return { ok: true, text: async () => '' }; };
  await resendMailer({ key: 'k', from: 'A <a@x.test>', fetchImpl: f })({ to: 'u@x.test', subject: 'S', text: 't', html: 'h' });
  assert.equal(seen[0][0], 'https://api.resend.com/emails');
  assert.deepEqual(seen[0][1].to, ['u@x.test']);
  assert.equal(seen[0][2].Authorization, 'Bearer k');
  await ntfySender({ fetchImpl: f })({ topic: TOPIC, title: 'Ücretsiz oyun', message: 'ş', click: 'https://x.test' });
  assert.equal(seen[1][1].title, 'Ücretsiz oyun');
  await assert.rejects(resendMailer({ key: 'k', from: 'x', fetchImpl: async () => ({ ok: false, status: 403, text: async () => 'no' }) })({ to: 'a', subject: '', text: '', html: '' }), /Resend HTTP 403/);
  await assert.rejects(ntfySender({ fetchImpl: async () => ({ ok: false, status: 500 }) })({ topic: TOPIC }), /ntfy HTTP 500/);
});

test('the SQL keeps the email server-chosen and the sending record server-only', () => {
  const sql = readFileSync(new URL('../supabase/schema-v51-fiyat-merkezi.sql', import.meta.url), 'utf8');
  assert.match(sql, /select u\.email from auth\.users u where u\.id=new\.user_id/);
  assert.match(sql, /security definer set search_path=public,auth/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /ntfy_topic ~ '\^oyunradari-\[a-f0-9\]\{24\}\$'/);
  assert.doesNotMatch(sql, /to anon/);
});
