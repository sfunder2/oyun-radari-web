// Oyun puanları: IGDB oyuncu puanı (rating) ve eleştirmen puanı (aggregated_rating), ikisi de 0–100, ve puan sayıları.
// Eşleştirme yeniden yapılmaz: oyun süresi toplayıcısının game_ttb tablosuna yazdığı igdb_id kullanılır (ttb.mjs).
// Bu dosya game_ttb'yi yalnız okur; puanlar ayrı game_igdb_score tablosuna yazılır (schema-v37-oyun-puanlari.sql).
export const FRESH_DAYS=7,BATCH=500;
const num=v=>Number.isFinite(v)?Math.round(v*10)/10:null;
const cnt=v=>Number.isInteger(v)&&v>0?v:0;
/** IGDB oyun kimlikleri -> games satırları (500'lük parçalar). */
export async function scoresFor(query,ids){
 const out=new Map(),list=[...new Set(ids)].filter(Number.isInteger);
 for(let i=0;i<list.length;i+=BATCH){
  const rows=await query('games',`fields id,slug,rating,rating_count,aggregated_rating,aggregated_rating_count; where id = (${list.slice(i,i+BATCH).join(',')}); limit ${BATCH};`);
  for(const r of rows||[])if(r.id)out.set(r.id,r);
 }
 return out;
}
/** Tabloya yazılacak satır. Puan yoksa da yazılır ki 7 gün boyunca yeniden sorulmasın. */
export function scoreRow(key,igdbId,g,now=new Date().toISOString()){
 const uv=cnt(g?.rating_count),cv=cnt(g?.aggregated_rating_count);
 return{title_key:key,igdb_id:igdbId,slug:typeof g?.slug==='string'&&/^[a-z0-9-]{1,200}$/.test(g.slug)?g.slug:null,
  user_rating:uv?num(g.rating):null,user_votes:uv,critic_rating:cv?num(g.aggregated_rating):null,critic_votes:cv,checked_at:now};
}
/** Sıralamadaki ölçü (SQL igdb_user_rank ile aynı): az oyla gelen uç puanlar 70'e doğru çekilir. */
export const PRIOR=70,PRIOR_VOTES=10;
export const userRank=r=>Number.isFinite(r?.user_rating)&&r.user_votes>0?(r.user_votes*r.user_rating+PRIOR_VOTES*PRIOR)/(r.user_votes+PRIOR_VOTES):null;

export async function runScores({sb,query,limit=Infinity,say=()=>{},now=new Date()}){
 const iso=now.toISOString(),cutoff=now.getTime()-FRESH_DAYS*864e5;
 const fresh=new Set((await sb.selectAll('game_igdb_score?select=title_key,checked_at')).filter(r=>Date.parse(r.checked_at)>cutoff).map(r=>r.title_key));
 const todo=(await sb.selectAll('game_ttb?select=title_key,igdb_id&igdb_id=not.is.null')).filter(r=>!fresh.has(r.title_key)).slice(0,limit);
 const games=await scoresFor(query,todo.map(r=>r.igdb_id));
 const rows=todo.map(r=>scoreRow(r.title_key,r.igdb_id,games.get(r.igdb_id),iso));
 if(rows.length)await sb.upsert('game_igdb_score',rows,'title_key',500);
 const users=rows.filter(r=>r.user_rating!=null).length,critics=rows.filter(r=>r.critic_rating!=null).length;
 say(`Güncellenen: ${rows.length} · oyuncu puanı olan: ${users} · eleştirmen puanı olan: ${critics} · taze (atlandı): ${fresh.size}`);
 return{rows:rows.length,users,critics};
}
