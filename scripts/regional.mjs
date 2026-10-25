// Bir oyunun diğer ülke mağazalarındaki fiyatı: mağazaların kendi sitelerinin kullandığı uç noktalar ülke parametresiyle çağrılır.
// Anlık okumadır, veritabanına yazılmaz. fetch enjekte edilebilir (testler için). Okunamayan ya da satılmayan fiyat uydurulmaz.
import {norm,CONCEPT_PRODUCTS_HASH} from './ps-store.mjs';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const GQL='https://web.np.playstation.com/api/graphql/v1/op';
const t=ms=>AbortSignal.timeout(ms);
// TR ilk sırada: diğerleriyle aynı anda okunur, karşılaştırma aynı anın fiyatlarıyla yapılır.
export const COUNTRIES=[
 {cc:'TR',name:'Türkiye',locale:'tr-TR',currency:'TRY'},
 {cc:'US',name:'ABD',locale:'en-US',currency:'USD'},
 {cc:'DE',name:'Almanya',locale:'de-DE',currency:'EUR'},
 {cc:'GB',name:'İngiltere',locale:'en-GB',currency:'GBP'},
 {cc:'PL',name:'Polonya',locale:'pl-PL',currency:'PLN'},
 {cc:'UA',name:'Ukrayna',locale:'uk-UA',currency:'UAH'},
 {cc:'IN',name:'Hindistan',locale:'en-IN',currency:'INR'},
 {cc:'BR',name:'Brezilya',locale:'pt-BR',currency:'BRL'},
];
export const PLATFORMS=new Set(['playstation','xbox','steam','gog','epic']);
const offer=(price,base,currency,url)=>{const orig=Number.isFinite(base)&&base>price?base:null;return{price,original_price:orig,discount_percent:orig?Math.round((1-price/orig)*100):0,currency,url};};

// Steam: appid her ülkede aynı. Fiyatlar kuruş cinsinden; ücretsiz ya da satılmayan oyunda price_overview gelmez.
export function parseSteamPrice(j,appid,c){
 const d=j?.[appid];if(!d)throw new Error('Steam yanıtı okunamadı');
 const p=d.success?d.data?.price_overview:null;if(!p||!Number.isFinite(p.final)){
  if(d.success&&d.data?.is_free===true)return offer(0,null,d.data?.price_overview?.currency||c.currency,`https://store.steampowered.com/app/${appid}/?cc=${c.cc.toLowerCase()}`);
  return null;
 }
 return offer(p.final/100,p.initial/100,p.currency,`https://store.steampowered.com/app/${appid}/?cc=${c.cc.toLowerCase()}`);
}
export async function steamPrice(appid,c,f=fetch){
 const r=await f('https://store.steampowered.com/api/appdetails?'+new URLSearchParams({appids:appid,cc:c.cc.toLowerCase(),filters:'basic,price_overview'}),{headers:{'User-Agent':UA},signal:t(15000)});
 if(!r.ok)throw new Error('Steam HTTP '+r.status);return parseSteamPrice(await r.json(),appid,c);
}

// Xbox: ürün kimliği (BigId) her ülkede aynı. Deneme sürümü, Game Pass/üyelik koşullu teklifler ve satın alınamayanlar atılır.
export function parseXboxPrice(j,id,c){
 const p=(j?.Products||[]).find(x=>x.ProductId===id);if(!p)return null;
 const pool=(p.DisplaySkuAvailabilities||[]).filter(s=>s.Sku?.Properties?.IsTrial!==true).flatMap(s=>s.Availabilities||[])
  .filter(a=>a.Actions?.includes('Purchase')&&!a.RemediationRequired&&!a.AffirmationId&&Number.isFinite(a.OrderManagementData?.Price?.ListPrice))
  .map(a=>a.OrderManagementData.Price).filter(x=>x.CurrencyCode);
 const paid=pool.filter(x=>x.ListPrice>0),list=(paid.length?paid:pool).sort((a,b)=>a.ListPrice-b.ListPrice),o=list[0];if(!o)return null;
 return offer(o.ListPrice,o.MSRP,o.CurrencyCode,`https://www.xbox.com/${c.locale}/games/store/x/${id}`);
}
export async function xboxPrice(id,c,f=fetch){
 const r=await f('https://displaycatalog.mp.microsoft.com/v7.0/products?'+new URLSearchParams({bigIds:id,market:c.cc,languages:c.locale.toLowerCase()}),{headers:{'User-Agent':UA},signal:t(15000)});
 if(!r.ok)throw new Error('Xbox HTTP '+r.status);return parseXboxPrice(await r.json(),id,c);
}

