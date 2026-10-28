import {readAdminPrice} from './admin-price.mjs';
const ORIGINS=new Set(['https://sfunder2.github.io','https://oyun-radari-tr.gokhangozcu.chatgpt.site','http://terminal.local:4173']);
export function createAdminRefreshHandler({url,serviceKey,fetchImpl=fetch,readPrice=readAdminPrice}){
 return async req=>{
  const origin=req.headers.get('origin'),cors={'Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:'https://sfunder2.github.io','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(origin&&!ORIGINS.has(origin))return reply({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'POST gerekli'},405);
  if(Number(req.headers.get('content-length')||0)>2000)return reply({error:'İstek çok büyük'},413);
  const auth=req.headers.get('authorization');if(!auth?.startsWith('Bearer '))return reply({error:'Giriş gerekli'},401);
  const authHeaders={apikey:serviceKey,Authorization:auth,'Content-Type':'application/json'};
  let begun=null;
  const rpc=async(name,body,headers=authHeaders)=>{
   const r=await fetchImpl(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
   const d=await r.json().catch(()=>null);if(!r.ok)throw Error(d?.message||'İşlem yetkilendirilemedi');return d;
  };
  const serviceHeaders={apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'};
  try{
   // Validate the session with Auth, then authorize with the user's database identity.
   const u=await fetchImpl(url+'/auth/v1/user',{headers:authHeaders,signal:AbortSignal.timeout(10000)});
   if(!u.ok)return reply({error:'Oturum doğrulanamadı'},401);
   if(await rpc('is_radar_admin',{})!==true)return reply({error:'Yönetici yetkisi gerekli'},403);
   const text=await req.text();if(text.length>2000)return reply({error:'İstek çok büyük'},413);
   let body;try{body=JSON.parse(text)}catch{return reply({error:'Geçersiz JSON'},400)}
   if(!['playstation','steam','xbox','switch','epic','gog'].includes(body.platform)||typeof body.id!=='string'||!body.id||body.id.length>160)return reply({error:'Geçersiz ürün'},400);
   begun=await rpc('admin_begin_refresh',{p_platform:body.platform,p_id:body.id});
   const offer=await readPrice(begun.item,fetchImpl);
   const result=await rpc('admin_finish_refresh',{p_request:begun.id,p_offer:offer,p_error:offer?null:'Mağazada doğrulanmış fiyat bulunamadı; önceki fiyat korundu.'},serviceHeaders);
   return reply(result);
  }catch(e){
   if(begun)await rpc('admin_finish_refresh',{p_request:begun.id,p_offer:null,p_error:'Mağaza kontrolü tamamlanamadı; önceki fiyat korundu.'},serviceHeaders).catch(()=>{});
   return reply({error:begun?'Mağaza kontrolü tamamlanamadı; önceki fiyat korundu.':String(e.message||'İşlem tamamlanamadı').slice(0,200)},begun?502:400);
  }
 };
}
