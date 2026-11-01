// Benzer oyunlar: IGDB "similar_games" verisi. IGDB oyun kimlikleri oyun süresi toplayıcısının game_ttb.igdb_id eşleşmesinden okunur
// (yeniden ad araması yapılmaz). IGDB'nin benzer bulduğu oyunlardan yalnız bizim katalogda da olanlar (game_ttb'de kimliği bulunanlar)
// başlık anahtarına çevrilip game_similar tablosuna yazılır.
export const MAX_KEYS=20,FRESH_DAYS=30;

/** IGDB oyun kimlikleri -> benzer oyun kimlikleri (IGDB sırasıyla). */
export async function similarFor(query,gameIds){
 const out=new Map(),ids=[...new Set(gameIds)].filter(Number.isInteger);
 for(let i=0;i<ids.length;i+=400){
  const rows=await query('games',`fields id,similar_games; where id = (${ids.slice(i,i+400).join(',')}); limit 500;`);
  for(const r of rows||[])if(r.id)out.set(r.id,(r.similar_games||[]).filter(Number.isInteger));
 }
 return out;
}
/** Kimlik -> başlık anahtarları. Aynı IGDB oyunu birden çok anahtara eşlenmişse (sürümler) hepsi tutulur, en kısa anahtar başta. */
export function reverseIndex(ttbRows){
 const m=new Map();
 for(const r of ttbRows||[])if(r.title_key&&Number.isInteger(r.igdb_id)){if(!m.has(r.igdb_id))m.set(r.igdb_id,[]);m.get(r.igdb_id).push(r.title_key)}
 for(const v of m.values())v.sort((a,b)=>a.length-b.length||a.localeCompare(b));
 return m;
}
/** Tabloya yazılacak satır: benzer kimlikleri katalog anahtarlarına çevirir; kendisi, aynı seri öneki ve tekrarlar atılır. */
export function similarRow(key,igdbId,similarIds,byId,now=new Date().toISOString()){
 const keys=[],seen=new Set([key]),self=k=>k===key||k.startsWith(key+' ')||key.startsWith(k+' ');
 for(const id of similarIds||[]){
  if(id===igdbId)continue;
  const k=(byId.get(id)||[])[0];
  if(!k||seen.has(k)||self(k))continue;
  seen.add(k);keys.push(k);if(keys.length>=MAX_KEYS)break;
 }
 return{title_key:key,igdb_id:igdbId,similar_keys:keys,similar_total:(similarIds||[]).length,checked_at:now};
}

/** Bir tur: IGDB kimliği bilinen ve son 30 günde bakılmamış oyunlar için benzer oyun listesi. */
export async function runSimilar({sb,query,limit=Infinity,say=()=>{},now=new Date()}){
 const iso=now.toISOString(),cutoff=now.getTime()-FRESH_DAYS*864e5;
 const ttb=await sb.selectAll('game_ttb?select=title_key,igdb_id&igdb_id=not.is.null');
 const byId=reverseIndex(ttb);
 const fresh=new Set((await sb.selectAll('game_similar?select=title_key,checked_at')).filter(r=>Date.parse(r.checked_at)>cutoff).map(r=>r.title_key));
 const todo=ttb.filter(r=>Number.isInteger(r.igdb_id)&&!fresh.has(r.title_key)).slice(0,limit);
 const sims=await similarFor(query,todo.map(r=>r.igdb_id));
 // IGDB'nin yanıt vermediği kimlikler de boş listeyle yazılır ki 30 gün boyunca yeniden sorulmasın.
 const rows=todo.map(r=>similarRow(r.title_key,r.igdb_id,sims.get(r.igdb_id)||[],byId,iso));
 if(rows.length)await sb.upsert('game_similar',rows,'title_key',500);
 const withKeys=rows.filter(r=>r.similar_keys.length).length;
 const left=ttb.filter(r=>!fresh.has(r.title_key)).length-todo.length;
 say(`IGDB kimliği bilinen: ${ttb.length} · bu turda bakılan: ${todo.length} · yazılan: ${rows.length} · katalogda benzeri olan: ${withKeys} · kalan: ${Math.max(0,left)}`);
 return{checked:todo.length,written:rows.length,withKeys};
}
