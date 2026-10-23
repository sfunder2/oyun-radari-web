// Mağazaların kendi tür/etiket adları -> site tür adları (scripts/steam-meta.mjs GENRE_TR) ve persona eşleşmesi için Steam etiketi adları.
// GOG, Epic ve Nintendo İngilizce ad verir; Xbox (tr-TR) Türkçe kategori adı verir.
const T=(genres=[],tags=[])=>({genres,tags});
const EN={
 'action':T(['Aksiyon']),'action-adventure':T(['Aksiyon','Macera']),'action & adventure':T(['Aksiyon','Macera']),'adventure':T(['Macera']),'narrative adventure':T(['Macera'],['Narrative']),
 'rpg':T(['RPG']),'role playing':T(['RPG']),'role-playing':T(['RPG']),'jrpg':T(['RPG'],['JRPG']),'dungeon crawler':T(['RPG'],['Dungeon Crawler']),
 'strategy':T(['Strateji']),'rts':T(['Strateji'],['RTS']),'real-time strategy':T(['Strateji'],['RTS']),'turn-based':T(['Strateji'],['Turn-Based Strategy']),'turn-based strategy':T(['Strateji'],['Turn-Based Strategy']),
 'tower defense':T(['Strateji'],['Tower Defense']),'city builder':T(['Strateji','Simülasyon'],['City Builder']),'tactical':T(['Strateji'],['Tactical']),'grand strategy':T(['Strateji'],['Grand Strategy']),
 'simulation':T(['Simülasyon']),'sports':T(['Spor']),'racing':T(['Yarış'],['Racing']),'racing & flying':T(['Yarış'],['Racing']),'indie':T(['Bağımsız']),'casual':T(['Rahat']),'family & kids':T(['Rahat'],['Family Friendly']),
 'mmo':T(['MMO'],['Multiplayer']),'massively multiplayer':T(['MMO'],['Multiplayer']),
 'shooter':T([],['Shooter']),'shooting':T([],['Shooter']),'fps':T([],['Shooter','FPS']),'horror':T([],['Horror']),'puzzle':T([],['Puzzle']),'puzzle & trivia':T([],['Puzzle']),
 'platformer':T([],['Platformer']),'platforming':T([],['Platformer']),'fighting':T([],['Fighting']),'party':T([],['Party Game']),'fantasy':T([],['Fantasy']),'arcade':T([],['Arcade']),
 'stealth':T([],['Stealth']),'music':T([],['Rhythm']),'rhythmic gameplay':T([],['Rhythm']),'card game':T([],['Card Game']),'card & board':T([],['Card Game']),'tabletop':T([],['Board Game']),
 'educational':T([],['Education']),'education':T([],['Education']),'open world':T([],['Open World']),'free roaming':T([],['Open World']),'exploration':T([],['Exploration']),'survival':T([],['Survival']),
 'sandbox':T([],['Sandbox']),'co-op':T([],['Co-op']),'online co-op':T([],['Online Co-Op']),'local co-op':T([],['Local Co-Op']),'multiplayer':T([],['Multiplayer']),'online multiplayer':T([],['Multiplayer']),
 'local multiplayer':T([],['Multiplayer']),'competitive':T([],['Competitive']),'pvp':T([],['PvP']),'rogue-lite':T([],['Roguelike']),'roguelite':T([],['Roguelike']),'roguelike':T([],['Roguelike']),
 'metroidvania':T([],['Metroidvania']),'pixel art':T([],['Pixel Graphics']),'pixel graphics':T([],['Pixel Graphics']),'retro':T([],['Retro']),'story rich':T([],['Story Rich']),'narrative':T([],['Narrative']),
 'narration':T([],['Narrative']),'choices matter':T([],['Choices Matter']),'choose your own path':T([],['Choices Matter']),'atmospheric':T([],['Atmospheric']),'cute':T([],['Cute']),'relaxing':T([],['Relaxing']),
 'cozy':T([],['Cozy']),'farming sim':T(['Simülasyon'],['Farming Sim']),'life sim':T(['Simülasyon'],['Life Sim']),'hack and slash':T([],['Hack and Slash']),'souls-like':T([],['Souls-like']),
 'third-person shooter':T([],['Shooter','Third-Person Shooter']),'base building':T([],['Base Building']),'multi-player online battle arena':T([],['MOBA','Competitive'])
};
// Xbox tr-TR kategori adları; ürün kartlarındaki ad ile süzgeç başlığı bazen farklıdır (Atıcı / Nişancı, Rol oyunları / Canlandırma).
const TR=[
 [/aksiyon/,T(['Aksiyon','Macera'])],[/atıcı|nişancı/,T([],['Shooter'])],[/spor/,T(['Spor'])],[/simülasyon/,T(['Simülasyon'])],[/strateji/,T(['Strateji'])],
 [/yarış/,T(['Yarış'],['Racing'])],[/rol oyun|canlandırma/,T(['RPG'])],[/aile|çocuk/,T(['Rahat'],['Family Friendly'])],[/bulmaca/,T([],['Puzzle'])],[/dövüş/,T([],['Fighting'])],
 [/platform/,T([],['Platformer'])],[/müzik/,T([],['Rhythm'])],[/kart|kutu oyun/,T([],['Card Game'])],[/eğitim/,T([],['Education'])],[/savaş alanı/,T([],['MOBA','Competitive'])]
];
/** Etiket listesi -> {genres,tags}. Tanınmayan adlar atlanır; sonuç sıralı ve tekildir. */
export function mapStoreGenres(labels){
 const g=new Set(),t=new Set();
 for(const raw of Array.isArray(labels)?labels:[]){
  if(typeof raw!=='string')continue;const en=raw.trim().toLowerCase(),tr=raw.trim().toLocaleLowerCase('tr-TR');if(!en||en.length>60)continue;
  const hit=EN[en]||TR.find(([re])=>re.test(tr))?.[1];if(!hit)continue;
  for(const x of hit.genres)g.add(x);for(const x of hit.tags)t.add(x);
 }
 return{genres:[...g].sort(),tags:[...t].sort()};
}
