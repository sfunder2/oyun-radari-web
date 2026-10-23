import {supabase} from './supabase.mjs';
import {parseOcSitemap} from './stores.mjs';
import {runEnrichBatch,loadOcIndex} from './enrich-batch.mjs';
import {appendFile} from 'node:fs/promises';
const {SUPABASE_URL,SUPABASE_SERVICE_KEY}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
const sb=supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY),BATCH=Number(process.env.ENRICH_BATCH||60),sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{await sb.select('oc_index?select=id&limit=1')}catch(e){if(/404|PGRST205/.test(e.message)){console.log('supabase/schema-v2.sql henüz çalıştırılmamış; zenginleştirme atlandı.');process.exit(0)}throw e}
const UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'};
const log=[];const say=m=>{console.log(m);log.push(m)};
// 1) OpenCritic site haritası (robots.txt izin veriyor) -> oc_index; boşsa veya 30 günden eskiyse yenilenir
async function buildOcIndex(){
 const st=await sb.select('ps_state?select=value&key=eq.oc_index');const last=st?.[0]?.value?.at?Date.parse(st[0].value.at):0;
 if(Date.now()-last<30*864e5)return;
 const idx=await (await fetch('https://opencritic.com/sitemap.xml',{headers:UA})).text();
 const maps=[...idx.matchAll(/<loc>(https:\/\/opencritic\.com\/sitemap_games_\d+\.xml)<\/loc>/g)].map(m=>m[1]);
 const rows=new Map();
 for(const u of maps){const r=await fetch(u,{headers:UA});if(!r.ok)continue;for(const e of parseOcSitemap(await r.text()))rows.set(e.id,e);await sleep(500);}
 await sb.upsert('oc_index',[...rows.values()],'id',500);
 await sb.upsert('ps_state',[{key:'oc_index',value:{at:new Date().toISOString(),count:rows.size}}],'key');
 say(`OpenCritic dizini: ${rows.size} oyun`);
}
await buildOcIndex();
const result=await runEnrichBatch({sb,batch:BATCH,say,ocIndex:await loadOcIndex(sb)});
say(`Ürün: ${result.products} · mağaza teklifi: ${result.offers} · puan kaydı: ${result.scores} · kaynak hatası: ${result.errors}`);
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'### Zenginleştirme\n\n'+log.map(l=>'- '+l).join('\n')+'\n');

