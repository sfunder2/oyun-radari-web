import test from 'node:test';import assert from 'node:assert/strict';
import {changedOffers,existingQuery,FRESH_MS} from '../scripts/offer-diff.mjs';
import {runMarketBatch} from '../scripts/market-batch.mjs';
const now=Date.parse('2026-10-24T06:00:00Z'),recent=new Date(now-3600e3).toISOString(),old=new Date(now-FRESH_MS-1).toISOString();
const row=(id,o={})=>({platform:'steam',store_id:String(id),name:'Oyun '+id,price:10,original_price:20,labels:['RPG'],devices:null,checked_at:'NEW',...o});
test('değişmeyen ve taze teklif atlanır; yeni, değişen ve bayatlayan yazılır',()=>{
 const rows=[row(1),row(2,{price:9}),row(3),row(4),row(5,{labels:['RPG','Indie']})];
 const existing=[{...row(1),price:'10.00',checked_at:recent},{...row(2),checked_at:recent},{...row(3),checked_at:old},{...row(5),checked_at:recent}];
 assert.deepEqual(changedOffers(rows,existing,now).map(r=>r.store_id),['2','3','4','5']);
});
test('boş değer ile dolu değer farklı sayılır, null ile eksik aynı',()=>{
 assert.equal(changedOffers([row(1,{image:'x'})],[{...row(1),checked_at:recent}],now).length,1);
 assert.equal(changedOffers([row(1,{image:null})],[{...row(1),checked_at:recent}],now).length,0);
 assert.equal(changedOffers([row(1)],[{...row(1),price:null,checked_at:recent}],now).length,1);
});
test('sorgu yalnız satırdaki sütunları ve tırnaklı kimlikleri ister',()=>{
 const q=decodeURIComponent(existingQuery([row('a,b'),row('c"d')]));
 assert.match(q,/^store_offers\?select=platform,store_id,checked_at,name,price,original_price,labels,devices&platform=eq\.steam&store_id=in\.\("a,b","c\\"d"\)$/);
});
test('toplayıcı yalnız değişenleri yazar, okuma hatasında hepsini yazar',async()=>{
 const mk=existing=>{const calls=[];return{calls,select:async p=>{if(p.includes('key=eq.market'))return[];if(existing instanceof Error)throw existing;return existing},upsert:async(t,rows)=>{calls.push({t,rows})}}};
 const fetchers={steam:async()=>({rows:[row(1,{checked_at:'x'}),row(2,{checked_at:'x'})],hasMore:false})};
 const fresh=new Date().toISOString();
 const a=mk([{...row(1),checked_at:fresh}]);const r=await runMarketBatch({sb:a,pages:1,say:()=>{},fetchers});
 assert.deepEqual(a.calls.find(c=>c.t==='store_offers').rows.map(r=>r.store_id),['2']);assert.equal(r.stats.steam,2);assert.equal(r.written.steam,1);
 const b=mk(new Error('HTTP 500'));await runMarketBatch({sb:b,pages:1,say:()=>{},fetchers});
 assert.equal(b.calls.find(c=>c.t==='store_offers').rows.length,2);
 const c=mk([{...row(1),checked_at:fresh},{...row(2),checked_at:fresh}]);await runMarketBatch({sb:c,pages:1,say:()=>{},fetchers});
 assert.equal(c.calls.filter(x=>x.t==='store_offers').length,0);
});
