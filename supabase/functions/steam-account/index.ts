import {supabase} from '../../../scripts/supabase.mjs';
import {signState,readState,safeReturn,loginUrl,verifyOpenId,fetchLibrary,fetchAchievements,fetchProgress,parseAppids} from '../../../scripts/steam-account.mjs';
// Steam hesabı bağlama ve kütüphane okuma. Steam OpenID dönüşü JWT taşımadığı için --no-verify-jwt ile yayımlanır;
// diğer işlemler kullanıcının Supabase oturum jetonunu kendisi doğrular. Kütüphane veritabanına yazılmaz, yalnız bellekte önbelleklenir.
const ALLOWED=new Set(['https://sfunder2.github.io','https://oyun-radari-tr.gokhangozcu.chatgpt.site','http://terminal.local:4173']);
const env=(name:string)=>Deno.env.get(name)||'';
const BASE=env('SUPABASE_URL')+'/functions/v1/steam-account';
const SECRET=env('STEAM_LINK_SECRET')||env('SUPABASE_SERVICE_ROLE_KEY');
const sb=supabase(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'));
const cache=new Map<string,{at:number,data:unknown}>();
const hashState=async(state:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(state)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const consumeState=async(state:string)=>sb.rpc('consume_steam_link_state',{p_hash:await hashState(state)});
const callbackUrl=(state:string)=>BASE+'?'+new URLSearchParams({action:'callback',state});
async function cached(key:string,load:()=>Promise<unknown>){const old=cache.get(key);if(old&&Date.now()-old.at<10*60000)return old.data;const data=await load();if(cache.size>300)cache.clear();cache.set(key,{at:Date.now(),data});return data;}
async function userOf(req:Request){const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null;const r=await fetch(env('SUPABASE_URL')+'/auth/v1/user',{headers:{apikey:req.headers.get('apikey')||env('SUPABASE_ANON_KEY'),Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});if(!r.ok)return null;const u=await r.json();return u?.id?String(u.id):null;}
async function linkedSteam(userId:string){const rows=await sb.select('linked_accounts?select=external_id,display_name,avatar_url,linked_at&platform=eq.steam&user_id=eq.'+encodeURIComponent(userId)+'&limit=1');return rows?.[0]||null;}
function back(returnTo:string,hash:Record<string,string>){return new Response(null,{status:302,headers:{Location:returnTo+'#'+new URLSearchParams(hash)}});}

async function callback(u:URL){
 const state=await readState(u.searchParams.get('state'),SECRET);
 if(!state||!safeReturn(state.returnTo,ALLOWED))return new Response('Bağlantı geçersiz veya süresi dolmuş.',{status:400});
 const fail=(reason:string)=>back(state.returnTo,{steam:'error',reason});
 const steamid=await verifyOpenId(u.searchParams,callbackUrl(u.searchParams.get('state')||'')).catch(()=>null);
 if(!steamid)return fail('verify');
 // A successful Steam verification must be consumed atomically before linking.
 // Migration sprint-01-steam-state.sql is mandatory before deploying this function.
 if(await consumeState(u.searchParams.get('state')||'')!==true)return fail('replay');
 const lib:any=await fetchLibrary(steamid,env('STEAM_API_KEY')).catch(()=>null);
 try{await sb.upsert('linked_accounts',[{user_id:state.userId,platform:'steam',external_id:steamid,display_name:lib?.profile?.name||null,avatar_url:lib?.profile?.avatar||null,linked_at:new Date().toISOString()}],'user_id,platform');}
 catch(e){return fail(/23505|duplicate|409/.test(String((e as Error).message))?'taken':'save');}
 cache.delete(steamid+':library');
 return back(state.returnTo,{steam:'linked'});
}

async function handle(req:Request,u:URL,action:string){
 if(action==='callback'&&req.method==='GET')return callback(u);
 if(action==='status')return Response.json({ready:!!env('STEAM_API_KEY')});
 const userId=await userOf(req);if(!userId)return Response.json({error:'Steam hesabını bağlamak için giriş yap.'},{status:401});
 if(action==='start'&&req.method==='POST'){
  if(!SECRET||!env('STEAM_API_KEY'))return Response.json({error:'Steam bağlantısı yapılandırılmamış'},{status:503});
  const body=await req.json().catch(()=>({}));const returnTo=safeReturn(body.returnTo,ALLOWED);if(!returnTo)return Response.json({error:'Geçersiz dönüş adresi'},{status:400});
  return Response.json({url:loginUrl(callbackUrl(await signState({userId,returnTo},SECRET)))});
 }
 if(action==='unlink'&&req.method==='POST'){const prior=await linkedSteam(userId);await sb.del('linked_accounts?platform=eq.steam&user_id=eq.'+encodeURIComponent(userId));if(prior?.external_id){const sid=String(prior.external_id);for(const key of cache.keys())if(key.startsWith(sid+':'))cache.delete(key);}return Response.json({linked:false});}
 const link=await linkedSteam(userId);if(!link)return Response.json({linked:false});
 if(!env('STEAM_API_KEY'))return Response.json({error:'Steam bağlantısı henüz hazır değil. Biraz sonra tekrar dene.'},{status:503});
 const steamid=String(link.external_id);
 if(action==='library')return Response.json({linked:true,linkedAt:link.linked_at,...(await cached(steamid+':library',()=>fetchLibrary(steamid,env('STEAM_API_KEY'))) as object)});
 if(action==='achievements'){
  const appid=Number(u.searchParams.get('appid'));if(!Number.isInteger(appid)||appid<=0)return Response.json({error:'Geçersiz oyun'},{status:400});
  return Response.json({linked:true,appid,achievements:await cached(steamid+':ach2:'+appid,()=>fetchAchievements(steamid,appid,env('STEAM_API_KEY')))});
 }
 if(action==='progress'){
  const ids=parseAppids(u.searchParams.get('appids')),key=env('STEAM_API_KEY');
  const rows=await Promise.all(ids.map(id=>cached(steamid+':prog:'+id,()=>fetchProgress(steamid,id,key)).catch(()=>null)));
  return Response.json({linked:true,progress:Object.fromEntries(ids.map((id,i)=>[id,rows[i]]))});
 }
 return Response.json({error:'Bilinmeyen işlem'},{status:400});
}

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':ALLOWED.has(origin)?origin:'https://sfunder2.github.io','Access-Control-Allow-Headers':'authorization,content-type,apikey','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
 if(req.method==='OPTIONS')return new Response(null,{headers});
 try{const u=new URL(req.url),res=await handle(req,u,u.searchParams.get('action')||'library');for(const [k,v] of Object.entries(headers))res.headers.set(k,v);return res;}
 catch(e){console.error('steam-account:',(e as Error).name);return Response.json({error:'Steam şu anda yanıt vermiyor. Biraz sonra tekrar dene.'},{status:503,headers});}
});
