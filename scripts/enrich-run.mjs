import {supabase} from './supabase.mjs';
import {enrichProduct} from './enrich.mjs';
import {parseOcSitemap} from './stores.mjs';
import {titleKey} from './titles.mjs';
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
// 2) OpenCritic dizinini belleğe al (title_key -> {id,slug}); aynı anahtarda en küçük id korunur
const ocIndex=new Map();
for(const r of await sb.selectAll('oc_index?select=id,slug,title_key&order=id',1000))if(!ocIndex.has(r.title_key))ocIndex.set(r.title_key,r);
// 3) Sıradaki ürünler: hiç zenginleştirilmemiş olanlar önce (indirimliler en önde), sonra en eskiler
const products=await sb.select(`ps_products?select=id,name,title_key&order=enriched_at.asc.nullsfirst,discount_percent.desc&limit=${BATCH}`);
let offersN=0,scoresN=0,errN=0;const offers=[],scores=new Map(),done=[],now=new Date().toISOString();
for(let i=0;i<products.length;i+=3){
 await Promise.all(products.slice(i,i+3).map(async p=>{
  const r=await enrichProduct(p,{ocIndex});done.push({id:p.id,key:r.key});
  offers.push(...r.offers);if(r.scores)scores.set(r.key,r.scores);errN+=r.errors.length;
  if(r.errors.length)console.log(p.name,'->',r.errors.join(' | '));
 }));
 await sleep(500);
}
// yinelenen anahtarlar tek kayıt olsun
const uniq=new Map(offers.map(o=>[o.platform+':'+o.store_id,o]));
await sb.upsert('store_offers',[...uniq.values()],'platform,store_id');
await sb.upsert('game_scores',[...scores.values()],'title_key');
const missing=new Map(products.filter(p=>!p.title_key).map(p=>[p.id,true]));
for(let i=0;i<done.length;i+=50){const chunk=done.slice(i,i+50);
 await sb.patch(`ps_products?id=in.(${chunk.map(c=>`"${c.id}"`).join(',')})`,{enriched_at:now});
 for(const c of chunk)if(c.key&&missing.has(c.id))await sb.patch(`ps_products?id=eq.${encodeURIComponent(c.id)}`,{title_key:c.key});}
offersN=uniq.size;scoresN=scores.size;
say(`Ürün: ${products.length} · mağaza teklifi: ${offersN} · puan kaydı: ${scoresN} · kaynak hatası: ${errN}`);
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'### Zenginleştirme\n\n'+log.map(l=>'- '+l).join('\n')+'\n');
