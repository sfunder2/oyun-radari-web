import test from 'node:test';import assert from 'node:assert/strict';
import {similarFor,reverseIndex,similarRow,runSimilar} from '../scripts/similar.mjs';
test('benzer oyun sorgusu 400lük parçalara bölünür, tekrarlar atılır',async()=>{
 const bodies=[];const q=async(ep,body)=>{bodies.push([ep,body]);return[{id:1,similar_games:[2,3]},{id:5}]};
 const m=await similarFor(q,[...Array.from({length:450},(_,i)=>i+1),1]);
 assert.equal(bodies.length,2);assert.equal(bodies[0][0],'games');assert.match(bodies[0][1],/fields id,similar_games; where id = \(1,2,/);
 assert.deepEqual(m.get(1),[2,3]);assert.deepEqual(m.get(5),[]);
});
test('satır: katalogda olmayan, kendisi, aynı seri ve tekrarlar atılır; IGDB sırası korunur',()=>{
 const byId=reverseIndex([{title_key:'hades',igdb_id:1},{title_key:'hades ii',igdb_id:2},{title_key:'dead cells',igdb_id:3},{title_key:'dead cells deluxe',igdb_id:3},{title_key:'celeste',igdb_id:4},{title_key:'x',igdb_id:null}]);
 assert.deepEqual(byId.get(3),['dead cells','dead cells deluxe']);
 const r=similarRow('hades',1,[1,2,99,4,3,3],byId,'2026-11-01T00:00:00Z');
 assert.deepEqual(r.similar_keys,['celeste','dead cells']);assert.equal(r.similar_total,6);assert.equal(r.igdb_id,1);
 assert.equal(similarRow('a',9,Array.from({length:40},(_,i)=>i+100),reverseIndex(Array.from({length:40},(_,i)=>({title_key:'g'+i,igdb_id:i+100})))).similar_keys.length,20);
});
test('tur: taze kayıtlar atlanır, IGDB yanıtı olmayan boş listeyle yazılır',async()=>{
 const now=new Date('2026-11-01T00:00:00Z'),up=[];
 const sb={selectAll:async p=>p.startsWith('game_ttb')?[{title_key:'hades',igdb_id:1},{title_key:'celeste',igdb_id:4},{title_key:'gone',igdb_id:7}]
  :[{title_key:'celeste',checked_at:'2026-10-30T00:00:00Z'}],upsert:async(t,rows)=>{assert.equal(t,'game_similar');up.push(...rows)}};
 const q=async(ep,body)=>{assert.match(body,/where id = \(1,7\)/);return[{id:1,similar_games:[4,50]}]};
 const r=await runSimilar({sb,query:q,now});
 assert.deepEqual(up.map(x=>[x.title_key,x.similar_keys]),[['hades',['celeste']],['gone',[]]]);
 assert.deepEqual(r,{checked:2,written:2,withKeys:1});
});
