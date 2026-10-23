import {supabase} from '../../../scripts/supabase.mjs';
import {runEnrichBatch,loadOcIndex} from '../../../scripts/enrich-batch.mjs';
// Diğer market eşleşmeleri, puanlar, oyun ayrıntıları, vurgu renkleri, haberler ve takvim. Küçük turlar halinde çalışır (Edge süre sınırı).
const expected='87730d7bfc920db86609a9305096904f24a8e7d0735793d5b811cce4784e236c';
Deno.serve(async req=>{
 const key=req.headers.get('x-batch-secret')||'';
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))),x=>x.toString(16).padStart(2,'0')).join('');
 if(req.method!=='POST'||hash!==expected)return new Response('Unauthorized',{status:401});
 const sb=supabase(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
 const log:string[]=[],started=new Date().toISOString();
 try{
  const result=await runEnrichBatch({sb,batch:24,concurrency:4,accentLimit:150,deadlineMs:95000,say:(m:string)=>log.push(m),ocIndex:await loadOcIndex(sb)});
  await sb.upsert('ps_state',[{key:'enrich_batch',value:{startedAt:started,finishedAt:new Date().toISOString(),engine:'supabase-cron',...result}}],'key');
  return Response.json({...result,log});
 }catch(e){console.error('Enrich batch:',e.message);return Response.json({error:'Zenginleştirme tamamlanamadı'},{status:502});}
});
