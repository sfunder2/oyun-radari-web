// PlayStation Store TR: kategori listesi (GraphQL) -> ürün kayıtları
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const GQL='https://web.np.playstation.com/api/graphql/v1/op';
export const HASH='9845afc0dbaab4965f6563fffc703f588c8e76792000e8610843b8d3ee9c4c09';
// newest = PS4 oyunları kategorisi (tarihsel ad), ps5 = PS5 oyunları. PS5'e özel ve PS4 & PS5 paketli oyunlar (ör. ELDEN RING) yalnızca ps5'te listelenir.
export const CATS={discounts:'3f772501-f6f8-49b7-abac-874a88ca4897',newest:'44d8bb20-653e-431e-8ad0-c0a365f68d2f',ps5:'4cbf39e2-5749-4970-ba81-93a489e4570c'};
// Tüm oyunlar (concept) listesi: PS4/PS5 ürün listelerinde görünmeyen paketleri/sürümleri (ör. Batman: Arkham Collection) yakalamak için.
export const CONCEPTS='28c9c2b2-cecc-415c-9a08-482a605cb104',CONCEPT_PRODUCTS_HASH='0a4c9f3693b3604df1c8341fdc3e481f42eeecf961a996baaa65e65a657a6433';
export const PAGE=100,KEEP=new Set(['FULL_GAME','PREMIUM_EDITION','GAME_BUNDLE']);
// Arama metni: arayüzdeki (lib/ps-supabase.mjs) norm ile birebir aynı olmalı.
export const norm=s=>String(s||'').replace(/[™®©]/g,'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/\s+/g,' ').trim();
export const tr=s=>{if(s==null)return null;if(typeof s==='number')return s;s=String(s).trim();if(/^(ücretsiz|free)$/i.test(s))return 0;const d=s.replace(/[^\d,.]/g,'');if(!d)return null;const v=Number(d.replace(/\./g,'').replace(',','.'));return Number.isFinite(v)?v:null};
export function money(p){
 const base=Number.isFinite(p.basePriceValue)?p.basePriceValue/100:tr(p.basePrice);
 let disc=Number.isFinite(p.discountedValue)?p.discountedValue/100:tr(p.discountedPrice);
 const plusOnly=p.isTiedToSubscription===true||(p.serviceBranding||[]).some(x=>x&&x!=='NONE');
 if(plusOnly||disc===null)disc=base; // abonelik fiyatı karşılaştırmaya alınmaz
 if(p.isFree)return{price:0,originalPrice:null,discountPercent:0,endsAt:null};
 const sale=base!==null&&disc!==null&&disc<base;
 const end=sale&&p.endTime?new Date(Number(p.endTime)||p.endTime):null;
 return{price:disc,originalPrice:sale?base:null,discountPercent:sale?Math.round((1-disc/base)*100):0,endsAt:end&&!isNaN(end)?end.toISOString():null};
}
export function fromGrid(p,now=new Date().toISOString()){
 if(!p?.id||!p.name||!p.price)return null;
 const cls=p.storeDisplayClassification||'';if(cls&&!KEEP.has(cls))return null;
 const m=money(p.price);if(m.price===null)return null;
 const img=(p.media||[]).find(x=>x.type==='IMAGE'&&x.role==='GAMEHUB_COVER_ART')||(p.media||[]).find(x=>x.type==='IMAGE'&&x.role==='EDITION_KEY_ART')||(p.media||[]).find(x=>x.type==='IMAGE');
 const hero=(p.media||[]).find(x=>x.type==='IMAGE'&&x.role==='SIXTEEN_BY_NINE_BANNER')||(p.media||[]).find(x=>x.type==='IMAGE'&&x.role==='BACKGROUND')||(p.media||[]).find(x=>x.type==='IMAGE'&&x.role==='MASTER');
 const vid=(p.media||[]).find(x=>x.type==='VIDEO'&&x.role==='PREVIEW'&&/\.mp4(\?|$)/i.test(x.url||''));
 return{id:p.id,name:p.name,image:img?img.url+'?w=480':null,previewUrl:vid?vid.url:null,heroUrl:hero?hero.url.replace(/\?.*$/,''):null,price:m.price,originalPrice:m.originalPrice,discountPercent:m.discountPercent,discountEndsAt:m.endsAt,
  edition:[(p.platforms||[]).join('/'),p.localizedStoreDisplayClassification].filter(Boolean).join(' · ')||'PlayStation Store',url:'https://store.playstation.com/tr-tr/product/'+p.id,checkedAt:now};
}
export async function fetchGrid(kind,page,fetchImpl=fetch){
 const vars={id:CATS[kind],pageArgs:{size:PAGE,offset:(page-1)*PAGE},sortBy:kind!=='discounts'?{name:'productReleaseDate',isAscending:false}:null,filterBy:[],facetOptions:[]};
 const q=new URLSearchParams({operationName:'categoryGridRetrieve',variables:JSON.stringify(vars),extensions:JSON.stringify({persistedQuery:{version:1,sha256Hash:HASH}})});
 const r=await fetchImpl(GQL+'?'+q,{headers:{'User-Agent':UA,'x-psn-store-locale-override':'tr-TR',Accept:'application/json','content-type':'application/json','x-apollo-operation-name':'categoryGridRetrieve','apollo-require-preflight':'true',Origin:'https://store.playstation.com',Referer:'https://store.playstation.com/'},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error('PS Store katalog HTTP '+r.status);
 const j=await r.json();if(j.errors?.length)throw new Error('PS Store katalog: '+String(j.errors[0].message).slice(0,160));
 const g=j.data?.categoryGridRetrieve;if(!g||!Array.isArray(g.products))throw new Error('PS Store katalog yanıtı okunamadı');
 return{items:g.products.map(p=>fromGrid(p)).filter(Boolean),raw:g.products.length,hasMore:g.pageInfo?.isLast===false,total:g.pageInfo?.totalCount??null};
}
// İndirim bitiş zamanı kategori listesinde yok; ürün sayfasındaki fiyat nesnelerinde (price.endTime, ms) var.
// Yalnız aboneliksiz ve fiyatı listedeki indirimli fiyatla birebir aynı olan teklif kabul edilir.
export function parseEndTime(html,item){
 const want=Math.round(Number(item?.price)*100);if(!Number.isFinite(want))return null;
 for(const m of String(html||'').matchAll(/"price":\{"__typename":"Price",([^{}]*?)"endTime":"(\d{12,14})"([^{}]*?)(?:\}|"qualifications")/g)){
  const body=m[1]+m[3],brand=body.match(/"serviceBranding":\[([^\]]*)\]/)?.[1]||'',value=Number(body.match(/"discountedValue":(\d+)/)?.[1]);
  if(value!==want||!/^"NONE"$/.test(brand.trim()))continue;
  const end=new Date(Number(m[2]));if(!isNaN(end))return end.toISOString();
 }
 return null;
}
export async function fetchEndTime(item,fetchImpl=fetch){
 const r=await fetchImpl('https://store.playstation.com/tr-tr/product/'+encodeURIComponent(item.id),{headers:{'User-Agent':UA,'Accept-Language':'tr-TR,tr;q=0.9'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error('PS Store ürün sayfası HTTP '+r.status);
 return parseEndTime(await r.text(),item);
}
export async function gql(operationName,variables,sha256Hash,fetchImpl){
 const q=new URLSearchParams({operationName,variables:JSON.stringify(variables),extensions:JSON.stringify({persistedQuery:{version:1,sha256Hash}})});
 const r=await fetchImpl(GQL+'?'+q,{headers:{'User-Agent':UA,'x-psn-store-locale-override':'tr-TR',Accept:'application/json','content-type':'application/json','x-apollo-operation-name':operationName,'apollo-require-preflight':'true',Origin:'https://store.playstation.com',Referer:'https://store.playstation.com/'},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error('PS Store '+operationName+' HTTP '+r.status);
 const j=await r.json();if(j.errors?.length&&!j.data)throw new Error('PS Store '+operationName+': '+String(j.errors[0].message).slice(0,160));
 return j.data;
}
// Concept listesinin bir sayfası: her concept için ürün kimlikleri (fiyat içermez).
export async function fetchConcepts(page,fetchImpl=fetch){
 const vars={id:CONCEPTS,pageArgs:{size:PAGE,offset:(page-1)*PAGE},sortBy:null,filterBy:[],facetOptions:[]};
 const g=(await gql('categoryGridRetrieve',vars,HASH,fetchImpl))?.categoryGridRetrieve;if(!g||!Array.isArray(g.concepts))throw new Error('PS Store concept listesi okunamadı');
 return{concepts:g.concepts.map(c=>({id:c.id,name:c.name,productIds:(c.products||[]).map(p=>p.id).filter(Boolean)})),hasMore:g.pageInfo?.isLast===false};
}
// Bir ürünün concept'indeki satın alınabilir tüm sürümler, liste kaydı biçiminde.
export async function fetchConceptProducts(productId,fetchImpl=fetch){
 const d=await gql('metGetConceptByProductIdQuery',{productId},CONCEPT_PRODUCTS_HASH,fetchImpl);
 return(d?.productRetrieve?.concept?.selectableProducts?.purchasableProducts||[]).map(p=>fromGrid(p)).filter(Boolean);
}
