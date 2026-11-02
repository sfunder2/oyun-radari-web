// Supabase PostgREST için küçük istemci (SDK gerekmez).
// Geçici sayılan Postgres hataları: 57014 statement timeout (sorgu iptal edilip geri alınır), 40P01 deadlock, 55P03 kilit alınamadı, 53300 bağlantı sınırı.
const TRANSIENT_PG=/"code"\s*:\s*"(57014|40P01|55P03|53300)"/;
const TRANSIENT_HTTP=[502,503,504,520,522,524];
export function supabase(url,key,fetchImpl=fetch,{retries=4,retryDelay=1500,timeoutMs=30000,sleep=ms=>new Promise(ok=>setTimeout(ok,ms)),log=m=>console.log(m)}={}){
 const base=url.replace(/\/$/,'')+'/rest/v1/';
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 // Üstel bekleme + rastgele sapma: 1.5 sn, 3 sn, 6 sn, 12 sn (±%25). Aynı anda düşen toplayıcılar aynı saniyede yeniden vurmasın.
 const wait=attempt=>Math.round(retryDelay*2**attempt*(0.75+Math.random()*0.5));
 async function req(method,path,{body,prefer,replayable=true}={}){
  // Okumalar, merge-duplicates upsert'leri, PATCH ve DELETE tekrarlanabilir. RPC'ler yalnızca sunucunun işi yapmadığı kesin olduğunda
  // (ağ geçidi hatası ya da Postgres'in iptal edip geri aldığı sorgu) yeniden denenir; istemci tarafı zaman aşımında sunucu işi bitirmiş olabilir.
  const label=`Supabase ${method} ${path.split('?')[0]}`;
  for(let attempt=0;;attempt++){
   let r,reason;
   try{r=await fetchImpl(base+path,{method,headers:{...headers,...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});}
   catch(e){if(!replayable||attempt>=retries)throw new Error(`${label}: ${e.name==='TimeoutError'?`${timeoutMs/1000} sn içinde yanıt yok`:e.message}`,{cause:e});reason=e.name==='TimeoutError'?'istemci zaman aşımı':'ağ hatası: '+e.message;}
   if(r){
    if(r.ok){const t=await r.text();return t?JSON.parse(t):null;}
    const text=await r.text().catch(()=>'');
    const transient=TRANSIENT_HTTP.includes(r.status)||(r.status>=500&&TRANSIENT_PG.test(text));
    if(!transient||attempt>=retries)throw new Error(`${label} HTTP ${r.status}: ${text.slice(0,200)}`);
    reason=`HTTP ${r.status}${TRANSIENT_PG.test(text)?' '+text.match(TRANSIENT_PG)[1]:''}`;
   }
   const ms=wait(attempt);log(`${label} geçici hata (${reason}); ${attempt+1}/${retries}. yeniden deneme ${(ms/1000).toFixed(1)} sn sonra`);
   await sleep(ms);
  }
 }
 async function selectAll(path,size=1000){
  const out=[];
  for(let off=0;;off+=size){const rows=await req('GET',`${path}${path.includes('?')?'&':'?'}limit=${size}&offset=${off}`);out.push(...rows);if(rows.length<size)return out;}
 }
 async function upsert(table,rows,conflict,size=200){
  // SQL şeması henüz güncellenmemişse bilinmeyen sütunlar atılıp yeniden denenir
  let data=rows;
  for(let attempt=0;;attempt++){
   try{
    // PostgREST requires identical keys in each request. Group sparse rows rather
    // than filling missing fields with null, which would erase saved metadata.
    const groups=new Map();for(const row of data){const signature=Object.keys(row).sort().join(',');if(!groups.has(signature))groups.set(signature,[]);groups.get(signature).push(row);}
    for(const group of groups.values())for(let i=0;i<group.length;i+=size)await req('POST',`${table}?on_conflict=${conflict}`,{body:group.slice(i,i+size),prefer:'resolution=merge-duplicates,return=minimal'});
    return;
   }
   catch(e){const col=e.message.match(/Could not find the '(\w+)' column/)?.[1];if(!col||attempt>6)throw e;console.log(`${table}.${col} sütunu yok; ilgili SQL çalıştırılana kadar atlanıyor`);data=data.map(({[col]:_,...r})=>r);}
  }
 }
 const patch=(path,body)=>req('PATCH',path,{body,prefer:'return=minimal'});
 const del=path=>req('DELETE',path,{prefer:'return=minimal'});
 return{rpc:(name,body)=>req('POST','rpc/'+name,{body,replayable:false}),select:p=>req('GET',p),selectAll,upsert,patch,del};
}

