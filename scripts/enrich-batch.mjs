import {mergeScores} from './score-merge.mjs';
import {enrichProduct} from './enrich.mjs';
import {titleKey} from './titles.mjs';
import {fetchUpcoming,fetchDetails,fetchNews} from './steam-meta.mjs';
import {fetchAllNews} from './news.mjs';
import {fetchAccent} from './color.mjs';
// Zenginleştirme turunun çekirdeği. Hem GitHub Actions (CLI) hem Supabase Edge Function aynı kodu çalıştırır.
// deadlineMs: Edge Function'ların süre sınırı için zaman bütçesi; dolunca kalan işler sonraki tura bırakılır.
export async function loadOcIndex(sb){
 const ocIndex=new Map();
 for(const r of await sb.selectAll('oc_index?select=id,slug,title_key&order=id',1000)){const slug=r.slug.split('/')[0],key=titleKey(slug.replace(/-/g,' '));if(!ocIndex.has(key))ocIndex.set(key,{...r,slug,title_key:key});}
 return ocIndex;
}
export async function runEnrichBatch({sb,batch=60,say=console.log,deadlineMs=0,accentLimit=60,concurrency=3,ocIndex}){
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),deadline=deadlineMs?Date.now()+deadlineMs:Infinity;
let hasMeta=true;
try{await sb.select('game_meta?select=title_key&limit=1');await sb.select('upcoming_games?select=id&limit=1');}catch(e){if(/404|PGRST205/.test(e.message)){hasMeta=false;say('supabase/schema-v4.sql henüz çalıştırılmamış; tür/tarih/takvim verisi atlanıyor.');}else throw e;}
// 2) OpenCritic dizinini belleğe al (title_key -> {id,slug}); aynı anahtarda en küçük id korunur
ocIndex=ocIndex||await loadOcIndex(sb);
// 3) Sıradaki ürünler: hiç zenginleştirilmemiş olanlar önce (indirimliler en önde), sonra en eskiler
const fresh=await sb.select(`ps_products?select=id,name,title_key,image&enriched_at=is.null&order=discount_percent.desc,id&limit=${Math.ceil(batch*.75)}`);
const revisits=await sb.select(`ps_products?select=id,name,title_key,image&enriched_at=not.is.null&order=enriched_at.asc,id&limit=${Math.max(1,batch-fresh.length)}`);
const products=[...fresh,...revisits];
let offersN=0,scoresN=0,errN=0;const offers=[],scores=new Map(),metas=new Map(),done=[],accents=new Map(),now=new Date().toISOString();
for(let i=0;i<products.length;i+=concurrency){
 if(Date.now()>deadline){say('Süre bütçesi doldu; kalan ürünler sonraki turda işlenecek.');break;}
 await Promise.all(products.slice(i,i+concurrency).map(async p=>{
  const r=await enrichProduct(p,{ocIndex});done.push({id:p.id,key:r.key,store_status:r.storeStatus,enrichment_status:r.errors.some(e=>/^(steam|xbox|switch):/.test(e))?'partial':'ok'});
  offers.push(...r.offers);if(r.scores)scores.set(r.key,r.scores);if(r.meta)metas.set(r.key,r.meta);if(r.accent)accents.set(p.id,r.accent);errN+=r.errors.length;
  if(r.errors.length)console.log(p.name,'->',r.errors.join(' | '));
 }));
 await sleep(500);
}
// yinelenen anahtarlar tek kayıt olsun
const uniq=new Map(offers.map(o=>[o.platform+':'+o.store_id,o]));
await sb.upsert('store_offers',[...uniq.values()],'platform,store_id');
const oldScores=new Map();if(scores.size){const keys=[...scores.keys()].map(k=>'"'+k.replaceAll('"','')+'"').join(',');for(const row of await sb.selectAll('game_scores?select=*&title_key=in.('+keys+')'))oldScores.set(row.title_key,row);}
await sb.upsert('game_scores',[...scores.values()].map(row=>mergeScores(oldScores.get(row.title_key),row)),'title_key');
if(hasMeta&&metas.size)await sb.upsert('game_meta',[...metas.values()],'title_key');
const missing=new Map(products.filter(p=>!p.title_key).map(p=>[p.id,true]));
for(let i=0;i<done.length;i+=50){const chunk=done.slice(i,i+50);
 for(const c of chunk)await sb.patch('ps_products?id=eq.'+encodeURIComponent(c.id),{enriched_at:now,store_status:c.store_status,enrichment_status:c.enrichment_status});
 for(const c of chunk)if(c.key&&missing.has(c.id))await sb.patch(`ps_products?id=eq.${encodeURIComponent(c.id)}`,{title_key:c.key});}
