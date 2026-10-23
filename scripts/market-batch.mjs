import {fetchSteamPage,fetchXboxPage,fetchSwitchPage} from './market-catalog.mjs';
// Her turda üç mağazanın katalogundan birkaç sayfa okunur; imleçler ps_state.market içinde saklanır, tur bitince başa dönülür.
// GitHub Actions (CLI) ve Supabase Edge Function aynı çekirdeği çalıştırır.
export async function runMarketBatch({sb,pages=3,say=console.log,deadlineMs=0,fetchers={steam:fetchSteamPage,xbox:fetchXboxPage,switch:fetchSwitchPage}}){
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),deadline=deadlineMs?Date.now()+deadlineMs:Infinity;
 const saved=(await sb.select('ps_state?select=value&key=eq.market'))?.[0]?.value||{};
 const cur={steam:0,xbox:'',switch:0,...saved.cursors},stats={},errors=[];
 const jobs={ // wrapped: katalog bitti, imleç başa döndü; bu tur o mağaza için tamam
  steam:async()=>{const r=await fetchers.steam(cur.steam),wrapped=!(r.hasMore&&r.rows.length);cur.steam=wrapped?0:cur.steam+1;return{rows:r.rows,wrapped}},
  xbox:async()=>{const r=await fetchers.xbox(cur.xbox),wrapped=!r.hasMore;cur.xbox=wrapped?'':r.next;return{rows:r.rows,wrapped}},
  switch:async()=>{const r=await fetchers.switch(cur.switch),wrapped=!(r.hasMore&&r.rows.length);cur.switch=wrapped?0:cur.switch+1;return{rows:r.rows,wrapped}},
 };
 // Üç mağaza aynı anda okunur (farklı sunucular); her mağazanın tur başına sayfa sınırı ayrı verilebilir: {steam:10,xbox:20,switch:8}.
 const limit=market=>typeof pages==='object'?Number(pages[market]||0):pages;
 await Promise.all(Object.entries(jobs).map(async([market,job])=>{
  stats[market]=0;
  for(let i=0;i<limit(market);i++){
   if(Date.now()>deadline){errors.push({source:market,error:'süre bütçesi doldu'});break;}
   let wrapped=false;
   try{
    const r=await job();wrapped=r.wrapped;const rows=r.rows;
    const uniq=[...new Map(rows.map(r=>[r.platform+':'+r.store_id,r])).values()];
    await sb.upsert('store_offers',uniq,'platform,store_id');stats[market]+=uniq.length;
    say(`${market} sayfa ${i+1}: ${uniq.length} kayıt`);
   }catch(e){errors.push({source:market,error:e.message});say(`${market} hata: ${e.message}`);break;}
   if(wrapped)break;
   await sleep(market==='xbox'?800:1200);
  }
 }));
 const finishedAt=new Date().toISOString(),total=Object.values(stats).reduce((a,b)=>a+b,0);
 const status=total===0&&errors.length?'failed':errors.length?'partial':'ok';
 await sb.upsert('ps_state',[{key:'market',value:{cursors:cur,finishedAt,stats,errors,status}}],'key');
 return{status,stats,errors,finishedAt};
}
