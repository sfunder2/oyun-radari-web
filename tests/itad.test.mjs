import test from 'node:test';import assert from 'node:assert/strict';
import {parseItadPrices,itadEdition,makeItadFetcher,ITAD_PLATFORMS} from '../scripts/itad.mjs';
import {runMarketBatch} from '../scripts/market-batch.mjs';
import {titleKey} from '../scripts/titles.mjs';
const src=new Map([['g1',{store_id:'10',name:'Hades™',image:'h.jpg',genres:['Aksiyon'],tags:['Roguelike']}]]);
const deal=(shop,amount,regular,extra={})=>({shop:{id:shop,name:'x'},price:{amount,currency:'TRY'},regular:{amount:regular,currency:'TRY'},cut:0,drm:[{id:61,name:'Steam'}],url:'https://itad.link/a',...extra});
test('itad: parses TRY deals, keeps the cheapest GamesPlanet region, copies Steam metadata',()=>{
 const rows=parseItadPrices([{id:'g1',deals:[deal(6,573.73,1247.82),deal(26,900,900),deal(27,800,1000),deal(61,748,748),deal(37,100,100,{price:{amount:2,currency:'USD'}})]},{id:'unknown',deals:[deal(6,1,1)]}],src,'T');
 assert.deepEqual(rows.map(r=>r.platform).sort(),['fanatical','gamesplanet']);   // Steam (61), USD ve kaynaksız oyun atlandı
 const f=rows.find(r=>r.platform==='fanatical');
 assert.equal(f.store_id,'g1');assert.equal(f.name,'Hades™');assert.equal(f.title_key,titleKey('Hades™'));assert.equal(f.image,'h.jpg');
 assert.equal(f.original_price,1247.82);assert.equal(f.discount_percent,54);assert.equal(f.currency,'TRY');assert.deepEqual(f.genres,['Aksiyon']);assert.equal(f.checked_at,'T');
 const g=rows.find(r=>r.platform==='gamesplanet');assert.equal(g.price,800);assert.equal(g.discount_percent,20);
 assert.throws(()=>parseItadPrices(null,src));
});
test('itad: edition label from DRM',()=>{
 assert.equal(itadEdition([{name:'Steam'}]),'Anahtar (Steam)');assert.equal(itadEdition([{name:'Drm Free'}]),'DRM yok');assert.equal(itadEdition([]),'Anahtar');
});
function fakeSb(data){const calls={upsert:[],del:[],select:[]};
 return{calls,select:async p=>{calls.select.push(p);for(const[k,v]of Object.entries(data))if(p.includes(k))return typeof v==='function'?v(p):v;return[]},
  upsert:async(t,rows,c)=>{calls.upsert.push({t,rows,c})},del:async p=>{calls.del.push(p)}}}
test('itad fetcher: looks up only uncached appids, caches misses, requests TR prices for the five shops',async()=>{
 const sb=fakeSb({'platform=eq.steam':[{store_id:'10',name:'Hades',image:'h'},{store_id:'20',name:'Celeste'},{store_id:'30',name:'Yok'}],
  'itad_games?':[{steam_appid:'20',itad_id:'g2',checked_at:new Date().toISOString()}]});
 const reqs=[];const f=async(u,o)=>{reqs.push({u:String(u),body:JSON.parse(o.body)});
  if(String(u).includes('/lookup/'))return{ok:true,json:async()=>({'app/10':'g1','app/30':null})};
  return{ok:true,json:async()=>[{id:'g1',deals:[deal(37,500,500)]},{id:'g2',deals:[deal(36,90,300)]}]}};
 const r=await makeItadFetcher({sb,key:'K',size:3,f})(6);
 assert.deepEqual(reqs[0].body,['app/10','app/30']);assert.match(reqs[0].u,/key=K/);
 assert.deepEqual(sb.calls.upsert[0].rows.map(x=>[x.steam_appid,x.itad_id]),[['10','g1'],['30',null]]);
 assert.match(reqs[1].u,/country=TR/);assert.match(reqs[1].u,/shops=6%2C26%2C27%2C28%2C29%2C36%2C37%2C64|shops=/);assert.deepEqual(reqs[1].body.sort(),['g1','g2']);
 assert.deepEqual(r.rows.map(x=>x.platform+':'+x.store_id).sort(),['gmg:g2','humble:g1']);
 assert.equal(r.hasMore,true);assert.equal(r.next,9);
});
test('market batch: itad job keeps its own state key, wraps and removes stale offers',async()=>{
 const sb=fakeSb({'key=eq.market_itad':[{value:{cursors:{itad:400}}}]});
 const seen=[];const itad=async c=>{seen.push(c);return{rows:[{platform:'humble',store_id:'g1',name:'A',price:1,checked_at:'T'},{platform:'gmg',store_id:'g1',name:'A',price:2,checked_at:'T'}],hasMore:false,next:0}};
 const r=await runMarketBatch({sb,pages:3,say:()=>{},stateKey:'market_itad',only:['itad'],fetchers:{steam:async()=>{throw new Error('çalışmamalı')},itad}});
 assert.deepEqual(seen,[400]);assert.equal(r.status,'ok');assert.equal(r.stats.itad,2);
 assert.ok(sb.calls.select.some(p=>p.includes('platform=eq.humble'))&&sb.calls.select.some(p=>p.includes('platform=eq.gmg')));  // platform başına kayıtlı hâl
 assert.equal(sb.calls.del.length,1);assert.match(sb.calls.del[0],new RegExp(`platform=in\\.\\(${ITAD_PLATFORMS.join(',')}\\)&checked_at=lt\\.`));
 const st=sb.calls.upsert.find(u=>u.t==='ps_state').rows[0];assert.equal(st.key,'market_itad');assert.equal(st.value.cursors.itad,0);
});
test('itad v47: new key shops and publisher stores map to their own platforms',()=>{
 const rows=parseItadPrices([{id:'g1',deals:[deal(20,400,500),deal(42,300,900),deal(62,1499,1499,{drm:[{name:'Ubisoft Store'}]}),deal(4,2795,2795,{drm:[{name:'Blizzard'}]}),deal(48,50,50)]}],src,'T');
 assert.deepEqual(rows.map(r=>r.platform).sort(),['blizzard','gamebillet','indiegala','ubisoft']);   // Microsoft Store (48) Xbox ile aynı, atlanır
 assert.equal(rows.find(r=>r.platform==='ubisoft').edition,null);assert.equal(rows.find(r=>r.platform==='indiegala').edition,'Anahtar (Steam)');
 for(const p of ['gamebillet','dreamgame','allyouplay','gamersgate','indiegala','planetplay','playsum','playerland','ubisoft','blizzard'])assert.ok(ITAD_PLATFORMS.includes(p),p);
});
