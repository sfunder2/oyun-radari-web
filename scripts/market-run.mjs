import {appendFile} from 'node:fs/promises';
import {supabase} from './supabase.mjs';
import {fetchSteamPage,fetchXboxPage,fetchSwitchPage} from './market-catalog.mjs';
// Her turda üç mağazanın katalogundan birkaç sayfa okunur; imleçler ps_state.market içinde saklanır, tur bitince başa dönülür.
const {SUPABASE_URL,SUPABASE_SERVICE_KEY}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
const sb=supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY),PAGES=Number(process.env.MARKET_PAGES||3),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const saved=(await sb.select('ps_state?select=value&key=eq.market'))?.[0]?.value||{};
const cur={steam:0,xbox:'',switch:0,...saved.cursors},stats={},errors=[];
const jobs={
 steam:async()=>{const r=await fetchSteamPage(cur.steam);cur.steam=r.hasMore&&r.rows.length?cur.steam+1:0;return r.rows},
 xbox:async()=>{const r=await fetchXboxPage(cur.xbox);cur.xbox=r.hasMore?r.next:'';return r.rows},
 switch:async()=>{const r=await fetchSwitchPage(cur.switch);cur.switch=r.hasMore&&r.rows.length?cur.switch+1:0;return r.rows},
};
for(const [market,job] of Object.entries(jobs)){
 stats[market]=0;
 for(let i=0;i<PAGES;i++){
  try{
   const rows=await job();
   const uniq=[...new Map(rows.map(r=>[r.platform+':'+r.store_id,r])).values()];
   await sb.upsert('store_offers',uniq,'platform,store_id');stats[market]+=uniq.length;
   console.log(market,'sayfa',i+1,uniq.length,'kayıt');
  }catch(e){errors.push({source:market,error:e.message});console.log(market,'hata:',e.message);break;}
  await sleep(1500);
  if(market==='xbox'&&!cur.xbox&&i>0)break;
 }
}
const finishedAt=new Date().toISOString(),total=Object.values(stats).reduce((a,b)=>a+b,0);
await sb.upsert('ps_state',[{key:'market',value:{cursors:cur,finishedAt,stats,errors}}],'key');
console.log(JSON.stringify({stats,errors}));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`### Market katalogları\n\n${Object.entries(stats).map(([k,v])=>`- ${k}: ${v} kayıt`).join('\n')}\n${errors.map(e=>`- Hata: ${e.source}: ${e.error}`).join('\n')}\n`);
process.exitCode=total===0&&errors.length?1:0;
