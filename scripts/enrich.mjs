import {titleKey} from './titles.mjs';
import {steamSearch,xboxSearch,switchSearch,pickExact,openCritic} from './stores.mjs';
import {fetchDetails,fetchNews} from './steam-meta.mjs';
import {fetchAccent} from './color.mjs';
// Bir PlayStation ürünü için diğer mağaza teklifleri ve puanlar. Her kaynak bağımsızdır: biri başarısız olursa diğerleri yazılır.
export async function enrichProduct(p,{ocIndex,f=fetch,now=new Date().toISOString()}={}){
 const key=titleKey(p.name),offers=[],errors=[];let metacritic=null,opencritic=null,meta=null;const storeStatus={};
 if(!key)return{key,offers,scores:null,errors:['boş başlık']};
 const run=async(label,fn)=>{try{return await fn()}catch(e){errors.push(label+': '+e.message);return null}};
 const accentP=p.image?run('renk',()=>fetchAccent(p.image,f)):Promise.resolve(null);
 const [steam,xbox,sw]=await Promise.all([run('steam',()=>steamSearch(p.name,f)),run('xbox',()=>xboxSearch(p.name,f)),run('switch',()=>switchSearch(p.name,f))]);
 for(const [c,list] of [['steam',steam],['xbox',xbox],['switch',sw]]){
  const hit=list&&pickExact(list,key);storeStatus[c]={status:list===null?'unavailable':hit?'ok':'no_match',checkedAt:now};
  if(hit){offers.push({platform:hit.platform,store_id:hit.store_id,title_key:key,name:hit.name,image:hit.image,price:hit.price,original_price:hit.original_price,discount_percent:hit.discount_percent,currency:hit.currency,url:hit.url,edition:hit.edition,checked_at:now});
   if(c==='steam')meta=await run('steam ayrıntı',()=>fetchDetails(hit.store_id,key,f));
   if(c==='steam'&&meta){const n=await run('steam haber',()=>fetchNews(hit.store_id,f));if(n)meta.news=n;}
   if(c==='steam'&&hit.metascore)metacritic={score:hit.metascore,platform:'PC',url:`https://www.metacritic.com/search/${encodeURIComponent(hit.name)}/?category=13`};}
 }
 const oc=ocIndex?.get(key);
 if(oc){try{const r=await openCritic(oc,f);if(r)opencritic={score:r.score,reviews:r.reviews,url:r.url}}catch(e){errors.push('opencritic: '+e.message)}}
 const scores=(metacritic||opencritic)?{title_key:key,metacritic:metacritic?.score??null,metacritic_platform:metacritic?.platform??null,metacritic_url:metacritic?.url??null,opencritic:opencritic?.score??null,opencritic_reviews:opencritic?.reviews??null,opencritic_url:opencritic?.url??null,checked_at:now}:null;
 return{key,offers,scores,meta,storeStatus,accent:await accentP,errors};
}

