// Gizlilik dostu olay toplayıcı. Tarayıcı sendBeacon ile {events:[{name,route,lang,ui,device,props}]} yollar.
// Kimlik, çerez, IP ve arama metni saklanmaz; yalnız günlük sayaç (public.radar_events) artar.
// Gizli değer: SUPABASE_SERVICE_ROLE_KEY (Supabase tarafından sağlanır). JWT doğrulaması kapalı (herkese açık uç).
const ALLOWED=new Set(['https://sfunder2.github.io','https://oyun-radari-tr.gokhangozcu.chatgpt.site','http://terminal.local:4173']);
const NAME=/^[a-z0-9_]{1,40}$/,KEY=/^[a-z0-9_]{1,24}$/;
const env=(n:string)=>Deno.env.get(n)||'';
function cleanProps(p:unknown){
 const out:Record<string,string|number|boolean>={};
 if(!p||typeof p!=='object')return out;
 for(const [k,v] of Object.entries(p as Record<string,unknown>).slice(0,6)){
  if(!KEY.test(k))continue;
  if(typeof v==='number'&&Number.isFinite(v))out[k]=v;
  else if(typeof v==='boolean')out[k]=v;
  else if(typeof v==='string'&&!/@|eyJ|token/i.test(v))out[k]=v.slice(0,60);
 }
 return out;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':ALLOWED.has(origin)?origin:[...ALLOWED][0],'Vary':'Origin','Cache-Control':'no-store'};
 if(req.method==='OPTIONS')return new Response(null,{headers:{...headers,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'content-type'}});
 if(req.method!=='POST'||!ALLOWED.has(origin))return new Response(null,{status:204,headers});
 let body:{events?:Array<Record<string,unknown>>};
 try{body=JSON.parse((await req.text()).slice(0,20000));}catch{return new Response(null,{status:204,headers});}
 const events=Array.isArray(body.events)?body.events.slice(0,20):[];
 for(const e of events){
  const name=String(e.name||'');
  if(!NAME.test(name))continue;
  await fetch(env('SUPABASE_URL')+'/rest/v1/rpc/record_radar_event',{method:'POST',headers:{apikey:env('SUPABASE_SERVICE_ROLE_KEY'),Authorization:'Bearer '+env('SUPABASE_SERVICE_ROLE_KEY'),'Content-Type':'application/json'},
   body:JSON.stringify({p_name:name,p_route:String(e.route||'').slice(0,60),p_lang:e.lang==='en'?'en':'tr',p_ui:e.ui==='sade'?'sade':'klasik',p_device:e.device==='mobile'||e.device==='desktop'?e.device:'unknown',p_props:cleanProps(e.props)})}).catch(()=>{});
 }
 return new Response(null,{status:204,headers});
});
