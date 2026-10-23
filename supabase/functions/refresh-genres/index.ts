import {supabase} from '../../../scripts/supabase.mjs';
import {runGenreSweep} from '../../../scripts/ps-genres.mjs';
// PS Store tür taraması (ps_products.ps_genres / ps_tags). refresh-ps-prices ile aynı gizli anahtar özetini kullanır (JWT doğrulaması AÇIK).
const expected='87730d7bfc920db86609a9305096904f24a8e7d0735793d5b811cce4784e236c';
Deno.serve(async req=>{
 const key=req.headers.get('x-batch-secret')||'';
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))),x=>x.toString(16).padStart(2,'0')).join('');
 if(req.method!=='POST'||hash!==expected)return new Response('Unauthorized',{status:401});
 const sb=supabase(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
 const log:string[]=[];
 try{const result=await runGenreSweep({sb,deadlineMs:90000,say:(m:string)=>log.push(m)});return Response.json({...result,log});}
 catch(e){console.error('Genre sweep:',e.message);return Response.json({error:'Tür taraması tamamlanamadı'},{status:502});}
});
