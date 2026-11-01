import test from 'node:test';import assert from 'node:assert/strict';
import {helixClient,topGames,viewersFor,boxArt,toItem,pickOffer,matchCatalog,runTwitch} from '../scripts/twitch.mjs';
const res=(body,status=200,headers={})=>({ok:status<400,status,headers:{get:k=>headers[k]??null},json:async()=>body,text:async()=>JSON.stringify(body)});
test('helix istemcisi: uygulama jetonu, başlıklar, çoklu parametre ve 429 sonrası yeniden deneme',async()=>{
 const calls=[];let n=0;
 const f=async(url,o)=>{calls.push([url,o]);if(url.startsWith('https://id.twitch.tv'))return res({access_token:'tok'});if(n++===0)return res({},429,{'ratelimit-reset':'0'});return res({data:[1]})};
 const get=await helixClient('cid','sec',{f,gap:0});
 assert.deepEqual(await get('streams',{game_id:['1','2'],first:100,after:undefined}),{data:[1]});
 assert.match(calls[0][0],/grant_type=client_credentials/);
 assert.equal(calls[2][0],'https://api.twitch.tv/helix/streams?game_id=1&game_id=2&first=100');
 assert.equal(calls[2][1].headers['Client-ID'],'cid');assert.equal(calls[2][1].headers.Authorization,'Bearer tok');
});
test('oyun olmayan kategoriler (IGDB kimliği yok) atılır, sayfa ilerler',async()=>{
 const pages=[{data:[{id:'509658',name:'Just Chatting',igdb_id:''},{id:'21779',name:'League of Legends',igdb_id:'115',box_art_url:'x-{width}x{height}.jpg'}],pagination:{cursor:'c'}},{data:[{id:'33214',name:'Fortnite',igdb_id:'1905'}],pagination:{}}];
 let i=0;const get=async(p,q)=>{assert.equal(p,'games/top');return pages[i++]};
 const g=await topGames(get,5);
 assert.deepEqual(g.map(x=>[x.id,x.igdbId]),[['21779',115],['33214',1905]]);
 assert.equal(boxArt(g[0].boxArt),'x-285x380.jpg');
});
test('izleyici toplamı: kuyrukta (<3 izleyici) ya da son sayfada durur',async()=>{
 const full=n=>Array.from({length:100},()=>({viewer_count:n}));
 const seq=[{data:full(50),pagination:{cursor:'a'}},{data:full(2),pagination:{cursor:'b'}},{data:full(1),pagination:{cursor:'c'}}];
 let i=0;const get=async()=>seq[i++];
 assert.deepEqual(await viewersFor(get,'1'),{viewers:5200,streams:200});
 assert.equal(i,2);
});
test('ürün seçimi ve öğe biçimi: Steam önce, sürümsüz önce; PlayStation kimliği öneksiz',()=>{
 const best=pickOffer([{platform:'xbox',store_id:'9N',price:'100'},{platform:'steam',store_id:'2',edition:'Deluxe',price:'50'},{platform:'steam',store_id:'1',price:'80'}]);
 assert.equal(best.store_id,'1');
 assert.deepEqual(toItem({platform:'steam',store_id:'1',name:'A',price:'80.5',currency:'TRY'},'a'),{id:'steam:1',storeId:'1',platform:'steam',titleKey:'a',name:'A',image:null,price:80.5,originalPrice:null,discountPercent:0,currency:'TRY',url:null,edition:null});
 assert.equal(toItem({id:'EP1-X',platform:'playstation',name:'B'},'b').id,'EP1-X');
});
const fakeSb=(tables,log=[])=>({log,
 select:async p=>{log.push(p);const t=p.split('?')[0];if(tables[t]instanceof Error)throw tables[t];return tables[t]??[]},
 upsert:async(t,rows,c)=>log.push(['upsert',t,rows,c]),del:async p=>log.push(['del',p])});
test('katalog eşleşmesi: IGDB kimliği game_ttb üzerinden, yoksa ad; game_ttb yoksa adla devam',async()=>{
 const games=[{id:'1',name:'Some Name',igdbId:7},{id:'2',name:'Hades II',igdbId:8},{id:'3',name:'Not In Catalog',igdbId:9}];
 const sb=fakeSb({game_ttb:[{title_key:'grand theft auto v',igdb_id:7}],store_offers:[{platform:'steam',store_id:'271590',title_key:'grand theft auto v',name:'GTA V'}],ps_products:[{id:'EP-H2',title_key:'hades ii',name:'Hades II'}]});
 const m=await matchCatalog(sb,games);
 assert.equal(m.get('1').item.id,'steam:271590');assert.equal(m.get('2').item.id,'EP-H2');assert.equal(m.has('3'),false);
 assert.match(decodeURIComponent(sb.log[1]),/title_key=in\.\("grand theft auto v","some name","hades ii","not in catalog"\)/);
 const sb2=fakeSb({game_ttb:new Error('Supabase GET game_ttb HTTP 404: PGRST205'),ps_products:[{id:'EP-H2',title_key:'hades ii',name:'Hades II'}]});
 assert.equal((await matchCatalog(sb2,games)).get('2').item.id,'EP-H2');
});
test('tur: izleyiciye göre sıralar, tabloyu yazar ve eski satırları siler',async()=>{
 const get=async(p,q)=>p==='games/top'?{data:[{id:'a',name:'Hades II',igdb_id:'1'},{id:'b',name:'Other',igdb_id:'2'}]}:{data:[{viewer_count:q.game_id==='a'?10:500}]};
 const sb=fakeSb({ps_products:[{id:'EP-H2',title_key:'hades ii',name:'Hades II'}]});
 const r=await runTwitch({sb,get,now:new Date('2026-11-01T00:00:00Z')});
 assert.deepEqual(r,{games:2,matched:1});
 const up=sb.log.find(x=>x[0]==='upsert');assert.deepEqual(up[2].map(x=>[x.twitch_id,x.rank,x.viewers,!!x.item]),[['b',1,500,false],['a',2,10,true]]);
 assert.deepEqual(sb.log.at(-1),['del','twitch_top_games?updated_at=lt.2026-11-01T00%3A00%3A00.000Z']);
});
