// Neon Auth (Better Auth) için Supabase biçimli giriş köprüsü. Neon Functions kotası dolunca authproxy yerine çalışır.
// Yollar: /signup /login /refresh /logout /recover /reset /password. Yanıtlar Supabase GoTrue şeklindedir (access_token, refresh_token, expires_in, user).
// refresh_token = Neon Auth oturum çerezinin değeri; access_token = o oturumdan alınan kısa ömürlü JWT.
const ALLOWED=new Set(['https://sfunder2.github.io','https://oyun-radari-tr.gokhangozcu.chatgpt.site','http://terminal.local:4173']);
const env=(name:string)=>Deno.env.get(name)||'';
const BASE=(env('NEON_AUTH_URL')||'https://ep-dry-tree-b90vvy12.neonauth.c-7.eu-central-1.aws.neon.tech/neondb/auth').replace(/\/$/,'');
const ORIGIN=[...ALLOWED][0],COOKIE='__Secure-neon-auth.session_token';
const MESSAGES:Record<string,string>={INVALID_EMAIL_OR_PASSWORD:'Invalid login credentials',USER_ALREADY_EXISTS:'User already registered',USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:'User already registered',EMAIL_NOT_VERIFIED:'Email not confirmed',PASSWORD_TOO_SHORT:'Password should be at least 6 characters.',INVALID_TOKEN:'invalid token expired',INVALID_PASSWORD:'Invalid login credentials'};
class Fail extends Error{status:number;constructor(msg:string,status=400){super(msg);this.status=status;}}
async function neon(path:string,body:unknown,cookie='',method='POST'){
 const res=await fetch(BASE+path,{method,headers:{'Content-Type':'application/json',Origin:ORIGIN,...(cookie?{Cookie:cookie}:{})},body:method==='GET'?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Fail(MESSAGES[data.code]||data.message||'Oturum işlemi tamamlanamadı',res.status>=500?502:res.status===401?400:res.status);
 return {res,data};
}
const sessionOf=(res:Response)=>{for(const c of res.headers.getSetCookie()){const [pair]=c.split(';'),i=pair.indexOf('=');if(pair.slice(0,i)===COOKIE)return pair.slice(i+1);}return '';};
const cookieOf=(refresh:string)=>COOKIE+'='+refresh;
const claims=(jwt:string)=>JSON.parse(atob(jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
const userOf=(u:any)=>({id:u.id,email:u.email,role:'authenticated',user_metadata:{display_name:u.name,name:u.name}});
async function session(refresh:string,user?:any){
 if(!refresh)throw new Fail('Invalid login credentials');
 const {data}=await neon('/token',null,cookieOf(refresh),'GET').catch(()=>{throw new Fail('invalid token expired');});
 const jwt=String(data.token||''),c=claims(jwt);
 return {access_token:jwt,token_type:'bearer',expires_in:Math.max(60,Math.floor(c.exp-Date.now()/1000)),refresh_token:refresh,user:user?userOf(user):{id:c.sub,email:c.email,role:'authenticated',user_metadata:{display_name:c.name,name:c.name}}};
}
async function handle(route:string,b:any){
 if(route==='signup'){const {res,data}=await neon('/sign-up/email',{email:b.email,password:b.password,name:b.name||String(b.email||'').split('@')[0]});return session(sessionOf(res),data.user);}
 if(route==='login'){const {res,data}=await neon('/sign-in/email',{email:b.email,password:b.password});return session(sessionOf(res),data.user);}
 if(route==='refresh')return session(String(b.refresh_token||''));
 if(route==='logout'){if(b.refresh_token)await neon('/sign-out',{},cookieOf(String(b.refresh_token))).catch(()=>{});return {};}
 if(route==='recover'){await neon('/request-password-reset',{email:b.email,redirectTo:b.redirect_to||ORIGIN});return {};}
 if(route==='reset'){await neon('/reset-password',{newPassword:b.password,token:b.token});return {};}
 if(route==='password'){
  const refresh=String(b.refresh_token||'');if(!refresh)throw new Fail('invalid token expired',401);
  const {data}=await neon('/change-password',{newPassword:b.password,currentPassword:b.current_password,revokeOtherSessions:false},cookieOf(refresh));
  return userOf(data.user||{});
 }
 throw new Fail('unsupported',404);
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':ALLOWED.has(origin)?origin:ORIGIN,'Vary':'Origin','Cache-Control':'no-store'};
 if(req.method==='OPTIONS')return new Response(null,{headers:{...headers,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'content-type'}});
 if(req.method!=='POST')return new Response(JSON.stringify({msg:'method'}),{status:405,headers});
 try{
  const route=new URL(req.url).pathname.split('/').pop()||'';
  const body=await req.json().catch(()=>({}));
  return new Response(JSON.stringify(await handle(route,body)),{headers});
 }catch(e){const f=e instanceof Fail?e:new Fail('Oturum işlemi tamamlanamadı',502);return new Response(JSON.stringify({msg:f.message}),{status:f.status,headers});}
});
