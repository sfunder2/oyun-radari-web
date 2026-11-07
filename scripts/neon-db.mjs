// scripts/supabase.mjs ile aynı arayüz (rpc, select, selectAll, upsert, patch, del), ama Neon Postgres'e doğrudan SQL ile yazar.
// Neon Data API'de service key yoktur; toplayıcılar bu yüzden PostgREST yerine veritabanına kendi bağlantı adresiyle bağlanır.
// Yalnızca toplayıcıların kullandığı PostgREST alt kümesi çevrilir: select, eq/neq/gt/gte/lt/lte/like/ilike/is/in (not. önekiyle), or=(...), order, limit, offset.
import {neon} from '@neondatabase/serverless';

const ident=s=>{if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s))throw new Error('Geçersiz ad: '+s);return '"'+s+'"';};
const table=name=>{const parts=name.split('.');if(parts.length>2)throw new Error('Geçersiz tablo: '+name);return parts.map(ident).join('.');};
const dec=s=>decodeURIComponent(s);
const OPS={eq:'=',neq:'<>',gt:'>',gte:'>=',lt:'<',lte:'<=',like:'LIKE',ilike:'ILIKE'};

/** "(a,b,\"c,d\")" -> ['a','b','c,d'] */
function list(text){
 const inner=text.trim().replace(/^\(/,'').replace(/\)$/,'');const out=[];let cur='',q=false;
 for(let i=0;i<inner.length;i++){const c=inner[i];
  if(c==='"'){q=!q;continue;}
  if(c==='\\'&&q&&i+1<inner.length){cur+=inner[++i];continue;}
  if(c===','&&!q){out.push(cur);cur='';continue;}
  cur+=c;}
 if(inner.length||cur)out.push(cur);return out;
}
/** Tek koşul: col + "not.eq.x" gibi işleç metni -> SQL ve parametreler */
function condition(col,spec,params){
 let negate=false,rest=spec;
 if(rest.startsWith('not.')){negate=true;rest=rest.slice(4);}
 const dot=rest.indexOf('.');const op=dot<0?rest:rest.slice(0,dot),val=dot<0?'':rest.slice(dot+1);
 const c=ident(col);let sql;
 if(op==='is'){
  const v=val.toLowerCase();if(!['null','true','false'].includes(v))throw new Error('Desteklenmeyen is: '+val);
  sql=`${c} IS ${v==='null'?'NULL':v.toUpperCase()}`;
 }else if(op==='in'){
  const items=list(val);if(!items.length)sql='false';
  else sql=`${c} IN (${items.map(v=>{params.push(v);return '$'+params.length;}).join(',')})`;
 }else if(OPS[op]){
  params.push(op==='like'||op==='ilike'?val.replace(/\*/g,'%'):val);sql=`${c} ${OPS[op]} $${params.length}`;
 }else throw new Error('Desteklenmeyen işleç: '+op);
 return negate?`NOT (${sql})`:sql;
}
/** or=(a.is.null,b.eq.3) -> "(... OR ...)" */
function group(joiner,text,params){
 const parts=list(text).map(item=>{
  const m=item.match(/^(or|and)=?\((.*)\)$/s)||item.match(/^(or|and)(\(.*\))$/s);
  if(m)return group(m[1].toUpperCase(),m[2],params);
  const dot=item.indexOf('.');return condition(item.slice(0,dot),item.slice(dot+1),params);
 });
 return '('+parts.join(` ${joiner} `)+')';
}

