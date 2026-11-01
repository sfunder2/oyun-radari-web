import test from 'node:test';import assert from 'node:assert/strict';
import {tagsOf,gamesFor,modeRow,runPlayModes} from '../scripts/playmodes.mjs';
test('etiketler: IGDB kimlikleri koda, multiplayer_modes co-op ve bölünmüş ekranı tamamlar, erotik tema yok',()=>{
 assert.deepEqual(tagsOf({game_modes:[1,2],themes:[19,21,42,999],multiplayer_modes:[{offlinecoop:true},{splitscreen:true}]}),{modes:['solo','coop','split','multi'],themes:['horror','survival']});
 assert.deepEqual(tagsOf({game_modes:[5,6,3,4]}),{modes:['coop','split','mmo','br'],themes:[]});
 assert.deepEqual(tagsOf(null),{modes:[],themes:[]});
 assert.deepEqual(tagsOf({multiplayer_modes:[7,{onlinecoop:false}]}),{modes:[],themes:[]});
});
test('oyun sorgusu 500lük parçalara bölünür, tekrarlar atılır',async()=>{
 const bodies=[];const q=async(ep,b)=>{bodies.push([ep,b]);return[{id:3,game_modes:[1]}]};
 const ids=[...Array.from({length:600},(_,i)=>i+1),3,'x'];
 const m=await gamesFor(q,ids);assert.equal(bodies.length,2);assert.equal(bodies[0][0],'games');
 assert.match(bodies[0][1],/fields id,game_modes,themes,multiplayer_modes\.onlinecoop/);assert.match(bodies[0][1],/where id = \(1,2,3,/);assert.match(bodies[1][1],/limit 500;$/);
 assert.equal(m.get(3).game_modes[0],1);
});
test('satır: IGDB kaydı yoksa boş etiket',()=>{
 assert.deepEqual(modeRow('k',9,undefined,'2026-11-01T00:00:00Z'),{title_key:'k',igdb_id:9,modes:[],themes:[],checked_at:'2026-11-01T00:00:00Z'});
});
test('tur: taze ve aynı kimlikli kayıtlar atlanır, kimliği değişen ve eskiyen yenilenir',async()=>{
 const now=new Date('2026-11-01T00:00:00Z'),up=[],asked=[];
 const sb={selectAll:async p=>p.startsWith('game_modes')?[{title_key:'fresh',igdb_id:1,checked_at:'2026-10-30T00:00:00Z'},{title_key:'moved',igdb_id:2,checked_at:'2026-10-30T00:00:00Z'},{title_key:'stale',igdb_id:3,checked_at:'2026-09-01T00:00:00Z'}]
  :[{title_key:'fresh',igdb_id:1},{title_key:'moved',igdb_id:20},{title_key:'stale',igdb_id:3},{title_key:'new',igdb_id:4}],upsert:async(t,rows,c)=>{assert.equal(t,'game_modes');assert.equal(c,'title_key');up.push(...rows)}};
 const q=async(ep,b)=>{asked.push(b);return[{id:20,game_modes:[3]},{id:4,themes:[17]}]};
 const r=await runPlayModes({sb,query:q,now});
 assert.match(asked[0],/where id = \(20,3,4\)/);
 assert.deepEqual(up.map(x=>[x.title_key,x.modes,x.themes]),[['moved',['coop'],[]],['stale',[],[]],['new',[],['fantasy']]]);
 assert.deepEqual(r,{rows:3,tagged:2,coop:1});
});
