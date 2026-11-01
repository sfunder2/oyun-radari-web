// Şu an Twitch'te en çok izlenen oyunlar: Twitch Helix "games/top" sırası, her oyun için canlı yayınların izleyici toplamı.
// Aynı Twitch uygulaması (TWITCH_CLIENT_ID/SECRET, IGDB toplayıcısıyla ortak) uygulama jetonuyla kullanılır; kullanıcı girişi gerekmez.
// Katalog eşleşmesi: 1) Twitch'in verdiği IGDB kimliği -> game_ttb.igdb_id -> başlık anahtarı, 2) Twitch adının başlık anahtarı.
// Eşleşen anahtarın mağaza ürünlerinden biri (Steam önce) karta "item" olarak yazılır ki site oyun ayrıntısını doğrudan açabilsin.
import {titleKey} from './titles.mjs';
const HELIX='https://api.twitch.tv/helix/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/** Helix istemcisi: uygulama jetonu, istekler arası küçük bekleme, 429'da Ratelimit-Reset'e kadar bekleyip yeniden deneme. */
export async function helixClient(clientId,clientSecret,{f=fetch,gap=80}={}){
 const t=await f('https://id.twitch.tv/oauth2/token?'+new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'client_credentials'}),{method:'POST'});
 if(!t.ok)throw new Error('Twitch jetonu alınamadı: HTTP '+t.status+' '+(await t.text().catch(()=>'')).slice(0,200));
 const token=(await t.json()).access_token;if(!token)throw new Error('Twitch jetonu boş döndü');
 let last=0;
 return async function get(path,params={}){
  const qs=new URLSearchParams();for(const [k,v] of Object.entries(params))for(const x of [].concat(v))if(x!==undefined&&x!==null&&x!=='')qs.append(k,String(x));
  for(let attempt=0;;attempt++){
   const wait=last+gap-Date.now();if(wait>0)await sleep(wait);last=Date.now();
   const r=await f(HELIX+path+(qs.size?'?'+qs:''),{headers:{'Client-ID':clientId,Authorization:'Bearer '+token}});
   if(r.status===429&&attempt<4){const reset=Number(r.headers?.get?.('ratelimit-reset'))*1000;await sleep(Math.min(60000,Math.max(1000,reset?reset-Date.now():1000*(attempt+1))));continue;}
   if(!r.ok)throw new Error(`Twitch ${path} HTTP ${r.status}: ${(await r.text()).slice(0,200)}`);
   return r.json();
  }
 };
}

/** En çok izlenen kategoriler. IGDB kimliği olmayanlar (Just Chatting, Music, Sports gibi oyun olmayan kategoriler) atılır. */
export async function topGames(get,limit=40){
 const out=[];let after;
 while(out.length<limit){
  const r=await get('games/top',{first:100,after});
  for(const g of r?.data||[])if(g.id&&g.name&&/^\d+$/.test(String(g.igdb_id||'')))out.push({id:String(g.id),name:g.name,igdbId:Number(g.igdb_id),boxArt:g.box_art_url||''});
  after=r?.pagination?.cursor;if(!after||!(r?.data||[]).length)break;
 }
 return out.slice(0,limit);
}

/** Bir oyunun canlı yayınlarının izleyici toplamı. Yayınlar izleyiciye göre sıralı gelir; kuyruk küçük olduğundan en çok `pages` sayfa okunur. */
export async function viewersFor(get,gameId,pages=5){
 let viewers=0,streams=0,after;
 for(let p=0;p<pages;p++){
  const r=await get('streams',{game_id:gameId,first:100,type:'live',after});
  const rows=r?.data||[];
  for(const s of rows){viewers+=Number(s.viewer_count)||0;streams++;}
  after=r?.pagination?.cursor;
  if(!after||rows.length<100||(Number(rows.at(-1)?.viewer_count)||0)<3)break;
 }
 return{viewers,streams};
}

