import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordHistory,computeStats} from '../scripts/ps-history.mjs';
import {mergeScores} from '../scripts/score-merge.mjs';
import {runPsBatch} from '../scripts/run-ps-batch.mjs';
test('same day price increase preserves the earlier daily low',()=>{const h={};recordHistory(h,[{id:'a',price:80}], '2026-10-21');recordHistory(h,[{id:'a',price:50}], '2026-10-22');recordHistory(h,[{id:'a',price:100}], '2026-10-22');const s=computeStats(h.items.a,{price:100},'2026-10-22');assert.equal(s.lowestEver,50);assert.equal(s.lowest30d,50);assert.equal(h.items.a.p.at(-1)[1],100);});
test('a failed score source cannot erase a previous score',()=>{const result=mergeScores({opencritic:90,opencritic_url:'old'},{metacritic:85,opencritic:null,checked_at:'now'});assert.equal(result.opencritic,90);assert.equal(result.opencritic_url,'old');assert.equal(result.metacritic_checked_at,'now');});
function db(fail=false){const writes=[];return{writes,rpc:async name=>name==='claim_ps_batch',select:async path=>path.includes('cursors')?[{value:{newest:20,discounts:10}}]:[],selectAll:async()=>[],upsert:async(t,r)=>{if(fail&&t==='ps_products')throw Error('write failed');writes.push([t,r]);}};}
const item={id:'EP1_TEST',name:'Test',price:50,checkedAt:'2026-10-22T00:00:00Z'};
test('batch revisits latest releases and advances persisted cursors',async()=>{const sb=db(),calls=[];const r=await runPsBatch({sb,pagesPerKind:1,sleep:async()=>{},fetchGrid:async(k,p)=>(calls.push([k,p]),{items:[item],hasMore:true})});assert.equal(r.status,'ok');assert.deepEqual(calls,[['newest',1],['ps5',1],['discounts',10],['newest',20],['ps5',1]]);assert.ok(sb.writes.some(([t,rows])=>t==='ps_state'&&rows[0].key==='cursors'&&rows[0].value.newest===21));});
test('failed persistence cannot advance discovery cursors and releases lease',async()=>{const sb=db(true);let released=false;sb.rpc=async n=>n==='claim_ps_batch'?true:(released=true);const r=await runPsBatch({sb,pagesPerKind:1,sleep:async()=>{},fetchGrid:async()=>({items:[item],hasMore:true})});assert.equal(r.status,'failed');assert.ok(!sb.writes.some(([t,rows])=>t==='ps_state'&&rows[0].key==='cursors'));assert.ok(released);});
test('overlapping batch is skipped without reading or writing data',async()=>{const sb={rpc:async()=>false};assert.equal((await runPsBatch({sb})).status,'skipped');});
test('concept backfill adds games missing from category grids and advances its cursor',async()=>{
 const sb=db();sb.select=async path=>path.includes('cursors')?[{value:{newest:20,discounts:10,ps5:3,concepts:7}}]:path.startsWith('ps_products?select=id')?[{id:'EP_KNOWN'}]:[];
 const asked=[];
 const r=await runPsBatch({sb,pagesPerKind:1,sleep:async()=>{},fetchGrid:async()=>({items:[item],hasMore:true}),
  fetchConcepts:async p=>({concepts:[{id:'1',productIds:['EP_KNOWN','EP_OTHER']},{id:'2',productIds:['EP_ARKHAM','EP_ARKHAM2']},{id:'3',productIds:[]}],hasMore:true}),
  fetchConceptProducts:async id=>(asked.push(id),[{id:'EP_ARKHAM',name:'Batman: Arkham Collection',price:2099,checkedAt:'2026-10-22T00:00:00Z'}])});
 assert.equal(r.status,'ok');assert.deepEqual(asked,['EP_ARKHAM']);
 assert.ok(r.pages.some(p=>p.kind==='concepts'&&p.page===7&&p.products===1));
 assert.ok(sb.writes.some(([t,rows])=>t==='ps_products'&&rows.some(x=>x.id==='EP_ARKHAM')));
 assert.ok(sb.writes.some(([t,rows])=>t==='ps_state'&&rows[0].key==='cursors'&&rows[0].value.concepts===8));
});
test('discount end time comes from the product page offer that matches the listed price',async()=>{
 const {parseEndTime}=await import('../scripts/ps-store.mjs');
 const html='x"price":{"__typename":"Price","basePrice":"1.749,00 TL","discountedPrice":"1.574,10 TL","displayDiscountText":"-10%","serviceBranding":["PS_PLUS"],"endTime":"1793289600000","displayUpsellText":"","basePriceValue":174900,"discountedValue":157410,"currencyCode":"TRY","qualifications":[]}'
  +'y"price":{"__typename":"Price","basePrice":"2.149,00 TL","discountedPrice":"859,60 TL","displayDiscountText":"","serviceBranding":["NONE"],"endTime":"1793836740000","displayUpsellText":"","basePriceValue":214900,"discountedValue":85960,"currencyCode":"TRY","qualifications":[]}'
  +'z"price":{"__typename":"Price","basePrice":"3.999,00 TL","discountedPrice":"3.999,00 TL","displayDiscountText":null,"serviceBranding":["NONE"],"endTime":null,"basePriceValue":399900,"discountedValue":399900,"currencyCode":"TRY"}';
 assert.equal(parseEndTime(html,{price:859.6}),new Date(1793836740000).toISOString());
 assert.equal(parseEndTime(html,{price:1574.1}),null); // yalnız PS Plus teklifi
 assert.equal(parseEndTime(html,{price:3999}),null);
});
test('batch keeps a stored end time while the same discount runs and fills missing ones within the limit',async()=>{
 const future='2099-01-01T00:00:00.000Z',a={...item,id:'EP_A',price:500,originalPrice:1000,discountPercent:50,discountEndsAt:null},b={...a,id:'EP_B'},c={...a,id:'EP_C'};
 const sb=db();sb.select=async path=>path.includes('discount_ends_at=not.is.null')?[{id:'EP_A',price:'500.00',discount_percent:50,discount_ends_at:future}]:path.includes('cursors')?[{value:{}}]:[];
 const asked=[];const r=await runPsBatch({sb,pagesPerKind:1,endTimeLimit:1,sleep:async()=>{},fetchGrid:async()=>({items:[a,b,c],hasMore:false}),fetchEndTime:async it=>(asked.push(it.id),future)});
 assert.deepEqual(asked,['EP_B']);assert.deepEqual(r.endTimes,{filled:1,tried:1,kept:1});
 const rows=sb.writes.find(([t])=>t==='ps_products')[1];assert.equal(rows.find(x=>x.id==='EP_A').discount_ends_at,future);assert.equal(rows.find(x=>x.id==='EP_B').discount_ends_at,future);assert.equal(rows.find(x=>x.id==='EP_C').discount_ends_at,null);
});
