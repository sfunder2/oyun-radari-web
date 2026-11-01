// Oyun modları (tek kişilik, co-op, çok oyunculu, bölünmüş ekran, MMO, battle royale) ve tema etiketleri: IGDB (Twitch).
// Eşleştirme yeniden yapılmaz: oyun süresi toplayıcısının game_ttb tablosuna yazdığı igdb_id kullanılır (scripts/ttb.mjs).
// IGDB "games" uç noktasından game_modes, themes ve multiplayer_modes okunur; tabloya kısa kodlar yazılır (game_modes tablosu).
// Twitch istemcisi oyun süresiyle ortaktır (igdbClient).
export {igdbClient} from './ttb.mjs';

// IGDB game_modes kimlikleri -> kod. multiplayer_modes bayrakları co-op ve bölünmüş ekranı tamamlar.
export const MODE_IDS={1:'solo',2:'multi',3:'coop',4:'split',5:'mmo',6:'br'};
export const MODES=['solo','coop','split','multi','mmo','br'];
// IGDB themes kimlikleri -> kod. 42 (erotik) bilerek yok.
export const THEME_IDS={1:'action',17:'fantasy',18:'scifi',19:'horror',20:'thriller',21:'survival',22:'historical',23:'stealth',27:'comedy',28:'business',31:'drama',32:'nonfiction',33:'sandbox',34:'educational',35:'kids',38:'openworld',39:'warfare',40:'party',41:'4x',43:'mystery',44:'romance'};
export const THEMES=Object.values(THEME_IDS);

/** IGDB oyun satırı -> {modes, themes} (sıralı, tekrarsız kodlar). */
export function tagsOf(g){
 const modes=new Set(),themes=new Set();
 for(const id of g?.game_modes||[])if(MODE_IDS[id])modes.add(MODE_IDS[id]);
 for(const m of g?.multiplayer_modes||[]){
  if(!m||typeof m!=='object')continue;
  if(m.onlinecoop||m.offlinecoop||m.lancoop)modes.add('coop');
  if(m.splitscreen||m.splitscreenonline)modes.add('split');
 }
 for(const id of g?.themes||[])if(THEME_IDS[id])themes.add(THEME_IDS[id]);
 return{modes:MODES.filter(m=>modes.has(m)),themes:THEMES.filter(t=>themes.has(t))};
}
/** IGDB oyun kimlikleri -> Map(id -> IGDB satırı). 500'lük parçalar. */
export async function gamesFor(query,ids){
 const out=new Map(),list=[...new Set(ids)].filter(Number.isInteger);
 for(let i=0;i<list.length;i+=500){
  const rows=await query('games',`fields id,game_modes,themes,multiplayer_modes.onlinecoop,multiplayer_modes.offlinecoop,multiplayer_modes.lancoop,multiplayer_modes.splitscreen,multiplayer_modes.splitscreenonline; where id = (${list.slice(i,i+500).join(',')}); limit 500;`);
  for(const r of rows||[])if(Number.isInteger(r?.id))out.set(r.id,r);
 }
 return out;
}
export function modeRow(key,igdbId,g,now=new Date().toISOString()){
 const {modes,themes}=tagsOf(g);return{title_key:key,igdb_id:igdbId,modes,themes,checked_at:now};
}

const FRESH_DAYS=30;
/** Bir tur: game_ttb'de IGDB kimliği olan, game_modes'ta hiç olmayan, 30 günden eski ya da kimliği değişmiş oyunlar. */
export async function runPlayModes({sb,query,limit=Infinity,say=()=>{},now=new Date()}){
 const iso=now.toISOString(),cutoff=now.getTime()-FRESH_DAYS*864e5;
 const have=new Map();for(const r of await sb.selectAll('game_modes?select=title_key,igdb_id,checked_at'))have.set(r.title_key,r);
 const ttb=(await sb.selectAll('game_ttb?select=title_key,igdb_id&igdb_id=not.is.null')).filter(r=>r.title_key&&Number.isInteger(r.igdb_id));
 const due=ttb.filter(r=>{const h=have.get(r.title_key);return!h||h.igdb_id!==r.igdb_id||!(Date.parse(h.checked_at)>cutoff)}),todo=due.slice(0,limit);
 const games=await gamesFor(query,todo.map(r=>r.igdb_id));
 // IGDB'de kimliği artık olmayan oyunlar da boş etiketle yazılır ki her turda yeniden sorulmasın.
 const rows=todo.map(r=>modeRow(r.title_key,r.igdb_id,games.get(r.igdb_id),iso));
 if(rows.length)await sb.upsert('game_modes',rows,'title_key',500);
 const tagged=rows.filter(r=>r.modes.length||r.themes.length).length,coop=rows.filter(r=>r.modes.includes('coop')).length;
 say(`IGDB kimliği olan: ${ttb.length} · bu tur: ${rows.length} · etiketli: ${tagged} · co-op: ${coop} · kalan: ${due.length-todo.length}`);
 return{rows:rows.length,tagged,coop};
}
