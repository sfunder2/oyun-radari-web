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