/** "table?select=a,b&x=eq.1&order=a.desc,b&limit=5" -> {table, select, where, params, order, limit, offset} */
export function parsePath(path){
 const q=path.indexOf('?');const name=q<0?path:path.slice(0,q);const qs=q<0?'':path.slice(q+1);
 const out={table:name,select:'*',where:[],params:[],order:'',limit:null,offset:null,onConflict:null};
 for(const pair of qs.split('&').filter(Boolean)){
  const eqi=pair.indexOf('=');const key=dec(eqi<0?pair:pair.slice(0,eqi)),value=eqi<0?'':dec(pair.slice(eqi+1));
  if(key==='select')out.select=value;
  else if(key==='order')out.order=value;
  else if(key==='limit')out.limit=Number(value);
  else if(key==='offset')out.offset=Number(value);
  else if(key==='on_conflict')out.onConflict=value;
  else if(key==='or'||key==='and')out.where.push(group(key.toUpperCase(),value,out.params));
  else out.where.push(condition(key,value,out.params));
 }
 return out;
}
function selectList(sel){
 if(sel.trim()==='*')return '*';
 return sel.split(',').map(s=>{const c=s.trim();if(c==='*')return '*';const m=c.match(/^([A-Za-z_]\w*)$/);if(!m)throw new Error('Desteklenmeyen select: '+c);return ident(m[1]);}).join(', ');
}
function orderBy(order){
 if(!order)return '';
 return ' ORDER BY '+order.split(',').map(part=>{
  const [col,...mods]=part.split('.');
  return ident(col)+(mods.includes('desc')?' DESC':' ASC')+(mods.includes('nullsfirst')?' NULLS FIRST':mods.includes('nullslast')?' NULLS LAST':'');
 }).join(', ');
}
export function selectSql(path){
 const p=parsePath(path);
 let sql=`SELECT ${selectList(p.select)} FROM ${table(p.table)}`;
 if(p.where.length)sql+=' WHERE '+p.where.join(' AND ');
 sql+=orderBy(p.order);
 if(Number.isInteger(p.limit))sql+=` LIMIT ${p.limit}`;
 if(Number.isInteger(p.offset)&&p.offset>0)sql+=` OFFSET ${p.offset}`;
 return {text:sql,params:p.params};
}
export function deleteSql(path){
 const p=parsePath(path);
 return {text:`DELETE FROM ${table(p.table)}${p.where.length?' WHERE '+p.where.join(' AND '):''}`,params:p.params};
}
export function patchSql(path,body){
 const p=parsePath(path),cols=Object.keys(body);
 if(!cols.length)throw new Error('Boş güncelleme');
 p.params.push(JSON.stringify(body));const n=p.params.length;
 const set=`(${cols.map(ident).join(',')}) = (SELECT ${cols.map(ident).join(',')} FROM json_populate_record(null::${table(p.table)}, $${n}::json))`;
 return {text:`UPDATE ${table(p.table)} SET ${set}${p.where.length?' WHERE '+p.where.join(' AND '):''}`,params:p.params};
}
export function upsertSql(tableName,rows,conflict){
 const cols=Object.keys(rows[0]),keys=conflict.split(',').map(s=>s.trim());
 const update=cols.filter(c=>!keys.includes(c));
 const t=table(tableName);
 const text=`INSERT INTO ${t} (${cols.map(ident).join(',')}) SELECT ${cols.map(ident).join(',')} FROM json_populate_recordset(null::${t}, $1::json) `
  +`ON CONFLICT (${keys.map(ident).join(',')}) `+(update.length?`DO UPDATE SET ${update.map(c=>`${ident(c)} = EXCLUDED.${ident(c)}`).join(', ')}`:'DO NOTHING');
 return {text,params:[JSON.stringify(rows)]};
}

// PostgREST gibi: bigint/numeric sayı, zaman damgası ISO biçimi.
const iso=v=>v==null?v:String(v).replace(' ','T').replace(/([+-]\d\d)$/,'$1:00');
const TYPES={20:v=>v==null?v:Number(v),1700:v=>v==null?v:Number(v),1184:iso,1114:v=>v==null?v:String(v).replace(' ','T')};
const TRANSIENT=/^(57014|40P01|55P03|53300|57P01|08\w{3}|XX000)$/;

