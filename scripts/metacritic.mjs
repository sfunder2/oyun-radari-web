// Metacritic puanı tamamlayıcısı. Zenginleştirme Metacritic'i yalnız Steam arama sonucundaki "metascore" alanından alıyordu:
// bu alan yalnız PlayStation ürünü Steam'de birebir adla ve fiyatla bulununca okunuyordu. Bu yüzden PlayStation'a özel oyunlar,
// Steam adı farklı olanlar, ücretsiz oyunlar ve yalnız Steam/Xbox/Switch'te olan oyunlar puansız kalıyordu.
// İki açık kaynak eksikleri doldurur, var olan puanların üzerine yazmaz:
//  1) Wikidata (CC0): Metacritic'in verdiği eleştirmen puanı (P444, "review score by" = Metacritic) ve Metacritic kimliği (P1712).
//     Haftada bir tek SPARQL sorgusu. Eşleştirme önce Steam uygulama kimliğiyle (P1733), sonra başlık anahtarıyla.
//  2) Steam appdetails "metacritic" alanı: game_meta'daki Steam oyunları sırayla, her turda sınırlı sayıda (Steam hız sınırı).
import {titleKey} from './titles.mjs';
export const WIKIDATA_DAYS=7,METACRITIC_ITEM='Q150248';
const UA='OyunRadari/1.0 (https://github.com/sfunder2/oyun-radari-web; metacritic score sync)';
const BROWSER_UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
export const SPARQL=`SELECT ?item ?label ?score ?platLabel ?time ?steam ?mcid WHERE {
 ?item p:P444 ?st . ?st ps:P444 ?score ; pq:P447 wd:${METACRITIC_ITEM} .
 FILTER EXISTS { ?item wdt:P400 [] }
 OPTIONAL { ?st pq:P400 ?plat . ?plat rdfs:label ?platLabel . FILTER(LANG(?platLabel)="en") }
 OPTIONAL { ?st pq:P585 ?time }
 OPTIONAL { ?item rdfs:label ?label . FILTER(LANG(?label)="en") }
 OPTIONAL { ?item wdt:P1733 ?steam }
 OPTIONAL { ?item wdt:P1712 ?mcid }
}`;
// Site PlayStation ağırlıklı: aynı oyunda birden çok platform puanı varsa önce PS5, sonra PS4, sonra PC.
const PLATFORMS=[[/playstation 5/i,'PS5'],[/playstation 4/i,'PS4'],[/windows|^pc$|personal computer/i,'PC'],[/xbox series/i,'Xbox Series'],[/xbox one/i,'Xbox One'],[/switch 2/i,'Switch 2'],[/nintendo switch/i,'Switch'],[/playstation 3/i,'PS3'],[/xbox 360/i,'Xbox 360']];
export function shortPlatform(label){const hit=PLATFORMS.findIndex(([re])=>re.test(String(label||'')));return hit<0?{name:label?String(label).slice(0,30):null,rank:PLATFORMS.length}:{name:PLATFORMS[hit][1],rank:hit};}
/** "88/100" | "88" -> 88. Kullanıcı puanı ("8.5/10") ve geçersiz değerler null. */
export function parseScore(text){
 const t=String(text||'').trim();let m=t.match(/^(\d{1,3})(?:\.0+)?\s*\/\s*100$/);
 if(!m&&/^\d{2,3}$/.test(t))m=[t,t];
 const n=m?Number(m[1]):NaN;return Number.isInteger(n)&&n>0&&n<=100?n:null;
}
/** P1712 "game/playstation-4/the-last-of-us" | "game/astro-bot" -> https://www.metacritic.com/game/<slug>/ */
export function metacriticUrl(id,name){
 const m=String(id||'').trim().match(/^game\/(?:[a-z0-9-]+\/)?([a-z0-9][a-z0-9-]*)\/?$/i);
 if(m)return`https://www.metacritic.com/game/${m[1].toLowerCase()}/`;
 return name?`https://www.metacritic.com/search/${encodeURIComponent(name)}/?category=13`:null;
}
const qid=uri=>Number(String(uri||'').match(/Q(\d+)$/)?.[1]||0);
/** SPARQL JSON -> oyun başına tek kayıt: {qid,label,key,score,platform,time,steam:[...],url} */
export function parseWikidata(json){
 const items=new Map();
 for(const b of json?.results?.bindings||[]){
  const id=qid(b.item?.value);const score=parseScore(b.score?.value);if(!id||score==null)continue;
  let it=items.get(id);if(!it){it={qid:id,label:null,steam:new Set(),mcid:null,best:null};items.set(id,it);}
  if(b.label?.value)it.label=b.label.value;
  if(/^\d{1,8}$/.test(b.steam?.value||''))it.steam.add(b.steam.value);
  if(b.mcid?.value&&!it.mcid)it.mcid=b.mcid.value;
  const p=shortPlatform(b.platLabel?.value),time=b.time?.value?Date.parse(b.time.value)||0:0;
  const cand={score,platform:p.name,rank:p.rank,time};
  const best=it.best;
  if(!best||cand.rank<best.rank||(cand.rank===best.rank&&(cand.time>best.time||(cand.time===best.time&&cand.score>best.score))))it.best=cand;
 }
 const out=[];
 for(const it of items.values()){
  const key=it.label?titleKey(it.label):'';
  out.push({qid:it.qid,label:it.label,key,score:it.best.score,platform:it.best.platform,time:it.best.time,steam:[...it.steam],url:metacriticUrl(it.mcid,it.label)});
 }
 return out;
}
export async function fetchWikidata(f=fetch){
 const r=await f('https://query.wikidata.org/sparql',{method:'POST',headers:{'User-Agent':UA,Accept:'application/sparql-results+json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({query:SPARQL}),signal:AbortSignal.timeout(90000)});
 if(!r.ok)throw new Error('Wikidata HTTP '+r.status);
 return parseWikidata(await r.json());
}
/** Wikidata kayıtları -> başlık anahtarı başına tek kayıt. Steam kimliği eşleşmesi ad eşleşmesinden önce gelir;
 * aynı ada birden çok oyun düşerse (yeniden yapım ve özgün) puan tarihi yeni olan, sonra Wikidata kimliği büyük olan seçilir. */
export function pickByKey(items,steamToKey=new Map()){
 const byKey=new Map(),viaSteam=new Set();
 const newer=(a,b)=>a.time!==b.time?a.time>b.time:a.qid>b.qid;
 for(const it of items)for(const s of it.steam){const k=steamToKey.get(s);if(!k)continue;const cur=byKey.get(k);if(!cur||!viaSteam.has(k)||newer(it,cur)){byKey.set(k,it);viaSteam.add(k);}}
 for(const it of items){if(!it.key||viaSteam.has(it.key))continue;const cur=byKey.get(it.key);if(!cur||newer(it,cur))byKey.set(it.key,it);}
 return byKey;
}
/** Steam appdetails metacritic alanı -> {score,url} | null */
export function parseSteamMetacritic(entry){
 const m=entry?.success&&entry.data&&!Array.isArray(entry.data)?entry.data.metacritic:null;
 const score=Number(m?.score);if(!Number.isInteger(score)||score<=0||score>100)return null;
 const url=/^https:\/\/www\.metacritic\.com\//.test(m.url||'')?m.url.split('?')[0]:null;
 return{score,url};
}
export class RateLimited extends Error{}
export async function steamMetacritic(appid,f=fetch){
 const r=await f(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=metacritic`,{headers:{'User-Agent':BROWSER_UA},signal:AbortSignal.timeout(20000)});
 if(r.status===429||r.status===403)throw new RateLimited('Steam HTTP '+r.status);
 if(!r.ok)throw new Error('Steam HTTP '+r.status);
 const j=await r.json();if(j===null)throw new RateLimited('Steam boş yanıt');
 return parseSteamMetacritic(j?.[appid]);
}
const quote=k=>'"'+String(k).replaceAll('"','').replaceAll('\\','')+'"';
/** Verilen anahtarlardan puanı olanları ve satırı olanları döner. */
async function existing(sb,keys){
 const have=new Set(),rows=new Set();
 for(let i=0;i<keys.length;i+=300){
  const part=keys.slice(i,i+300);if(!part.length)continue;
  for(const r of await sb.select(`game_scores?select=title_key,metacritic&title_key=in.(${part.map(quote).join(',')})`)){rows.add(r.title_key);if(r.metacritic>0)have.add(r.title_key);}
 }
 return{have,rows};
}
async function knownKeys(sb,keys){
 const out=new Set();
 for(let i=0;i<keys.length;i+=300){
  const list=keys.slice(i,i+300).map(quote).join(',');if(!list)continue;
  for(const t of ['ps_products','store_offers'])for(const r of await sb.select(`${t}?select=title_key&title_key=in.(${list})`))out.add(r.title_key);
 }
 return out;
}
function scoreRows(found,rows,now){
 return found.map(x=>({title_key:x.key,metacritic:x.score,metacritic_platform:x.platform||null,metacritic_url:x.url||null,metacritic_checked_at:now,...(rows.has(x.key)?{}:{checked_at:now})}));
}
/** [{key,score,platform,url}] -> game_scores. Yalnız Metacritic sütunları yazılır; OpenCritic alanlarına dokunulmaz. */
export async function saveScores(sb,found,now=new Date().toISOString()){
 if(!found.length)return 0;const {rows}=await existing(sb,[...new Set(found.map(x=>x.key))]);
 await sb.upsert('game_scores',scoreRows([...new Map(found.map(x=>[x.key,x])).values()],rows,now),'title_key',500);return found.length;
}
export async function syncWikidata({sb,f=fetch,say=()=>{},now=new Date().toISOString()}){
 const items=await fetchWikidata(f);
 const steamIds=[...new Set(items.flatMap(i=>i.steam))],steamToKey=new Map();
 for(let i=0;i<steamIds.length;i+=300){
  const part=steamIds.slice(i,i+300);if(!part.length)continue;
  for(const r of await sb.select(`game_meta?select=title_key,steam_appid&steam_appid=in.(${part.join(',')})`))if(r.title_key)steamToKey.set(String(r.steam_appid),r.title_key);
  for(const r of await sb.select(`store_offers?select=title_key,store_id&platform=eq.steam&store_id=in.(${part.map(quote).join(',')})`))if(r.title_key&&!steamToKey.has(r.store_id))steamToKey.set(r.store_id,r.title_key);
 }
 const byKey=pickByKey(items,steamToKey);
 const known=await knownKeys(sb,[...byKey.keys()]);
 const keys=[...byKey.keys()].filter(k=>known.has(k));
 const {have,rows}=await existing(sb,keys);
 const found=keys.filter(k=>!have.has(k)).map(k=>({...byKey.get(k),key:k}));
 if(found.length)await sb.upsert('game_scores',scoreRows(found,rows,now),'title_key',500);
 await sb.upsert('ps_state',[{key:'metacritic_wikidata',value:{at:now,items:items.length,matched:keys.length,added:found.length}}],'key');
 say(`Wikidata: ${items.length} oyunda Metacritic puanı · sitede eşleşen: ${keys.length} · yeni eklenen: ${found.length}`);
 return{items:items.length,matched:keys.length,added:found.length};
}
/** game_meta Steam oyunlarında sırayla gezinir (imleç ps_state'te). Puanı zaten olan anahtarlar sorulmaz. */
export async function sweepSteam({sb,f=fetch,limit=80,gapMs=1500,deadline=Infinity,say=()=>{},now=new Date().toISOString(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 const st=(await sb.select('ps_state?select=value&key=eq.metacritic_steam'))?.[0]?.value||{};
 let after=Number(st.after)||0,checked=0,added=0,stopped=null,wrapped=false;const found=[];
 while(checked<limit&&!stopped){
  const page=await sb.select(`game_meta?select=title_key,steam_appid&steam_appid=gt.${after}&order=steam_appid&limit=${Math.max(50,limit*2)}`);
  if(!page.length){if(wrapped||after===0)break;after=0;wrapped=true;continue;}
  const {have}=await existing(sb,[...new Set(page.map(r=>r.title_key))]);
  for(const r of page){
   if(checked>=limit||Date.now()>deadline){stopped=stopped||(checked>=limit?null:'süre');break;}
   after=r.steam_appid;if(have.has(r.title_key))continue;
   try{const m=await steamMetacritic(r.steam_appid,f);checked++;if(m){found.push({key:r.title_key,score:m.score,platform:'PC',url:m.url||metacriticUrl(null,r.title_key)});have.add(r.title_key);}}
   catch(e){if(e instanceof RateLimited){stopped=e.message;after=r.steam_appid-1;break;}checked++;}
   await sleep(gapMs);
  }
  if(Date.now()>deadline)stopped=stopped||'süre';
 }
 added=await saveScores(sb,found,now);
 await sb.upsert('ps_state',[{key:'metacritic_steam',value:{after,at:now,checked,added,passes:(Number(st.passes)||0)+(wrapped?1:0)}}],'key');
 say(`Steam: ${checked} oyun soruldu · Metacritic puanı bulunan: ${added}${stopped?' · durdu: '+stopped:''} · imleç: ${after}`);
 return{checked,added,after,stopped};
}
export async function runMetacritic({sb,f=fetch,say=()=>{},deadlineMs=0,steamLimit=80,gapMs=1500,forceWikidata=false,now=new Date()}){
 const deadline=deadlineMs?Date.now()+deadlineMs:Infinity,iso=now.toISOString(),out={};
 const last=(await sb.select('ps_state?select=value&key=eq.metacritic_wikidata'))?.[0]?.value?.at;
 if(forceWikidata||!last||now.getTime()-Date.parse(last)>WIKIDATA_DAYS*864e5){
  try{out.wikidata=await syncWikidata({sb,f,say,now:iso});}catch(e){say('Wikidata atlandı: '+String(e.message).slice(0,160));out.wikidataError=String(e.message).slice(0,160);}
 }
 if(steamLimit>0)out.steam=await sweepSteam({sb,f,limit:steamLimit,gapMs,deadline,say,now:iso});
 return out;
}