offersN=uniq.size;scoresN=scores.size;
// Baskın vurgu rengi (v7 sütunu varsa): bu turdaki ürünler + rengi eksik olan en çok 60 ürün
try{
 const extra=await sb.select('ps_products?select=id,image&accent_color=is.null&image=not.is.null&enriched_at=not.is.null&order=discount_percent.desc&limit='+accentLimit);
 for(let i=0;i<extra.length;i+=6){if(Date.now()>deadline)break;await Promise.all(extra.slice(i,i+6).map(async x=>{try{const c=await fetchAccent(x.image);if(c)accents.set(x.id,c);}catch{}}));await sleep(300);}
 for(const [id,c] of accents)await sb.patch(`ps_products?id=eq.${encodeURIComponent(id)}`,{accent_color:c});
 say(`Vurgu rengi: ${accents.size}`);
}catch(e){if(!/400|404|PGRST/.test(e.message))say('Vurgu rengi atlandı: '+e.message.slice(0,100));}
// Daha önce zenginleştirilmiş Steam eşleşmeleri için eksik ayrıntıları tamamla (her turda en çok 40)
if(hasMeta){
 try{
  const st=await sb.select('store_offers?select=title_key,store_id&platform=eq.steam&order=checked_at.desc&limit=300');
  const list=st.filter(o=>o.title_key).map(o=>`"${o.title_key}"`).join(',');
  const have=new Set(list?(await sb.selectAll(`game_meta?select=title_key&title_key=in.(${list})`)).map(r=>r.title_key):[]);
  const todo=st.filter(o=>!have.has(o.title_key)&&!metas.has(o.title_key)).slice(0,25),got=[];
  try{ // v5: gereksinim/DLC/duyuru alanları boş olan mevcut kayıtları tamamla
   let stale;
   try{stale=await sb.select('game_meta?select=title_key,steam_appid&or=(requirements.is.null,age_notes.is.null,summary.is.null)&steam_appid=not.is.null&order=checked_at.asc&limit=25');}
   catch(e){if(!/400|PGRST/.test(e.message))throw e;stale=await sb.select('game_meta?select=title_key,steam_appid&requirements=is.null&steam_appid=not.is.null&order=checked_at.asc&limit=25');}
   for(const m of stale)todo.push({title_key:m.title_key,store_id:String(m.steam_appid),refresh:true});
  }catch(e){if(!/400|404|PGRST/.test(e.message))throw e;}
  for(const o of todo){if(Date.now()>deadline)break;try{const m=await fetchDetails(o.store_id,o.title_key);if(m){try{const n=await fetchNews(o.store_id);if(n.length)m.news=n;}catch{}got.push(m);}}catch(e){console.log('ayrıntı hatası',o.store_id,e.message);}await sleep(500);}
  if(got.length)await sb.upsert('game_meta',got,'title_key');
  say(`Ayrıntı tamamlama: ${got.length}/${todo.length}`);
 }catch(e){say('Ayrıntı tamamlama atlandı: '+e.message.slice(0,120));}
 // Haber şeridi: 3 saatte bir
 try{
  const last=(await sb.select('ps_state?select=value&key=eq.news'))?.[0]?.value?.at;
  if(!last||Date.now()-Date.parse(last)>3*3600e3){
   const {items,errors}=await fetchAllNews();
   if(items.length){await sb.upsert('news_items',items.map(i=>({...i,checked_at:new Date().toISOString()})),'url');await sb.del(`news_items?published_at=lt.${new Date(Date.now()-10*864e5).toISOString()}`);
    await sb.upsert('ps_state',[{key:'news',value:{at:new Date().toISOString(),count:items.length}}],'key');}
   say(`Haberler: ${items.length}${errors.length?' · hata: '+errors.join('; '):''}`);
  }
 }catch(e){say('Haberler atlandı: '+e.message.slice(0,120));}
 // Yaklaşan oyunlar: günde bir
 try{
  const last=(await sb.select('ps_state?select=value&key=eq.upcoming'))?.[0]?.value?.at;
  if(!last||Date.now()-Date.parse(last)>20*3600e3){
   const ups=await fetchUpcoming();await sb.upsert('upcoming_games',ups,'id');
   const today=new Date(Date.now()+3*3600e3).toISOString().slice(0,10);await sb.del(`upcoming_games?release_date=lt.${today}`);
   await sb.upsert('ps_state',[{key:'upcoming',value:{at:new Date().toISOString(),count:ups.length}}],'key');say(`Yaklaşan oyunlar: ${ups.length}`);
  }
 }catch(e){say('Yaklaşan oyunlar atlandı: '+e.message.slice(0,120));}
}
say(`Ürün: ${products.length} · mağaza teklifi: ${offersN} · puan kaydı: ${scoresN} · kaynak hatası: ${errN}`);
return{products:products.length,processed:done.length,offers:offersN,scores:scoresN,errors:errN,accents:accents.size};
}
