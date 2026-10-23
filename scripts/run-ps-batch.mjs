import {recordHistory,computeStats} from './ps-history.mjs';
import {titleKey} from './titles.mjs';
import {norm} from './ps-store.mjs';
export async function runPsBatch({sb,fetchGrid,fetchConcepts,fetchConceptProducts,fetchEndTime,endTimeLimit=30,conceptLimit=20,pagesPerKind=4,sleep=ms=>new Promise(r=>setTimeout(r,1000)),clock=()=>new Date(),token=crypto.randomUUID(),engine='github-actions'}){
 const claimed=await sb.rpc('claim_ps_batch',{lease_token:token});
 if(!claimed)return {status:'skipped',reason:'Önceki fiyat güncellemesi sürüyor'};
 const startedAt=clock().toISOString(),today=new Date(clock().getTime()+3*3600000).toISOString().slice(0,10),errors=[],pages=[],found=new Map();
 let ends=null,cursors={discounts:1,newest:1,ps5:1,concepts:1},status='ok',saved=0;
 try{
  const previous=await sb.select('ps_state?select=value&key=eq.cursors');cursors={...cursors,...previous?.[0]?.value};
  const previousBatch=(await sb.select('ps_state?select=value&key=eq.batch'))?.[0]?.value;
  // Always revisit the first release page so newly listed games are not delayed by a full catalog sweep.
  const jobs=[{kind:'newest',page:1,advance:false},{kind:'ps5',page:1,advance:false},...['discounts','newest','ps5'].flatMap(kind=>Array.from({length:pagesPerKind},()=>({kind,advance:true})))];
  const exhausted=new Set();
  for(const job of jobs){if(exhausted.has(job.kind))continue;const page=job.page||cursors[job.kind];
   try{const feed=await fetchGrid(job.kind,page);for(const item of feed.items)found.set(item.id,item);pages.push({kind:job.kind,page,products:feed.items.length});if(job.advance)cursors[job.kind]=feed.hasMore?page+1:1;if(!feed.hasMore)exhausted.add(job.kind);}
   catch(e){errors.push({source:job.kind+' sayfa '+page,error:e.message});exhausted.add(job.kind);}
   await sleep(1000);
  }
  // Kategori listelerinde hiç görünmeyen oyunlar: concept listesinden eksik olanları tek tek tamamla.
  if(fetchConcepts&&fetchConceptProducts&&found.size){const page=cursors.concepts;
   try{const feed=await fetchConcepts(page),ids=feed.concepts.flatMap(c=>c.productIds),known=new Set(found.keys());
    for(let i=0;i<ids.length;i+=80){const list=ids.slice(i,i+80).map(x=>'"'+x+'"').join(',');for(const row of await sb.select('ps_products?select=id&id=in.('+list+')')||[])known.add(row.id);}
    const missing=feed.concepts.filter(c=>c.productIds.length&&!c.productIds.some(id=>known.has(id))).slice(0,conceptLimit);let added=0;
    for(const c of missing){try{for(const item of await fetchConceptProducts(c.productIds[0])){found.set(item.id,item);added++;}}catch(e){errors.push({source:'concept '+c.id,error:e.message});}}
    pages.push({kind:'concepts',page,products:added});cursors.concepts=feed.hasMore?page+1:1;}
   catch(e){errors.push({source:'concepts sayfa '+page,error:e.message});}
  }
  if(!found.size)status='failed';
  else{
   const ids=[...found.keys()],hist={items:{}};
   for(let i=0;i<ids.length;i+=80){const list=ids.slice(i,i+80).map(x=>'"'+x+'"').join(',');for(const row of await sb.selectAll('ps_price_history?select=product_id,day,price,base_price,low_price&product_id=in.('+list+')&order=product_id,day'))(hist.items[row.product_id]??={p:[]}).p.push([row.day,Number(row.price),Number(row.base_price),row.low_price===null?Number(row.price):Number(row.low_price)]);}
   // İndirim bitiş zamanı: listede gelmez. Kayıtlı olanı (aynı indirim sürerken) koru, eksikleri ürün sayfasından sınırlı sayıda tamamla.
   ends={filled:0,tried:0,kept:0};const nowMs=clock().getTime();
   for(let i=0;i<ids.length;i+=80){const list=ids.slice(i,i+80).map(x=>'"'+x+'"').join(',');for(const row of await sb.select('ps_products?select=id,price,discount_percent,discount_ends_at&discount_ends_at=not.is.null&id=in.('+list+')')||[]){const it=found.get(row.id);if(it&&!it.discountEndsAt&&it.discountPercent>0&&Number(row.price)===it.price&&row.discount_percent===it.discountPercent&&Date.parse(row.discount_ends_at)>nowMs){it.discountEndsAt=row.discount_ends_at;ends.kept++;}}}
   if(fetchEndTime)for(const it of [...found.values()].filter(x=>x.discountPercent>0&&!x.discountEndsAt).slice(0,endTimeLimit)){ends.tried++;try{const end=await fetchEndTime(it);if(end&&Date.parse(end)>nowMs){it.discountEndsAt=end;ends.filled++;}}catch{}await sleep(500);}
   const before=new Map(ids.map(id=>[id,JSON.stringify(hist.items[id]?.p.at(-1))]));recordHistory(hist,[...found.values()],today);
   const products=[],historyRows=[];
   for(const it of found.values()){
    const h=hist.items[it.id],stats=computeStats(h,it,today)||{};
    products.push({id:it.id,name:it.name,name_search:norm(it.name),title_key:titleKey(it.name),preview_url:it.previewUrl,hero_url:it.heroUrl,image:it.image,edition:it.edition,price:it.price,original_price:it.originalPrice,discount_percent:it.discountPercent,discount_ends_at:it.discountEndsAt,currency:'TRY',url:it.url,checked_at:it.checkedAt,lowest_ever:stats.lowestEver??null,lowest_30d:stats.lowest30d??null,history_days:stats.historyDays??0,historical_low:!!stats.historicalLow,low_30d:!!stats.low30d,price_rise:stats.priceRise??null});
    const last=h.p.at(-1);if(last[0]===today&&JSON.stringify(last)!==before.get(it.id))historyRows.push({product_id:it.id,day:last[0],price:last[1],base_price:last[2],low_price:last[3]??last[1]});
   }
   await sb.upsert('ps_products',products,'id');await sb.upsert('ps_price_history',historyRows,'product_id,day');saved=products.length;
  }
  if(errors.length&&status!=='failed')status='partial';
  const batch={startedAt,finishedAt:clock().toISOString(),status,refreshed:saved,pages,errors,intervalMinutes:5,engine,endTimes:ends,previousFinishedAt:previousBatch?.finishedAt||null};
  // Advance discovery cursors only when product/history persistence completed successfully.
  if(saved)await sb.upsert('ps_state',[{key:'cursors',value:cursors}],'key');
  await sb.upsert('ps_state',[{key:'batch',value:batch}],'key');
  return batch;
 }catch(e){const batch={startedAt,finishedAt:clock().toISOString(),status:'failed',refreshed:saved,pages,errors:[...errors,{source:'veri kaydı',error:e.message}],intervalMinutes:5,engine};try{await sb.upsert('ps_state',[{key:'batch',value:batch}],'key')}catch{}return batch;}
 finally{await sb.rpc('release_ps_batch',{lease_token:token}).catch(()=>{});}
}
