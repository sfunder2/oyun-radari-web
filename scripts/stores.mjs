// Steam, Xbox, Nintendo ve OpenCritic için ad bazlı arama / puan okuma. fetch enjekte edilebilir (testler için).
import {titleKey,cleanTitle} from './titles.mjs';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const H={'User-Agent':UA,'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.8'};
const t=ms=>AbortSignal.timeout(ms);
const num=v=>Number.isFinite(Number(v))?Number(v):null;
export async function steamSearch(name,f=fetch){
 const r=await f('https://store.steampowered.com/api/storesearch/?'+new URLSearchParams({term:cleanTitle(name).slice(0,80),cc:'tr',l:'turkish'}),{headers:H,signal:t(20000)});
 if(!r.ok)throw new Error('Steam arama HTTP '+r.status);
 return((await r.json()).items||[]).filter(i=>i.type==='app'&&i.price).map(i=>{const fin=num(i.price.final)/100,ini=num(i.price.initial)/100;
  return{platform:'steam',store_id:String(i.id),name:i.name,image:i.tiny_image||null,price:fin,original_price:ini>fin?ini:null,discount_percent:ini>fin?Math.round((1-fin/ini)*100):0,currency:i.price.currency||'USD',url:`https://store.steampowered.com/app/${i.id}/`,edition:'Ana oyun',metascore:num(i.metascore)||null}});
}
export function parseXbox(j){
 const c=Object.values(j.channels||{})[0];if(!c)return[];
 const products=new Map((j.productSummaries||[]).map(p=>[p.productId,p]));
 return(c.products||[]).map(({productId})=>{const p=products.get(productId);if(!p)return null;
  const a=(j.availabilitySummaries||[]).filter(a=>a.productId===productId&&a.actions?.includes('Purchase')&&a.price?.currency==='TRY'&&Number.isFinite(a.price.listPrice)&&a.price.eligibilityInfo?.eligibility==='None');
  const paid=a.filter(a=>a.price.listPrice>0),pool=paid.length?paid:a.filter(a=>a.price.listPrice===0&&!a.price.hasXPriceOffer);pool.sort((x,y)=>x.price.listPrice-y.price.listPrice);const o=pool[0];if(!o)return null;
  const msrp=o.price.msrp>o.price.listPrice?o.price.msrp:null;
  return{platform:'xbox',store_id:productId,name:p.title,image:p.images?.boxArt?.url||p.images?.superHeroArt?.url||null,price:o.price.listPrice,original_price:msrp,discount_percent:msrp?Math.round((1-o.price.listPrice/msrp)*100):0,currency:'TRY',url:`https://www.xbox.com/tr-TR/games/store/game/${productId}`,edition:p.productKind||'Mağaza ürünü'};
 }).filter(Boolean);
}
export async function xboxSearch(name,f=fetch){
 const r=await f('https://emerald.xboxservices.com/xboxcomfd/search/games?locale=tr-TR',{method:'POST',headers:{'Content-Type':'application/json','X-MS-API-Version':'1.1','MS-CV':'OyunRadariCatalog000000.0'},body:JSON.stringify({ReturnFilters:false,ChannelKeyToBeUsedInResponse:'SEARCH_CHANNELID=GAMES',Filters:'',ChannelId:'Games',Query:cleanTitle(name).slice(0,80)}),signal:t(20000)});
 if(!r.ok)throw new Error('Xbox arama HTTP '+r.status);return parseXbox(await r.json());
}
// Nintendo'nun tarayıcı paketinde yer alan herkese açık, yalnız arama yapabilen anahtar (yönetici anahtarı değildir).
const NA='U3B6GR4UA3',NK='a29c6927638bfd8cee23993e51e721c9';
export async function switchSearch(name,f=fetch){
 const q=new URLSearchParams({'x-algolia-application-id':NA,'x-algolia-api-key':NK,hitsPerPage:'8',page:'0',query:cleanTitle(name).slice(0,80),filters:'platform:"Nintendo Switch"'});
 const r=await f(`https://${NA.toLowerCase()}-dsn.algolia.net/1/indexes/store_game_en_us?${q}`,{headers:H,signal:t(20000)});
 if(!r.ok)throw new Error('Nintendo arama HTTP '+r.status);
 return((await r.json()).hits||[]).filter(h=>Number.isFinite(h.price?.finalPrice)).map(h=>{const fin=h.price.finalPrice,reg=h.price.regPrice;
  return{platform:'switch',store_id:String(h.urlKey||h.objectID),name:h.title,image:h.productImage?`https://assets.nintendo.com/image/upload/f_auto/q_auto/w_600/${h.productImage}`:null,price:fin,original_price:reg>fin?reg:null,discount_percent:reg>fin?Math.round((1-fin/reg)*100):0,currency:'USD',url:`https://www.nintendo.com/us/store/products/${encodeURIComponent(h.urlKey)}/`,edition:'ABD mağazası'}});
}
// Aynı başlık anahtarına sahip adaylar içinden en ucuzu
export function pickExact(cands,key){
 const m=cands.filter(c=>titleKey(c.name)===key&&Number.isFinite(c.price));
 m.sort((a,b)=>a.price-b.price);return m[0]||null;
}
export function ocFromHtml(html,expectedName){
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  let j;try{j=JSON.parse(m[1])}catch{continue}
  for(const x of [j].flat()){if(![x?.['@type']].flat().includes('VideoGame'))continue;
   if(titleKey(x.name)!==titleKey(expectedName))continue;const r=x.aggregateRating,s=Number(r?.ratingValue);
   if(r&&Number(r.bestRating)===100&&Number.isFinite(s)&&s>0&&s<=100&&(!r.name||/OpenCritic/i.test(r.name)))return{score:Math.round(s),reviews:num(r.reviewCount)};}
 }return null;
}
export async function openCritic(entry,f=fetch){
 const url=`https://opencritic.com/game/${entry.id}/${entry.slug}`;
 const r=await f(url,{headers:H,signal:t(20000)});if(!r.ok)throw new Error('OpenCritic HTTP '+r.status);
 const s=ocFromHtml(await r.text(),entry.slug.replace(/-/g,' '));return s?{...s,url}:null;
}
export function parseOcSitemap(xml){
 return[...xml.matchAll(/<loc>https:\/\/opencritic\.com\/game\/(\d+)\/([^<\s]+)<\/loc>/g)].map(m=>({id:Number(m[1]),slug:m[2],title_key:titleKey(m[2].replace(/-/g,' '))})).filter(x=>x.title_key);
}