export const boxArt=(url,w=285,h=380)=>String(url||'').replace('{width}',w).replace('{height}',h);
const KEY=/^[a-z0-9 ]{1,160}$/;
const inList=keys=>'in.('+keys.map(k=>'"'+String(k).replace(/"/g,'')+'"').join(',')+')';
// Kart için tercih edilen mağaza: Steam, sonra PlayStation, sonra diğerleri. Aynı mağazada sürüm adı olmayan, sonra ucuz olan.
const ORDER=['steam','playstation','xbox','epic','gog','switch'];
const num=v=>v===null||v===undefined||v===''?null:Number(v);

/** Mağaza satırı -> sitenin oyun ayrıntısını açan öğe biçimi (PlayStation kimliği öneksiz, diğerleri "platform:kimlik"). */
export function toItem(row,key){
 const platform=row.platform||'playstation',storeId=String(row.store_id??row.id);
 return{id:platform==='playstation'?storeId:platform+':'+storeId,storeId,platform,titleKey:key,name:row.name,image:row.image||null,
  price:num(row.price),originalPrice:num(row.original_price),discountPercent:Number(row.discount_percent)||0,currency:row.currency||'TRY',url:row.url||null,edition:row.edition||null};
}
export function pickOffer(rows){
 return [...rows].sort((a,b)=>ORDER.indexOf(a.platform||'playstation')-ORDER.indexOf(b.platform||'playstation')||!!a.edition-!!b.edition||(num(a.price)??9e9)-(num(b.price)??9e9))[0]||null;
}

/** Twitch oyunlarını katalogla eşler: Map(twitchId -> {key, item}). */
export async function matchCatalog(sb,games){
 const out=new Map(),keyOf=new Map();
 // 1) IGDB kimliği (oyun süresi toplayıcısının game_ttb tablosu kuruluysa)
 const ids=[...new Set(games.map(g=>g.igdbId).filter(Number.isInteger))];
 if(ids.length){
  try{for(const r of await sb.select('game_ttb?select=title_key,igdb_id&igdb_id=in.('+ids.join(',')+')'))if(r.igdb_id&&!keyOf.has(r.igdb_id))keyOf.set(r.igdb_id,r.title_key);}
  catch(e){if(!/404|PGRST205|does not exist/.test(e.message))throw e;}
 }
 const cand=new Map();for(const g of games){const ks=[keyOf.get(g.igdbId),titleKey(g.name)].filter(k=>k&&KEY.test(k));cand.set(g.id,[...new Set(ks)]);}
 const keys=[...new Set([...cand.values()].flat())];
 const offers=new Map();
 for(let i=0;i<keys.length;i+=60){
  const part=inList(keys.slice(i,i+60));
  const [so,ps]=await Promise.all([
   sb.select('store_offers?select=platform,store_id,title_key,name,image,price,original_price,discount_percent,currency,url,edition&title_key='+encodeURIComponent(part)),
   sb.select('ps_products?select=id,title_key,name,image,price,original_price,discount_percent,currency,url,edition&title_key='+encodeURIComponent(part)).catch(()=>[])
  ]);
  for(const r of [...(so||[]),...(ps||[]).map(r=>({...r,platform:'playstation'}))]){if(!offers.has(r.title_key))offers.set(r.title_key,[]);offers.get(r.title_key).push(r);}
 }
 for(const g of games)for(const k of cand.get(g.id)){const best=pickOffer(offers.get(k)||[]);if(best){out.set(g.id,{key:k,item:toItem(best,k)});break;}}
 return out;
}

/** Bir tur: sıralamayı al, izleyicileri topla, katalogla eşle, tabloyu bu turun satırlarıyla değiştir. */
export async function runTwitch({sb,get,limit=40,pages=5,say=()=>{},now=new Date()}){
 const iso=now.toISOString();
 const games=await topGames(get,limit);
 const rows=[];
 for(const g of games){const v=await viewersFor(get,g.id,pages);rows.push({...g,...v});}
 rows.sort((a,b)=>b.viewers-a.viewers);
 const match=await matchCatalog(sb,rows);
 const out=rows.map((g,i)=>({twitch_id:g.id,rank:i+1,name:g.name,igdb_id:g.igdbId,box_art:boxArt(g.boxArt)||null,viewers:g.viewers,streams:g.streams,
  title_key:match.get(g.id)?.key??null,item:match.get(g.id)?.item??null,updated_at:iso}));
 if(out.length){
  await sb.upsert('twitch_top_games',out,'twitch_id',100);
  await sb.del('twitch_top_games?updated_at=lt.'+encodeURIComponent(iso));
 }
 const matched=out.filter(r=>r.item).length;
 say(`Twitch: ${out.length} oyun · katalogla eşleşen: ${matched} · toplam izleyici: ${out.reduce((s,r)=>s+r.viewers,0).toLocaleString('tr-TR')}`);
 if(out[0])say('İlk 5: '+out.slice(0,5).map(r=>`${r.name} (${r.viewers.toLocaleString('tr-TR')}${r.item?'':', katalogda yok'})`).join(' · '));
 return{games:out.length,matched};
}
