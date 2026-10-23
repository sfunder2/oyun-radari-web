// Steam, Xbox, Nintendo Switch, Epic Games Store ve GOG mağaza kataloglarını sayfa sayfa okur -> store_offers satırları.
import {titleKey} from './titles.mjs';
import {norm} from './ps-store.mjs';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const strip=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&reg;|&trade;/g,'').replace(/\s+/g,' ').trim();
const toRow=o=>({platform:o.platform,store_id:String(o.store_id),title_key:titleKey(o.name),name:String(o.name).slice(0,200),name_search:norm(o.name),image:o.image||null,price:o.price,original_price:o.original_price??null,discount_percent:o.discount_percent||0,currency:o.currency,url:o.url,edition:o.edition||null,checked_at:o.checked_at});
export function parseSteam(j,now=new Date().toISOString()){
 const rows=[];
 for(const m of String(j?.results_html||'').matchAll(/<a\b([^>]*data-ds-appid[^>]*)>([\s\S]*?)<\/a>/g)){
  const id=m[1].match(/data-ds-appid="(\d+)"/)?.[1],body=m[2],name=strip(body.match(/class="title"[^>]*>([\s\S]*?)<\/span>/)?.[1]);if(!id||!name)continue;
  const pennies=body.match(/data-price-final="(\d+)"/)?.[1],free=/>\s*(?:Free To Play|Free|Ücretsiz)\s*</i.test(body);
  const price=free?0:pennies!==undefined?Number(pennies)/100:null;if(price===null)continue;     // fiyatı olmayan (çıkmamış) kayıtlar listelenmez
  const oc=body.match(/data-price-original="(\d+)"/)?.[1],ot=strip(body.match(/class="discount_original_price"[^>]*>([\s\S]*?)<\/div>/)?.[1]).replace(/[^0-9.]/g,'');
  const base=oc!==undefined?Number(oc)/100:ot?Number(ot):null,orig=base>price?base:null;
  rows.push(toRow({platform:'steam',store_id:id,name,image:body.match(/<img[^>]*src="([^"]+)"/)?.[1]?.replace(/&amp;/g,'&'),price,original_price:orig,discount_percent:orig?Math.round((1-price/orig)*100):0,currency:'USD',url:`https://store.steampowered.com/app/${id}/`,edition:'Ana oyun',checked_at:now}));
 }
 return{rows,total:Number(j?.total_count)||0};
}
export async function fetchSteamPage(page,size=100,f=fetch){
 const p=new URLSearchParams({start:String(page*size),count:String(size),category1:'998',filter:'topsellers',infinite:'1',cc:'tr',l:'english',ignore_preferences:'1'});
 const r=await f('https://store.steampowered.com/search/results/?'+p,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error('Steam katalog HTTP '+r.status);const out=parseSteam(await r.json());return{...out,hasMore:(page+1)*size<Math.min(out.total,20000)};
}
export function parseXbox(j,now=new Date().toISOString()){
 const c=Object.values(j?.channels||{})[0];if(!c)throw new Error('Xbox kataloğu okunamadı');
 const products=new Map((j.productSummaries||[]).map(p=>[p.productId,p])),rows=[];
 for(const {productId} of c.products||[]){
  const p=products.get(productId);if(!p)continue;
  const a=(j.availabilitySummaries||[]).filter(a=>a.productId===productId&&a.actions?.includes('Purchase')&&a.price?.currency==='TRY'&&Number.isFinite(a.price.listPrice)&&a.price.eligibilityInfo?.eligibility==='None');
  const paid=a.filter(a=>a.price.listPrice>0),pool=paid.length?paid:a.filter(a=>a.price.listPrice===0&&!a.price.hasXPriceOffer);pool.sort((x,y)=>x.price.listPrice-y.price.listPrice);const o=pool[0];if(!o)continue;
  const msrp=o.price.msrp>o.price.listPrice?o.price.msrp:null;
  rows.push(toRow({platform:'xbox',store_id:productId,name:p.title,image:p.images?.boxArt?.url||p.images?.superHeroArt?.url,price:o.price.listPrice,original_price:msrp,discount_percent:msrp?Math.round((1-o.price.listPrice/msrp)*100):0,currency:'TRY',url:`https://www.xbox.com/tr-TR/games/store/game/${productId}`,edition:p.productKind||'Mağaza ürünü',checked_at:now}));
 }
 return{rows,next:c.encodedCT||null,total:c.totalItems||null};
}
export async function fetchXboxPage(token='',f=fetch){
 const body={ReturnFilters:false,ChannelKeyToBeUsedInResponse:'BROWSE_CHANNELID=_FILTERS=',Filters:'',...(token?{EncodedCT:token}:{})};
 const r=await f('https://emerald.xboxservices.com/xboxcomfd/browse?locale=tr-TR',{method:'POST',headers:{'Content-Type':'application/json','X-MS-API-Version':'1.1','MS-CV':'OyunRadariCatalog000000.0'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error('Xbox katalog HTTP '+r.status);const out=parseXbox(await r.json());return{...out,hasMore:!!out.next};
}
export function parseSwitch(j,now=new Date().toISOString()){
 const rows=[];
 for(const h of j?.hits||[]){
  if(!Number.isFinite(h.price?.finalPrice)||!h.title)continue;const fin=h.price.finalPrice,reg=h.price.regPrice>fin?h.price.regPrice:null;
  rows.push(toRow({platform:'switch',store_id:h.urlKey||h.objectID,name:h.title,image:h.productImage?`https://assets.nintendo.com/image/upload/f_auto/q_auto/w_800/${h.productImage}`:null,price:fin,original_price:reg,discount_percent:reg?Math.round((1-fin/reg)*100):0,currency:'USD',url:`https://www.nintendo.com/us/store/products/${encodeURIComponent(h.urlKey||h.objectID)}/`,edition:(h.editions||[]).join(' / ')||'ABD mağazası',checked_at:now}));
 }
 return{rows,page:j?.page??0,pages:j?.nbPages??0};
}
// Nintendo'nun tarayıcı paketindeki herkese açık, yalnız arama yapabilen anahtar (yönetici anahtarı değildir).
const NA='U3B6GR4UA3',NK='a29c6927638bfd8cee23993e51e721c9';
export async function fetchSwitchPage(page,f=fetch){
 const p=new URLSearchParams({'x-algolia-application-id':NA,'x-algolia-api-key':NK,hitsPerPage:'100',page:String(page),query:'',filters:'platform:"Nintendo Switch"'});
 const r=await f(`https://${NA.toLowerCase()}-dsn.algolia.net/1/indexes/store_game_en_us?${p}`,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error('Nintendo katalog HTTP '+r.status);const out=parseSwitch(await r.json());return{...out,hasMore:out.page+1<out.pages};
}
// Epic Games Store TR: mağaza sitesinin GraphQL arama sorgusu (ana oyunlar). Fiyatlar kuruş cinsinden gelir, ondalık sayısı yanıttadır.
const EPIC_QUERY=`query searchStoreQuery($country:String!,$locale:String,$count:Int,$start:Int,$category:String,$sortBy:String,$sortDir:String){Catalog{searchStore(country:$country,locale:$locale,count:$count,start:$start,category:$category,sortBy:$sortBy,sortDir:$sortDir,allowCountries:$country){elements{title id namespace productSlug urlSlug offerType keyImages{type url} catalogNs{mappings(pageType:"productHome"){pageSlug pageType}} offerMappings{pageSlug pageType} price(country:$country){totalPrice{discountPrice originalPrice currencyCode currencyInfo{decimals}}}} paging{count total}}}}`;
const epicSlug=e=>[e.catalogNs?.mappings?.[0]?.pageSlug,e.offerMappings?.[0]?.pageSlug,e.productSlug?.replace(/\/home$/,''),e.urlSlug].find(s=>/^[a-zA-Z0-9/_-]+$/.test(s||''));
const epicImage=e=>['OfferImageWide','DieselStoreFrontWide','Thumbnail','OfferImageTall'].map(t=>e.keyImages?.find(x=>x.type===t)?.url).find(Boolean)||null;
export function parseEpic(j,now=new Date().toISOString()){
 const s=j?.data?.Catalog?.searchStore;if(!s)throw new Error('Epic kataloğu okunamadı'+(j?.errors?.[0]?.message?': '+String(j.errors[0].message).slice(0,80):''));
 const rows=[];
 for(const e of s.elements||[]){
  const t=e.price?.totalPrice,slug=epicSlug(e);if(!t||!e.title||!e.id||!slug||!['TRY','USD'].includes(t.currencyCode))continue;
  const d=10**(t.currencyInfo?.decimals??2),fin=Number(t.discountPrice)/d,base=Number(t.originalPrice)/d;if(!Number.isFinite(fin)||fin<0)continue;
  const orig=base>fin?base:null;
  rows.push(toRow({platform:'epic',store_id:e.id,name:e.title,image:epicImage(e),price:fin,original_price:orig,discount_percent:orig?Math.round((1-fin/orig)*100):0,currency:t.currencyCode,url:'https://store.epicgames.com/tr/p/'+slug,edition:'Ana oyun',checked_at:now}));
 }
 return{rows,total:Number(s.paging?.total)||0};
}
export async function fetchEpicPage(page,size=40,f=fetch){
 const variables={country:'TR',locale:'tr',count:size,start:page*size,category:'games/edition/base',sortBy:'title',sortDir:'ASC'};
 const r=await f('https://store.epicgames.com/graphql',{method:'POST',headers:{'Content-Type':'application/json;charset=UTF-8','User-Agent':UA,Origin:'https://store.epicgames.com',Referer:'https://store.epicgames.com/tr/browse'},body:JSON.stringify({query:EPIC_QUERY,variables}),signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error('Epic katalog HTTP '+r.status);const out=parseEpic(await r.json());return{...out,hasMore:(page+1)*size<out.total};
}
// GOG TR: herkese açık katalog servisi, TL fiyatlar. Yalnız oyunlar (paket ve DLC hariç), ada göre sabit sıralama.
export function parseGog(j,now=new Date().toISOString()){
 if(!Array.isArray(j?.products))throw new Error('GOG kataloğu okunamadı');
 const rows=[];
 for(const p of j.products){
  const fm=p.price?.finalMoney,bm=p.price?.baseMoney,fin=Number(fm?.amount),base=Number(bm?.amount);
  if(!p.id||!p.title||!fm||!Number.isFinite(fin)||fin<0||!['TRY','USD'].includes(fm.currency))continue;
  const orig=base>fin?base:null;
  rows.push(toRow({platform:'gog',store_id:p.id,name:p.title,image:p.coverHorizontal||p.coverVertical||null,price:fin,original_price:orig,discount_percent:orig?Math.round((1-fin/orig)*100):0,currency:fm.currency,url:/^https:\/\/www\.gog\.com\//.test(p.storeLink||'')?p.storeLink:'https://www.gog.com/en/game/'+encodeURIComponent(p.slug||p.id),edition:'Ana oyun',checked_at:now}));
 }
 return{rows,page:Number(j.currentPage)||null,pages:Number(j.pages)||0,total:Number(j.productCount)||0};
}
export async function fetchGogPage(page,f=fetch){
 const p=new URLSearchParams({limit:'48',order:'asc:title',productType:'in:game',page:String(page+1),countryCode:'TR',locale:'en-US',currencyCode:'TRY'});
 const r=await f('https://catalog.gog.com/v1/catalog?'+p,{headers:{'User-Agent':UA,Accept:'application/json'},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error('GOG katalog HTTP '+r.status);const out=parseGog(await r.json());return{...out,hasMore:page+1<out.pages};
}