// GOG: ürün kimliği her ülkede aynı. Yanıt birden çok para birimi verebilir; ülkenin kendi para birimi varsa o seçilir.
export function parseGogPrice(j,id,c){
 const list=j?._embedded?.prices;if(!Array.isArray(list))return null;
 const pick=list.find(x=>x.currency?.code===c.currency)||list[0];if(!pick)return null;
 const amount=s=>{if(typeof s==='number')return Number.isFinite(s)&&s>=0?s/100:NaN;
  const raw=String(s??'').trim().split(/\s+/)[0];return /^\d+$/.test(raw)?Number(raw)/100:NaN;};
 const fin=amount(pick.finalPrice),base=amount(pick.basePrice);if(!Number.isFinite(fin)||fin<0||!pick.currency?.code)return null;
 return offer(fin,base,pick.currency.code,`https://www.gog.com/game/${encodeURIComponent(id)}`);
}
export async function gogPrice(id,c,f=fetch){
 const r=await f(`https://api.gog.com/products/${encodeURIComponent(id)}/prices?countryCode=${c.cc}`,{headers:{'User-Agent':UA,Accept:'application/json'},signal:t(15000)});
 if(r.status===400||r.status===404)return null;if(!r.ok)throw new Error('GOG HTTP '+r.status);return parseGogPrice(await r.json(),id,c);
}

// Epic: teklif kimliği her ülkede aynı ama ürüne doğrudan fiyat sorgusu yok; ülke mağazasında adla aranır, kimlik birebir eşleşmelidir.
const EPIC_QUERY='query searchStoreQuery($country:String!,$locale:String,$keywords:String){Catalog{searchStore(country:$country,locale:$locale,keywords:$keywords,count:20,category:"games/edition/base",allowCountries:$country){elements{id productSlug urlSlug catalogNs{mappings(pageType:"productHome"){pageSlug}} price(country:$country){totalPrice{discountPrice originalPrice currencyCode currencyInfo{decimals}}}}}}}';
export function parseEpicPrice(j,id,c){
 const s=j?.data?.Catalog?.searchStore;if(!s)throw new Error('Epic yanıtı okunamadı');
 const e=(s.elements||[]).find(x=>x.id===id),p=e?.price?.totalPrice;if(!p)return null;
 const d=10**(p.currencyInfo?.decimals??2),fin=Number(p.discountPrice)/d;if(!Number.isFinite(fin)||fin<0)return null;
 const slug=[e.catalogNs?.mappings?.[0]?.pageSlug,e.productSlug?.replace(/\/home$/,''),e.urlSlug].find(x=>/^[a-zA-Z0-9/_-]+$/.test(x||''));
 return offer(fin,Number(p.originalPrice)/d,p.currencyCode,slug?`https://store.epicgames.com/${c.locale}/p/${slug}`:'https://store.epicgames.com/');
}
export async function epicPrice(id,c,f=fetch,ctx={}){
 const name=ctx.name;if(!name)return null;
 const r=await f('https://store.epicgames.com/graphql',{method:'POST',headers:{'Content-Type':'application/json;charset=UTF-8','User-Agent':UA,Origin:'https://store.epicgames.com',Referer:'https://store.epicgames.com/'},body:JSON.stringify({query:EPIC_QUERY,variables:{country:c.cc,locale:c.locale,keywords:String(name).slice(0,80)}}),signal:t(15000)});
 if(!r.ok)throw new Error('Epic HTTP '+r.status);return parseEpicPrice(await r.json(),id,c);
}

