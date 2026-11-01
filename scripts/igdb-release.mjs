// Çıkış tarihi ve fragman: IGDB (Twitch) "release_dates" ve "videos" verisi -> game_igdb_info.
// Oyun süresi toplayıcısının (ttb.mjs) IGDB istemcisi ve eşleştirme yardımcıları yeniden kullanılır; yazılan tablo ayrıdır.
// Kapsam: 1) yaklaşan oyunlar (upcoming_games) her gün, 2) katalogdaki oyunlar (game_ttb'de IGDB kimliği bulunanlar) 14 günde bir.
import {titleKey} from './titles.mjs';
import {steamToIgdb,PLATFORMS,igdbClient} from './ttb.mjs';
export {igdbClient};
// Mağaza ailesi -> IGDB platform kimlikleri. Steam satırları PC (6) tarihini kullanır.
export const FAMILIES={steam:[6],playstation:[167,48],xbox:[169,49],switch:[130,508]};
const quote=s=>'"'+String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
const MONTHS={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
const pad=n=>String(n).padStart(2,'0');
const dayOf=unix=>Number.isFinite(unix)?new Date(unix*1000).toISOString().slice(0,10):null;

/** IGDB release_dates kaydı -> {date:'YYYY-MM-DD', precision}. Kesinlik "human" alanından okunur
 *  ("Mar 14, 2026" gün, "Mar 2026" ay, "Q3 2026" çeyrek, "2026" yıl, "TBD" belirsiz); böylece eski "category" ve yeni
 *  "date_format" alanlarından hangisinin API'de bulunduğuna bağlı kalınmaz. */
export function parseRelease(r){
 const h=String(r?.human||'').trim();let m;
 if(/^tbd$/i.test(h))return{date:null,precision:'tbd'};
 if((m=h.match(/^Q([1-4])\s+(\d{4})$/i)))return{date:`${m[2]}-${pad((m[1]-1)*3+1)}-01`,precision:'quarter'};
 if((m=h.match(/^(\d{4})$/)))return{date:`${m[1]}-01-01`,precision:'year'};
 if((m=h.match(/^([A-Z][a-z]{2})\s+(\d{4})$/))&&MONTHS[m[1]])return{date:`${m[2]}-${pad(MONTHS[m[1]])}-01`,precision:'month'};
 const d=dayOf(r?.date);if(d)return{date:d,precision:'day'};
 return null;
}
const RANK={day:0,month:1,quarter:2,year:3,tbd:4};
/** Oyunun tüm çıkış kayıtlarından: genel ilk çıkış (+kesinlik) ve aile başına gün kesinliğinde tarih. */
export function releaseInfo(dates,today){
 const parsed=(dates||[]).map(r=>({...parseRelease(r),platform:r?.platform})).filter(r=>r.precision);
 const platform_dates={};
 for(const [fam,ids] of Object.entries(FAMILIES)){
  const days=parsed.filter(r=>r.precision==='day'&&ids.includes(r.platform)).map(r=>r.date).sort();
  // Yaklaşan bir sürüm varsa (ör. eski oyunun yeni konsol sürümü) o, yoksa en eski tarih.
  const pick=days.find(d=>d>=today)||days[0];if(pick)platform_dates[fam]=pick;
 }
 const days=parsed.filter(r=>r.precision==='day').map(r=>r.date).sort();
 if(days.length)return{release_date:days[0],release_precision:'day',platform_dates};
 const part=parsed.filter(r=>r.date).sort((a,b)=>RANK[a.precision]-RANK[b.precision]||a.date.localeCompare(b.date))[0];
 if(part)return{release_date:part.date,release_precision:part.precision,platform_dates};
 return{release_date:null,release_precision:parsed.length?'tbd':null,platform_dates};
}
/** Fragman seçimi: çıkış/lansman fragmanı > resmî fragman > fragman > oynanış > teaser > diğer. Yorum, inceleme vb. alınmaz. */
export function pickTrailer(videos){
 const score=n=>/review|reaction|interview|developer diary|dev diary|podcast|walkthrough|let'?s play|commentary|livestream|stream/i.test(n)?-1
  :/launch|release/i.test(n)?6:/official.*trailer|trailer.*official/i.test(n)?5:/announce/i.test(n)?4:/trailer/i.test(n)?3:/gameplay/i.test(n)?2:/teaser/i.test(n)?1:0;
 let best=null,bs=-1;
 for(const v of videos||[]){
  const id=String(v?.video_id||'').trim();if(!/^[A-Za-z0-9_-]{11}$/.test(id))continue;
  const s=score(String(v.name||''));if(s>bs){best={id,name:String(v.name||'').slice(0,120)||null};bs=s;}
 }
 return best;
}
export function infoRow(key,game,matchedBy,today,now){
 if(!game)return{title_key:key,igdb_id:null,release_date:null,release_precision:null,platform_dates:{},trailer_youtube:null,trailer_name:null,matched_by:null,checked_at:now};
 const rel=releaseInfo(game.release_dates,today),tr=pickTrailer(game.videos);
 return{title_key:key,igdb_id:game.id,...rel,trailer_youtube:tr?.id??null,trailer_name:tr?.name??null,matched_by:matchedBy,checked_at:now};
}
const GAME_FIELDS='fields id,name,category,game_type,first_release_date,alternative_names.name,release_dates.date,release_dates.human,release_dates.platform,videos.video_id,videos.name';
/** IGDB oyun kimlikleri -> oyun kaydı (çıkış tarihleri ve videolarla). */
export async function gamesById(query,ids){
 const out=new Map(),list=[...new Set(ids.filter(Number.isInteger))];
 for(let i=0;i<list.length;i+=200){
  const rows=await query('games',`${GAME_FIELDS}; where id = (${list.slice(i,i+200).join(',')}); limit 500;`);
  for(const g of rows||[])if(g?.id)out.set(g.id,g);
 }
 return out;
}
/** Yaklaşan oyun için ad eşleşmesi: başlık anahtarı birebir aynı olmalı; aynı adı taşıyan birden çok oyunda
 *  (ör. 2004 ve 2026 "Fable") henüz çıkmamış ya da en yeni olan seçilir. */
export function pickUpcoming(rows,key,todayUnix){
 const list=(rows||[]).filter(g=>titleKey(g.name)===key||(g.alternative_names||[]).some(a=>titleKey(a?.name)===key));
 const fresh=g=>g.first_release_date==null||g.first_release_date>=todayUnix-180*86400;
 list.sort((a,b)=>fresh(b)-fresh(a)||((a.category??a.game_type??0)!==0)-((b.category??b.game_type??0)!==0)||(b.first_release_date??9e12)-(a.first_release_date??9e12));
 return list[0]&&fresh(list[0])?list[0]:null;
}
export async function searchUpcoming(query,name){
 const q=String(name||'').replace(/[™®©"\\]/g,' ').replace(/\s+/g,' ').trim().slice(0,100);if(!q)return[];
 return query('games',`search ${quote(q)}; ${GAME_FIELDS}; where platforms = (${PLATFORMS.join(',')}); limit 10;`);
}

const UPCOMING_HOURS=20,CATALOG_DAYS=14,MISS_DAYS=7;
/** Bir tur. Önce yaklaşan oyunlar (Steam kimliğiyle toplu eşleme, kalanlar ad araması), sonra katalog (oyun süresi
 *  toplayıcısının bulduğu IGDB kimlikleri; ad araması yapılmaz). */
export async function runIgdbRelease({sb,query,say=()=>{},now=new Date(),nameLimit=300,catalogLimit=6000}){
 const iso=now.toISOString(),today=new Date(now.getTime()+3*3600e3).toISOString().slice(0,10),todayUnix=Math.floor(Date.parse(today)/1000);
 const prev=new Map((await sb.selectAll('game_igdb_info?select=title_key,igdb_id,checked_at,matched_by')).map(r=>[r.title_key,r]));
 const age=k=>{const p=prev.get(k);return p?now.getTime()-Date.parse(p.checked_at):Infinity};
 // 1) Yaklaşan oyunlar
 const up=new Map();
 for(const r of await sb.selectAll('upcoming_games?select=id,platform,title_key,name')){
  if(!r.title_key)continue;const c=up.get(r.title_key)||{name:r.name,appid:null};
  if(r.platform==='steam'&&/^\d+$/.test(r.id))c.appid=String(r.id);up.set(r.title_key,c);
 }
 const upTodo=[...up].filter(([k])=>age(k)>(prev.get(k)?.igdb_id?UPCOMING_HOURS*3600e3:MISS_DAYS*864e5));
 const ids=new Map(),by=new Map();
 // Daha önce eşleşmiş oyunlar yeniden aranmaz, yalnız verisi tazelenir.
 for(const [k] of upTodo){const p=prev.get(k);if(p?.igdb_id){ids.set(k,p.igdb_id);by.set(k,p.matched_by||'name');}}
 const byApp=await steamToIgdb(query,upTodo.filter(([k,c])=>!ids.has(k)&&c.appid).map(([,c])=>c.appid));
 for(const [k,c] of upTodo)if(!ids.has(k)&&c.appid&&byApp.has(c.appid)){ids.set(k,byApp.get(c.appid));by.set(k,'steam');}
 const games=await gamesById(query,[...ids.values()]);
 let searched=0,errors=0;const missing=[];
 for(const [k,c] of upTodo){
  if(ids.has(k))continue;if(searched>=nameLimit){continue;}searched++;
  try{const hit=pickUpcoming(await searchUpcoming(query,c.name||k),k,todayUnix);if(hit){ids.set(k,hit.id);by.set(k,'name');games.set(hit.id,hit);}else missing.push(k);}
  catch(e){errors++;if(errors>10)throw e;}
 }
 const upRows=upTodo.filter(([k])=>ids.has(k)||missing.includes(k)).map(([k])=>infoRow(k,games.get(ids.get(k)),by.get(k),today,iso));
 if(upRows.length)await sb.upsert('game_igdb_info',upRows,'title_key',500);
 // 2) Katalog: oyun süresi tablosundaki IGDB kimlikleri (yalnız okunur).
 const cat=(await sb.selectAll('game_ttb?select=title_key,igdb_id&igdb_id=not.is.null')).filter(r=>!up.has(r.title_key)&&age(r.title_key)>CATALOG_DAYS*864e5).slice(0,catalogLimit);
 const cg=await gamesById(query,cat.map(r=>r.igdb_id));
 const catRows=cat.map(r=>cg.has(r.igdb_id)?infoRow(r.title_key,cg.get(r.igdb_id),'ttb',today,iso):null).filter(Boolean);
 if(catRows.length)await sb.upsert('game_igdb_info',catRows,'title_key',500);
 const all=[...upRows,...catRows],dated=upRows.filter(r=>r.release_precision==='day').length,trailers=all.filter(r=>r.trailer_youtube).length;
 say(`Yaklaşan: ${upRows.filter(r=>r.igdb_id).length}/${upTodo.length} eşleşti (ad araması ${searched}) · kesin tarihli: ${dated} · katalog: ${catRows.length} · fragmanlı: ${trailers}`);
 return{upcoming:upRows.length,catalog:catRows.length,dated,trailers,errors};
}
