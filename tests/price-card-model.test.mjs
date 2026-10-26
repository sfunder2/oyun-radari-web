import test from 'node:test';
import assert from 'node:assert/strict';
import {priceCardModel} from '../scripts/price-card-model.mjs';

test('formats two genuine TRY offers with savings',()=>{
 const c=priceCardModel([{store:'Steam',price:750,currency:'TRY',originalPrice:1000,originalPriceVerified:true},{store:'Xbox',price:1000,currency:'TRY'}]);
 assert.equal(c.state,'ready');
 assert.equal(c.best.store,'Steam');
 assert.match(c.best.priceText,/750/);
 assert.match(c.savings.amountText,/250/);
 assert.equal(c.savings.percentText,'%25');
 assert.equal(c.offers[0].discountText,'%25 indirim');
});
test('mixed currencies require selection instead of an invented winner',()=>{
 const c=priceCardModel([{store:'A',price:10,currency:'USD'},{store:'B',price:100,currency:'TRY'}]);
 assert.equal(c.state,'choose-currency');
 assert.equal(c.best,null);
 assert.deepEqual(c.currencies,['TRY','USD']);
});
test('empty and single-store states omit fabricated savings',()=>{
 assert.equal(priceCardModel([]).state,'unavailable');
 const c=priceCardModel([{store:'Steam',price:10,currency:'USD'}]);
 assert.equal(c.savings,null);
 assert.equal(c.offers[0].discountText,null);
});

test('provides a clear message when a currency choice is needed',()=>{
 const m=priceCardModel([{store:'Steam',price:10,currency:'USD'},{store:'Xbox',price:800,currency:'TRY'}]);
 assert.equal(m.state,'choose-currency');
 assert.match(m.message,/para birimi/);
 assert.equal(m.best,null);
});
test('provides a clear message for unavailable selected currency',()=>{
 const m=priceCardModel([{store:'Steam',price:10,currency:'USD'}],{currency:'TRY'});
 assert.equal(m.state,'unavailable');
 assert.match(m.message,/fiyat bulunamadı/);
 assert.equal(m.savings,null);
});
