import test from 'node:test';import assert from 'node:assert/strict';
import {parseScore,metacriticUrl,parseWikidata,pickByKey,parseSteamMetacritic,steamMetacritic,RateLimited,syncWikidata,sweepSteam} from '../scripts/metacritic.mjs';
import {enrichProduct} from '../scripts/enrich.mjs';
const B=(o)=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,{value:v}]));
test('puan metni: eleştirmen puanı alınır, kullanıcı puanı ve bozuk değerler atılır',()=>{
 assert.equal(parseScore('88/100'),88);assert.equal(parseScore(' 94 / 100'),94);assert.equal(parseScore('91'),91);
 assert.equal(parseScore('8.5/10'),null);assert.equal(parseScore('8'),null);assert.equal(parseScore('120/100'),null);assert.equal(parseScore(''),null);
});
test('Metacritic adresi: eski platformlu kimlik yeni biçime çevrilir, kimlik yoksa arama adresi',()=>{
 assert.equal(metacriticUrl('game/playstation-4/the-last-of-us-part-ii'),'https://www.metacritic.com/game/the-last-of-us-part-ii/');
 assert.equal(metacriticUrl('game/astro-bot'),'https://www.metacritic.com/game/astro-bot/');
 assert.equal(metacriticUrl('<script>','Astro Bot'),'https://www.metacritic.com/search/Astro%20Bot/?category=13');
});
test('Wikidata: oyun başına tek puan, PS5 önce, Steam kimlikleri toplanır',()=>{
 const items=parseWikidata({results:{bindings:[
  B({item:'http://www.wikidata.org/entity/Q1',label:'Astro Bot',score:'94/100',platLabel:'PlayStation 5',mcid:'game/astro-bot'}),
  B({item:'http://www.wikidata.org/entity/Q2',label:'DOOM Eternal',score:'88/100',platLabel:'Microsoft Windows',steam:'782330'}),
  B({item:'http://www.wikidata.org/entity/Q2',label:'DOOM Eternal',score:'89/100',platLabel:'PlayStation 4',steam:'782330'}),
  B({item:'http://www.wikidata.org/entity/Q2',label:'DOOM Eternal',score:'7.5/10',platLabel:'PlayStation 5'}),
 ]}});
 assert.equal(items.length,2);
 const d=items.find(i=>i.qid===2);assert.equal(d.score,89);assert.equal(d.platform,'PS4');assert.deepEqual(d.steam,['782330']);assert.equal(d.key,'doom eternal');
 assert.equal(items.find(i=>i.qid===1).url,'https://www.metacritic.com/game/astro-bot/');
});
test('eşleştirme: Steam kimliği adın önüne geçer, aynı adda yeni puan kazanır',()=>{
 const old={qid:5,key:'resident evil 4',score:96,time:Date.parse('2005-01-01'),steam:[]},remake={qid:9,key:'resident evil 4',score:93,time:Date.parse('2023-03-24'),steam:[]};
 const other={qid:3,key:'final fantasy vii rebirth',score:92,time:0,steam:['2909400']};
 const m=pickByKey([old,remake,other],new Map([['2909400','final fantasy vii rebirth deluxe']]));
 assert.equal(m.get('resident evil 4').score,93);assert.equal(m.get('final fantasy vii rebirth deluxe').qid,3);assert.equal(m.get('final fantasy vii rebirth').qid,3);
});
test('Steam appdetails metacritic alanı',async()=>{
 assert.deepEqual(parseSteamMetacritic({success:true,data:{metacritic:{score:88,url:'https://www.metacritic.com/game/pc/doom-eternal?ftag=MCD-06-10aaa1f'}}}),{score:88,url:'https://www.metacritic.com/game/pc/doom-eternal'});
 assert.equal(parseSteamMetacritic({success:true,data:[]}),null);assert.equal(parseSteamMetacritic({success:false}),null);
 await assert.rejects(steamMetacritic(1,async()=>new Response('',{status:429})),RateLimited);
});
function memDb(seed){
 const t={game_scores:[],ps_state:[],game_meta:[],store_offers:[],ps_products:[],...seed},writes=[];
 const inList=(q,col)=>{const m=q.match(new RegExp(col+'=in\\.\\(([^)]*)\\)'));return m?m[1].split(',').map(s=>s.replace(/^"|"$/g,'')):null;};
 return{t,writes,
  async select(q){const [name]=q.split('?');let rows=t[name];
   const key=q.match(/key=eq\.(\w+)/);if(key)rows=rows.filter(r=>r.key===key[1]);
   for(const col of ['title_key','steam_appid','store_id']){const l=inList(q,col);if(l)rows=rows.filter(r=>l.includes(String(r[col])));}
   const gt=q.match(/steam_appid=gt\.(\d+)/);if(gt)rows=rows.filter(r=>r.steam_appid>Number(gt[1])).sort((a,b)=>a.steam_appid-b.steam_appid);
   const lim=q.match(/limit=(\d+)/);if(lim)rows=rows.slice(0,Number(lim[1]));return rows;},
  async upsert(name,rows,conflict){writes.push([name,rows]);for(const r of rows){const k=conflict.split(',');const i=t[name].findIndex(x=>k.every(c=>x[c]===r[c]));if(i<0)t[name].push({...r});else t[name][i]={...t[name][i],...r};}},
 };
}
test('Wikidata eşitlemesi yalnız sitede olan ve puanı eksik oyunları doldurur, OpenCritic alanına dokunmaz',async()=>{
 const sb=memDb({game_scores:[{title_key:'doom eternal',metacritic:null,opencritic:89,checked_at:'X'},{title_key:'hades',metacritic:93,metacritic_platform:'PC',checked_at:'X'}],
  ps_products:[{title_key:'astro bot'},{title_key:'hades'}],store_offers:[{title_key:'doom eternal',platform:'steam',store_id:'782330'}],game_meta:[]});
 const json={results:{bindings:[B({item:'Q1',label:'Astro Bot',score:'94/100',platLabel:'PlayStation 5',mcid:'game/astro-bot'}),B({item:'Q2',label:'Doom Eternal (2020)',score:'88/100',steam:'782330'}),B({item:'Q3',label:'Hades',score:'90/100'}),B({item:'Q4',label:'Not On Site',score:'70/100'})]}};
 const r=await syncWikidata({sb,f:async()=>new Response(JSON.stringify(json)),now:'N'});
 assert.deepEqual(r,{items:4,matched:3,added:2});
 const g=Object.fromEntries(sb.t.game_scores.map(x=>[x.title_key,x]));
 assert.equal(g['astro bot'].metacritic,94);assert.equal(g['astro bot'].checked_at,'N');assert.equal(g['astro bot'].metacritic_url,'https://www.metacritic.com/game/astro-bot/');
 assert.equal(g['doom eternal'].metacritic,88);assert.equal(g['doom eternal'].opencritic,89);assert.equal(g['doom eternal'].checked_at,'X');
 assert.equal(g.hades.metacritic,93);assert.equal(g['not on site'],undefined);
});
test('Steam taraması puanı olanları atlar, imleci ilerletir, hız sınırında durur',async()=>{
 const sb=memDb({game_meta:[{title_key:'a',steam_appid:10},{title_key:'b',steam_appid:20},{title_key:'c',steam_appid:30},{title_key:'d',steam_appid:40}],game_scores:[{title_key:'b',metacritic:80,checked_at:'X'}]});
 const asked=[];const f=async u=>{const id=Number(String(u).match(/appids=(\d+)/)[1]);asked.push(id);if(id===40)return new Response('',{status:429});
  return new Response(JSON.stringify({[id]:{success:true,data:id===30?{metacritic:{score:77,url:'https://www.metacritic.com/game/c/'}}:[]}}));};
 const r=await sweepSteam({sb,f,limit:10,gapMs:0,now:'N'});
 assert.deepEqual(asked,[10,30,40]);assert.equal(r.added,1);assert.match(r.stopped,/429/);assert.equal(r.after,39);
 assert.equal(sb.t.game_scores.find(x=>x.title_key==='c').metacritic,77);
 assert.equal(sb.t.ps_state[0].value.after,39);
});
test('enrich: arama sonucunda metascore yoksa Steam ayrıntısındaki puan kullanılır',async()=>{
 const f=async(url)=>{url=String(url);
  if(url.includes('storesearch'))return new Response(JSON.stringify({items:[{type:'app',id:782330,name:'DOOM Eternal',price:{currency:'USD',initial:3999,final:3999},metascore:''}]}));
  if(url.includes('appdetails'))return new Response(JSON.stringify({782330:{success:true,data:{type:'game',steam_appid:782330,name:'DOOM Eternal',metacritic:{score:88,url:'https://www.metacritic.com/game/pc/doom-eternal?ftag=x'}}}}));
  if(url.includes('GetNewsForApp'))return new Response(JSON.stringify({appnews:{newsitems:[]}}));
  if(url.includes('store.steampowered.com/app/'))return new Response('');
  return new Response('x',{status:500});};
 const r=await enrichProduct({id:'EP2',name:'DOOM Eternal'},{f,now:'T'});
 assert.equal(r.scores.metacritic,88);assert.equal(r.scores.metacritic_url,'https://www.metacritic.com/game/pc/doom-eternal');
 assert.equal(Object.keys(r.meta).includes('metacritic'),false);
});
