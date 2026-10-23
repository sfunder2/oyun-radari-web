import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {supabase} from '../scripts/supabase.mjs';
import {fromGrid,money,norm,tr} from '../scripts/ps-store.mjs';
function server(handler){return new Promise(res=>{const s=http.createServer(handler).listen(0,()=>res({s,url:'http://127.0.0.1:'+s.address().port}))})}
test('upsert sends merge-duplicates, auth headers, chunks',async()=>{
 const seen=[];const {s,url}=await server((q,r)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{seen.push({m:q.method,u:q.url,h:q.headers,b:JSON.parse(b)});r.writeHead(201);r.end()})});
 const sb=supabase(url,'KEY');await sb.upsert('ps_products',Array.from({length:450},(_,i)=>({id:'x'+i})),'id');s.close();
 assert.equal(seen.length,3);assert.equal(seen[0].m,'POST');assert.equal(seen[0].u,'/rest/v1/ps_products?on_conflict=id');
 assert.equal(seen[0].h.apikey,'KEY');assert.equal(seen[0].h.authorization,'Bearer KEY');assert.match(seen[0].h.prefer,/merge-duplicates/);assert.equal(seen[2].b.length,50);
});
test('selectAll pages until a short page',async()=>{
 const {s,url}=await server((q,r)=>{const off=Number(new URL(q.url,'http://x').searchParams.get('offset'));r.writeHead(200,{'content-type':'application/json'});r.end(JSON.stringify(Array.from({length:off>=2?1:2},(_,i)=>({i:off+i}))))});
 const rows=await supabase(url,'K').selectAll('t?select=*',2);s.close();assert.equal(rows.length,3);
});
test('errors include status and table',async()=>{
 const {s,url}=await server((q,r)=>{r.writeHead(401);r.end('{"message":"nope"}')});
 await assert.rejects(supabase(url,'K').select('ps_state?select=*'),/ps_state HTTP 401/);s.close();
});
test('price parsing: sale, subscription-only discount, free',()=>{
 assert.deepEqual(money({basePriceValue:129900,discountedValue:64950,currencyCode:'TRY'}),{price:649.5,originalPrice:1299,discountPercent:50,endsAt:null});
 const plus=money({basePriceValue:100000,discountedValue:50000,serviceBranding:['PS_PLUS']});assert.equal(plus.price,1000);assert.equal(plus.originalPrice,null);
 assert.equal(money({isFree:true}).price,0);assert.equal(money({basePriceValue:0,discountedValue:0}).price,null);assert.equal(money({basePrice:'Ücretsiz'}).price,0);assert.equal(money({basePriceValue:49900,discountedValue:0}).price,0);assert.equal(tr('1.299,00 TL'),1299);
});
test('grid mapping keeps games, drops add-ons, builds official url',()=>{
 const g=fromGrid({id:'EP1-X_00-A',name:'Oyun',storeDisplayClassification:'FULL_GAME',platforms:['PS5'],localizedStoreDisplayClassification:'Tam Sürüm Oyun',price:{basePriceValue:50000,discountedValue:50000},media:[{type:'IMAGE',role:'GAMEHUB_COVER_ART',url:'https://i/x.png'}]});
 assert.equal(g.url,'https://store.playstation.com/tr-tr/product/EP1-X_00-A');assert.equal(g.price,500);assert.equal(g.edition,'PS5 · Tam Sürüm Oyun');
 assert.equal(fromGrid({id:'a',name:'DLC',storeDisplayClassification:'ADD-ON',price:{basePriceValue:100}}),null);
});
test('search text ignores case, accents and trademarks',()=>{assert.equal(norm('  Pokémon™  İstanbul  ISIK '),'pokemon istanbul isik')});
import {fromGrid as fg} from '../scripts/ps-store.mjs';
test('preview video is the first PREVIEW mp4',()=>{
 const g=fg({id:'EP1-A_00-X',name:'Oyun',storeDisplayClassification:'FULL_GAME',price:{basePriceValue:100,discountedValue:100},media:[{type:'VIDEO',role:'PREVIEW',url:'https://v/a.mp4'},{type:'VIDEO',role:'PREVIEW',url:'https://v/b.mp4'},{type:'IMAGE',role:'GAMEHUB_COVER_ART',url:'https://i/x.png'}]});
 assert.equal(g.previewUrl,'https://v/a.mp4');
});


 test('sparse metadata rows are grouped without nulling absent fields',async()=>{
  const bodies=[];const sb=supabase('https://example.test','key',async(u,o)=>{bodies.push(JSON.parse(o.body));return new Response('',{status:200});});
  await sb.upsert('game_meta',[{id:'a',name:'A',news:[]},{id:'b',name:'B'},{id:'c',name:'C',news:[]}],'id');
  assert.equal(bodies.length,2);for(const rows of bodies)for(const row of rows)assert.deepEqual(Object.keys(row).sort(),Object.keys(rows[0]).sort());assert.ok(!('news' in bodies.flat().find(x=>x.id==='b')));
 });
test('supabase client retries gateway timeouts, not client errors',async()=>{
 let calls=0;const sb=supabase('https://example.test','key',async()=>{calls++;return new Response(calls<3?'{"message":"Gateway Timeout"}':'',{status:calls<3?504:201});},{retryDelay:0});
 await sb.upsert('store_offers',[{platform:'steam',store_id:'1'}],'platform,store_id');assert.equal(calls,3);
 let bad=0;const sb2=supabase('https://example.test','key',async()=>{bad++;return new Response('no',{status:400});},{retryDelay:0});
 await assert.rejects(sb2.select('t?select=*'),/HTTP 400/);assert.equal(bad,1);
 let down=0;const sb3=supabase('https://example.test','key',async()=>{down++;return new Response('x',{status:504});},{retryDelay:0});
 await assert.rejects(sb3.select('t?select=*'),/HTTP 504/);assert.equal(down,3);
});
