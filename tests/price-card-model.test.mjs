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
