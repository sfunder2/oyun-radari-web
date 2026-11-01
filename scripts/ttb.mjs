// Oyun bitirme süresi: IGDB (Twitch) "game_time_to_beats" verisi. HowLongToBeat'in resmi API'si olmadığı için kullanılmaz.
// Eşleştirme iki yoldan: 1) Steam kimliği -> IGDB external_games (kaynak 1 = Steam), 2) Steam'de olmayan oyunlar için IGDB ad araması
// ve bizim başlık anahtarımızla birebir eşleşme. Süreler IGDB'de saniyedir, tabloya dakika olarak yazılır.
import {titleKey} from './titles.mjs';
const API='https://api.igdb.com/v4/',STEAM_SOURCE=1;
// Konsol ve PC platformları (IGDB kimlikleri): PS4 48, PS5 167, PC 6, Xbox One 49, Xbox Series 169, Switch 130, Switch 2 508.
export const PLATFORMS=[48,167,6,49,169,130,508];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/** Twitch istemci kimliğiyle IGDB'ye istek atan küçük istemci. Saniyede 4 istek sınırına uyar, 429'da bekleyip yeniden dener. */
export async function igdbClient(clientId,clientSecret,{f=fetch,gap=260}={}){
 const t=await f('https://id.twitch.tv/oauth2/token?'+new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'client_credentials'}),{method:'POST'});
 if(!t.ok)throw new Error('Twitch jetonu alınamadı: HTTP '+t.status+' '+(await t.text().catch(()=>'')).slice(0,200)+` (Client ID ${clientId.length} karakter, Secret ${clientSecret.length} karakter)`);
 const token=(await t.json()).access_token;if(!token)throw new Error('Twitch jetonu boş döndü');
 let last=0;
 return async function query(endpoint,body){
  for(let attempt=0;;attempt++){
   const wait=last+gap-Date.now();if(wait>0)await sleep(wait);last=Date.now();
   const r=await f(API+endpoint,{method:'POST',headers:{'Client-ID':clientId,Authorization:'Bearer '+token,Accept:'application/json'},body});
   if(r.status===429&&attempt<4){await sleep(1000*(attempt+1));continue;}
   if(!r.ok)throw new Error(`IGDB ${endpoint} HTTP ${r.status}: ${(await r.text()).slice(0,200)}`);
   return r.json();
  }
 };
}
const quote=s=>'"'+String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
const toMin=s=>Number.isFinite(s)&&s>0?Math.max(1,Math.round(s/60)):null;

