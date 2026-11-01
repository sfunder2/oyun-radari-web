import test from 'node:test';import assert from 'node:assert/strict';
import {igdbClient,steamToIgdb,timesFor,pickByName,ttbRow,bucketOf,runTtb} from '../scripts/ttb.mjs';
const res=(body,status=200)=>({ok:status<400,status,json:async()=>body,text:async()=>JSON.stringify(body)});
test('igdb istemcisi: Twitch jetonu, başlıklar ve 429 sonrası yeniden deneme',async()=>{
 const calls=[];let n=0;
 const f=async(url,o)=>{calls.push([url,o]);if(url.startsWith('https://id.twitch.tv'))return res({access_token:'tok'});if(n++===0)return res({},429);return res([{id:1}])};
 const q=await igdbClient('cid','sec',{f,gap:0});
 assert.deepEqual(await q('games','fields id;'),[{id:1}]);
 assert.match(calls[0][0],/client_id=cid&client_secret=sec&grant_type=client_credentials/);
 assert.equal(calls[2][0],'https://api.igdb.com/v4/games');assert.equal(calls[2][1].headers['Client-ID'],'cid');assert.equal(calls[2][1].headers.Authorization,'Bearer tok');
});
test('steam kimliği ve süre sorguları 400lük parçalara bölünür',async()=>{
 const bodies=[];const q=async(ep,body)=>{bodies.push([ep,body]);return ep==='external_games'?[{game:7,uid:'10'},{game:8,uid:'20'}]:[{game_id:7,normally:36000,count:4}]};
 const ids=Array.from({length:450},(_,i)=>String(i+1));
 const map=await steamToIgdb(q,ids);assert.equal(bodies.length,2);assert.match(bodies[0][1],/external_game_source = 1 & uid = \("1","2"/);
 assert.equal(map.get('10'),7);
 const t=await timesFor(q,[7,7,8]);assert.match(bodies[2][1],/game_id = \(7,8\)/);assert.equal(t.get(7).normally,36000);
});
test('ad eşleşmesi: yalnız başlık anahtarı birebir aynı olan, ana oyun öncelikli',()=>{
 const rows=[{id:1,name:'Hades II'},{id:2,name:'Hades',category:8,first_release_date:1},{id:3,name:'Hades',category:0,first_release_date:2},{id:4,name:'Hadès',alternative_names:[{name:'Hades: Battle out of Hell'}]}];
 assert.equal(pickByName(rows,'hades').id,3);
 assert.equal(pickByName(rows,'hades battle out of hell').id,4);
 assert.equal(pickByName(rows,'hades 3'),null);
});
test('satır: saniye → dakika, süre yoksa boş; kova sınırları',()=>{
 const r=ttbRow('k',5,{hastily:20000,normally:28800,completely:0,count:12},'steam','2026-11-01T00:00:00Z');
 assert.deepEqual([r.hastily_min,r.normally_min,r.completely_min,r.votes,r.matched_by],[333,480,null,12,'steam']);
 assert.equal(ttbRow('k',null,null,'name').matched_by,null);
 assert.equal(bucketOf({normally_min:480}),'short');assert.equal(bucketOf({normally_min:481}),'medium');
 assert.equal(bucketOf({normally_min:null,hastily_min:1500}),'long');assert.equal(bucketOf({normally_min:3001}),'epic');assert.equal(bucketOf({}),null);
});
test('tur: taze kayıtlar atlanır, Steam eşleşmeyen ad aramasına düşer',async()=>{
 const now=new Date('2026-11-01T00:00:00Z'),up=[];
 const sb={selectAll:async p=>p.startsWith('game_ttb')?[{title_key:'old',checked_at:'2026-10-30T00:00:00Z'}]
  :p.includes('platform=eq.steam')?[{title_key:'old',store_id:'1'},{title_key:'hades',store_id:'2'},{title_key:'nomatch',store_id:'3'}]
  :p.startsWith('ps_products')?[{title_key:'gran turismo 7',name:'Gran Turismo™ 7'}]:[],upsert:async(t,rows)=>up.push(...rows)};
 const q=async(ep,body)=>ep==='external_games'?[{game:10,uid:'2'}]:ep==='games'?(body.includes('Gran Turismo')?[{id:20,name:'Gran Turismo 7'}]:[]):[{game_id:10,normally:72000,count:3},{game_id:20,hastily:18000,count:1}];
 const r=await runTtb({sb,query:q,now});
 assert.deepEqual(up.map(x=>[x.title_key,x.igdb_id,x.matched_by]),[['hades',10,'steam'],['gran turismo 7',20,'name'],['nomatch',null,null]]);
 assert.equal(r.withTime,2);
});
