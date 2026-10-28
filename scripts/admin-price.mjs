import {COUNTRIES,steamPrice,xboxPrice,gogPrice,epicPrice} from './regional.mjs';
import {fetchConceptProducts,fetchEndTime} from './ps-store.mjs';
import {parseSwitch} from './market-catalog.mjs';
const TR=COUNTRIES[0];
export function validOffer(o){
 if(!o||!Number.isFinite(o.price)||o.price<0||!/^[A-Z]{3}$/.test(o.currency||'')||!Number.isInteger(o.discount_percent)||o.discount_percent<0||o.discount_percent>100)return false;
 if(o.original_price!=null&&(!Number.isFinite(o.original_price)||o.original_price<o.price))return false;
 return !(o.discount_percent>0&&!(o.original_price>o.price));
}
export async function readAdminPrice(item,f=fetch){
 const {platform,store_id:id}=item;if(typeof id!=='string'||!id||id.length>160)throw Error('Geçersiz ürün kimliği');
 let o;
 if(platform==='playstation'){
  const p=(await fetchConceptProducts(id,f)).find(p=>p.id===id);if(!p)return null;
  let end=p.discountEndsAt;if(p.discountPercent>0&&!end)end=await fetchEndTime(p,f).catch(()=>null);
  o={price:p.price,original_price:p.originalPrice,discount_percent:p.discountPercent,currency:'TRY',discount_ends_at:end||null};
 }else if(platform==='steam')o=await steamPrice(id,TR,f);
 else if(platform==='xbox')o=await xboxPrice(id,TR,f);
 else if(platform==='gog')o=await gogPrice(id,TR,f);
 else if(platform==='epic')o=await epicPrice(id,TR,f,{name:item.name});
 else if(platform==='switch'){
  // This is Nintendo's existing public search-only key, never an administrative credential.
  const q=new URLSearchParams({'x-algolia-application-id':'U3B6GR4UA3','x-algolia-api-key':'a29c6927638bfd8cee23993e51e721c9',query:String(item.name).slice(0,100),hitsPerPage:'100',filters:'platform:"Nintendo Switch"'});
  const r=await f('https://u3b6gr4ua3-dsn.algolia.net/1/indexes/store_game_en_us?'+q,{signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('Nintendo HTTP '+r.status);o=parseSwitch(await r.json()).rows.find(p=>p.store_id===id)||null;
 }else throw Error('Desteklenmeyen mağaza');
 if(o&&!validOffer(o))throw Error('Kaynak geçerli bir fiyat döndürmedi');
 // Do not rewrite product identity, URL, metadata or matching from a price response.
 return o?{price:o.price,original_price:o.original_price??null,discount_percent:o.discount_percent,currency:o.currency,discount_ends_at:o.discount_ends_at??null}:null;
}
