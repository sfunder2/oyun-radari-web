// ITAD ölçümü, tüm mağazalar: Türkiye listesindeki her mağaza için kapsam, para birimi ve mevcut en ucuz
// teklife (Steam, GOG, Epic + v46 ile eklenen beş ITAD mağazası) göre kazanç. Yalnız okur; Supabase'e yazmaz.
// Sonuç itad-probe.json ve iş özetine (ve günlüğe) yazılır.
import {writeFile,appendFile} from 'node:fs/promises';
import {supabase} from './supabase.mjs';
import {ITAD_SHOPS} from './itad.mjs';

const API='https://api.isthereanydeal.com';
const KEY=process.env.ITAD_API_KEY||'';
const COUNTRY=process.env.ITAD_COUNTRY||'TR';
const SAMPLE=Number(process.env.ITAD_SAMPLE||600);
if(!KEY){console.error('ITAD_API_KEY gerekli');process.exit(2)}
// Steam=61, GOG=35, Epic=16 + v46 mağazaları: "mevcut" taban.
const BASE=new Set([61,35,16,...Object.keys(ITAD_SHOPS).map(Number)]);
const POPULAR=[1091500,1145360,292030,1174180,271590,1245620,413150,367520,1086940,814380,2050650,1817070,2215430,1593500,548430,105600,892970,2208920,2369390,359550,1794680,1150690,588650,646570,1868140,2379780,1716740,990080,2420110,2399830,
 2246340,2358720,1623730,2195250,1971870,2138330,2278370,1364780,1196590,1962700,2124490,1938090,2183900,2344520,2050670,1328670,1426210,1240440,1817190,1888930,
 2239550,1774580,1659040,2161700,1966720,2054970,1203220,2322010,2369900,1551360];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function req(path,params,body){
 const u=new URL(API+path);for(const[k,v]of Object.entries({...params,key:KEY}))u.searchParams.set(k,v);
 const r=await fetch(u,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)}:{signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error(`${path} HTTP ${r.status}: ${(await r.text()).slice(0,200)}`);return r.json();
}

const out={at:new Date().toISOString(),country:COUNTRY,shops:[],sample:null,stats:{},errors:[]};
const list=await req('/service/shops/v1',{country:COUNTRY});
const title=Object.fromEntries(list.map(s=>[s.id,s.title]));
out.shops=list.map(s=>({id:s.id,title:s.title,games:s.games,deals:s.deals,base:BASE.has(s.id)}));

let appids=[...new Set(POPULAR)];
const sb=supabase(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
const rows=await sb.selectAll('store_offers?select=store_id&platform=eq.steam&order=store_id');
const step=Math.max(1,Math.floor(rows.length/(SAMPLE-appids.length)));
for(let i=0;i<rows.length&&appids.length<SAMPLE;i+=step)if(/^\d+$/.test(rows[i].store_id))appids.push(Number(rows[i].store_id));
appids=[...new Set(appids)];
const map={};
for(let i=0;i<appids.length;i+=200){Object.assign(map,await req('/lookup/id/shop/61/v1',{},appids.slice(i,i+200).map(a=>'app/'+a)));await sleep(500);}
const gid=Object.fromEntries(Object.entries(map).filter(([,v])=>v));
const popularIds=new Set(POPULAR.map(a=>gid['app/'+a]).filter(Boolean));
out.sample={appids:appids.length,matched:Object.keys(gid).length,popular:popularIds.size,steamRowsInDb:rows.length};

const all=Object.values(gid),S=out.stats;
for(let i=0;i<all.length;i+=100){
 let res;
 try{res=await req('/games/prices/v3',{country:COUNTRY,deals:'false',vouchers:'false',capacity:'0'},all.slice(i,i+100))}
 catch(e){out.errors.push(e.message);continue}
 for(const g of res){
  const best={};
  for(const d of g.deals||[]){
   const id=d.shop?.id,v=Number(d.price?.amount);if(!Number.isFinite(v))continue;
   const s=S[id]??={id,title:title[id]||d.shop?.name,games:0,popular:0,discounted:0,currencies:{},drm:{},hosts:{},cheaper:0,popularCheaper:0,only:0,save:[],ex:[]};
   if(best[id]===undefined){s.games++;if(popularIds.has(g.id))s.popular++;}
   if(d.cut>0)s.discounted++;
   s.currencies[d.price?.currency]=(s.currencies[d.price?.currency]||0)+1;
   for(const x of d.drm||[])s.drm[x.name]=(s.drm[x.name]||0)+1;
   try{const h=new URL(d.url).hostname;s.hosts[h]=(s.hosts[h]||0)+1}catch{}
   if(popularIds.has(g.id)&&s.ex.length<3)s.ex.push(`${g.id.slice(0,8)} ${v} ${d.price?.currency} (normal ${d.regular?.amount}, -%${d.cut})`);
   if(best[id]===undefined||v<best[id])best[id]=v;
  }
  let base=Infinity;for(const[id,v]of Object.entries(best))if(BASE.has(Number(id))&&v<base)base=v;
  for(const[id,v]of Object.entries(best)){
   if(BASE.has(Number(id)))continue;const s=S[id];
   if(base===Infinity){s.only++;continue}
   if(v<base-0.005){s.cheaper++;if(popularIds.has(g.id))s.popularCheaper++;if(base>0)s.save.push(Math.round((1-v/base)*100));}
  }
 }
 await sleep(700);
}
for(const s of Object.values(S)){const a=s.save.sort((x,y)=>x-y);s.medianSave=a.length?a[a.length>>1]:null;delete s.save;}

await writeFile('itad-probe.json',JSON.stringify(out,null,1));
let md=`### ITAD tüm mağazalar (${COUNTRY})\n\nÖrneklem: ${out.sample.appids} Steam oyunu, ${out.sample.matched} ITAD eşleşmesi, ${out.sample.popular} popüler\n\n`;
md+='| id | mağaza | ITAD katalog | örneklemde | popüler | indirimli | mevcut en ucuzdan ucuz | popülerde ucuz | yalnız burada | medyan kazanç % | para birimi | DRM | alan adı |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
const cat=Object.fromEntries(list.map(s=>[s.id,s.games]));
for(const s of Object.values(S).sort((a,b)=>b.cheaper-a.cheaper||b.games-a.games))
 md+=`| ${s.id}${BASE.has(s.id)?'*':''} | ${s.title} | ${cat[s.id]??'-'} | ${s.games} | ${s.popular} | ${s.discounted} | ${BASE.has(s.id)?'-':s.cheaper} | ${BASE.has(s.id)?'-':s.popularCheaper} | ${BASE.has(s.id)?'-':s.only} | ${s.medianSave??'-'} | ${JSON.stringify(s.currencies)} | ${Object.keys(s.drm).slice(0,4).join(', ')} | ${Object.keys(s.hosts).slice(0,2).join(', ')} |\n`;
md+=`\nÖrneklemde teklifi olmayan TR mağazaları: ${list.filter(s=>!S[s.id]).map(s=>`${s.title}#${s.id} (${s.games})`).join(', ')}\n\n`;
md+=`Örnekler (popüler):\n${Object.values(S).filter(s=>!BASE.has(s.id)&&s.ex.length).map(s=>`- ${s.title}: ${s.ex.join(' · ')}`).join('\n')}\n`;
md+=out.errors.map(e=>`- Hata: ${e}`).join('\n')+'\n';
console.log(md);
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,md);
