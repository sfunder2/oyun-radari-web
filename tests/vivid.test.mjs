import test from 'node:test';
import assert from 'node:assert/strict';
import {genreKey,genreLabel,discountTier,parsePct,parseMoney,formatMoney,ease} from '../assets/vivid-20261108.js';

test('tür anahtarı Türkçe ve İngilizce türlerden gelir; ilk eşleşen tür kazanır', () => {
  assert.equal(genreKey({genres:['Aksiyon','Macera']}), 'action');
  assert.equal(genreKey({genres:['Role-Playing (RPG)']}), 'rpg');
  assert.equal(genreKey({genres:['Rol yapma']}), 'rpg');
  assert.equal(genreKey({genres:['Strateji']}), 'strategy');
  assert.equal(genreKey({genres:['Simülasyon']}), 'sim');
  assert.equal(genreKey({genres:['Yarış']}), 'racing');
  assert.equal(genreKey({genres:['Bilinmeyen tür']}), '');
  assert.equal(genreKey({}), '');
  assert.equal(genreKey(null), '');
});

test('tür etiketi ilk dolu türdür', () => {
  assert.equal(genreLabel({genres:['', 'RPG']}), 'RPG');
  assert.equal(genreLabel({genres:[]}), '');
});

test('indirim basamakları 25/50/75 sınırlarında değişir', () => {
  assert.equal(discountTier(0), 0);
  assert.equal(discountTier(NaN), 0);
  assert.equal(discountTier(10), 1);
  assert.equal(discountTier(24), 1);
  assert.equal(discountTier(25), 2);
  assert.equal(discountTier(49), 2);
  assert.equal(discountTier(50), 3);
  assert.equal(discountTier(74), 3);
  assert.equal(discountTier(75), 4);
  assert.equal(discountTier(100), 4);
});

test('yüzde metinden okunur', () => {
  assert.equal(parsePct('%15 indirim'), 15);
  assert.equal(parsePct('−%60'), 60);
  assert.equal(parsePct('45% off'), 45);
  assert.equal(parsePct('—'), 0);
  assert.equal(parsePct('%0'), 0);
});

test('para metni her iki ondalık biçiminde ayrışır ve aynı biçimde yazılır', () => {
  const tr = parseMoney('₺1.088,00');
  assert.equal(tr.value, 1088); assert.equal(tr.decimals, 2); assert.equal(tr.dec, ',');
  assert.equal(formatMoney(1234.5, tr), '1.234,50');
  const en = parseMoney('$1,299.99');
  assert.equal(en.value, 1299.99); assert.equal(en.dec, '.');
  assert.equal(formatMoney(1500, en), '1,500.00');
  const whole = parseMoney('₺952');
  assert.equal(whole.value, 952); assert.equal(whole.decimals, 0);
  assert.equal(formatMoney(1000, whole), '1.000');
  assert.equal(parseMoney('Fiyat açıklanmadı'), null);
});

test('sayaç eğrisi 0 ile 1 arasında yumuşak ilerler', () => {
  assert.equal(ease(0), 0); assert.equal(ease(1), 1);
  assert.ok(ease(.5) > .5 && ease(.5) < 1);
});
