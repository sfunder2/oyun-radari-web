// IsThereAnyDeal (ITAD) ölçümü: hangi mağaza hangi ülkede fiyat veriyor, katalog kapsamı ne kadar.
// Yalnız okur; Supabase'e hiçbir şey yazmaz. Sonuç itad-probe.json ve iş özetine yazılır.
// ITAD_API_KEY yoksa yalnız anahtarsız uç (mağaza listesi) ölçülür.
import {writeFile,appendFile} from 'node:fs/promises';
import {supabase} from './supabase.mjs';

const API='https://api.isthereanydeal.com';
const KEY=process.env.ITAD_API_KEY||'';
const COUNTRIES=(process.env.ITAD_COUNTRIES||'TR,US,DE,GB').split(',');
const WANT={humble:/humble/i,fanatical:/fanatical/i,gmg:/green\s*man/i,gamesplanet:/gamesplanet/i,indiegala:/indiegala/i,wingamestore:/wingamestore/i,ubisoft:/ubisoft|ubi\s*store/i,steam:/^steam$/i,gog:/^gog/i,epic:/epic/i};
// Bilinen popüler Steam oyunları (AAA, Ubisoft, bağımsız karışık).
const POPULAR=[1091500,1145360,292030,1174180,271590,1245620,413150,367520,1086940,814380,2050650,1817070,2215430,1593500,548430,105600,892970,2208920,2369390,359550,1794680,1150690,588650,646570,1868140,2379780,1716740,990080,2420110,2399830];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function get(path,params={}){
 const u=new URL(API+path);for(const[k,v]of Object.entries({...params,...(KEY?{key:KEY}:{})}))u.searchParams.set(k,v);
 const r=await fetch(u,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`${path} HTTP ${r.status}: ${(await r.text()).slice(0,200)}`);return r.json();
}
async function post(path,params,body){
 const u=new URL(API+path);for(const[k,v]of Object.entries({...params,key:KEY}))u.searchParams.set(k,v);
 const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 if(!r.ok)throw new Error(`${path} HTTP ${r.status}: ${(await r.text()).slice(0,200)}`);return r.json();
}

const out={at:new Date().toISOString(),hasKey:!!KEY,shops:{},sample:null,coverage:{},errors:[]};

// 1. Ülke başına mağaza listesi (anahtarsız uç).
const ids={};
for(const c of COUNTRIES){
 try{
  const list=await get('/service/shops/v1',{country:c});
  out.shops[c]={total:list.length,wanted:{}};
  for(const[k,re]of Object.entries(WANT)){const s=list.filter(x=>re.test(x.title));out.shops[c].wanted[k]=s.map(x=>({id:x.id,title:x.title,deals:x.deals,games:x.games,update:x.update}));for(const x of s)(ids[k]??=new Set).add(x.id);}
  if(c==='TR')out.shops.TR.all=list.map(x=>({id:x.id,title:x.title,deals:x.deals,games:x.games}));
 }catch(e){out.errors.push({step:'shops '+c,error:e.message})}
 await sleep(500);
}

if(KEY){
 // 2. Örneklem: popüler oyunlar + veritabanındaki Steam oyunlarından düzgün aralıklı seçim.
 let appids=[...POPULAR];
 try{
  if(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_KEY){
   const sb=supabase(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
   const rows=await sb.selectAll('store_offers?select=store_id&platform=eq.steam&order=store_id');
   const step=Math.max(1,Math.floor(rows.length/270));
   for(let i=0;i<rows.length&&appids.length<300;i+=step)if(/^\d+$/.test(rows[i].store_id))appids.push(Number(rows[i].store_id));
   out.steamRowsInDb=rows.length;
  }
 }catch(e){out.errors.push({step:'supabase sample',error:e.message})}
 appids=[...new Set(appids)];
 // 3. Steam appid -> ITAD oyun kimliği (Steam mağaza kimliği 61).
 let map={};
 try{map=await post('/lookup/id/shop/61/v1',{},appids.map(a=>'app/'+a))}catch(e){out.errors.push({step:'lookup',error:e.message})}
 const gid=Object.fromEntries(Object.entries(map).filter(([,v])=>v));
 out.sample={appids:appids.length,popular:POPULAR.length,matched:Object.keys(gid).length};
 const popularIds=new Set(POPULAR.map(a=>gid['app/'+a]).filter(Boolean));
 // 4. Ülke başına fiyatlar: mağaza başına kaç oyunda teklif var, para birimi, örnek fiyat.
 const all=Object.values(gid);
 for(const c of COUNTRIES){
  const cov={};
  try{
   for(let i=0;i<all.length;i+=100){
    const res=await post('/games/prices/v3',{country:c,deals:'false',vouchers:'true',capacity:'0'},all.slice(i,i+100));
    for(const g of res)for(const d of g.deals||[]){
     const k=Object.entries(WANT).find(([,re])=>re.test(d.shop?.name||''))?.[0]||('other:'+d.shop?.name);
     const s=cov[k]??={games:0,popular:0,currencies:{},shopNames:{},discounted:0,examples:[]};
     s.games++;if(popularIds.has(g.id))s.popular++;if(d.cut>0)s.discounted++;
     s.currencies[d.price?.currency]=(s.currencies[d.price?.currency]||0)+1;s.shopNames[d.shop?.name]=1;
     if(popularIds.has(g.id)&&s.examples.length<4)s.examples.push({id:g.id,price:d.price?.amount,regular:d.regular?.amount,cur:d.price?.currency,cut:d.cut,drm:(d.drm||[]).map(x=>x.name),url:d.url});
    }
    await sleep(800);
   }
  }catch(e){out.errors.push({step:'prices '+c,error:e.message})}
  out.coverage[c]=cov;
 }
}

await writeFile('itad-probe.json',JSON.stringify(out,null,1));
let md=`### ITAD ölçümü\n\nAnahtar: ${KEY?'var':'yok'}\n\n`;
for(const[c,s]of Object.entries(out.shops))md+=`**${c}** mağaza listesi (${s.total}): ${Object.entries(s.wanted).map(([k,v])=>`${k}=${v.length?v.map(x=>`${x.title}#${x.id} (${x.games} oyun, ${x.deals} fırsat)`).join('+'):'YOK'}`).join(' · ')}\n\n`;
if(out.sample)md+=`Örneklem: ${out.sample.appids} Steam oyunu, ${out.sample.matched} ITAD eşleşmesi (popüler ${out.sample.popular})\n\n`;
for(const[c,cov]of Object.entries(out.coverage)){
 md+=`**${c}** | mağaza | oyun | popüler | indirimli | para birimi\n|---|---|---|---|---|\n`;
 for(const[k,s]of Object.entries(cov).sort((a,b)=>b[1].games-a[1].games))md+=`| ${k} | ${s.games} | ${s.popular} | ${s.discounted} | ${JSON.stringify(s.currencies)} |\n`;
 md+='\n';
}
md+=out.errors.map(e=>`- Hata: ${e.step}: ${e.error}`).join('\n')+'\n';
console.log(md);console.log(JSON.stringify(out).slice(0,60000));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,md);
