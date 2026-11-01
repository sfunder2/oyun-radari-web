import test from 'node:test';import assert from 'node:assert/strict';
import {scoresFor,scoreRow,userRank,runScores} from '../scripts/igdb-score.mjs';
test('puan sorgusu 500lük parçalara bölünür, tekrar eden kimlikler bir kez sorulur',async()=>{
 const bodies=[];const q=async(ep,body)=>{bodies.push([ep,body]);return[{id:7,rating:81.234,rating_count:40}]};
 const m=await scoresFor(q,[...Array.from({length:520},(_,i)=>i+1),7,null]);
 assert.equal(bodies.length,2);assert.equal(bodies[0][0],'games');
 assert.match(bodies[0][1],/fields id,slug,rating,rating_count,aggregated_rating,aggregated_rating_count; where id = \(1,2,/);
 assert.match(bodies[1][1],/where id = \(501,.*520\); limit 500;/);
 assert.equal(m.get(7).rating,81.234);
});
test('satır: bir ondalık, oy yoksa puan boş, geçersiz slug atılır',()=>{
 const r=scoreRow('hades',7,{slug:'hades--1',rating:93.456,rating_count:812,aggregated_rating:90.04,aggregated_rating_count:0},'2026-11-01T00:00:00Z');
 assert.deepEqual(r,{title_key:'hades',igdb_id:7,slug:'hades--1',user_rating:93.5,user_votes:812,critic_rating:null,critic_votes:0,checked_at:'2026-11-01T00:00:00Z'});
 assert.equal(scoreRow('x',1,{slug:'<script>'}).slug,null);
 assert.equal(scoreRow('x',1,undefined).user_rating,null);
});
test('sıralama ölçüsü: az oylu uç puan çok oylu yüksek puanın önüne geçmez',()=>{
 assert.ok(userRank({user_rating:100,user_votes:2})<userRank({user_rating:90,user_votes:5000}));
 assert.equal(userRank({user_rating:70,user_votes:3}),70);
 assert.equal(userRank({user_rating:null,user_votes:0}),null);
});
test('tur: yalnız game_ttb igdb_id\'si olan ve 7 günden eski kayıtlar sorulur',async()=>{
 const now=new Date('2026-11-01T00:00:00Z'),paths=[],up=[];
 const sb={selectAll:async p=>{paths.push(p);return p.startsWith('game_igdb_score')?[{title_key:'fresh',checked_at:'2026-10-30T00:00:00Z'},{title_key:'old',checked_at:'2026-10-01T00:00:00Z'}]
  :[{title_key:'fresh',igdb_id:1},{title_key:'old',igdb_id:2},{title_key:'new',igdb_id:3}]},upsert:async(t,rows,c)=>{assert.equal(t,'game_igdb_score');assert.equal(c,'title_key');up.push(...rows)}};
 const q=async(ep,body)=>{assert.match(body,/where id = \(2,3\)/);return[{id:2,rating:75,rating_count:20,aggregated_rating:80,aggregated_rating_count:6}]};
 const r=await runScores({sb,query:q,now});
 assert.ok(paths.includes('game_ttb?select=title_key,igdb_id&igdb_id=not.is.null'));
 assert.deepEqual(up.map(x=>[x.title_key,x.user_rating,x.critic_rating]),[['old',75,80],['new',null,null]]);
 assert.deepEqual(r,{rows:2,users:1,critics:1});
});
