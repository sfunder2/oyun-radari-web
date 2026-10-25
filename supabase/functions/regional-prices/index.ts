import {regionalPrices,fxRates,PLATFORMS} from '../../../scripts/regional.mjs';
// Oyun ayrıntısındaki "Diğer ülkeler" paneli: tek oyunun ülke fiyatları mağazalardan anlık okunur, veritabanına yazılmaz.
// Sonuç ve kurlar fonksiyon belleğinde 1 saat tutulur. Anon anahtarıyla çağrılır (JWT doğrulaması AÇIK).
const ALLOWED=new Set(['https://sfunder2.github.io','https://oyun-radari-tr.gokhangozcu.chatgpt.site','http://terminal.local:4173']);
const HOUR=3600000,cache=new Map<string,{at:number,data:unknown}>();let fx:{at:number,data:any}|null=null;
const ID=/^[A-Za-z0-9_.-]{1,64}$/;
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':ALLOWED.has(origin)?origin:'https://sfunder2.github.io','Access-Control-Allow-Headers':'authorization,content-type','Vary':'Origin'};
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='GET')return Response.json({error:'Yalnız GET desteklenir'},{status:405,headers});
 const u=new URL(req.url),platform=u.searchParams.get('platform')||'',id=u.searchParams.get('id')||'',name=(u.searchParams.get('name')||'').slice(0,120);
 if(!PLATFORMS.has(platform)||!ID.test(id))return Response.json({error:'Geçersiz oyun'},{status:400,headers});
 const key=platform+':'+id,old=cache.get(key);
 if(old&&Date.now()-old.at<HOUR)return Response.json(old.data,{headers});
 try{
  if(!fx||Date.now()-fx.at>HOUR)fx={at:Date.now(),data:await fxRates()};
  const data=await regionalPrices({platform,id,name,rates:fx.data});
  if(cache.size>500)cache.clear();
  if(data.countries.some((c:any)=>c.status!=='error'))cache.set(key,{at:Date.now(),data});
  return Response.json(data,{headers});
 }catch(e){console.error('Bölge fiyatı:',(e as Error).message);return Response.json({error:'Bölge fiyatları şu anda okunamadı'},{status:503,headers});}
});
