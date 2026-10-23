import {CATS,HASH,PAGE,gql} from './ps-store.mjs';
// PS Store tür taraması: kategori listesi "productGenres" süzgeciyle tür tür sayfalanır, her ürünün türleri ps_products.ps_genres / ps_tags alanına eklenir.
// Steam eşleşmesi olmayan PlayStation oyunlarının da tür filtresine ve "Sana göre" sıralamasına girmesi için.
// genres: arayüzdeki Türkçe tür adları (scripts/steam-meta.mjs GENRE_TR ile aynı küme). tags: persona eşleşmesi için Steam etiketi adları.
export const PS_GENRES={
 ACTION:{genres:['Aksiyon']},ADVENTURE:{genres:['Macera']},ROLE_PLAYING_GAMES:{genres:['RPG']},STRATEGY:{genres:['Strateji']},
 SIMULATION:{genres:['Simülasyon']},SIMULATOR:{genres:['Simülasyon']},SPORTS:{genres:['Spor']},SOCCER:{genres:['Spor']},FOOTBALL:{genres:['Spor']},
 BASEBALL:{genres:['Spor']},BASKETBALL:{genres:['Spor']},RACING:{genres:['Yarış'],tags:['Racing']},CASUAL:{genres:['Rahat']},FAMILY:{genres:['Rahat'],tags:['Family Friendly']},
 MASSIVELY_MULTIPLAYER_ONLINE_ROLE_PLAYING_GAME:{genres:['MMO','RPG'],tags:['Multiplayer']},
 SHOOTER:{tags:['Shooter']},FIRST_PERSON_SHOOTER:{tags:['Shooter','FPS']},THIRD_PERSON_SHOOTER:{tags:['Shooter','Third-Person Shooter']},
 HORROR:{tags:['Horror']},PUZZLE:{tags:['Puzzle']},PLATFORMER:{tags:['Platformer']},FIGHTING:{tags:['Fighting']},COMBAT:{tags:['Fighting']},
 PARTY:{tags:['Party Game']},FANTASY:{tags:['Fantasy']},ARCADE:{tags:['Arcade']},STEALTH:{tags:['Stealth']},'MUSIC/RHYTHM':{tags:['Rhythm']},
 CARD_GAME:{tags:['Card Game']},BRAIN_TRAINING:{tags:['Puzzle']},QUIZ:{tags:['Trivia']},EDUCATIONAL:{tags:['Education']},FITNESS:{tags:['Sports']}
};
export const GENRE_KEYS=Object.keys(PS_GENRES),SWEEP_CATS=['ps5','newest'];
// Bir tür + kategori sayfası: o sayfadaki ürün kimlikleri.
export async function fetchGenrePage(cat,key,offset,fetchImpl=fetch){
 const g=(await gql('categoryGridRetrieve',{id:CATS[cat],pageArgs:{size:PAGE,offset},sortBy:null,filterBy:['productGenres:'+key],facetOptions:[]},HASH,fetchImpl))?.categoryGridRetrieve;
 if(!g||!Array.isArray(g.products))throw new Error('PS Store tür listesi okunamadı ('+key+')');
 return{ids:g.products.map(p=>p?.id).filter(x=>typeof x==='string'),hasMore:g.pageInfo?.isLast===false&&g.products.length>0,total:g.pageInfo?.totalCount??null};
}
/** Kimlik -> {genres,tags}. Aynı ürün birden çok türde görünür; kümeler birleştirilir. */
export function collect(map,ids,key){
 const m=PS_GENRES[key];if(!m)return map;
 for(const id of ids){const e=map.get(id)||{genres:new Set(),tags:new Set()};for(const g of m.genres||[])e.genres.add(g);for(const t of m.tags||[])e.tags.add(t);map.set(id,e);}
 return map;
}
export const rowsOf=map=>[...map].map(([id,e])=>({id,genres:[...e.genres].sort(),tags:[...e.tags].sort()}));
// Konum: {cat,key,offset}. Sıradaki sayfa; tarama bitince null (sonraki tur baştan başlar).
export function nextPos(pos,hasMore){
 if(hasMore)return{...pos,offset:pos.offset+PAGE};
 const ki=GENRE_KEYS.indexOf(pos.key);
 if(ki>=0&&ki<GENRE_KEYS.length-1)return{cat:pos.cat,key:GENRE_KEYS[ki+1],offset:0};
 const ci=SWEEP_CATS.indexOf(pos.cat);
 return ci>=0&&ci<SWEEP_CATS.length-1?{cat:SWEEP_CATS[ci+1],key:GENRE_KEYS[0],offset:0}:null;
}
export const firstPos=()=>({cat:SWEEP_CATS[0],key:GENRE_KEYS[0],offset:0});
/** Süre bütçesi içinde tarar, sonuçları merge_ps_genres RPC'siyle yazar, kaldığı yeri ps_state'e kaydeder. */
export async function runGenreSweep({sb,deadlineMs=90000,maxPages=200,fetchImpl=fetch,say=console.log,sleepMs=250,restMs=12*3600e3}){
 const deadline=Date.now()+deadlineMs,sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const st=(await sb.select('ps_state?select=value&key=eq.genre_sweep'))?.[0]?.value||{};
 // Tam tarama bittikten sonra 12 saat beklenir; türler sık değişmez.
 if(!st.pos&&st.lastCompletedAt&&Date.now()-Date.parse(st.lastCompletedAt)<restMs){say('Tür taraması dinlenmede; son tamamlanma '+st.lastCompletedAt);return{pages:0,products:0,errors:0,completed:false,skipped:true};}
 let pos=st.pos&&PS_GENRES[st.pos.key]&&SWEEP_CATS.includes(st.pos.cat)&&Number.isInteger(st.pos.offset)?st.pos:firstPos();
 const startedAt=st.pos?st.startedAt:new Date().toISOString();
 const map=new Map();let pages=0,errors=0,completed=false,failPos=null,failCount=0;
 while(pos&&pages<maxPages&&Date.now()<deadline){
  try{const r=await fetchGenrePage(pos.cat,pos.key,pos.offset,fetchImpl);collect(map,r.ids,pos.key);pages++;pos=nextPos(pos,r.hasMore);}
  catch(e){
   // Hata: aynı sayfa sonraki turda yeniden denenir; üç turda üst üste başarısızsa bu türün kalan sayfaları atlanır.
   errors++;say('Tür sayfası okunamadı: '+String(e.message).slice(0,120));
   const same=st.failPos&&st.failPos.cat===pos.cat&&st.failPos.key===pos.key&&st.failPos.offset===pos.offset;
   failCount=same?(st.failCount||0)+1:1;failPos=pos;if(failCount>=3){pos=nextPos(pos,false);failCount=0;failPos=null;}
   break;
  }
  if(!pos)completed=true;
  await sleep(sleepMs);
 }
 const rows=rowsOf(map);
 for(let i=0;i<rows.length;i+=500)await sb.rpc('merge_ps_genres',{rows:rows.slice(i,i+500)});
 const now=new Date().toISOString();
 const value=completed?{pos:null,startedAt:null,lastCompletedAt:now,lastSweepStartedAt:startedAt,updatedAt:now,failPos:null,failCount:0}:{...st,pos,startedAt,updatedAt:now,failPos,failCount};
 await sb.upsert('ps_state',[{key:'genre_sweep',value}],'key');
 say(`Tür taraması: ${pages} sayfa, ${rows.length} ürün${completed?' · tarama tamamlandı':''}${errors?' · hata: '+errors:''}`);
 return{pages,products:rows.length,errors,completed,pos};
}
