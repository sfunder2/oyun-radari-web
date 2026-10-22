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
