import {readAdminPrice} from '../../../scripts/admin-price.mjs';
import {neonDb} from '../../../scripts/neon-db.mjs';
import {httpRun} from '../../../neon/lib/neon-http.mjs';
import {verifyNeonJwt} from '../../../neon/lib/neon-jwt.mjs';
// Yönetici fiyat yenileme (Supabase admin-price-refresh'in Neon karşılığı).
// Yönetici kontrolü ve işlem başlatma kullanıcının kendi Neon jetonuyla Data API üzerinden yapılır (is_radar_admin, admin_begin_refresh).
// Sonuç yazma (admin_finish_refresh) yalnızca o fonksiyona yetkili ayrı bir veritabanı rolüyle yapılır.
const ORIGINS=new Set(['https://sfunder2.github.io','https://oyun-radari-tr.gokhangozcu.chatgpt.site','http://terminal.local:4173']);
// Neon Functions kotası dolunca Supabase'te çalışır. Gizli değer yalnızca ADMINSVC_PASSWORD (radar_adminsvc rolü); diğerleri açık adreslerdir.
const DEFAULTS:Record<string,string>={
 DATABASE_HOST:'ep-dry-tree-b90vvy12.c-7.eu-central-1.aws.neon.tech',
 DATA_API_URL:'https://ep-dry-tree-b90vvy12.apirest.c-7.eu-central-1.aws.neon.tech/neondb/rest/v1',
 JWKS_URL:'https://ep-dry-tree-b90vvy12.neonauth.c-7.eu-central-1.aws.neon.tech/neondb/auth/.well-known/jwks.json',
};
const env=(name:string)=>Deno.env.get(name)||(name==='DATABASE_URL'?'postgresql://radar_adminsvc:'+encodeURIComponent(Deno.env.get('ADMINSVC_PASSWORD')||'')+'@'+(Deno.env.get('DATABASE_HOST')||DEFAULTS.DATABASE_HOST)+'/neondb?sslmode=require':DEFAULTS[name]||'');
const svc=neonDb('',{retries:1,run:httpRun({host:env('DATABASE_HOST'),connectionString:env('DATABASE_URL')})});
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin'),cors:Record<string,string>={'Access-Control-Allow-Origin':ORIGINS.has(origin||'')?origin!:'https://sfunder2.github.io','Vary':'Origin','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origin not allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'POST gerekli'},405);
 if(Number(req.headers.get('content-length')||0)>2000)return reply({error:'İstek çok büyük'},413);
 const auth=req.headers.get('authorization');if(!auth?.startsWith('Bearer '))return reply({error:'Giriş gerekli'},401);
 let begun:any=null;
 const userRpc=async(name:string,body:unknown)=>{
  const r=await fetch(env('DATA_API_URL').replace(/\/$/,'')+'/rpc/'+name,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const d=await r.json().catch(()=>null);if(!r.ok)throw Error(d?.message||'İşlem yetkilendirilemedi');return d;
 };
 const finish=(id:number,offer:unknown,error:string|null)=>svc.rpc('admin_finish_refresh',{p_request:id,p_offer:offer,p_error:error});
 try{
  if(!await verifyNeonJwt(auth.slice(7),{jwksUrl:env('JWKS_URL')}))return reply({error:'Oturum doğrulanamadı'},401);
  if(await userRpc('is_radar_admin',{})!==true)return reply({error:'Yönetici yetkisi gerekli'},403);
  const text=await req.text();if(text.length>2000)return reply({error:'İstek çok büyük'},413);
  let body:any;try{body=JSON.parse(text)}catch{return reply({error:'Geçersiz JSON'},400)}
  if(!['playstation','steam','xbox','switch','epic','gog'].includes(body.platform)||typeof body.id!=='string'||!body.id||body.id.length>160)return reply({error:'Geçersiz ürün'},400);
  begun=await userRpc('admin_begin_refresh',{p_platform:body.platform,p_id:body.id});
  const offer=await readAdminPrice(begun.item,fetch);
  return reply(await finish(begun.id,offer,offer?null:'Mağazada doğrulanmış fiyat bulunamadı; önceki fiyat korundu.'));
 }catch(e){
  if(begun)await finish(begun.id,null,'Mağaza kontrolü tamamlanamadı; önceki fiyat korundu.').catch(()=>{});
  return reply({error:begun?'Mağaza kontrolü tamamlanamadı; önceki fiyat korundu.':String((e as Error).message||'İşlem tamamlanamadı').slice(0,200)},begun?502:400);
 }
});
