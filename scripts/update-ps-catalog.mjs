import {appendFile} from 'node:fs/promises';
import {supabase} from './supabase.mjs';
import {fetchGrid,norm} from './ps-store.mjs';
import {recordHistory,computeStats} from './ps-history.mjs';
// Tek gerçek: Supabase. Her turda kategori sayfalarından bir kısmı okunur; fiyatlar ve geçmiş Supabase'e yazılır.
const PAGES_PER_KIND=4,KINDS=['discounts','newest'];
const {SUPABASE_URL,SUPABASE_SERVICE_KEY}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY secret olarak tanımlı olmalı.');process.exit(2)}
const sb=supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY);
const startedAt=new Date().toISOString();
const today=new Date(Date.now()+3*3600e3).toISOString().slice(0,10); // Türkiye günü
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const st=await sb.select('ps_state?select=value&key=eq.cursors');
const cursors={discounts:1,newest:1,...(st?.[0]?.value||{})};
const found=new Map(),errors=[],pages=[];
for(const kind of KINDS){
 for(let n=0;n<PAGES_PER_KIND;n++){
  const page=cursors[kind];
  try{const f=await fetchGrid(kind,page);for(const it of f.items)found.set(it.id,it);pages.push({kind,page,products:f.items.length});cursors[kind]=f.hasMore?page+1:1;console.log(kind,'sayfa',page,f.raw,'ham',f.items.length,'kayıt');if(!f.hasMore)break;}
  catch(e){errors.push({source:kind+' sayfa '+page,error:e.message});break;}
  await sleep(2000);
 }
}
let status=errors.length?'partial':'ok';
if(found.size){
 const ids=[...found.keys()],hist={items:{}},before={};
 for(let i=0;i<ids.length;i+=80){
  const list=ids.slice(i,i+80).map(x=>`"${x}"`).join(',');
  for(const r of await sb.selectAll(`ps_price_history?select=product_id,day,price,base_price&product_id=in.(${list})&order=product_id,day`))
   (hist.items[r.product_id]??={n:'',p:[]}).p.push([r.day,Number(r.price),Number(r.base_price)]);
 }
 for(const id of ids)before[id]=JSON.stringify(hist.items[id]?.p.at(-1)||null);
 recordHistory(hist,[...found.values()],today);
 const products=[],historyRows=[];
 for(const it of found.values()){
  const h=hist.items[it.id],stats=computeStats(h,it,today)||{};
  products.push({id:it.id,name:it.name,name_search:norm(it.name),image:it.image,edition:it.edition,price:it.price,original_price:it.originalPrice,discount_percent:it.discountPercent,discount_ends_at:it.discountEndsAt,currency:'TRY',url:it.url,checked_at:it.checkedAt,
   lowest_ever:stats.lowestEver??null,lowest_30d:stats.lowest30d??null,history_days:stats.historyDays??0,historical_low:!!stats.historicalLow,low_30d:!!stats.low30d,price_rise:stats.priceRise??null});
  const last=h.p.at(-1);
  if(last[0]===today&&JSON.stringify(last)!==before[it.id])historyRows.push({product_id:it.id,day:last[0],price:last[1],base_price:last[2]});
 }
 try{
  await sb.upsert('ps_products',products,'id');
  await sb.upsert('ps_price_history',historyRows,'product_id,day');
 }catch(e){errors.push({source:'supabase yazma',error:e.message});status='failed';}
}else status='failed';
const batch={startedAt,finishedAt:new Date().toISOString(),status,refreshed:found.size,pages,errors,intervalMinutes:15};
try{await sb.upsert('ps_state',[{key:'cursors',value:cursors},{key:'batch',value:batch}],'key');}catch(e){errors.push({source:'durum',error:e.message});status='failed';}
console.log(JSON.stringify(batch));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`### PlayStation · 15 dakika batch\n\nDurum: ${status}\n\n- Yenilenen ürün: ${found.size}\n- Sayfalar: ${pages.map(p=>p.kind+' '+p.page).join(', ')||'—'}\n${errors.map(e=>`- Hata: ${e.source}: ${e.error}`).join('\n')}\n`);
process.exitCode=status==='failed'?1:0;
