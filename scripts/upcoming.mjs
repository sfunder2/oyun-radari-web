// Çıkış takvimi: dört mağazanın yaklaşan oyunları -> upcoming_games satırları (platform başına bir satır).
// Takvim aynı oyunun satırlarını title_key ile birleştirir. Her kaynak bağımsızdır: biri başarısız olursa diğerleri yazılır.
import {titleKey} from './titles.mjs';
import {fetchUpcoming as fetchSteamUpcoming} from './steam-meta.mjs';
import {fetchGrid} from './ps-store.mjs';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const t=ms=>AbortSignal.timeout(ms);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const trToday=()=>new Date(Date.now()+3*3600e3).toISOString().slice(0,10);
const TR_MONTHS=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const dayText=d=>`${+d.slice(8,10)} ${TR_MONTHS[+d.slice(5,7)-1]} ${d.slice(0,4)}`;
// ISO tarih -> "YYYY-MM-DD"; mağazaların yer tutucu tarihleri (9998-12-31, 2100-01-01 gibi) belirsiz sayılır
export function isoDay(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m||+m[1]<2000||+m[1]>2035)return null;return `${m[1]}-${m[2]}-${m[3]}`;}
const row=o=>({id:o.id,platform:o.platform,title_key:titleKey(o.name),name:String(o.name).slice(0,200),image:o.image||null,release_text:o.release_text??(o.release_date?dayText(o.release_date):null),release_date:o.release_date||null,url:o.url,checked_at:o.checked_at,price:o.price??null,original_price:o.original_price??null,discount_percent:o.discount_percent||0,currency:o.price==null?null:o.currency,wishlist_rank:o.wishlist_rank??null});

