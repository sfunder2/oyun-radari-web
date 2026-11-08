// Neon Data API için kısa ömürlü okuma jetonu verir (Neon Functions kotası dolduğunda Supabase'ten çalışır).
// Neon Auth'ta tek bir sistem kullanıcısıyla giriş yapar, oturumdan JWT alır ve bellekte önbelleğe alır.
// Gizli değer yalnızca SYS_PASSWORD; adres ve e-posta açık (isteğe bağlı olarak NEON_AUTH_URL, SYS_EMAIL ile değiştirilebilir). JWT doğrulaması kapalı (herkese açık okuma jetonu).
const ALLOWED=new Set(['https://sfunder2.github.io','https://oyun-radari-tr.gokhangozcu.chatgpt.site','http://terminal.local:4173']);
const env=(name:string)=>Deno.env.get(name)||'';
const AUTH_URL=env('NEON_AUTH_URL')||'https://ep-dry-tree-b90vvy12.neonauth.c-7.eu-central-1.aws.neon.tech/neondb/auth',EMAIL=env('SYS_EMAIL')||'anon-gateway@system.oyunradari.invalid';
let cache:{token:string,exp:number}|null=null,inflight:Promise<{token:string,exp:number}>|null=null;
const cookieHeader=(res:Response)=>res.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
async function mint(){
 const base=AUTH_URL.replace(/\/$/,''),origin=[...ALLOWED][0];
 if(!env('SYS_PASSWORD'))throw Error('not configured');
 const login=await fetch(base+'/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:EMAIL,password:env('SYS_PASSWORD')}),signal:AbortSignal.timeout(10000)});
 if(!login.ok)throw Error('login '+login.status);
 const tok=await fetch(base+'/token',{headers:{Origin:origin,Cookie:cookieHeader(login)},signal:AbortSignal.timeout(10000)});
 if(!tok.ok)throw Error('token '+tok.status);
 const token=String((await tok.json()).token||'');
 const exp=Number(JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp)*1000;
 if(!token||!Number.isFinite(exp))throw Error('bad token');
 return {token,exp};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':ALLOWED.has(origin)?origin:[...ALLOWED][0],'Vary':'Origin','Cache-Control':'no-store'};
 if(req.method==='OPTIONS')return new Response(null,{headers:{...headers,'Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'content-type'}});
 try{
  if(!cache||cache.exp-Date.now()<120000){inflight??=mint().finally(()=>{inflight=null;});cache=await inflight;}
  return new Response(JSON.stringify({token:cache.token,expires_at:cache.exp}),{headers});
 }catch(e){return new Response(JSON.stringify({error:'token unavailable'}),{status:503,headers});}
});
