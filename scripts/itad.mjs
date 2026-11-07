// IsThereAnyDeal (ITAD) üzerinden anahtar mağazalarının Türkiye fiyatları -> store_offers satırları.
// Katalog taranmaz: elimizdeki Steam oyunları ITAD kimliğine eşlenir, bu oyunlar için ITAD_SHOPS'taki mağazaların
// fiyatları istenir. Ad, görsel, tür ve etiketler Steam satırından alınır; böylece
// başlık anahtarı (title_key) Steam satırıyla aynı olur ve en ucuz teklif birleştirmesi ek iş gerektirmez.
// Ölçüm (1 Kasım 2026, 300 oyun): beş mağaza TR için TL fiyat veriyor; scripts/itad-probe.mjs.
import {titleKey} from './titles.mjs';
import {norm} from './ps-store.mjs';

export const ITAD_API='https://api.isthereanydeal.com';
// ITAD mağaza kimliği -> platform. GamesPlanet'in dört bölge mağazası tek platformda birleşir (en ucuzu tutulur).
// v47 (1 Kasım 2026, 597 oyunluk TR ölçümü, scripts/itad-probe-all.mjs): mevcut en ucuzu en az bir kez geçen sekiz anahtar
// mağazası ve iki resmî yayıncı mağazası (Ubisoft Store, Blizzard/Battle.net). Microsoft Store eklenmez: Xbox Store TR
// toplayıcısı aynı kataloğu ve aynı TL fiyatlarını zaten getiriyor.
export const ITAD_SHOPS={6:'fanatical',37:'humble',36:'gmg',64:'wingamestore',26:'gamesplanet',27:'gamesplanet',28:'gamesplanet',29:'gamesplanet',
 20:'gamebillet',15:'dreamgame',2:'allyouplay',24:'gamersgate',42:'indiegala',73:'planetplay',70:'playsum',74:'playerland',62:'ubisoft',4:'blizzard',16:'epic'};
export const ITAD_PLATFORMS=[...new Set(Object.values(ITAD_SHOPS))];
const STEAM_SHOP=61;
// Yayıncının kendi mağazası: satış anahtar değil, hesaba doğrudan eklenir; sürüm etiketi yazılmaz.
export const PUBLISHER_STORES=new Set(['ubisoft','blizzard','epic']);
// Epic'in kendi toplayıcısı (store.epicgames.com) bulut IP'lerinde 403 verdiği için fiyatlar ITAD'den gelir; ITAD'de olmayan Epic satırları silinmez.
export const ITAD_KEEP_PLATFORMS=new Set(['epic']);
export const LOOKUP_TTL_MS=30*24*3600e3; // eşleşmeyen oyunlar 30 günde bir yeniden sorulur

export function itadEdition(drm){
 const names=(drm||[]).map(x=>String(x?.name||x||'').trim()).filter(Boolean);
 if(names.some(n=>/drm\s*free/i.test(n)))return 'DRM yok';
 return names.length?`Anahtar (${[...new Set(names)].join(', ')})`:'Anahtar';
}

// prices/v3 yanıtı + ITAD kimliği -> kaynak (Steam) satırı eşlemesi -> store_offers satırları.
// Her oyun ve platform için en ucuz teklif tutulur; TL dışındaki para birimleri atlanır.
export function parseItadPrices(res,sources,now=new Date().toISOString()){
 if(!Array.isArray(res))throw new Error('ITAD fiyat yanıtı okunamadı');
 const best=new Map();
 for(const g of res){
  const src=sources.get(g?.id);if(!src?.name)continue;
  for(const d of g.deals||[]){
   const platform=ITAD_SHOPS[d?.shop?.id];if(!platform)continue;
   const price=Number(d.price?.amount),regular=Number(d.regular?.amount);
   if(d.price?.currency!=='TRY'||!Number.isFinite(price)||price<0)continue;
   if(!/^https:\/\//.test(d.url||''))continue;
   const k=platform+':'+g.id,old=best.get(k);if(old&&old.price<=price)continue;
   const orig=Number.isFinite(regular)&&regular>price?regular:null;
   best.set(k,{platform,store_id:String(g.id),title_key:titleKey(src.name),name:String(src.name).slice(0,200),name_search:norm(src.name),image:src.image||null,
    price,original_price:orig,discount_percent:orig?Math.round((1-price/orig)*100):0,currency:'TRY',url:d.url,edition:PUBLISHER_STORES.has(platform)?null:itadEdition(d.drm),
    genres:src.genres||[],tags:src.tags||[],checked_at:now});
  }
 }
 return[...best.values()];
}

async function call(f,key,path,params,body){
 const u=new URL(ITAD_API+path);for(const[k,v]of Object.entries({...params,key}))u.searchParams.set(k,v);
 const r=await f(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(40000)});
 if(!r.ok)throw new Error(`ITAD ${path.split('/').slice(0,3).join('/')} HTTP ${r.status}`);
 return r.json();
}

// runMarketBatch için sayfa okuyucu: imleç = Steam satırlarındaki konum. Her sayfa `size` Steam oyunudur.
export function makeItadFetcher({sb,key,size=200,f=fetch,now=()=>new Date()}){
 if(!key)throw new Error('ITAD_API_KEY gerekli');
 return async cursor=>{
  const off=Number(cursor)||0;
  const steam=await sb.select(`store_offers?select=store_id,name,image,genres,tags&platform=eq.steam&order=store_id&limit=${size}&offset=${off}`)||[];
  const hasMore=steam.length===size;
  if(!steam.length)return{rows:[],hasMore:false,next:0};
  // 1. Steam appid -> ITAD kimliği (önbellek: itad_games).
  const ids=steam.map(s=>s.store_id).filter(id=>/^\d+$/.test(id));
  const cached=new Map(((ids.length&&await sb.select(`itad_games?select=steam_appid,itad_id,checked_at&steam_appid=in.(${ids.join(',')})`))||[]).map(c=>[c.steam_appid,c]));
  const t=now().getTime(),stale=ids.filter(id=>{const c=cached.get(id);return!c||(!c.itad_id&&t-Date.parse(c.checked_at)>LOOKUP_TTL_MS)});
  if(stale.length){
   const map=await call(f,key,`/lookup/id/shop/${STEAM_SHOP}/v1`,{},stale.map(id=>'app/'+id))||{};
   const at=now().toISOString(),fresh=stale.map(id=>({steam_appid:id,itad_id:map['app/'+id]||null,checked_at:at}));
   await sb.upsert('itad_games',fresh,'steam_appid');for(const c of fresh)cached.set(c.steam_appid,c);
  }
  // 2. ITAD kimliği -> kaynak satır. Aynı ITAD oyununa birden çok Steam satırı düşerse ilki kalır.
  const sources=new Map();
  for(const s of steam){const id=cached.get(s.store_id)?.itad_id;if(id&&!sources.has(id))sources.set(id,s);}
  // 3. Türkiye fiyatları, yalnız seçilen mağazalar.
  const rows=[],gids=[...sources.keys()],at=now().toISOString();
  for(let i=0;i<gids.length;i+=100){
   const res=await call(f,key,'/games/prices/v3',{country:'TR',shops:Object.keys(ITAD_SHOPS).join(','),deals:'false',vouchers:'false',capacity:'0'},gids.slice(i,i+100));
   rows.push(...parseItadPrices(res,sources,at));
  }
  return{rows,hasMore,next:hasMore?off+steam.length:0};
 };
}
