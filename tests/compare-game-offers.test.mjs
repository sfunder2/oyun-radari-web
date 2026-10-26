import test from 'node:test';
import assert from 'node:assert/strict';
import {compareGameOffers} from '../scripts/compare-game-offers.mjs';

test('finds cheapest matching-currency offer deterministically',()=>{
 const r=compareGameOffers([{store:'Steam',price:500,currency:'TRY'},
 {store:'Xbox',price:400,currency:'TRY'},
 {store:'Other',price:1,currency:'USD'}],{currency:'TRY'});
 assert.equal(r.best.store,'Xbox');
 assert.equal(r.excluded,1);
 assert.deepEqual(r.offers.map(x=>x.price),[400,500]);
});
test('rejects invalid prices and keeps zero-cost offers',()=>{
 const r=compareGameOffers([{store:'Free',price:0,currency:'TRY'},
 {store:'Bad',price:-5,currency:'TRY'},
 {store:'Infinite',price:Infinity,currency:'TRY'}]);
 assert.equal(r.best.price,0);
 assert.equal(r.excluded,2);
});
test('returns empty comparison for unavailable currency',()=>{
 const r=compareGameOffers([{store:'Steam',price:20,currency:'USD'}],{currency:'EUR'});
 assert.equal(r.best,null);assert.equal(r.offers.length,0);
});
test('validates input',()=>{
 assert.throws(()=>compareGameOffers(null),TypeError);
 assert.throws(()=>compareGameOffers([],{currency:'invalid'}),TypeError);
});

test('savings are calculated only between valid same-currency stores',()=>{
 const result=compareGameOffers([
  {store:'A',price:90,currency:'TRY'},
  {store:'B',price:120,currency:'TRY'},
  {store:'C',price:1,currency:'USD'}
 ],{currency:'TRY'});
 assert.equal(result.savings,30);
 assert.equal(result.savingsPercent,25);
});
test('single store or free-only stores do not invent percentage savings',()=>{
 const single=compareGameOffers([{store:'Only',price:49,currency:'TRY'}]);
 assert.equal(single.savings,null);
 assert.equal(single.savingsPercent,null);
 const free=compareGameOffers([{store:'A',price:0,currency:'TRY'},{store:'B',price:0,currency:'TRY'}]);
 assert.equal(free.savings,0);
 assert.equal(free.savingsPercent,null);
});

test('mixed currencies never choose a price winner from feed ordering',()=>{
 const offers=[{store:'Steam',price:1,currency:'USD'},{store:'Xbox',price:300,currency:'TRY'}];
 const result=compareGameOffers(offers);
 assert.equal(result.best,null);
 assert.equal(result.requiresCurrencySelection,true);
 assert.equal(result.currency,null);
 assert.deepEqual(result.availableCurrencies,['TRY','USD']);
 const selected=compareGameOffers(offers,{currency:'TRY'});
 assert.equal(selected.best.store,'Xbox');
 assert.equal(selected.requiresCurrencySelection,false);
});

test('invalid non-string currency values fail with a clear TypeError',()=>{
 assert.throws(()=>compareGameOffers([],{currency:123}),TypeError);
 assert.throws(()=>compareGameOffers([],{currency:{}}),TypeError);
 assert.throws(()=>compareGameOffers([],{currency:false}),TypeError);
});

test('repeated rows from the same store do not create fictitious store savings',()=>{
 const result=compareGameOffers([
  {store:'Steam',price:100,currency:'TRY'},
  {store:' steam ',price:150,currency:'TRY'}
 ]);
 assert.equal(result.offers.length,1);
 assert.equal(result.best.price,100);
 assert.equal(result.savings,null);
 assert.equal(result.savingsPercent,null);
});
test('duplicate store prices retain cheapest offer while comparing other stores',()=>{
 const result=compareGameOffers([
  {store:'Steam',price:120,currency:'TRY'},
  {store:'Steam',price:100,currency:'TRY'},
  {store:'Xbox',price:200,currency:'TRY'}
 ]);
 assert.equal(result.offers.length,2);
 assert.equal(result.best.price,100);
 assert.equal(result.savings,100);
 assert.equal(result.savingsPercent,50);
});
