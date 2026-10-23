import {supabase} from '../../../scripts/supabase.mjs';
import {runMarketBatch} from '../../../scripts/market-batch.mjs';
// Steam, Xbox, Switch, Epic ve GOG kataloglarını store_offers'a yazar. refresh-ps-prices ile aynı gizli anahtar özetini kullanır (JWT doğrulaması AÇIK).
const expected='87730d7bfc920db86609a9305096904f24a8e7d0735793d5b811cce4784e236c';
Deno.serve(async req=>{
 const key=req.headers.get('x-batch-secret')||'';
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))),x=>x.toString(16).padStart(2,'0')).join('');
 if(req.method!=='POST'||hash!==expected)return new Response('Unauthorized',{status:401});
 const sb=supabase(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
 try{const result=await runMarketBatch({sb,pages:{steam:10,xbox:20,switch:8,epic:6,gog:8},deadlineMs:100000});return Response.json(result,{status:result.status==='failed'?502:200});}
 catch(e){console.error('Market batch:',e.message);return Response.json({error:'Katalog güncellemesi tamamlanamadı'},{status:502});}
});