export function neonDb(connectionString,{retries=4,retryDelay=1500,sleep=ms=>new Promise(ok=>setTimeout(ok,ms)),log=m=>console.log(m),run}={}){
 const sql=run?null:neon(connectionString,{fullResults:false,arrayMode:false,types:{getTypeParser:(oid,format)=>TYPES[oid]||undefined}});
 const exec=run||((text,params)=>sql.query(text,params));
 async function query(text,params=[],{replayable=true}={}){
  for(let attempt=0;;attempt++){
   try{return await exec(text,params);}
   catch(e){
    const transient=TRANSIENT.test(e.code||'')||/fetch failed|timeout|ECONN|ETIMEDOUT|socket/i.test(e.message||'');
    if(!replayable||!transient||attempt>=retries)throw new Error(`Neon ${text.slice(0,60).replace(/\s+/g,' ')}: ${e.message}`.slice(0,400),{cause:e});
    const ms=Math.round(retryDelay*2**attempt*(0.75+Math.random()*0.5));log(`Neon geçici hata (${e.code||e.message}); ${attempt+1}/${retries}. yeniden deneme ${(ms/1000).toFixed(1)} sn sonra`);await sleep(ms);
   }
  }
 }
 const select=async path=>{const q=selectSql(path);return query(q.text,q.params);};
 async function selectAll(path,size=1000){
  const out=[];
  for(let off=0;;off+=size){const rows=await select(`${path}${path.includes('?')?'&':'?'}limit=${size}&offset=${off}`);out.push(...rows);if(rows.length<size)return out;}
 }
 async function upsert(tableName,rows,conflict,size=200){
  let data=rows;
  for(let attempt=0;;attempt++){
   try{
    // Her satırda aynı sütunlar olmalı; seyrek satırlar gruplanır ki eksik alanlar null ile ezilmesin.
    const groups=new Map();for(const row of data){const sig=Object.keys(row).sort().join(',');if(!groups.has(sig))groups.set(sig,[]);groups.get(sig).push(row);}
    for(const group of groups.values())for(let i=0;i<group.length;i+=size){const q=upsertSql(tableName,group.slice(i,i+size),conflict);await query(q.text,q.params);}
    return;
   }catch(e){
    const col=(e.cause?.message||e.message).match(/column "(\w+)" of relation/)?.[1];
    if(!col||attempt>6)throw e;
    console.log(`${tableName}.${col} sütunu yok; ilgili SQL çalıştırılana kadar atlanıyor`);
    data=data.map(({[col]:_,...rest})=>rest);
   }
  }
 }
 const patch=async(path,body)=>{const q=patchSql(path,body);await query(q.text,q.params);return null;};
 const del=async path=>{const q=deleteSql(path);await query(q.text,q.params);return null;};
 const sigCache=new Map();
 async function signature(name){
  if(!sigCache.has(name)){
   const rows=await query(`SELECT p.proargnames AS names, (SELECT array_agg(u.t::regtype::text ORDER BY u.o) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY u(t,o)) AS types, p.proretset AS retset, p.prorettype::regtype::text AS ret
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1 LIMIT 1`,[name]);
   if(!rows[0])throw new Error('RPC bulunamadı: '+name);
   sigCache.set(name,rows[0]);
  }
  return sigCache.get(name);
 }
 async function rpc(name,body={}){
  ident(name);const sig=await signature(name);const args=Object.keys(body),params=[];
  const argSql=args.map(k=>{
   const idx=(sig.names||[]).indexOf(k);if(idx<0)throw new Error(`RPC ${name}: bilinmeyen bağımsız değişken ${k}`);
   const type=sig.types[idx],v=body[k];
   params.push(v!==null&&typeof v==='object'?JSON.stringify(v):v);
   return `${ident(k)} => $${params.length}::${type}`;
  }).join(', ');
  const call=`public.${ident(name)}(${argSql})`;
  const rows=await query(sig.retset?`SELECT * FROM ${call}`:`SELECT ${call} AS result`,params,{replayable:false});
  if(sig.retset)return rows;
  const value=rows[0]?.result;return sig.ret==='void'?null:value??null;
 }
 return {rpc,select,selectAll,upsert,patch,del};
}
