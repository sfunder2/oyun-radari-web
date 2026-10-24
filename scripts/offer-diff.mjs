// Toplayıcı her turda aynı satırları yeniden yazmasın: içeriği değişmeyen ve kontrol zamanı hâlâ taze olan teklifler atlanır.
// Kontrol zamanı (checked_at) "son 24 saatte doğrulandı" kuralı için tazelik süresi dolunca yine yazılır.
export const FRESH_MS=12*3600e3;
const none=v=>v===null||v===undefined;
const same=(a,b)=>{
 if(none(a)&&none(b))return true;
 if(none(a)||none(b))return false;
 if(typeof a==='number'||typeof b==='number')return Number(a)===Number(b);
 return JSON.stringify(a)===JSON.stringify(b);
};
const key=r=>r.platform+':'+r.store_id;
export function changedOffers(rows,existing,now=Date.now(),freshMs=FRESH_MS){
 const old=new Map((existing||[]).map(r=>[key(r),r]));
 return rows.filter(r=>{
  const o=old.get(key(r));if(!o)return true;
  const at=Date.parse(o.checked_at);if(!Number.isFinite(at)||now-at>=freshMs)return true;
  return Object.keys(r).some(k=>k!=='checked_at'&&!same(r[k],o[k]));
 });
}
// Sayfadaki tekliflerin kayıtlı hâli: yalnız yeni satırlarda bulunan sütunlar istenir.
export function existingQuery(rows){
 const platform=rows[0]?.platform,cols=[...new Set(['platform','store_id','checked_at',...rows.flatMap(r=>Object.keys(r))])];
 const ids=rows.map(r=>'"'+String(r.store_id).replace(/["\\]/g,m=>'\\'+m)+'"').join(',');
 return `store_offers?select=${cols.join(',')}&platform=eq.${encodeURIComponent(platform)}&store_id=in.(${encodeURIComponent(ids)})`;
}
