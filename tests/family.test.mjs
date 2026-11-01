import test from 'node:test';import assert from 'node:assert/strict';
import {entry,pickSeries,pickDlcs,familyRow,groupMembers,runFamily} from '../scripts/family.mjs';
const d=y=>Date.UTC(y,5,1)/1000;
test('öğe: kısa alanlar, başlık anahtarı ve kapak',()=>{
 assert.deepEqual(entry({id:5,name:'Grand Theft Auto V™',first_release_date:d(2013),game_type:0,cover:{image_id:'co2lbd'}}),{id:5,n:'Grand Theft Auto V™',y:2013,k:'grand theft auto v',c:'co2lbd'});
 assert.equal(entry({id:6,name:'X',cover:{image_id:'../bad'}}).c,undefined);
});
test('seri: tarih sırası, yalnız ana oyun/yeniden yapım, tek üyeli seri boş',()=>{
 const m=[{id:3,name:'C',first_release_date:d(2020)},{id:1,name:'A',first_release_date:d(2001)},{id:9,name:'A DLC',game_type:1,first_release_date:d(2002)},{id:2,name:'B remake',game_type:8,first_release_date:d(2010)},{id:1,name:'A',first_release_date:d(2001)}];
 assert.deepEqual(pickSeries(m,1).map(e=>e.id),[1,2,3]);
 assert.deepEqual(pickSeries([{id:1,name:'A'}],1),[]);
});
test('seri 40tan uzunsa bu oyunun çevresi alınır',()=>{
 const m=Array.from({length:100},(_,i)=>({id:i+1,name:'G'+i,first_release_date:d(1950+i)}));
 const s=pickSeries(m,90);assert.equal(s.length,40);assert.equal(s.at(-1).id,100);assert.ok(s.some(e=>e.id===90));
 assert.equal(pickSeries(m,50)[0].id,30);
});
test('DLC: yeniden eskiye, sınırlı; toplam sayı korunur',()=>{
 const rows=Array.from({length:70},(_,i)=>({id:i+1,name:'D'+i,first_release_date:d(2000+i%20)}));
 const l=pickDlcs(rows);assert.equal(l.length,60);assert.equal(l[0].y,2019);
 const r=familyRow('k',{id:1},{series:[],seriesName:'S',dlcs:l,dlcTotal:70},'2026-01-01T00:00:00Z');
 assert.equal(r.dlc_total,70);assert.equal(r.series_name,null);assert.equal(r.parent,null);
});
test('seri üyeleri: 10 grupluk istek, sayfalama, platform ve tür filtresi',async()=>{
 const bodies=[];const q=async(ep,b)=>{bodies.push(b);const off=Number(/offset (\d+)/.exec(b)[1]);if(b.includes('(1,2,3,4,5,6,7,8,9,10)')&&off===0)return Array.from({length:500},(_,i)=>({id:i+1,name:'g',collections:[1]}));return off===500?[{id:999,name:'h',collections:[2,77]}]:[]};
 const m=await groupMembers(q,'collections',[1,2,3,4,5,6,7,8,9,10,11]);
 assert.equal(bodies.length,3);assert.match(bodies[0],/collections = \(1,2,3,4,5,6,7,8,9,10\) & game_type = \(0,4,8,9,10\) & platforms = \(/);
 assert.equal(m.get(1).length,500);assert.equal(m.get(2)[0].id,999);assert.equal(m.has(77),false);
});
test('tur: game_ttb kimliğiyle seri, marka yedeği, DLC ve ana oyun',async()=>{
 const up=[];const sb={selectAll:async p=>p.startsWith('game_family')?[{title_key:'eski',checked_at:new Date().toISOString()}]:[{title_key:'gta v',igdb_id:10},{title_key:'fifa',igdb_id:20},{title_key:'eski',igdb_id:30},{title_key:'dlc',igdb_id:40}],upsert:async(t,rows)=>up.push(...rows)};
 const q=async(ep,b)=>{
  if(ep==='games'&&b.includes('parent_game.name'))return[{id:10,name:'GTA V',collections:[7],dlcs:[101]},{id:20,name:'FIFA',franchises:[8]},{id:40,name:'Bir DLC',parent_game:{id:10,name:'GTA V',first_release_date:d(2013)}}];
  if(ep==='games'&&b.includes('where collections'))return[{id:10,name:'GTA V',first_release_date:d(2013),collections:[7]},{id:11,name:'GTA IV',first_release_date:d(2008),collections:[7]}];
  if(ep==='games'&&b.includes('where franchises'))return[{id:20,name:'FIFA',franchises:[8]},{id:21,name:'FIFA 2',franchises:[8]}];
  if(ep==='games')return[{id:101,name:'GTA Online DLC',game_type:1}];
  if(ep==='collections')return[{id:7,name:'Grand Theft Auto'}];
  if(ep==='franchises')return[{id:8,name:'FIFA'}];
  return[];
 };
 const r=await runFamily({sb,query:q});
 assert.equal(r.rows,3);
 const by=Object.fromEntries(up.map(x=>[x.title_key,x]));
 assert.equal(by['gta v'].series_name,'Grand Theft Auto');assert.deepEqual(by['gta v'].series.map(e=>e.n),['GTA IV','GTA V']);
 assert.equal(by['gta v'].dlcs[0].t,1);assert.equal(by['gta v'].dlc_total,1);
 assert.equal(by.fifa.series_name,'FIFA');assert.equal(by.fifa.series.length,2);
 assert.equal(by.dlc.parent.n,'GTA V');assert.equal(by.dlc.series.length,0);
 assert.equal(by.eski,undefined);
});
test('arayüz: tablo yoksa bir daha sorulmaz; katalog eşleşmesinde aynı mağaza önce',async()=>{
 const {loadFamily,catalogFor}=await import('../assets/family-20261101.js');
 let n=0;const f=async()=>{n++;return{status:404,ok:false}};
 assert.equal(await loadFamily('gta v',f),null);assert.equal(await loadFamily('gta iv',f),null);assert.equal(n,1);
 assert.equal(await loadFamily('Bad;Key',f),null);
 const urls=[];const rows=async u=>{urls.push(u);return{rows:u.startsWith('library')?[{id:'P1',title_key:'a'}]:[{platform:'steam',store_id:'9',title_key:'a'},{platform:'xbox',store_id:'x',title_key:'b'}]}};
 const m=await catalogFor(['a','b','a','Bad!'],{rows,toItem:r=>({id:r.id})},'steam');
 assert.equal(m.get('a').id,'steam:9');assert.equal(m.get('b').id,'xbox:x');assert.equal(urls.length,2);assert.match(decodeURIComponent(urls[0]),/title_key=in\.\("a","b"\)/);
 const m2=await catalogFor(['a'],{rows,toItem:r=>({id:r.id})},'playstation');assert.equal(m2.get('a').id,'P1');
});
