// Bounded public catalogue page cache. No account, auth or user data is stored.
export function catalogPageKey(kind,args){
 const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
 return kind+':'+JSON.stringify(stable(args));
}
export function createCatalogPageCache({ttl=45000,max=24,now=Date.now,schedule=setTimeout,cancel=clearTimeout,canPrefetch=()=>typeof document!=='undefined'&&document.visibilityState==='visible'&&!globalThis.navigator?.connection?.saveData}={}){
 const values=new Map(),flights=new Map();let pending=null;
 function put(key,value){values.delete(key);values.set(key,{at:now(),value});while(values.size>max)values.delete(values.keys().next().value);return value;}
 function request(key,load){
  const hit=values.get(key);if(hit&&now()-hit.at<ttl){values.delete(key);values.set(key,hit);return Promise.resolve(hit.value)}
  if(flights.has(key))return flights.get(key);
  const p=Promise.resolve().then(load).then(v=>put(key,v)).finally(()=>flights.delete(key));flights.set(key,p);return p;
 }
 function prefetch(key,load){
  if(!canPrefetch())return;
  if(pending!==null)cancel(pending);
  if(values.has(key)&&now()-values.get(key).at<ttl||flights.has(key))return;
  pending=schedule(()=>{pending=null;if(typeof document!=='undefined'&&document.visibilityState!=='visible')return;if(globalThis.navigator?.connection?.saveData)return;void request(key,load).catch(()=>{});},350);
 }
 return {request,prefetch};
}
