import test from 'node:test';import assert from 'node:assert/strict';
import {mcField,parseMcField,isGameArticle,candidateTitles,resolvePages,lookupGames} from '../scripts/wikipedia-mc.mjs';
import {syncWikipedia} from '../scripts/metacritic.mjs';
const ARTICLE=`{{Short description|2024 video game}}
{{Infobox video game
| title = Astro Bot
| platforms = [[PlayStation 5]]
}}
==Reception==
{{Video game reviews
| MC = PS5: 94/100<ref name="MC">{{cite web |url=https://www.metacritic.com/game/astro-bot/critic-reviews/?platform=playstation-5 |title=Astro Bot |website=[[Metacritic]]}}</ref>
| OC = 94% recommend<ref>{{cite web|url=https://opencritic.com/game/1|title=x}}</ref>
| Destruct = 9/10
}}`;
test('MC alanı: ref içindeki | ayraç sayılmaz, puan ve gerçek adres alınır',()=>{
 const raw=mcField(ARTICLE);assert.match(raw,/94\/100/);assert.doesNotMatch(raw,/OC =/);
 assert.deepEqual(parseMcField(raw),{score:94,platform:'PS5',url:'https://www.metacritic.com/game/astro-bot/critic-reviews/'});
});
test('birden çok platform: PS5 > PS4 > PC; parantezli ve bağlantılı biçimler',()=>{
 assert.deepEqual(parseMcField("(PC) 83/100<ref>a</ref><br />(PS5) 86/100<ref>b</ref><br />(XSXS) 85/100"),{score:86,platform:'PS5',url:null});
 assert.equal(parseMcField("[[Microsoft Windows|PC]]: 88/100<br>[[PlayStation 4|PS4]]: 89/100").platform,'PS4');
 assert.deepEqual(parseMcField("85/100<ref name=mc/>"),{score:85,platform:null,url:null});
 assert.equal(parseMcField("7.4/10"),null);assert.equal(parseMcField(''),null);
 assert.equal(mcField('{{Video game reviews\n| GI = 9/10\n}}'),null);
});
test('makale denetimi ve aday başlıklar',()=>{
 assert.equal(isGameArticle(ARTICLE),true);assert.equal(isGameArticle('{{Infobox video game series\n|}}'),false);
 assert.deepEqual(candidateTitles('DOOM Eternal™','2020'),['DOOM Eternal (2020 video game)','DOOM Eternal (video game)','DOOM Eternal','Doom Eternal (2020 video game)','Doom Eternal (video game)','Doom Eternal']);
 assert.ok(candidateTitles('FINAL FANTASY VII REBIRTH',null).includes('Final Fantasy VII Rebirth'));
 assert.deepEqual(candidateTitles('',null),[]);
});
test('yönlendirme ve normalize uygulanır, bölüm yönlendirmesi atılır',()=>{
 const m=resolvePages({query:{normalized:[{from:'astro bot',to:'Astro bot'}],redirects:[{from:'Astro bot',to:'Astro Bot'},{from:'X',to:'Series',tofragment:'X'}],
  pages:[{title:'Astro Bot',revisions:[{slots:{main:{content:ARTICLE}}}]},{title:'Series',revisions:[{slots:{main:{content:ARTICLE}}}]},{title:'Nope',missing:true}]}},['astro bot','X','Nope']);
 assert.deepEqual([...m.keys()],['astro bot']);assert.equal(m.get('astro bot').title,'Astro Bot');
});
const wiki=pages=>async u=>{const titles=new URL(u).searchParams.get('titles').split('|');
 return new Response(JSON.stringify({query:{pages:titles.map(t=>pages[t]?{title:pages[t].title||t,revisions:[{slots:{main:{content:pages[t].content}}}]}:{title:t,missing:true}),redirects:titles.filter(t=>pages[t]?.title&&pages[t].title!==t).map(t=>({from:t,to:pages[t].title}))}}));};
test('arama: yıl başlığı önce denenir, başka oyuna giden yönlendirme kabul edilmez',async()=>{
 const f=wiki({'Astro Bot (2024 video game)':{content:ARTICLE,title:'Astro Bot (2024 video game)'},'Doom Eternal':{content:ARTICLE,title:'Doom (franchise)'}});
 const r=await lookupGames([{key:'astro bot',name:'ASTRO BOT',year:'2024'},{key:'doom eternal',name:'Doom Eternal',year:null}],{f,gapMs:0});
 assert.deepEqual(r.found.map(x=>[x.key,x.score,x.platform]),[['astro bot',94,'PS5']]);assert.equal(r.asked,2);
});
test('Wikipedia turu: yalnız eksik olanlar, imleç ve tur bitişi',async()=>{
 const t={game_scores:[{title_key:'astro bot',opencritic:94,metacritic:null,checked_at:'X'},{title_key:'hades',opencritic:93,metacritic:93,checked_at:'X'}],game_igdb_score:[],ps_state:[],
  store_offers:[],ps_products:[{title_key:'astro bot',name:'ASTRO BOT'}],game_meta:[{title_key:'astro bot',release_date:'2024-09-06'}]};
 const inList=q=>{const m=q.match(/title_key=in\.\(([^)]*)\)/);return m?m[1].split(',').map(s=>s.replace(/^"|"$/g,'')):null;};
 const sb={async select(q){const [n]=q.split('?');let rows=t[n]||[];const k=q.match(/key=eq\.(\w+)/);if(k)rows=rows.filter(r=>r.key===k[1]);const l=inList(q);if(l)rows=rows.filter(r=>l.includes(r.title_key));return rows;},
  async selectAll(q){const [n]=q.split('?');let rows=t[n]||[];if(/opencritic=gt\.0/.test(q))rows=rows.filter(r=>r.opencritic>0);return rows;},
  async upsert(n,rows,c){if(n==='game_scores'&&rows.some(r=>r.checked_at==null))throw new Error('checked_at not null');for(const r of rows){const i=t[n].findIndex(x=>x[c]===r[c]);if(i<0)t[n].push({...r});else t[n][i]={...t[n][i],...r};}}};
 const r=await syncWikipedia({sb,f:wiki({'Astro Bot (2024 video game)':{content:ARTICLE,title:'Astro Bot'}}),gapMs:0,now:new Date('2026-11-07T00:00:00Z')});
 assert.deepEqual(r,{candidates:1,asked:1,added:1,finished:true});
 assert.equal(t.game_scores[0].metacritic,94);assert.equal(t.game_scores[0].opencritic,94);
 assert.equal(t.ps_state[0].value.after,null);assert.equal(t.ps_state[0].value.at,'2026-11-07T00:00:00.000Z');
 assert.deepEqual(await syncWikipedia({sb,f:async()=>{throw new Error('sorulmamalı')},now:new Date('2026-11-08T00:00:00Z')}),{skipped:true});
});
