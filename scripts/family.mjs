// Seri ve DLC bilgisi (IGDB). Oyunlar yeniden eşleştirilmez: IGDB kimliği oyun süresi tablosundan (game_ttb.igdb_id) alınır.
// Bir turda: 1) oyunların seri/marka ve ek içerik kimlikleri, 2) serilerin üyeleri (toplu, sayfalı), 3) ek içeriklerin adları.
import {titleKey} from './titles.mjs';
import {PLATFORMS} from './ttb.mjs';

// IGDB oyun türleri: 0 ana oyun, 1 DLC, 2 genişleme, 4 bağımsız genişleme, 8 yeniden yapım, 9 remaster, 10 genişletilmiş oyun.
export const SERIES_TYPES=[0,4,8,9,10],DLC_TYPES=[1,2,4];
export const MAX_SERIES=40,MAX_DLCS=60,FRESH_DAYS=30;
const typeOf=g=>g?.game_type??g?.category??0;
const yearOf=s=>Number.isFinite(s)&&s>0?new Date(s*1000).getUTCFullYear():null;

/** Tabloya yazılan kısa öğe: kimlik, ad, yıl, tür, başlık anahtarı (katalogda aramak için), kapak. */
export function entry(g){
 const o={id:g.id,n:String(g.name||'').slice(0,160)},y=yearOf(g.first_release_date),k=titleKey(g.name),c=g.cover?.image_id;
 if(y)o.y=y;const t=typeOf(g);if(t)o.t=t;if(k)o.k=k;if(c&&/^[a-z0-9]{4,40}$/i.test(c))o.c=c;
 return o;
}
const byDate=(a,b)=>(a.first_release_date??9e9)-(b.first_release_date??9e9)||a.id-b.id;

/** Serideki oyunlar: tarih sırasına göre; 40'tan fazlaysa bu oyunun çevresindeki 40 oyun. Bu oyunun kendisi de listede kalır. */
export function pickSeries(members,selfId,max=MAX_SERIES){
 const seen=new Set(),list=[];
 for(const g of [...members].sort(byDate))if(g?.id&&g.name&&!seen.has(g.id)&&SERIES_TYPES.includes(typeOf(g))){seen.add(g.id);list.push(g)}
 if(list.length<=1)return[];
 if(list.length<=max)return list.map(entry);
 const at=Math.max(0,list.findIndex(g=>g.id===selfId)),start=Math.min(Math.max(0,at-Math.floor(max/2)),list.length-max);
 return list.slice(start,start+max).map(entry);
}
/** Ek içerikler: yeniden eskiye, en çok 60. */
export function pickDlcs(rows,max=MAX_DLCS){
 const list=(rows||[]).filter(g=>g?.id&&g.name).sort((a,b)=>byDate(b,a));
 return list.slice(0,max).map(entry);
}
export function familyRow(key,game,{series=[],seriesName=null,dlcs=[],dlcTotal=0,parent=null},now=new Date().toISOString()){
 return{title_key:key,igdb_id:game.id,series_name:series.length?seriesName:null,series,dlcs,dlc_total:Math.max(dlcTotal,dlcs.length),parent:parent?entry(parent):null,checked_at:now};
}

const GAME_FIELDS='id,name,first_release_date,game_type,category,cover.image_id';
/** IGDB oyun kimlikleri -> seri, marka ve ek içerik kimlikleri. */
export async function gameLinks(query,ids){
 const out=new Map();
 for(let i=0;i<ids.length;i+=400){
  const part=ids.slice(i,i+400);
  const rows=await query('games',`fields id,name,first_release_date,collections,collection,franchises,franchise,dlcs,expansions,standalone_expansions,parent_game.${GAME_FIELDS.replace(/,/g,',parent_game.')}; where id = (${part.join(',')}); limit 500;`);
  for(const r of rows||[])if(r.id)out.set(r.id,r);
 }
 return out;
}
/** Kimlikle oyunlar (ek içerik adları için). */
export async function gamesById(query,ids){
 const out=new Map(),list=[...new Set(ids)];
 for(let i=0;i<list.length;i+=400){
  for(const r of await query('games',`fields ${GAME_FIELDS}; where id = (${list.slice(i,i+400).join(',')}); limit 500;`)||[])if(r.id)out.set(r.id,r);
 }
 return out;
}
/** Seri (collection) ya da marka (franchise) üyeleri; aynı istekte en çok 10 grup, 500'lük sayfalar. Yalnız konsol ve PC oyunları. */
export async function groupMembers(query,field,ids,{maxPages=6}={}){
 const out=new Map(),list=[...new Set(ids)];
 for(const id of list)out.set(id,[]);
 for(let i=0;i<list.length;i+=10){
  const part=list.slice(i,i+10);
  for(let page=0;page<maxPages;page++){
   const rows=await query('games',`fields ${GAME_FIELDS},${field}; where ${field} = (${part.join(',')}) & game_type = (${SERIES_TYPES.join(',')}) & platforms = (${PLATFORMS.join(',')}); sort id asc; limit 500; offset ${page*500};`)||[];
   for(const r of rows)for(const c of r[field]||[])if(out.has(c))out.get(c).push(r);
   if(rows.length<500)break;
  }
 }
 return out;
}
export async function groupNames(query,endpoint,ids){
 const out=new Map(),list=[...new Set(ids)];
 for(let i=0;i<list.length;i+=400)for(const r of await query(endpoint,`fields id,name; where id = (${list.slice(i,i+400).join(',')}); limit 500;`)||[])if(r.id)out.set(r.id,r.name);
 return out;
}
const arr=(...v)=>v.flatMap(x=>Array.isArray(x)?x:Number.isInteger(x)?[x]:[]);

