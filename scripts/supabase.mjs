// Supabase PostgREST için küçük istemci (SDK gerekmez).
export function supabase(url,key,fetchImpl=fetch){
 const base=url.replace(/\/$/,'')+'/rest/v1/';
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 async function req(method,path,{body,prefer}={}){
  const r=await fetchImpl(base+path,{method,headers:{...headers,...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw new Error(`Supabase ${method} ${path.split('?')[0]} HTTP ${r.status}: ${(await r.text()).slice(0,200)}`);
  const t=await r.text();return t?JSON.parse(t):null;
 }
 async function selectAll(path,size=1000){
  const out=[];
  for(let off=0;;off+=size){const rows=await req('GET',`${path}${path.includes('?')?'&':'?'}limit=${size}&offset=${off}`);out.push(...rows);if(rows.length<size)return out;}
 }
 async function upsert(table,rows,conflict,size=200){
  // SQL şeması henüz güncellenmemişse bilinmeyen sütunlar atılıp yeniden denenir
  let data=rows;
  for(let attempt=0;;attempt++){
   try{for(let i=0;i<data.length;i+=size)await req('POST',`${table}?on_conflict=${conflict}`,{body:data.slice(i,i+size),prefer:'resolution=merge-duplicates,return=minimal'});return;}
   catch(e){const col=e.message.match(/Could not find the '(\w+)' column/)?.[1];if(!col||attempt>6)throw e;console.log(`${table}.${col} sütunu yok; ilgili SQL çalıştırılana kadar atlanıyor`);data=data.map(({[col]:_,...r})=>r);}
  }
 }
 const patch=(path,body)=>req('PATCH',path,{body,prefer:'return=minimal'});
 const del=path=>req('DELETE',path,{prefer:'return=minimal'});
 return{select:p=>req('GET',p),selectAll,upsert,patch,del};
}