// PlayStation: Avrupa kimliği (EP...) Türkiye, İngiltere, Polonya, Ukrayna ve Hindistan'da da geçerli. Geçerli olmadığı ülkede (ABD, Brezilya,
// bazen Almanya) oyunun concept sayfasından o ülkenin ürün kimliği bulunur ve aynı ad + aynı konsol kuşağıyla (PPSA/CUSA) eşleştirilir.
// Fiyat değerinin ondalık sayısı para birimine göre değişir (ör. INR "Rs 2,999" = 2999); biçimli metinden çıkarılır.
const decimals=(...s)=>{for(const x of s)if(/\d/.test(String(x||'')))return /[.,]\d{2}(?!\d)/.test(String(x))?2:0;return 2;};
export function psPrice(p){
 const x=p?.price;if(!x||!x.currencyCode||!Number.isFinite(x.basePriceValue))return null;
 const d=10**decimals(x.basePrice,x.discountedPrice),base=x.basePriceValue/d;
 const plus=x.isTiedToSubscription===true||(x.serviceBranding||[]).some(b=>b&&b!=='NONE');
 const fin=!plus&&Number.isFinite(x.discountedValue)?x.discountedValue/d:base; // abonelik fiyatı karşılaştırmaya alınmaz
 if(fin===0&&!x.isFree)return null; // "ücretsiz" işareti olmadan görünen 0 doğrulanmamış sayılır
 return{price:fin,base,currency:x.currencyCode};
}
const gen=id=>String(id||'').split('-')[1]?.slice(0,4)||'';
const generation=id=>{const g=gen(id);return g==='PPSA'?'PS5':g==='CUSA'?'PS4':null;};
export function matchPsProduct(products,target){
 const same=products.filter(p=>norm(p.name)===norm(target.name));
 const exact=products.find(p=>p.id===target.id);if(exact)return exact;
 const targetGen=generation(target.id);if(!targetGen)return null;
 const matches=same.filter(p=>generation(p.id)===targetGen);
 return matches.length===1?matches[0]:null;
}
async function psGql(productId,locale,f){
 const q=new URLSearchParams({operationName:'metGetConceptByProductIdQuery',variables:JSON.stringify({productId}),extensions:JSON.stringify({persistedQuery:{version:1,sha256Hash:CONCEPT_PRODUCTS_HASH}})});
 const r=await f(GQL+'?'+q,{headers:{'User-Agent':UA,'x-psn-store-locale-override':locale.toLowerCase(),Accept:'application/json','content-type':'application/json','x-apollo-operation-name':'metGetConceptByProductIdQuery','apollo-require-preflight':'true',Origin:'https://store.playstation.com',Referer:'https://store.playstation.com/'},signal:t(15000)});
 if(!r.ok)throw new Error('PS Store HTTP '+r.status);const j=await r.json(),pr=j?.data?.productRetrieve;
 if(!pr){if(/not available/i.test(j?.errors?.[0]?.message||''))return null;throw new Error('PS Store yanıtı okunamadı');}
 return{conceptId:pr.concept?.id?String(pr.concept.id):null,products:pr.concept?.selectableProducts?.purchasableProducts||[]};
}
export const conceptProductIds=html=>[...new Set([...String(html||'').matchAll(/"id":"([A-Z]{2}\d{4}-[A-Z]{4}\d{5}_00-[A-Z0-9]{16})"/g)].map(m=>m[1]))];
// ctx: aynı oyun için tüm ülkelerde paylaşılan TR kaydı (ad ve concept kimliği), ilk çağrıda doldurulur.
export async function psRegionPrice(id,c,f=fetch,ctx={}){
 ctx.tr??=psGql(id,'tr-TR',f).then(res=>({res,conceptId:res?.conceptId,target:{id,name:res?.products.find(p=>p.id===id)?.name||ctx.name||''}}));
 const tr=await ctx.tr;
 let res=c.cc==='TR'?tr.res:await psGql(id,c.locale,f);
 if(!res||!res.products.some(p=>p.id===id)){
  if(!tr.conceptId||!tr.target.name)return null;
  const r=await f(`https://store.playstation.com/${c.locale.toLowerCase()}/concept/${tr.conceptId}`,{headers:{'User-Agent':UA},signal:t(20000)});
  if(r.status===404)return null;if(!r.ok)throw new Error('PS Store concept HTTP '+r.status);
  const first=conceptProductIds(await r.text())[0];if(!first)return null;res=await psGql(first,c.locale,f);if(!res)return null;
 }
 const p=matchPsProduct(res.products,tr.target),m=p&&psPrice(p);if(!m)return null;
 return{...offer(m.price,m.base,m.currency,`https://store.playstation.com/${c.locale.toLowerCase()}/product/${p.id}`),edition:p.name};
}

