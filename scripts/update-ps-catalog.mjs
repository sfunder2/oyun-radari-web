import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {mergeBatch} from './batch-state.mjs';
import {recordHistory,computeStats} from './ps-history.mjs';
// Doğrudan PlayStation Store TR: ürün sayfaları (ps-links.json) + resmî katalog/indirim kategorileri.
const startedAt=new Date().toISOString();
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const GQL='https://web.np.playstation.com/api/graphql/v1/op';
const HASH='9845afc0dbaab4965f6563fffc703f588c8e76792000e8610843b8d3ee9c4c09';
const CATS={discounts:'3f772501-f6f8-49b7-abac-874a88ca4897',newest:'44d8bb20-653e-431e-8ad0-c0a365f68d2f'};
const PAGE=100,KEEP=new Set(['FULL_GAME','PREMIUM_EDITION','GAME_BUNDLE']);
let old={items:[],cursors:{newest:1,popular:1,discounts:1}};try{old=JSON.parse(await readFile('data/ps-index.json','utf8'))}catch{}
const cursors={newest:1,popular:1,discounts:1,...old.cursors},records=[],errors=[],pages=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tr=s=>{if(s==null)return null;if(typeof s==='number')return s;s=String(s).trim();if(/^(ücretsiz|free)$/i.test(s))return 0;const d=s.replace(/[^\d,.]/g,'');if(!d)return null;const v=Number(d.replace(/\./g,'').replace(',','.'));return Number.isFinite(v)?v:null};
function money(p){ // kuruş değerleri varsa onları, yoksa metni kullan
 const base=Number.isFinite(p.basePriceValue)?p.basePriceValue/100:tr(p.basePrice);
 let disc=Number.isFinite(p.discountedValue)?p.discountedValue/100:tr(p.discountedPrice);
 const plusOnly=p.isTiedToSubscription===true||(p.serviceBranding||[]).some(x=>x&&x!=='NONE');
 if(plusOnly||disc===null)disc=base; // abonelik fiyatı karşılaştırmaya alınmaz
 if(p.isFree)return{price:0,originalPrice:null,discountPercent:0,endsAt:null};
 const sale=base!==null&&disc!==null&&disc<base;
 return{price:disc,originalPrice:sale?base:null,discountPercent:sale?Math.round((1-disc/base)*100):0,endsAt:sale&&p.endTime?new Date(Number(p.endTime)||p.endTime).toISOString():null};
}
const link=id=>'https://store.playstation.com/tr-tr/product/'+id;
function fromGrid(p){
 if(!p?.id||!p.name||!p.price)return null;
 const cls=p.storeDisplayClassification||'';if(cls&&!KEEP.has(cls))return null;
 const m=money(p.price);if(m.price===null)return null;
 const img=(p.media||[]).find(x=>x.type==='IMAGE'&&x.role==='GAMEHUB_COVER_ART')||(p.media||[]).find(x=>x.type==='IMAGE'&&x.role==='EDITION_KEY_ART')||(p.media||[]).find(x=>x.type==='IMAGE');
 return{id:'playstation:'+p.id,providerId:p.id,storeId:p.id,platform:'playstation',name:p.name,image:img?img.url+'?w=480':undefined,price:m.price,originalPrice:m.originalPrice,discountPercent:m.discountPercent,discountEndsAt:m.endsAt,currency:'TRY',region:'TR',
  edition:[(p.platforms||[]).join('/'),p.localizedStoreDisplayClassification].filter(Boolean).join(' · ')||'PlayStation Store',url:link(p.id),source:link(p.id),sourceKind:'psstore',sourceLabel:'PlayStation Store TR',checkedAt:new Date().toISOString(),status:'ok',purchaseEligible:true};
}
async function grid(kind,page){
 const var_={id:CATS[kind],pageArgs:{size:PAGE,offset:(page-1)*PAGE},sortBy:kind==='newest'?{name:'productReleaseDate',isAscending:false}:null,filterBy:[],facetOptions:[]};
 const q=new URLSearchParams({operationName:'categoryGridRetrieve',variables:JSON.stringify(var_),extensions:JSON.stringify({persistedQuery:{version:1,sha256Hash:HASH}})});
 const r=await fetch(GQL+'?'+q,{headers:{'User-Agent':UA,'x-psn-store-locale-override':'tr-TR',Accept:'application/json','content-type':'application/json','x-apollo-operation-name':'categoryGridRetrieve','apollo-require-preflight':'true',Origin:'https://store.playstation.com',Referer:'https://store.playstation.com/'},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error('PS Store katalog HTTP '+r.status);
 const j=await r.json();if(j.errors?.length)throw new Error('PS Store katalog: '+String(j.errors[0].message).slice(0,160));
 const g=j.data?.categoryGridRetrieve;if(!g||!Array.isArray(g.products))throw new Error('PS Store katalog yanıtı okunamadı');
 return{items:g.products.map(fromGrid).filter(Boolean),raw:g.products.length,hasMore:g.pageInfo?.isLast===false&&page<400};
}
for(const kind of ['discounts','newest']){
 try{const page=cursors[kind],f=await grid(kind,page);records.push(...f.items);pages.push({kind,page,products:f.items.length});cursors[kind]=f.hasMore?page+1:1;console.log(kind,'page',page,f.raw,'ham',f.items.length,'kayıt');}
 catch(e){errors.push({source:'store.playstation.com '+kind,error:e.message});}
 await sleep(2500);
}
// Resmî ürün sayfaları (ps-links.json): anlık okuma
let links=[];try{links=JSON.parse(await readFile('ps-links.json','utf8'))}catch{}
for(const url of links){
 if(!/^https:\/\/store\.playstation\.com\/tr-tr\/product\/[A-Z0-9_-]+$/i.test(url))continue;
 try{
  const r=await fetch(url,{headers:{'User-Agent':UA,'Accept-Language':'tr-TR,tr;q=0.9'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error('Ürün sayfası HTTP '+r.status);
  const html=await r.text(),id=url.split('/').pop();
  const ld=[...html.matchAll(/<script id="mfe-jsonld-tags"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>{try{return JSON.parse(m[1])}catch{return null}}).find(Boolean);
  const prices=[...html.matchAll(/"price":(\{"__typename":"Price"[^{}]*?\})/g)].map(m=>{try{return JSON.parse(m[1])}catch{return null}}).filter(Boolean);
  const main=prices.find(p=>p.isTiedToSubscription===false&&(p.serviceBranding||['NONE']).every(x=>x==='NONE'))||prices[0];
  const m=main?money(main):{price:tr(ld?.offers?.price),originalPrice:null,discountPercent:0,endsAt:null};
  const name=ld?.name||(html.match(/<title>([^<]+)<\/title>/)?.[1]||'').replace(/\s*[-–|].*$/,'').trim();
  if(!name||m.price===null)throw new Error('Fiyat bulunamadı (sayfa yapısı değişmiş olabilir)');
  records.push({id:'playstation:'+id,providerId:id,storeId:id,platform:'playstation',name,image:(ld?.image||undefined),price:m.price,originalPrice:m.originalPrice,discountPercent:m.discountPercent,discountEndsAt:m.endsAt,currency:'TRY',region:'TR',edition:'Mağazadaki sürüm · içeriği kontrol edin',url,source:url,sourceKind:'psstore',sourceLabel:'PlayStation Store TR',checkedAt:new Date().toISOString(),status:'ok',message:'Resmî ürün fiyatı okundu.',purchaseEligible:true});
  console.log('ürün',name,m.price);
 }catch(e){errors.push({source:url,error:e.message});}
 await sleep(1200);
}
// Canlı kaydı olan oyunların eski PS Deals kopyalarını kaldır
const live=new Set(records.map(r=>r.name.toLowerCase().trim()));
old.items=(old.items||[]).filter(i=>!(i.sourceKind==='psdeals'&&live.has(String(i.name).toLowerCase().trim())));
const data=mergeBatch(old,records,{startedAt,errors,cursors,pages});
data.coverage='Doğrudan PlayStation Store TR (resmî ürün sayfaları ve kategori listeleri); her turda kataloğun bir kısmı yenilenir. Ürünlerin checkedAt alanını kullanın.';
await mkdir('data',{recursive:true});
{ // Fiyat geçmişi ve istatistikler (yalnızca bu turda yenilenen kayıtlar)
 const today=new Date().toISOString().slice(0,10);let hist={};try{hist=JSON.parse(await readFile('data/ps-history.json','utf8'))}catch{}
 const ids=new Set(records.map(r=>r.id)),fresh=data.items.filter(i=>ids.has(i.id));
 recordHistory(hist,fresh,today);
 for(const it of fresh){const st=computeStats(hist.items[it.id],it,today);if(st)Object.assign(it,st);}
 await writeFile('data/ps-history.json',JSON.stringify(hist));
}
await writeFile('data/ps-index.json',JSON.stringify(data,null,2));await writeFile('data/ps-prices.json',JSON.stringify(data,null,2));
await writeFile('data/ps-batch-status.json',JSON.stringify(data.batch,null,2));
console.log(JSON.stringify(data.batch));
await writeFile('data/ps-batch-summary.md',`### PlayStation · 15 dakika batch\n\nDurum: ${data.batch.status}\n\n- Yenilenen: ${data.batch.refreshed}\n- Yeni oyun: ${data.batch.added}\n- Katalog: ${data.batch.total}\n- Kaynak hatası: ${errors.length}\n${errors.slice(0,5).map(e=>'  - '+e.source+': '+e.error).join('\n')}\n\nHer ürünün kontrol zamanı ayrı tutulur.\n`);
if(!data.batch.refreshed)process.exitCode=1;