/** Bir tur: game_ttb'de IGDB kimliği olan, 30 gündür bakılmamış oyunlar (en çok `limit`). */
export async function runFamily({sb,query,limit=3000,say=()=>{},now=new Date()}){
 const iso=now.toISOString(),cutoff=now.getTime()-FRESH_DAYS*864e5;
 const fresh=new Set((await sb.selectAll('game_family?select=title_key,checked_at')).filter(r=>Date.parse(r.checked_at)>cutoff).map(r=>r.title_key));
 const all=(await sb.selectAll('game_ttb?select=title_key,igdb_id&igdb_id=not.is.null')).filter(r=>Number.isInteger(r.igdb_id)&&!fresh.has(r.title_key));
 const todo=all.slice(0,limit);
 if(!todo.length){say('Seri ve DLC: yenilenecek oyun yok');return{rows:0,withSeries:0,withDlc:0,left:0}}
 const links=await gameLinks(query,[...new Set(todo.map(r=>r.igdb_id))]);
 const collOf=g=>arr(g?.collections,g?.collection),franOf=g=>arr(g?.franchises,g?.franchise);
 const games=[...links.values()];
 // Seri yoksa marka kullanılır (ör. birçok spor oyununun yalnız markası vardır).
 const colls=await groupMembers(query,'collections',games.flatMap(collOf));
 const needFran=games.filter(g=>!collOf(g).some(c=>(colls.get(c)||[]).length>1));
 const frans=await groupMembers(query,'franchises',needFran.flatMap(franOf));
 const names=new Map([...(await groupNames(query,'collections',[...colls.keys()])).entries()].map(([k,v])=>['c'+k,v]));
 for(const [k,v] of await groupNames(query,'franchises',[...frans.keys()]))names.set('f'+k,v);
 const dlcIds=new Map(games.map(g=>[g.id,[...new Set(arr(g.expansions,g.standalone_expansions,g.dlcs))]]));
 const dlcGames=await gamesById(query,[...dlcIds.values()].flat());
 const rows=[];
 for(const {title_key,igdb_id} of todo){
  const g=links.get(igdb_id);if(!g)continue;
  // En çok üyesi olan seri seçilir (bir oyun birden çok seride olabilir).
  let best=null;
  for(const c of collOf(g)){const m=colls.get(c)||[];if(m.length>1&&(!best||m.length>best.m.length))best={m,name:names.get('c'+c)}}
  if(!best)for(const f of franOf(g)){const m=frans.get(f)||[];if(m.length>1&&(!best||m.length>best.m.length))best={m,name:names.get('f'+f)}}
  const series=best?pickSeries(best.m,g.id):[];
  const ids=dlcIds.get(g.id)||[],dlcs=pickDlcs(ids.map(i=>dlcGames.get(i)).filter(Boolean));
  const parent=g.parent_game&&typeof g.parent_game==='object'&&g.parent_game.name?g.parent_game:null;
  rows.push(familyRow(title_key,g,{series,seriesName:best?.name||null,dlcs,dlcTotal:ids.length,parent},iso));
 }
 if(rows.length)await sb.upsert('game_family',rows,'title_key',300);
 const withSeries=rows.filter(r=>r.series.length).length,withDlc=rows.filter(r=>r.dlcs.length).length,left=all.length-todo.length;
 say(`Seri ve DLC: ${rows.length}/${todo.length} oyun yazıldı · serisi olan: ${withSeries} · ek içeriği olan: ${withDlc} · kalan: ${left}`);
 return{rows:rows.length,withSeries,withDlc,left};
}