/** Steam uygulama kimlikleri -> IGDB oyun kimliği. */
export async function steamToIgdb(query,appids){
 const out=new Map();
 for(let i=0;i<appids.length;i+=400){
  const part=appids.slice(i,i+400).map(String);
  const rows=await query('external_games',`fields game,uid; where external_game_source = ${STEAM_SOURCE} & uid = (${part.map(quote).join(',')}); limit 500;`);
  for(const r of rows||[])if(r.game&&r.uid&&!out.has(String(r.uid)))out.set(String(r.uid),r.game);
 }
 return out;
}
/** IGDB oyun kimlikleri -> {hastily, normally, completely, count} (saniye). */
export async function timesFor(query,gameIds){
 const out=new Map(),ids=[...new Set(gameIds)];
 for(let i=0;i<ids.length;i+=400){
  const rows=await query('game_time_to_beats',`fields game_id,hastily,normally,completely,count; where game_id = (${ids.slice(i,i+400).join(',')}); limit 500;`);
  for(const r of rows||[])if(r.game_id)out.set(r.game_id,r);
 }
 return out;
}
/** Ad araması: yalnız başlık anahtarı birebir aynı olan (asıl ad ya da diğer adlarından biri) oyun kabul edilir. */
export function pickByName(rows,key){
 const list=(rows||[]).filter(g=>titleKey(g.name)===key||(g.alternative_names||[]).some(a=>titleKey(a?.name)===key));
 // Aynı adı taşıyan birden çok oyun varsa (yeniden yapım vb.) en çok süre girişi olan değil, ana oyun (category 0) ve en eski kayıt seçilir.
 list.sort((a,b)=>((a.category??a.game_type??0)!==0)-((b.category??b.game_type??0)!==0)||(a.first_release_date??9e9)-(b.first_release_date??9e9));
 return list[0]||null;
}
export async function searchByName(query,name){
 const q=String(name||'').replace(/[™®©"\\]/g,' ').replace(/\s+/g,' ').trim().slice(0,100);if(!q)return[];
 return query('games',`search ${quote(q)}; fields id,name,alternative_names.name,category,game_type,first_release_date; where platforms = (${PLATFORMS.join(',')}); limit 10;`);
}
/** Tabloya yazılacak satır. Süre yoksa (IGDB'de kimse girmemiş) igdb_id yine yazılır ki 30 gün boyunca yeniden sorulmasın. */
export function ttbRow(key,igdbId,t,matchedBy,now=new Date().toISOString()){
 return{title_key:key,igdb_id:igdbId??null,hastily_min:toMin(t?.hastily),normally_min:toMin(t?.normally),completely_min:toMin(t?.completely),votes:Number.isInteger(t?.count)?t.count:0,matched_by:igdbId?matchedBy:null,checked_at:now};
}
/** Arayüz ve SQL'deki kova sınırları (dakika; ana hikâye + yan içerik, yoksa acele süresi). */
export const BUCKETS=[['short',0,480],['medium',480,1200],['long',1200,3000],['epic',3000,Infinity]];
export function bucketOf(row){
 const m=row?.normally_min??row?.hastily_min;if(!Number.isFinite(m)||m<=0)return null;
 return BUCKETS.find(([,lo,hi],i)=>i===0?m<=hi:m>lo&&m<=hi)?.[0]??null;
}

const FRESH_DAYS=30;
/** Bir tur: önce Steam kimliği olan oyunlar (toplu, ucuz), sonra kalanlar için sınırlı sayıda ad araması. */
export async function runTtb({sb,query,steamLimit=Infinity,nameLimit=800,say=()=>{},now=new Date()}){
 const iso=now.toISOString(),cutoff=now.getTime()-FRESH_DAYS*864e5;
 const fresh=new Set((await sb.selectAll('game_ttb?select=title_key,checked_at')).filter(r=>Date.parse(r.checked_at)>cutoff).map(r=>r.title_key));
 // 1) Steam
 const steam=new Map();for(const o of await sb.selectAll('store_offers?select=title_key,store_id&platform=eq.steam'))if(o.title_key&&/^\d+$/.test(o.store_id)&&!steam.has(o.title_key))steam.set(o.title_key,o.store_id);
 const steamTodo=[...steam].filter(([k])=>!fresh.has(k)).slice(0,steamLimit);
 const byApp=await steamToIgdb(query,steamTodo.map(([,a])=>a));
 const times=await timesFor(query,[...byApp.values()]);
 const rows=steamTodo.map(([k,a])=>{const g=byApp.get(String(a));return ttbRow(k,g,g?times.get(g):null,'steam',iso)});
 // Steam'de IGDB eşleşmesi çıkmayanlar ad aramasına bırakılır (satır yazılmaz).
 const steamRows=rows.filter(r=>r.igdb_id);
 if(steamRows.length)await sb.upsert('game_ttb',steamRows,'title_key',500);
 for(const r of steamRows)fresh.add(r.title_key);
 // 2) Ad araması: önce PlayStation, sonra diğer mağazalar. Steam eşleşmesi olup IGDB'de kimliği bulunamayanlar da buraya girer.
 const names=new Map();
 for(const p of await sb.selectAll('ps_products?select=title_key,name'))if(p.title_key&&!names.has(p.title_key))names.set(p.title_key,p.name);
 for(const o of await sb.selectAll('store_offers?select=title_key,name&platform=neq.steam'))if(o.title_key&&!names.has(o.title_key))names.set(o.title_key,o.name);
 for(const [k] of steam)if(!names.has(k))names.set(k,null);
 const nameTodo=[...names].filter(([k])=>!fresh.has(k)).slice(0,nameLimit);
 const found=[];let errors=0;
 for(const [k,name] of nameTodo){
  try{const hit=pickByName(await searchByName(query,name||k),k);found.push([k,hit?.id??null]);}
  catch(e){errors++;if(errors>10)throw e;}
 }
 const t2=await timesFor(query,found.map(([,g])=>g).filter(Boolean));
 const nameRows=found.map(([k,g])=>ttbRow(k,g,g?t2.get(g):null,'name',iso));
 if(nameRows.length)await sb.upsert('game_ttb',nameRows,'title_key',500);
 const all=[...steamRows,...nameRows],withTime=all.filter(r=>r.normally_min||r.hastily_min).length;
 say(`Steam eşleşmesi: ${steamRows.length}/${steamTodo.length} · ad araması: ${nameRows.filter(r=>r.igdb_id).length}/${nameTodo.length} · süresi olan: ${withTime} · kalan: ${Math.max(0,[...names].filter(([k])=>!fresh.has(k)).length-nameTodo.length)}`);
 return{steam:steamRows.length,name:nameRows.length,withTime,errors};
}
