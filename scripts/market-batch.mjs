import {fetchSteamPage,fetchXboxPage,fetchSwitchPage,fetchEpicPage,fetchGogPage} from './market-catalog.mjs';
import {changedOffers,existingQuery} from './offer-diff.mjs';
import {makeItadFetcher,ITAD_PLATFORMS,ITAD_KEEP_PLATFORMS} from './itad.mjs';
export const ITAD_STALE_MS=3*24*3600e3; // tur boyunca yeniden görülmeyen ITAD teklifleri (mağaza satıştan kaldırdı) silinir
// Her turda mağazaların (Steam, Xbox, Switch, Epic, GOG; isteğe bağlı ITAD) katalogundan birkaç sayfa okunur; imleçler ps_state.market içinde saklanır, tur bitince başa dönülür.
// GitHub Actions (CLI) ve Supabase Edge Function aynı çekirdeği çalıştırır.
// itadKey verilirse ITAD (scripts/itad.mjs ITAD_SHOPS mağazaları) işi de eklenir; stateKey ayrı imleç kaydı içindir
// (ITAD GitHub Actions'ta ayrı çalışır, Edge Function'ın 'market' imleçlerini ezmesin).
export async function runMarketBatch({sb,pages=3,say=console.log,deadlineMs=0,stateKey='market',itadKey='',only=null,fetchers={steam:fetchSteamPage,xbox:fetchXboxPage,switch:fetchSwitchPage,epic:fetchEpicPage,gog:fetchGogPage}}){
 if(itadKey&&!fetchers.itad)fetchers={...fetchers,itad:makeItadFetcher({sb,key:itadKey})};
 if(only)fetchers=Object.fromEntries(Object.entries(fetchers).filter(([k])=>only.includes(k)));
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),deadline=deadlineMs?Date.now()+deadlineMs:Infinity;
 const saved=(await sb.select('ps_state?select=value&key=eq.'+stateKey))?.[0]?.value||{};
 const cur={steam:0,xbox:'',switch:0,epic:0,gog:0,itad:0,...saved.cursors},stats={},written={},errors=[];
 const jobs={ // wrapped: katalog bitti, imleç başa döndü; bu tur o mağaza için tamam
  steam:async()=>{const r=await fetchers.steam(cur.steam),wrapped=!(r.hasMore&&r.rows.length);cur.steam=wrapped?0:cur.steam+1;return{rows:r.rows,wrapped}},
  xbox:async()=>{const r=await fetchers.xbox(cur.xbox),wrapped=!r.hasMore;cur.xbox=wrapped?'':r.next;return{rows:r.rows,wrapped}},
  switch:async()=>{const r=await fetchers.switch(cur.switch),wrapped=!r.hasMore;cur.switch=wrapped?0:cur.switch+1;return{rows:r.rows,wrapped}},
  epic:async()=>{const r=await fetchers.epic(cur.epic),wrapped=!(r.hasMore&&r.rows.length);cur.epic=wrapped?0:cur.epic+1;return{rows:r.rows,wrapped}},
  gog:async()=>{const r=await fetchers.gog(cur.gog),wrapped=!(r.hasMore&&r.rows.length);cur.gog=wrapped?0:cur.gog+1;return{rows:r.rows,wrapped}},
  // ITAD sayfası Steam satırlarının bir dilimidir; dilimde hiç teklif çıkmasa da tur sürer (hasMore).
  itad:async()=>{const r=await fetchers.itad(cur.itad),wrapped=!r.hasMore;cur.itad=wrapped?0:r.next;return{rows:r.rows,wrapped}},
 };
 for(const market of Object.keys(jobs))if(!fetchers[market])delete jobs[market]; // verilmeyen mağaza bu turda atlanır
 // Mağazalar aynı anda okunur (farklı sunucular); her mağazanın tur başına sayfa sınırı ayrı verilebilir: {steam:10,xbox:20,switch:8}.
 const limit=market=>typeof pages==='object'?Number(pages[market]||0):pages;
 await Promise.all(Object.entries(jobs).map(async([market,job])=>{
  stats[market]=0;
  for(let i=0;i<limit(market);i++){
   if(Date.now()>deadline){errors.push({source:market,error:'süre bütçesi doldu'});break;}
   let wrapped=false;
   try{
    const r=await job();wrapped=r.wrapped;const rows=r.rows;
    const uniq=[...new Map(rows.map(r=>[r.platform+':'+r.store_id,r])).values()];
    // Değişmeyen ve yakın zamanda kontrol edilmiş teklifler yeniden yazılmaz; kayıtlı hâl okunamazsa hepsi yazılır.
    let fresh=uniq;if(uniq.length){try{fresh=changedOffers(uniq,await existingOffers(sb,uniq))}catch{fresh=uniq}}
    if(fresh.length)await sb.upsert('store_offers',fresh,'platform,store_id');stats[market]+=uniq.length;written[market]=(written[market]||0)+fresh.length;
    say(`${market} sayfa ${i+1}: ${uniq.length} kayıt, ${fresh.length} yazıldı`);
   }catch(e){errors.push({source:market,error:e.message});say(`${market} hata: ${e.message}`);break;}
   if(wrapped&&market==='itad'){try{await sb.del(`store_offers?platform=in.(${ITAD_PLATFORMS.filter(p=>!ITAD_KEEP_PLATFORMS.has(p)).join(',')})&checked_at=lt.${new Date(Date.now()-ITAD_STALE_MS).toISOString()}`)}catch(e){errors.push({source:market,error:'eski teklifler silinemedi: '+e.message})}}
   if(wrapped)break;
   await sleep(market==='xbox'?Number(process.env.MARKET_XBOX_SLEEP_MS||400):Number(process.env.MARKET_SLEEP_MS||600));
  }
 }));
 const finishedAt=new Date().toISOString(),total=Object.values(stats).reduce((a,b)=>a+b,0);
 const status=total===0&&errors.length?'failed':errors.length?'partial':'ok';
 await sb.upsert('ps_state',[{key:stateKey,value:{cursors:cur,finishedAt,stats,written,errors,status}}],'key');
 return{status,stats,written,errors,finishedAt};
}
// Kayıtlı hâl platform başına ve 100'erli parçalarla okunur (ITAD sayfası birden çok platform içerir, kimlikler uzun).
async function existingOffers(sb,rows){
 const out=[],by=new Map();for(const r of rows){if(!by.has(r.platform))by.set(r.platform,[]);by.get(r.platform).push(r);}
 const chunks=[];for(const g of by.values())for(let i=0;i<g.length;i+=100)chunks.push(g.slice(i,i+100));
 // 4 parça aynı anda okunur (Funnel sınırı 30 istek/sn; 5 mağaza paralel çalışsa da bu çok altında kalır).
 for(let i=0;i<chunks.length;i+=4)for(const rows of await Promise.all(chunks.slice(i,i+4).map(c=>sb.select(existingQuery(c)))))out.push(...(rows||[]));
 return out;
}