export const READERS={steam:steamPrice,xbox:xboxPrice,gog:gogPrice,epic:epicPrice,playstation:psRegionPrice};

// Kur: USD, EUR, GBP sitenin geri kalanıyla aynı kaynaktan (TCMB döviz satış); TCMB'nin vermediği kurlar (PLN, UAH, INR, BRL) open.er-api.com'dan.
export function parseTcmb(xml){
 const out={};for(const code of ['USD','EUR','GBP']){const b=String(xml||'').match(new RegExp('<Currency[^>]*CurrencyCode="'+code+'"[\\s\\S]*?</Currency>'))?.[0];const unit=Number(b?.match(/<Unit>([^<]+)</)?.[1]||1),n=Number(b?.match(/<ForexSelling>([^<]+)</)?.[1]);if(Number.isFinite(n)&&n>0)out[code]=n/unit;}
 return{rates:out,date:String(xml||'').match(/Tarih="([^"]+)"/)?.[1]||null};
}
export function parseErApi(j){
 if(j?.result!=='success'||j.base_code!=='TRY')return{rates:{},date:null};
 const out={};for(const [k,v] of Object.entries(j.rates||{}))if(Number.isFinite(v)&&v>0)out[k]=1/v;return{rates:out,date:j.time_last_update_utc||null};
}
export async function fxRates(f=fetch){
 const [tc,er]=await Promise.allSettled([f('https://www.tcmb.gov.tr/kurlar/today.xml',{signal:t(12000)}).then(r=>r.ok?r.text():Promise.reject(new Error('TCMB HTTP '+r.status))).then(parseTcmb),f('https://open.er-api.com/v6/latest/TRY',{signal:t(12000)}).then(r=>r.ok?r.json():Promise.reject(new Error('Kur HTTP '+r.status))).then(parseErApi)]);
 const rates={TRY:{rate:1,source:'—',date:null}};
 if(er.status==='fulfilled')for(const c of COUNTRIES)if(er.value.rates[c.currency])rates[c.currency]={rate:er.value.rates[c.currency],source:'open.er-api.com',date:er.value.date};
 if(tc.status==='fulfilled')for(const [k,v] of Object.entries(tc.value.rates))rates[k]={rate:v,source:'TCMB döviz satış',date:tc.value.date};
 return rates;
}

// Tek oyun, tüm ülkeler. Bir ülkenin hatası diğerlerini durdurmaz; durum: ok | none (o ülkede satılmıyor/fiyatı yok) | error.
export async function regionalPrices({platform,id,name='',f=fetch,countries=COUNTRIES,rates=null,now=()=>new Date().toISOString()}){
 const read=READERS[platform];if(!read)throw new Error('Bu mağaza için bölge fiyatı yok');
 const ctx={name},fx=rates||await fxRates(f).catch(()=>({TRY:{rate:1}}));
 const rows=await Promise.all(countries.map(async c=>{
  try{const o=await read(id,c,f,ctx);if(!o)return{cc:c.cc,name:c.name,status:'none'};
   const r=fx[o.currency]?.rate;return{cc:c.cc,name:c.name,status:'ok',...o,price_try:Number.isFinite(r)?Math.round(o.price*r*100)/100:null};}
  catch(e){return{cc:c.cc,name:c.name,status:'error',error:String(e.message||e).slice(0,120)};}
 }));
 const used=[...new Set(rows.filter(r=>r.status==='ok'&&r.currency!=='TRY').map(r=>r.currency))];
 return{platform,id,countries:rows,fx:Object.fromEntries(used.map(k=>[k,fx[k]||null])),checkedAt:now()};
}
