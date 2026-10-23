import test from 'node:test';import assert from 'node:assert/strict';
import {parseReleaseDate,parseUpcoming,parseDetails} from '../scripts/steam-meta.mjs';
import {enrichProduct} from '../scripts/enrich.mjs';
test('release dates: full dates only',()=>{
 assert.equal(parseReleaseDate('22 Oct, 2026'),'2026-10-22');assert.equal(parseReleaseDate('Oct 5, 2027'),'2027-10-05');assert.equal(parseReleaseDate('1 Jan, 2027'),'2027-01-01');
 for(const t of ['Q4 2026','2026','Oct 2026','To be announced','Coming soon','',null])assert.equal(parseReleaseDate(t),null);
});
test('upcoming list rows are parsed with names, dates and images',()=>{
 const html='<a href="x" data-ds-appid="4435490" class="search_result_row"><img src="https://i/a.jpg"><span class="title">Call of Duty&reg;: MW4</span><div class="col search_released responsive_secondrow">22 Oct, 2026</div></a><a data-ds-appid="9"><span class="title">Soon</span><div class="search_released">Q4 2026</div></a>';
 const r=parseUpcoming(html,'T');assert.equal(r.length,2);assert.equal(r[0].release_date,'2026-10-22');assert.equal(r[0].image,'https://i/a.jpg');assert.equal(r[1].release_date,null);assert.equal(r[1].release_text,'Q4 2026');
});
test('details: genres in Turkish, Turkish support and audio, age',()=>{
 const d={type:'game',steam_appid:1145360,genres:[{description:'Action'},{description:'RPG'},{description:'Indie'}],release_date:{coming_soon:false,date:'17 Sep, 2020'},developers:['Supergiant Games'],publishers:['Supergiant Games'],
  supported_languages:'English<strong>*</strong>, French, Turkish, German<br><strong>*</strong>languages with full audio support',ratings:{pegi:{rating:'16'},esrb:{rating:'t'}},required_age:0};
 const m=parseDetails(d,'hades','T');assert.deepEqual(m.genres,['Aksiyon','RPG','Bağımsız']);assert.equal(m.turkish,true);assert.equal(m.turkish_audio,false);assert.equal(m.age,'PEGI 16');assert.equal(m.release_date,'2020-09-17');
 assert.equal(parseDetails({...d,supported_languages:'Turkish<strong>*</strong>'},'x').turkish_audio,true);assert.equal(parseDetails({type:'dlc'},'x'),null);
 assert.equal(parseDetails({...d,ratings:{esrb:{rating:'m'}}},'x').age,'ESRB M');
});
test('enrich returns Steam metadata next to offers',async()=>{
 const f=async(url)=>{url=String(url);
  if(url.includes('storesearch'))return new Response(JSON.stringify({items:[{type:'app',id:1145360,name:'Hades',price:{currency:'USD',initial:825,final:825},metascore:'93'}]}));
  if(url.includes('appdetails'))return new Response(JSON.stringify({1145360:{success:true,data:{type:'game',steam_appid:1145360,genres:[{description:'Action'}],release_date:{date:'17 Sep, 2020'},supported_languages:'Turkish',developers:['S'],publishers:['S']}}}));
  return new Response('x',{status:500})};
 const r=await enrichProduct({id:'E',name:'Hades'},{f,now:'T'});assert.equal(r.meta.title_key,'hades');assert.deepEqual(r.meta.genres,['Aksiyon']);assert.equal(r.meta.turkish,true);
});
import {parseRequirements,parseNews} from '../scripts/steam-meta.mjs';
import {parseRss} from '../scripts/news.mjs';
test('system requirements parse into labelled rows',()=>{
 const html='<strong>Minimum:</strong><br><ul class="bb_ul"><li><strong>OS *:</strong> Windows 7 SP1<br></li><li><strong>Processor:</strong> Dual Core 2.4 GHz<br></li><li><strong>Memory:</strong> 4 GB RAM<br></li><li><strong>Graphics:</strong> 1GB VRAM / DirectX 10+ support<br></li><li><strong>Storage:</strong> 15 GB available space</li></ul>';
 assert.deepEqual(parseRequirements(html),[['İşletim sistemi','Windows 7 SP1'],['İşlemci','Dual Core 2.4 GHz'],['Bellek','4 GB RAM'],['Ekran kartı','1GB VRAM / DirectX 10+ support'],['Depolama','15 GB available space']]);
 assert.deepEqual(parseRequirements(''),[]);
 const d={type:'game',steam_appid:1,genres:[],release_date:{date:'1 Jan, 2020'},supported_languages:'',pc_requirements:{minimum:html,recommended:''},dlc:[1,2,3]};
 const m=parseDetails(d,'x');assert.equal(m.requirements.min.length,5);assert.equal(m.dlc_count,3);assert.equal(parseDetails({...d,pc_requirements:[]},'x').requirements,null);
});
test('steam news: three titles with https links only',()=>{
 const j={appnews:{newsitems:[{title:'Patch 1.2 &amp; fixes',url:'https://steamstore-a.akamaihd.net/n/1',date:1760000000,feedlabel:'Community Announcements'},{title:'Bad',url:'javascript:x',date:1},{title:'B',url:'https://x/2',date:1760000001},{title:'C',url:'https://x/3',date:1},{title:'D',url:'https://x/4',date:1}]}};
 const n=parseNews(j);assert.equal(n.length,2);assert.equal(n[0].title,'Patch 1.2 & fixes');assert.equal(n[0].date,'2025-10-09');
});
test('rss parsing: CDATA titles, https links, dates, limit',()=>{
 const xml='<rss><channel><item><title><![CDATA[Big &amp; News]]></title><link>https://ign.com/a</link><pubDate>Thu, 22 Oct 2026 20:00:00 GMT</pubDate></item><item><title>No link</title><link>http://insecure/x</link><pubDate>Thu, 22 Oct 2026 20:00:00 GMT</pubDate></item><item><title>Atom date</title><link>https://x/b</link><dc:date>2026-10-21T10:00:00Z</dc:date></item></channel></rss>';
 const r=parseRss(xml,'IGN');assert.equal(r.length,2);assert.equal(r[0].title,'Big & News');assert.equal(r[0].published_at,'2026-10-22T20:00:00.000Z');assert.equal(r[1].url,'https://x/b');
});
import {ageNotes} from '../scripts/steam-meta.mjs';
test('age notes come from PEGI first, then ESRB, deduplicated',()=>{
 assert.deepEqual(ageNotes({pegi:{rating:'18',descriptors:'Violence\nBad Language\nViolence'},esrb:{descriptors:'Blood'}}),['Violence','Bad Language']);
 assert.deepEqual(ageNotes({esrb:{descriptors:'Alcohol Reference\r\nBlood\r\nViolence'}}),['Alcohol Reference','Blood','Violence']);
 assert.deepEqual(ageNotes(undefined),[]);
});


 test('editorial metadata preserves only source descriptions and HTTPS screenshots',()=>{const m=parseDetails({type:'game',short_description:'<b>Official</b> &amp; summary',about_the_game:'A real game description',categories:[{description:'Online Co-op'}],screenshots:[{path_full:'https://cdn.example/test.jpg'},{path_full:'javascript:bad'}]},'test');assert.equal(m.summary,'Official & summary');assert.deepEqual(m.categories,['Online Co-op']);assert.equal(m.screenshots.length,1);assert.equal(m.description,'A real game description');});