// --- Xbox: Microsoft "Coming Soon" öneri listesi + DisplayCatalog ürün ayrıntısı (TR mağazası, TRY) ---
export function parseXboxProducts(j,now=new Date().toISOString(),today=trToday()){
 const out=[];
 for(const p of j?.Products||[]){
  const name=p.LocalizedProperties?.[0]?.ProductTitle;if(!p.ProductId||!name)continue;
  const date=isoDay(p.MarketProperties?.[0]?.OriginalReleaseDate);if(date&&date<today)continue;
  const imgs=p.LocalizedProperties?.[0]?.Images||[],img=imgs.find(i=>i.ImagePurpose==='SuperHeroArt')||imgs.find(i=>i.ImagePurpose==='BoxArt')||imgs.find(i=>i.ImagePurpose==='Poster')||imgs[0];
  const prices=(p.DisplaySkuAvailabilities||[]).flatMap(s=>s.Availabilities||[]).filter(a=>(a.Actions||[]).includes('Purchase')).map(a=>a.OrderManagementData?.Price).filter(x=>x&&x.CurrencyCode==='TRY'&&Number.isFinite(x.ListPrice)&&x.ListPrice>0).sort((a,b)=>a.ListPrice-b.ListPrice);
  const pr=prices[0],msrp=pr&&pr.MSRP>pr.ListPrice?pr.MSRP:null;
  out.push(row({id:'xbox:'+p.ProductId,platform:'xbox',name,image:img?.Uri?(img.Uri.startsWith('//')?'https:'+img.Uri:img.Uri):null,release_date:date,url:`https://www.xbox.com/tr-TR/games/store/game/${p.ProductId}`,checked_at:now,price:pr?.ListPrice??null,original_price:msrp,discount_percent:msrp?Math.round((1-pr.ListPrice/msrp)*100):0,currency:'TRY'}));
 }
 return out;
}
export async function fetchXboxUpcoming(f=fetch,count=200){
 const r=await f(`https://reco-public.rec.mp.microsoft.com/channels/Reco/V8.0/Lists/Computed/ComingSoon?Market=TR&Language=TR&ItemTypes=Game&deviceFamily=Windows.Xbox&count=${count}&skipitems=0`,{headers:{'User-Agent':UA},signal:t(20000)});
 if(!r.ok)throw new Error('Xbox yakında listesi HTTP '+r.status);
 const ids=[...new Set(((await r.json()).Items||[]).map(i=>i.Id).filter(Boolean))],out=[];
 for(let i=0;i<ids.length;i+=20){
  const d=await f(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${ids.slice(i,i+20).join(',')}&market=TR&languages=tr-tr`,{headers:{'User-Agent':UA},signal:t(20000)});
  if(!d.ok)throw new Error('Xbox katalog HTTP '+d.status);
  out.push(...parseXboxProducts(await d.json()));await sleep(300);
 }
 return out;
}

// --- Nintendo Switch: ABD mağazasının Algolia dizininde "yakında" ve "ön sipariş" oyunları (USD) ---
const NA='U3B6GR4UA3',NK='a29c6927638bfd8cee23993e51e721c9';
export function parseSwitchUpcoming(j,now=new Date().toISOString(),today=trToday()){
 const out=[];
 for(const h of j?.hits||[]){
  if(!h.title||!(h.urlKey||h.objectID))continue;
  const date=isoDay(h.releaseDate)||isoDay(h.releaseDateDisplay);if(date&&date<today)continue;
  const fin=Number.isFinite(h.price?.finalPrice)?h.price.finalPrice:null,reg=fin!==null&&h.price.regPrice>fin?h.price.regPrice:null;
  out.push(row({id:'switch:'+(h.urlKey||h.objectID),platform:'switch',name:h.title,image:h.productImage?`https://assets.nintendo.com/image/upload/f_auto/q_auto/w_800/${h.productImage}`:null,release_date:date,release_text:date?null:(typeof h.releaseDateDisplay==='string'&&!isoDay(h.releaseDateDisplay)?h.releaseDateDisplay:null),url:`https://www.nintendo.com/us/store/products/${encodeURIComponent(h.urlKey||h.objectID)}/`,checked_at:now,price:fin,original_price:reg,discount_percent:reg?Math.round((1-fin/reg)*100):0,currency:'USD'}));
 }
 return{rows:out,pages:j?.nbPages??0};
}
export async function fetchSwitchUpcoming(f=fetch,maxPages=5){
 const out=[];
 for(let page=0;page<maxPages;page++){
  const p=new URLSearchParams({'x-algolia-application-id':NA,'x-algolia-api-key':NK,hitsPerPage:'100',page:String(page),query:'',filters:'(availability:"Coming soon" OR availability:"Pre-order") AND (platform:"Nintendo Switch" OR platform:"Nintendo Switch 2")'});
  const r=await f(`https://${NA.toLowerCase()}-dsn.algolia.net/1/indexes/store_game_en_us?${p}`,{headers:{'User-Agent':UA},signal:t(20000)});
  if(!r.ok)throw new Error('Nintendo yakında HTTP '+r.status);
  const {rows,pages}=parseSwitchUpcoming(await r.json());out.push(...rows);if(page+1>=pages)break;await sleep(300);
 }
 return out;
}

// --- PlayStation Store TR: çıkış tarihine göre (yeniden eskiye) sıralı PS5/PS4 listesinin başı + ürün sayfasındaki çıkış tarihi ---
export function psReleaseDate(html){
 const s=String(html||'');
 return isoDay(s.match(/"releaseDate"\s*:\s*\{[^{}]*?"value"\s*:\s*"([^"]+)"/)?.[1])||isoDay(s.match(/"releaseDate"\s*:\s*"([^"]+)"/)?.[1])||null;
}
// known: daha önce bulunan çıkış tarihleri (ürün kimliği -> tarih); bunlar için ürün sayfası yeniden açılmaz, böylece
// her turda liste biraz daha derine (ör. birkaç hafta sonraki büyük çıkışlara) iner. maxPages yalnız yeni sayfa isteklerini sınırlar.
export async function fetchPsUpcoming(f=fetch,{maxPages=100,gridPages=3,grid=fetchGrid,known=new Map()}={}){
 const today=trToday(),now=new Date().toISOString(),out=new Map();let fetched=0,dated=0;
 const add=(p,d)=>out.set(p.id,row({id:'ps:'+p.id,platform:'playstation',name:p.name,image:p.image,release_date:d,url:p.url,checked_at:now,price:p.price,original_price:p.originalPrice,discount_percent:p.discountPercent,currency:'TRY'}));
 for(const kind of ['ps5','newest']){
  let past=0;
  for(let page=1;page<=gridPages&&past<3;page++){
   const {items}=await grid(kind,page,f);if(!items.length)break;
   for(let i=0;i<items.length&&past<3;){
    const fresh=[];
    for(;i<items.length&&fresh.length<4&&past<3;i++){const p=items[i];if(out.has(p.id))continue;const d=known.get(p.id);
     if(d){if(d<today)past++;else{past=0;add(p,d);}}else if(fetched+fresh.length<maxPages)fresh.push(p);}
    if(!fresh.length){if(fetched>=maxPages)break;continue;}
    const dates=await Promise.all(fresh.map(async p=>{try{const r=await f(p.url,{headers:{'User-Agent':UA,'Accept-Language':'tr-TR'},signal:t(15000)});return r.ok?psReleaseDate(await r.text()):null}catch{return null}}));
    fetched+=fresh.length;
    fresh.forEach((p,k)=>{const d=dates[k];if(!d)return;dated++;if(d<today){past++;return;}past=0;add(p,d);});
    // Ürün sayfaları tarih vermiyorsa (sayfa yapısı değişmiş) boşa istek atılmaz
    if(fetched>=8&&!dated)throw new Error('PS Store ürün sayfasında çıkış tarihi bulunamadı');
    await sleep(400);
   }
  }
 }
 return[...out.values()];
}

// --- Tüm kaynaklar ---
export async function refreshUpcoming(sb,{say=console.log,f=fetch,sources}={}){
 const src=sources||{steam:()=>fetchSteamUpcoming().then(rows=>rows.map(g=>row({...g,platform:'steam'}))),xbox:()=>fetchXboxUpcoming(f),switch:()=>fetchSwitchUpcoming(f),playstation:async()=>{const known=new Map(((await sb.select('upcoming_games?select=id,release_date&platform=eq.playstation&release_date=not.is.null').catch(()=>[]))||[]).map(r=>[String(r.id).replace(/^ps:/,''),r.release_date]));return fetchPsUpcoming(f,{known});}};
 const stats={},errors={};
 for(const [name,run] of Object.entries(src)){
  try{const rows=[...new Map((await run()).map(r=>[r.id,r])).values()];await sb.upsert('upcoming_games',rows,'id');stats[name]=rows.length;say(`Yaklaşan (${name}): ${rows.length}`);}
  catch(e){errors[name]=e.message.slice(0,160);say(`Yaklaşan (${name}) atlandı: ${errors[name]}`);}
 }
 const today=trToday();
 await sb.del(`upcoming_games?release_date=lt.${today}`);
 // Listeden düşen (3 gündür görülmeyen) kayıtlar silinir; başarısız kaynağın eski satırları bu süre boyunca korunur
 await sb.del(`upcoming_games?checked_at=lt.${new Date(Date.now()-3*864e5).toISOString()}`);
 const value={at:new Date().toISOString(),count:Object.values(stats).reduce((a,b)=>a+b,0),stats,errors};
 await sb.upsert('ps_state',[{key:'upcoming',value}],'key');
 return value;
}
