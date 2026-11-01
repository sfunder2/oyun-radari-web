import test from 'node:test';import assert from 'node:assert/strict';
import {parseRelease,releaseInfo,pickTrailer,pickUpcoming,infoRow,runIgdbRelease} from '../scripts/igdb-release.mjs';
const unix=d=>Date.parse(d+'T00:00:00Z')/1000;
test('çıkış kaydı: kesinlik human alanından okunur',()=>{
 assert.deepEqual(parseRelease({date:unix('2026-11-20'),human:'Nov 20, 2026'}),{date:'2026-11-20',precision:'day'});
 assert.deepEqual(parseRelease({date:unix('2027-12-31'),human:'2027'}),{date:'2027-01-01',precision:'year'});
 assert.deepEqual(parseRelease({date:unix('2027-09-30'),human:'Q3 2027'}),{date:'2027-07-01',precision:'quarter'});
 assert.deepEqual(parseRelease({date:unix('2027-03-31'),human:'Mar 2027'}),{date:'2027-03-01',precision:'month'});
 assert.deepEqual(parseRelease({human:'TBD'}),{date:null,precision:'tbd'});
 assert.equal(parseRelease({}),null);
});
test('aile başına tarih: yaklaşan sürüm öncelikli; gün kesinliği yoksa en kesin dönem',()=>{
 const r=releaseInfo([{platform:48,date:unix('2020-05-01'),human:'May 01, 2020'},{platform:167,date:unix('2026-12-03'),human:'Dec 03, 2026'},{platform:6,date:unix('2027-12-31'),human:'2027'},{platform:130,date:unix('2027-06-30'),human:'Q2 2027'}],'2026-11-01');
 assert.deepEqual(r.platform_dates,{playstation:'2026-12-03'});
 assert.equal(r.release_date,'2020-05-01');assert.equal(r.release_precision,'day');
 const p=releaseInfo([{platform:6,date:unix('2027-12-31'),human:'2027'},{platform:130,date:unix('2027-06-30'),human:'Q2 2027'}],'2026-11-01');
 assert.deepEqual([p.release_date,p.release_precision,p.platform_dates],['2027-04-01','quarter',{}]);
 assert.equal(releaseInfo([{human:'TBD'}],'2026-11-01').release_precision,'tbd');
 assert.equal(releaseInfo([],'2026-11-01').release_precision,null);
});
test('fragman: lansman fragmanı seçilir, inceleme ve bozuk kimlik alınmaz',()=>{
 assert.deepEqual(pickTrailer([{video_id:'aaaaaaaaaaa',name:'Teaser'},{video_id:'bbbbbbbbbbb',name:'Launch Trailer'},{video_id:'ccccccccccc',name:'IGN Review'},{video_id:'bad id',name:'Release Trailer'}]),{id:'bbbbbbbbbbb',name:'Launch Trailer'});
 assert.equal(pickTrailer([{video_id:'ccccccccccc',name:'Review'}]),null);
 assert.equal(pickTrailer(undefined),null);
});
test('yaklaşan oyunda aynı adlı eski oyun değil, yenisi seçilir',()=>{
 const t=unix('2026-11-01');
 const rows=[{id:1,name:'Fable',category:0,first_release_date:unix('2004-09-14')},{id:2,name:'Fable',category:0,first_release_date:unix('2027-02-23')},{id:3,name:'Fable II'}];
 assert.equal(pickUpcoming(rows,'fable',t).id,2);
 assert.equal(pickUpcoming([rows[0]],'fable',t),null);
});
test('satır: oyun yoksa boş satır, varsa tarih ve fragman',()=>{
 assert.equal(infoRow('k',null,'name','2026-11-01','x').igdb_id,null);
 const r=infoRow('k',{id:9,release_dates:[{platform:6,date:unix('2026-12-01'),human:'Dec 01, 2026'}],videos:[{video_id:'aaaaaaaaaaa',name:'Trailer'}]},'steam','2026-11-01','x');
 assert.deepEqual([r.igdb_id,r.release_date,r.platform_dates.steam,r.trailer_youtube,r.matched_by],[9,'2026-12-01','2026-12-01','aaaaaaaaaaa','steam']);
});
test('tur: Steam kimliğiyle eşleme, kalanlar ad araması, katalog oyun süresi kimliklerinden',async()=>{
 const now=new Date('2026-11-01T00:00:00Z'),up=[],bodies=[];
 const sb={selectAll:async p=>p.startsWith('game_igdb_info')?[{title_key:'fresh',igdb_id:5,checked_at:'2026-10-31T23:00:00Z'}]
  :p.startsWith('upcoming_games')?[{id:'100',platform:'steam',title_key:'deadlock',name:'Deadlock'},{id:'switch:x',platform:'switch',title_key:'kirby and the world beyond',name:'Kirby™ and the World Beyond'},{id:'200',platform:'steam',title_key:'fresh',name:'Fresh'}]
  :p.startsWith('game_ttb')?[{title_key:'hades',igdb_id:30},{title_key:'deadlock',igdb_id:10}]:[],upsert:async(t,rows)=>{assert.equal(t,'game_igdb_info');up.push(...rows)}};
 const q=async(ep,body)=>{bodies.push([ep,body]);
  if(ep==='external_games')return[{game:10,uid:'100'}];
  if(body.startsWith('search'))return[{id:20,name:'Kirby and the World Beyond',release_dates:[{platform:508,human:'2027',date:unix('2027-12-31')}],videos:[{video_id:'kkkkkkkkkkk',name:'Announcement Trailer'}]}];
  if(body.includes('id = (10)'))return[{id:10,release_dates:[{human:'TBD'}],videos:[]}];
  if(body.includes('id = (30)'))return[{id:30,release_dates:[{platform:6,date:unix('2020-09-17'),human:'Sep 17, 2020'}],videos:[{video_id:'hhhhhhhhhhh',name:'Launch Trailer'}]}];
  return[]};
 const r=await runIgdbRelease({sb,query:q,now});
 assert.deepEqual(up.map(x=>[x.title_key,x.igdb_id,x.matched_by,x.release_precision,x.trailer_youtube]),[
  ['deadlock',10,'steam','tbd',null],['kirby and the world beyond',20,'name','year','kkkkkkkkkkk'],['hades',30,'ttb','day','hhhhhhhhhhh']]);
 assert.ok(!bodies.some(([,b])=>b.includes('Fresh')),'taze kayıt yeniden sorulmaz');
 assert.equal(r.trailers,2);
});
import {applyInfo,periodText} from '../assets/igdb-20261101.js';
test('arayüz: eksik ve yer tutucu tarihler IGDB ile düzelir, Steam/PS tarihine dokunulmaz',()=>{
 const info=new Map([
  ['deadlock',{releaseDate:'2027-01-01',precision:'year',platformDates:{}}],
  ['ill',{releaseDate:'2026-11-20',precision:'day',platformDates:{steam:'2026-11-20',xbox:'2026-12-04'}}],
  ['kirby',{releaseDate:'2027-07-01',precision:'quarter',platformDates:{}}],
  ['pokemon',{releaseDate:'2027-03-05',precision:'day',platformDates:{switch:'2027-03-05'}}],
  ['ps',{releaseDate:'2026-12-01',precision:'day',platformDates:{playstation:'2026-12-09'}}]]);
 const rows=[
  {titleKey:'deadlock',platform:'steam',releaseDate:null,releaseText:'To be announced'},
  {titleKey:'ill',platform:'steam',releaseDate:null,releaseText:'2027'},
  {titleKey:'ill',platform:'xbox',releaseDate:'2026-11-20'},
  {titleKey:'kirby',platform:'switch',releaseDate:'2027-12-31',releaseText:'31 Ara 2027'},
  {titleKey:'pokemon',platform:'switch',releaseDate:'2027-12-31'},
  {titleKey:'ps',platform:'playstation',releaseDate:'2026-12-01'},
  {titleKey:'none',platform:'steam',releaseDate:null,releaseText:'Coming soon'}];
 const out=applyInfo(rows,info,'2026-11-01',false);
 assert.deepEqual(out.map(r=>[r.releaseDate,r.releaseText??null,r.dateSource??null]),[
  [null,'2027','igdb'],['2026-11-20',null,'igdb'],['2026-12-04',null,'igdb'],[null,'2027 3. çeyrek','igdb'],['2027-03-05',null,'igdb'],['2026-12-01',null,null],[null,'Coming soon',null]]);
 assert.equal(out[2].storeDate,'2026-11-20');assert.equal(rows[0].releaseText,'To be announced','girdi değişmez');
 assert.equal(periodText({releaseDate:'2027-07-01',precision:'quarter'},true),'Q3 2027');
 assert.equal(periodText({releaseDate:'2027-03-01',precision:'month'},false),'Mart 2027');
 assert.equal(periodText({precision:'tbd'},true),'Release date not announced');
});
