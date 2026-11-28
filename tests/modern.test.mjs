import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fold, fuzzyScore, parseCountText, formatCount, easeOut, applyOrder, moveId, stepId,
  sanitizeViews, badgeCount, chunkNames, chunksFor, goIndex, priceDropMessage,
} from '../assets/modern-20261128.js';

test('fold: Türkçe harfler ve aksanlar yok sayılır', () => {
  assert.equal(fold('İSTEK Listem'), 'istek listem');
  assert.equal(fold('Şöyle çağrı ğ ü'), 'soyle cagri g u');
  assert.equal(fold('Café'), 'cafe');
});

test('fuzzyScore: tüm sözcükler geçmeli, baştaki eşleşme önde', () => {
  assert.equal(fuzzyScore('xyz', 'Temayı değiştir'), null);
  assert.equal(fuzzyScore('', 'her şey'), 0);
  assert.ok(fuzzyScore('tema', 'Temayı değiştir') > fuzzyScore('tema', 'Klasik tema'));
  assert.ok(fuzzyScore('istek', 'İstek listem') !== null);
  assert.equal(fuzzyScore('degistir tema', 'Temayı değiştir') !== null, true);
});

test('parseCountText: TR ve EN sayı biçimleri', () => {
  assert.deepEqual(parseCountText('777 B', 'tr'), { prefix: '', value: 777, decimals: 0, suffix: ' B' });
  assert.deepEqual(parseCountText('₺1.234,50', 'tr'), { prefix: '₺', value: 1234.5, decimals: 2, suffix: '' });
  assert.deepEqual(parseCountText('$1,234.5 left', 'en'), { prefix: '$', value: 1234.5, decimals: 1, suffix: ' left' });
  assert.equal(parseCountText('yok', 'tr'), null);
  assert.equal(parseCountText('', 'tr'), null);
});

test('formatCount ve easeOut', () => {
  assert.equal(formatCount(1234.5, 2, 'tr').replace(/\s/g, ''), '1.234,50');
  assert.equal(formatCount(1234, 0, 'en'), '1,234');
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
  assert.equal(easeOut(2), 1);
  assert.ok(easeOut(0.5) > 0.5);
});

test('applyOrder / moveId / stepId', () => {
  assert.deepEqual(applyOrder(['a', 'b', 'c'], ['c', 'a']), ['c', 'a', 'b']);
  assert.deepEqual(applyOrder(['a', 'b'], null), ['a', 'b']);
  assert.deepEqual(applyOrder(['a', 'b', 'c', 'd'], ['b']), ['b', 'a', 'c', 'd']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 'a', 'c'), ['b', 'c', 'a']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);
  assert.deepEqual(moveId(['a', 'b'], 'a', 'zz'), ['a', 'b']);
  assert.deepEqual(stepId(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c']);
  assert.deepEqual(stepId(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c']);
  assert.deepEqual(stepId(['a', 'b', 'c'], 'c', 1), ['a', 'b', 'c']);
});

test('sanitizeViews: bozuk kayıtları atar, sınırları uygular', () => {
  assert.deepEqual(sanitizeViews('x'), []);
  const out = sanitizeViews([
    { id: 'a', name: '  Ucuz RPG  ', values: { 'select:Tür': 'RPG', bad: 5, ok: true } },
    { id: 1, name: 'x', values: {} },
    { id: 'b', name: 'x'.repeat(100), values: {} },
    null,
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, 'Ucuz RPG');
  assert.deepEqual(out[0].values, { 'select:Tür': 'RPG', ok: true });
  assert.equal(out[1].name.length, 40);
  assert.equal(sanitizeViews(Array.from({ length: 30 }, (_, i) => ({ id: 'i' + i, name: 'n', values: {} }))).length, 12);
});

test('badgeCount: yalnız hedef fiyata inenler', () => {
  assert.equal(badgeCount([{ price: 100, target: 150 }, { price: 200, target: 150 }, { price: null, target: 5 }, { price: 50, target: null }, null]), 1);
  assert.equal(badgeCount(undefined), 0);
});

test('chunkNames / chunksFor / goIndex', () => {
  const text = 'import("./Deals-AbC123xy.js");x=`./Favorites-Zz9_yy-1.js`;"./x-a.js";"./Deals-AbC123xy.js"';
  assert.deepEqual(chunkNames(text), ['Deals-AbC123xy.js', 'Favorites-Zz9_yy-1.js']);
  assert.deepEqual(chunksFor(chunkNames(text), 'Deals'), ['Deals-AbC123xy.js']);
  assert.deepEqual(chunkNames(null), []);
  assert.equal(goIndex('w'), 2);
  assert.equal(goIndex('z'), null);
  assert.equal(goIndex('constructor'), null);
});

test('priceDropMessage: yalnız gerçek fiyat düşüşü', () => {
  const rec = { name: 'Oyun', price: 50, currency: 'TRY' };
  assert.match(priceDropMessage({ record: rec, old_record: { price: 100 } }, 'tr'), /Oyun: .*100.*→.*50/);
  assert.equal(priceDropMessage({ record: rec, old_record: { price: 50 } }), null);
  assert.equal(priceDropMessage({ record: rec, old_record: { price: 10 } }), null);
  assert.equal(priceDropMessage({ record: rec }), null);
  assert.equal(priceDropMessage({ record: { ...rec, name: 5 }, old_record: { price: 100 } }), null);
});
