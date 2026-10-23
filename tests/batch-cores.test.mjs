import test from 'node:test';import assert from 'node:assert/strict';
import {runMarketBatch} from '../scripts/market-batch.mjs';
import {runEnrichBatch} from '../scripts/enrich-batch.mjs';
function fakeSb(data={}){const calls={upsert:[],patch:[],del:[]};
 return{calls,
  select:async p=>{for(const [k,v] of Object.entries(data))if(p.includes(k))return typeof v==='function'?v(p):v;return[]},
  selectAll:async p=>{for(const [k,v] of Object.entries(data))if(p.includes(k))return typeof v==='function'?v(p):v;return[]},
  upsert:async(t,rows,c)=>{calls.upsert.push({t,rows,c})},patch:async(p,b)=>{calls.patch.push({p,b})},del:async p=>{calls.del.push(p)}}}
const row=(pl,id)=>({platform:pl,store_id:String(id),title_key:'k'+id,name:'Oyun '+id,price:10,checked_at:'T'});
test('market batch: advances cursors, dedupes rows, records state, isolates a failing store',async()=>{
 const sb=fakeSb({'key=eq.market':[{value:{cursors:{steam:2,xbox:'TOK',switch:0}}}]});
 const seen=[];
 const fetchers={steam:async c=>{seen.push(['steam',c]);return{rows:[row('steam',1),row('steam',1),row('steam',2)],hasMore:true}},
  xbox:async c=>{seen.push(['xbox',c]);return{rows:[row('xbox',9)],hasMore:false,next:null}},
  switch:async()=>{throw new Error('Nintendo katalog HTTP 503')}};
 const r=await runMarketBatch({sb,pages:2,say:()=>{},fetchers});
 assert.deepEqual(seen.filter(s=>s[0]==='steam'),[['steam',2],['steam',3]]);assert.equal(r.stats.steam,4);              // yinelenen satır tek sayıldı
 assert.equal(r.stats.xbox,1);assert.equal(r.errors.length,1);assert.equal(r.errors[0].source,'switch');assert.equal(r.status,'partial');
 const state=sb.calls.upsert.find(u=>u.t==='ps_state').rows[0].value;assert.equal(state.cursors.steam,4);assert.equal(state.cursors.xbox,'');
 assert.ok(sb.calls.upsert.some(u=>u.t==='store_offers'&&u.c==='platform,store_id'));
});
test('market batch: all stores failing is reported as failed',async()=>{
 const boom=async()=>{throw new Error('x')};const r=await runMarketBatch({sb:fakeSb(),pages:1,say:()=>{},fetchers:{steam:boom,xbox:boom,switch:boom}});assert.equal(r.status,'failed');
});
test('market batch: time budget stops work and leaves the cursor for the next round',async()=>{
 let calls=0;const f=async()=>{calls++;return{rows:[row('steam',calls)],hasMore:true}};
 const r=await runMarketBatch({sb:fakeSb(),pages:5,say:()=>{},deadlineMs:-1,fetchers:{steam:f,xbox:f,switch:f}});
 assert.equal(calls,0);assert.ok(r.errors.every(e=>/süre/.test(e.error)));
});
test('enrich batch: marks processed products, survives failing sources, honors the time budget',async()=>{
 const products=[{id:'EP1',name:'Hades',title_key:null,image:null},{id:'EP2',name:'Celeste',title_key:'celeste',image:null}];
 const sb=fakeSb({'enriched_at=is.null':products});
 const realFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('x',{status:500});
 try{
  const logs=[];const r=await runEnrichBatch({sb,batch:2,say:m=>logs.push(m),concurrency:2,ocIndex:new Map()});
  assert.equal(r.products,2);assert.equal(r.processed,2);
  const marked=sb.calls.patch.filter(c=>c.b.enriched_at);assert.equal(marked.length,2);assert.ok(marked.every(c=>'store_status' in c.b));
  assert.ok(sb.calls.patch.some(c=>c.b.title_key==='hades'));                    // eksik title_key tamamlandı
  const sb2=fakeSb({'enriched_at=is.null':products});const r2=await runEnrichBatch({sb:sb2,batch:2,say:()=>{},deadlineMs:-1,ocIndex:new Map()});
  assert.equal(r2.processed,0);assert.equal(sb2.calls.patch.filter(c=>c.b.enriched_at).length,0);   // süre doluysa hiçbir ürün işaretlenmez
 }finally{globalThis.fetch=realFetch}
});
test('market batch: per-store page limits',async()=>{
 const n={steam:0,xbox:0,switch:0};const f=k=>async()=>{n[k]++;return{rows:[row(k,n[k])],hasMore:true,next:'T'}};
 const r=await runMarketBatch({sb:fakeSb(),pages:{steam:3,xbox:1,switch:0},say:()=>{},fetchers:{steam:f('steam'),xbox:f('xbox'),switch:f('switch')}});
 assert.deepEqual(n,{steam:3,xbox:1,switch:0});assert.equal(r.status,'ok');
});
