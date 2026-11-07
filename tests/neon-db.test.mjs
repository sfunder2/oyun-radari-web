import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSql,deleteSql,patchSql,upsertSql,neonDb} from '../scripts/neon-db.mjs';

test('select: filters, in-list, order, limit', () => {
  const q = selectSql('ps_products?select=id,price&discount_ends_at=not.is.null&id=in.(a,b,"c,d")&order=discount_percent.desc,id&limit=5');
  assert.equal(q.text, 'SELECT "id", "price" FROM "ps_products" WHERE NOT ("discount_ends_at" IS NULL) AND "id" IN ($1,$2,$3) ORDER BY "discount_percent" DESC, "id" ASC LIMIT 5');
  assert.deepEqual(q.params, ['a', 'b', 'c,d']);
});
test('select: or group and encoded values', () => {
  const q = selectSql('game_meta?select=title_key&or=(requirements.is.null,age_notes.is.null)&steam_appid=not.is.null&title_key=eq.' + encodeURIComponent('a&b'));
  assert.equal(q.text, 'SELECT "title_key" FROM "game_meta" WHERE ("requirements" IS NULL OR "age_notes" IS NULL) AND NOT ("steam_appid" IS NULL) AND "title_key" = $1');
  assert.deepEqual(q.params, ['a&b']);
});
test('select: star, offset, empty in', () => {
  assert.equal(selectSql('game_scores?select=*&title_key=in.()').text, 'SELECT * FROM "game_scores" WHERE false');
  assert.equal(selectSql('t?select=a&limit=10&offset=20').text, 'SELECT "a" FROM "t" LIMIT 10 OFFSET 20');
});
test('delete and patch', () => {
  assert.deepEqual(deleteSql('upcoming_games?release_date=lt.2026-01-01'), {text: 'DELETE FROM "upcoming_games" WHERE "release_date" < $1', params: ['2026-01-01']});
  const p = patchSql('ps_products?id=eq.X', {price: 5, name: 'n'});
  assert.match(p.text, /^UPDATE "ps_products" SET \("price","name"\) = \(SELECT "price","name" FROM json_populate_record\(null::"ps_products", \$2::json\)\) WHERE "id" = \$1$/);
  assert.deepEqual(p.params, ['X', '{"price":5,"name":"n"}']);
});
test('upsert: update list and do-nothing', () => {
  assert.match(upsertSql('ps_state', [{key: 'a', value: {x: 1}}], 'key').text, /ON CONFLICT \("key"\) DO UPDATE SET "value" = EXCLUDED\."value"$/);
  assert.match(upsertSql('x', [{a: 1, b: 2}], 'a,b').text, /DO NOTHING$/);
});
test('rejects unsafe identifiers and operators', () => {
  assert.throws(() => selectSql('t;drop table x?select=a'), /Geçersiz/);
  assert.throws(() => selectSql('t?select=a&b=wat.1'), /Desteklenmeyen/);
  assert.throws(() => selectSql('t?select=a(b)'), /Desteklenmeyen/);
});
test('upsert drops unknown columns and retries; rpc maps args and result', async () => {
  const calls = [];
  const run = async (text, params) => {
    calls.push(text);
    if (text.startsWith('INSERT') && text.includes('"ghost"')) { const e = new Error('column "ghost" of relation "t" does not exist'); e.code = '42703'; throw e; }
    if (text.includes('pg_proc')) return [{names: ['rows'], types: ['jsonb'], retset: false, ret: 'integer'}];
    if (text.startsWith('SELECT public.')) return [{result: 3}];
    return [];
  };
  const db = neonDb('postgres://unused', {run, sleep: async () => {}, log: () => {}});
  await db.upsert('t', [{id: 1, ghost: 2}], 'id');
  assert.equal(calls.filter(c => c.startsWith('INSERT')).length, 2);
  assert.equal(await db.rpc('merge_ps_genres', {rows: [1]}), 3);
  assert.ok(calls.some(c => c.includes('"rows" => $1::jsonb')));
});
test('transient errors retry; others fail immediately', async () => {
  let n = 0;
  const run = async () => { n++; const e = new Error('canceling statement'); e.code = '57014'; if (n < 3) throw e; return [{ok: 1}]; };
  const db = neonDb('postgres://unused', {run, sleep: async () => {}, log: () => {}});
  assert.deepEqual(await db.select('t?select=ok'), [{ok: 1}]);
  const bad = neonDb('postgres://unused', {run: async () => { const e = new Error('nope'); e.code = '42P01'; throw e; }, sleep: async () => {}, log: () => {}});
  await assert.rejects(bad.select('t?select=a'), /nope/);
});
