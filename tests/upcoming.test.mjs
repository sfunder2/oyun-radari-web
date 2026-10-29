import test from 'node:test';import assert from 'node:assert/strict';
import {parseXboxUpcoming,xboxCandidates,fetchXboxUpcoming,parseSwitchUpcoming,psReleaseDate,isoDay,fetchPsUpcoming,refreshUpcoming} from '../scripts/upcoming.mjs';
const T='2026-10-23';
test('placeholder store dates count as unknown',()=>{assert.equal(isoDay('9998-12-30T00:00:00.0000000Z'),null);assert.equal(isoDay('2100-01-01'),null);assert.equal(isoDay('2026-11-14T00:00:00Z'),'2026-11-14');assert.equal(isoDay('TBD'),null);});
test('Xbox search hit becomes an upcoming row: own date, else the other store date; TRY price',()=>{
 const j=(date,price)=>({productSummaries:[{productId:'9OTHER',title:'Grand Theft Auto VI Soundtrack'},{productId:'9GTA',title:'Grand Theft Auto VI',releaseDate:date,images:{boxArt:{url:'https://img/x'}}}],
  availabilitySummaries:[{productId:'9GTA',actions:['Details','PreOrder'],price:{currency:'TRY',listPrice:price,msrp:price,eligibilityInfo:{eligibility:'None'}}},{productId:'9GTA',price:{currency:'TRY',listPrice:0,eligibilityInfo:{eligibility:'GamePass'}}}]});
 const c={key:'grand theft auto vi',name:'Grand Theft Auto VI',date:'2026-11-18',text:null};
 const r=parseXboxUpcoming(j('2026-11-19T00:00:00.0000000Z',3999),c,'N',T);
 assert.deepEqual([r.id,r.platform,r.release_date,r.price,r.currency,r.image],['xbox:9GTA','xbox','2026-11-19',3999,'TRY','https://img/x']);
 assert.equal(parseXboxUpcoming(j('9998-12-31T00:00:00Z',3999),c,'N',T).release_date,'2026-11-18');
 assert.equal(parseXboxUpcoming(j('2020-01-01T00:00:00Z',100),c,'N',T),null);
 assert.equal(parseXboxUpcoming(j(null,0),c,'N',T).price,null);
 assert.equal(parseXboxUpcoming(j(null,1),{...c,key:'fable'},'N',T),null);
});
test('Xbox candidates: wishlist and PlayStation titles, one per key, best rank first',()=>{
 const rows=[{platform:'steam',title_key:'a',name:'A',wishlist_rank:5,release_date:'2026-12-01'},{platform:'playstation',title_key:'a',name:'A',release_date:'2026-11-30'},
  {platform:'steam',title_key:'indie',name:'Indie',wishlist_rank:null},{platform:'switch',title_key:'s',name:'S'},{platform:'playstation',title_key:'big',name:'Big',price:3999}];
 const c=xboxCandidates(rows);assert.deepEqual(c.map(x=>x.key),['a','big']);assert.equal(c[0].date,'2026-11-30');
});
test('Xbox source fails loudly only when the search service is unreachable',async()=>{
 await assert.rejects(fetchXboxUpcoming(fetch,Array.from({length:8},(_,i)=>({key:'k'+i,name:'K'+i})),{search:async()=>{throw new Error('fetch failed')}}),/ulaşılamadı/);
 const rows=await fetchXboxUpcoming(fetch,[{key:'fable',name:'Fable',date:'2027-02-23'}],{search:async()=>({productSummaries:[{productId:'9F',title:'Fable'}],availabilitySummaries:[]})});
 assert.equal(rows[0].id,'xbox:9F');assert.equal(rows[0].release_date,'2027-02-23');
});
test('Switch coming-soon hits keep USD price and date',()=>{
 const {rows}=parseSwitchUpcoming({hits:[{title:'Kirby X',urlKey:'kirby-x-switch',releaseDate:'2026-11-20T08:00:00.000Z',price:{finalPrice:69.99,regPrice:69.99}},{title:'Old',urlKey:'old',releaseDate:'2019-01-01T00:00:00Z'},{title:'TBA game',objectID:'o1',releaseDateDisplay:'Coming 2027'}],nbPages:1},'N',T);
 assert.equal(rows.length,2);assert.equal(rows[0].id,'switch:kirby-x-switch');assert.equal(rows[0].price,69.99);assert.equal(rows[0].currency,'USD');
 assert.equal(rows[1].release_date,null);assert.equal(rows[1].release_text,'Coming 2027');
});
test('PS product page release date',()=>{
 assert.equal(psReleaseDate('..."releaseDate":{"__typename":"LocalizedDate","type":"DAY_MONTH_YEAR","value":"2026-11-14T00:00:00Z"}...'),'2026-11-14');
 assert.equal(psReleaseDate('{"releaseDate":"2027-02-01T00:00:00Z"}'),'2027-02-01');assert.equal(psReleaseDate('<html></html>'),null);
});
test('PS: walks newest-first grid until releases are in the past',async()=>{
 const item=(id)=>({id,name:'PS '+id,image:'i',price:1999,originalPrice:null,discountPercent:0,url:'https://store.playstation.com/tr-tr/product/'+id});
 const dates={A:'2030-01-01',B:'2030-02-01',C:'2001-01-01',D:'2001-01-01',E:'2001-01-01',F:'2001-01-01',G:'2001-01-01',H:'2001-01-01',I:'2030-03-01'};
 const grid=async(kind)=>({items:kind==='ps5'?['A','B','C','D','E','F','G','H','I'].map(item):[]});
 const seen=[];const f=async(url)=>{const id=url.split('/').pop();seen.push(id);return{ok:true,text:async()=>`"releaseDate":{"value":"${dates[id]}T00:00:00Z"}`}};
 const rows=await fetchPsUpcoming(f,{grid});
 assert.deepEqual(rows.map(r=>r.id),['ps:A','ps:B']);assert.equal(rows[0].platform,'playstation');assert.equal(rows[0].price,1999);assert.ok(!seen.includes('I'));
});
test('PS: known release dates skip the product page so the walk reaches later pages',async()=>{
 const item=(id)=>({id,name:'PS '+id,image:'i',price:3999,originalPrice:null,discountPercent:0,url:'https://store.playstation.com/tr-tr/product/'+id});
 const pages={1:['A','B','C'],2:['GTA','X','Y','Z']},dates={GTA:'2030-11-19',X:'2001-01-01',Y:'2001-01-01',Z:'2001-01-01'};
 const grid=async(kind,page)=>({items:kind==='ps5'?(pages[page]||[]).map(item):[]});
 const seen=[];const f=async(url)=>{const id=url.split('/').pop();seen.push(id);return{ok:true,text:async()=>`"releaseDate":{"value":"${dates[id]}T00:00:00Z"}`}};
 const known=new Map([['A','2031-01-01'],['B','2031-01-01'],['C','2030-12-01']]);
 const rows=await fetchPsUpcoming(f,{grid,known,maxPages:4});
 assert.deepEqual(rows.map(r=>r.id),['ps:A','ps:B','ps:C','ps:GTA']);assert.ok(!seen.includes('A'));assert.ok(seen.includes('GTA'));
});
test('one failing source does not stop the others; stale rows are cleaned up',async()=>{
 const calls=[];const sb={upsert:async(t,rows)=>calls.push(['upsert',t,rows.length]),del:async p=>calls.push(['del',p])};
 const v=await refreshUpcoming(sb,{say:()=>{},sources:{steam:async()=>[{id:'1',name:'A'},{id:'1',name:'A'}],xbox:async()=>{throw new Error('HTTP 403')}}});
 assert.equal(v.stats.steam,1);assert.match(v.errors.xbox,/403/);
 assert.ok(calls.some(c=>c[0]==='del'&&/release_date=lt/.test(c[1])));assert.ok(calls.some(c=>c[0]==='del'&&/checked_at=lt/.test(c[1])));
 const today=new Date(Date.now()+3*3600e3).toISOString().slice(0,10),start=new Date(Date.parse(today)-6*864e5).toISOString().slice(0,10);
 assert.ok(calls.some(c=>c[1]===`upcoming_games?release_date=lt.${start}`));
 assert.ok(calls.some(c=>c[1].includes(`&or=(release_date.is.null,release_date.gt.${today})`)));
});

