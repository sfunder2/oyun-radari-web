// PlayStation Store TR: kategori listesi (GraphQL) -> ürün kayıtları
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const GQL='https://web.np.playstation.com/api/graphql/v1/op';
const HASH='9845afc0dbaab4965f6563fffc703f588c8e76792000e8610843b8d3ee9c4c09';
export const CATS={discounts:'3f772501-f6f8-49b7-abac-874a88ca4897',newest:'44d8bb20-653e-431e-8ad0-c0a365f68d2f'};
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
 const vars={id:CATS[kind],pageArgs:{size:PAGE,offset:(page-1)*PAGE},sortBy:kind==='newest'?{name:'productReleaseDate',isAscending:false}:null,filterBy:[],facetOptions:[]};
 const q=new URLSearchParams({operationName:'categoryGridRetrieve',variables:JSON.stringify(vars),extensions:JSON.stringify({persistedQuery:{version:1,sha256Hash:HASH}})});
 const r=await fetchImpl(GQL+'?'+q,{headers:{'User-Agent':UA,'x-psn-store-locale-override':'tr-TR',Accept:'application/json','content-type':'application/json','x-apollo-operation-name':'categoryGridRetrieve','apollo-require-preflight':'true',Origin:'https://store.playstation.com',Referer:'https://store.playstation.com/'},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error('PS Store katalog HTTP '+r.status);
 const j=await r.json();if(j.errors?.length)throw new Error('PS Store katalog: '+String(j.errors[0].message).slice(0,160));
 const g=j.data?.categoryGridRetrieve;if(!g||!Array.isArray(g.products))throw new Error('PS Store katalog yanıtı okunamadı');
 return{items:g.products.map(p=>fromGrid(p)).filter(Boolean),raw:g.products.length,hasMore:g.pageInfo?.isLast===false,total:g.pageInfo?.totalCount??null};
}
