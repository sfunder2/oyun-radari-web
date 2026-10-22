import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {mergeBatch} from './batch-state.mjs';
const startedAt=new Date().toISOString();
let old={items:[],cursors:{newest:1,popular:1,discounts:1}};try{old=JSON.parse(await readFile('data/ps-index.json','utf8'))}catch{}
const cursors={newest:1,popular:1,discounts:1,...old.cursors},records=[],errors=[],pages=[];
// Bounded batches: popular prices, rotating discovery, rotating public discounts.
// Stop upstream requests on rate limiting; preserve the cursor and try next scheduled run.
const jobs=[{key:'refresh',page:1,path:'all-games',query:'?sort=most-watchlisted'},
 {key:'newest',page:cursors.newest,path:'all-games',query:''},
 {key:'discounts',page:cursors.discounts,path:'discounts',query:''}];
for(const job of jobs){
 const source=`https://psdeals.net/tr-store/${job.path}/${job.page}${job.query}`;
 try{
  const endpoint='https://oyun-radari-tr.gokhangozcu.chatgpt.site/api/ps-catalog-batch?'+new URLSearchParams({kind:job.key,page:String(job.page)});
  const r=await fetch(endpoint,{headers:{'User-Agent':'OyunRadari/1.0 (game price comparison)','Accept-Language':'tr-TR'},signal:AbortSignal.timeout(25000)});
  if(!r.ok){const detail=await r.json().catch(()=>({}));errors.push({source,error:detail.error||'HTTP '+r.status});if(/403|429/.test(detail.error||'')||[403,429].includes(r.status))break;continue;}
  const feed=await r.json();if(feed.status!=='ok'||!Array.isArray(feed.items))throw new Error('Invalid catalog response');records.push(...feed.items);pages.push({kind:job.key,page:job.page,products:feed.items.length});
  if(job.key!=='refresh')cursors[job.key]=feed.hasMore&&job.page<200?job.page+1:1;
  console.log(job.key,'page',job.page,feed.items.length,'products');
 }catch(e){errors.push({source,error:e.message});}
 await new Promise(r=>setTimeout(r,4000));
}
let links=[];try{links=JSON.parse(await readFile('ps-links.json','utf8'))}catch{}
for(const url of links){if(!/^https:\/\/store\.playstation\.com\/tr-tr\/product\/[A-Z0-9_-]+$/.test(url))continue;
 try{const r=await fetch('https://oyun-radari-tr.gokhangozcu.chatgpt.site/api/playstation?'+new URLSearchParams({url}),{headers:{'User-Agent':'OyunRadari/1.0'},signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error('Official product HTTP '+r.status);const item=await r.json();if(item.status==='ok')records.push({...item,purchaseEligible:true,sourceLabel:'PlayStation Store TR'});}catch(e){errors.push({source:url,error:e.message});}
}
const data=mergeBatch(old,records,{startedAt,errors,cursors,pages});
data.coverage='PS Deals Türkiye ve doğrulanmış resmî ürünler; tüm katalog her turda yenilenmez. Ürünlerin checkedAt alanını kullanın.';
await mkdir('data',{recursive:true});
await writeFile('data/ps-index.json',JSON.stringify(data,null,2));await writeFile('data/ps-prices.json',JSON.stringify(data,null,2));
await writeFile('data/ps-batch-status.json',JSON.stringify(data.batch,null,2));
console.log(JSON.stringify(data.batch));
await writeFile('data/ps-batch-summary.md',`### PlayStation · 15 dakika batch\n\nDurum: ${data.batch.status}\n\n- Yenilenen: ${data.batch.refreshed}\n- Yeni oyun: ${data.batch.added}\n- Katalog: ${data.batch.total}\n- Kaynak hatası: ${errors.length}\n\nHer ürünün kontrol zamanı ayrı tutulur.\n`);
// Commit diagnostic state even on total failure, then let the workflow mark the run failed.
if(!data.batch.refreshed)process.exitCode=1;
