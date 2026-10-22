import {recordHistory,computeStats} from '../scripts/ps-history.mjs';
import assert from 'node:assert/strict';
const hist={};let day=Date.parse('2026-08-01');
const D=n=>new Date(day+n*864e5).toISOString().slice(0,10);
const seq=[ // [gün, fiyat, indirimsiz]
 [0,1000,null],[10,1000,null],[20,1000,null],[40,1200,null],  // taban fiyat 1000 -> 1200
 [50,900,1200],                                                 // indirim: 1200'den 900'e
 [60,900,1200],[70,1200,null],[80,800,1200]];                   // yeni dip 800
let it;
for(const [n,price,orig] of seq){it={id:'x',name:'Test',price,originalPrice:orig};recordHistory(hist,[it],D(n));}
console.log(JSON.stringify(hist.items.x.p));
const at50=(()=>{const h={};for(const [n,price,orig] of seq.slice(0,5)){recordHistory(h,[{id:'x',name:'T',price,originalPrice:orig}],D(n));}return computeStats(h.items.x,{price:900,originalPrice:1200},D(50));})();
console.log('gün50',at50);
assert.ok(at50.priceRise&&at50.priceRise.from===1000&&at50.priceRise.to===1200&&at50.priceRise.pct===20);
assert.equal(at50.historicalLow,true);          // 900 < 1000 kayıtlı en düşük, 50 gün kayıt
const s=computeStats(hist.items.x,it,D(80));console.log('gün80',s);
assert.equal(s.lowestEver,800);assert.equal(s.historicalLow,true);assert.equal(s.lowest30d,800);
// tek kayıtla rozet verilmemeli
const h2={};recordHistory(h2,[{id:'y',name:'Y',price:500,originalPrice:1000}],D(0));
const s2=computeStats(h2.items.y,{price:500,originalPrice:1000},D(0));console.log('tek',s2);
assert.equal(s2.historicalLow,false);assert.equal(s2.priceRise,null);
// değişmeyen fiyat yeni nokta eklememeli
recordHistory(hist,[it],D(81));assert.equal(hist.items.x.p.length,5);
console.log('TESTLER GEÇTİ');

