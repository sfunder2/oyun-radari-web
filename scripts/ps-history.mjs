// Fiyat geçmişi: yalnızca fiyat değiştiğinde (gün bazında) nokta ekler. Nokta = [YYYY-MM-DD, fiyat, indirimsiz fiyat]
const DAY=864e5;
const dstr=t=>new Date(t).toISOString().slice(0,10);
const days=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/DAY);
export function recordHistory(hist,items,today){
 hist.version=1;hist.since??=today;hist.items??={};
 for(const it of items){
  if(!it?.id||!Number.isFinite(it.price))continue;
  const base=Number.isFinite(it.originalPrice)&&it.originalPrice>it.price?it.originalPrice:it.price;
  const h=hist.items[it.id]??={n:it.name,p:[]};h.n=it.name;
  const last=h.p.at(-1);
  if(last&&last[0]===today){last[3]=Math.min(last[3]??last[1],it.price);last[1]=it.price;last[2]=base}
  else if(!last||last[1]!==it.price||last[2]!==base)h.p.push([today,it.price,base,it.price]);
  if(h.p.length>400)h.p.splice(0,h.p.length-400);
  h.s=today;
 }
 return hist;
}
// İndirim başlamadan önce indirimsiz fiyat yükseltilmiş mi? Yalnızca şu an indirimdeki ürünlerde bakılır.
export function detectRise(p,it){
 const cur=it.price,curBase=it.originalPrice;
 if(!(Number.isFinite(curBase)&&curBase>cur)||p.length<2)return null;
 let i=p.length-1;while(i>0&&p[i-1][1]<p[i-1][2])i--;      // güncel indirim serisinin ilk noktası
 if(!(p[i][1]<p[i][2])||i===0)return null;                   // indirim öncesi kayıt yok
 const start=p[i][0],cut=dstr(Date.parse(start)-60*DAY);
 const pre=p.slice(0,i).filter(x=>x[0]>=cut);
 if(!pre.length)return null;
 const minBase=Math.min(...pre.map(x=>x[2]));
 if(curBase<minBase*1.05)return null;
 const changed=pre.find(x=>x[2]>=curBase*0.999)||p[i];
 return{from:minBase,to:curBase,pct:Math.round((curBase/minBase-1)*100),changedAt:changed[0],saleStart:start};
}
export function computeStats(h,it,today){
 const p=h?.p||[];if(!p.length||!Number.isFinite(it.price))return null;
 const cur=it.price;
 const lowestEver=Math.min(cur,...p.map(x=>x[3]??x[1]));
 const cut=dstr(Date.parse(today)-30*DAY);
 const win=p.filter(x=>x[0]>=cut).map(x=>x[3]??x[1]);const before=[...p].reverse().find(x=>x[0]<cut);if(before)win.push(before[1]);
 const lowest30d=Math.min(cur,...win);
 const historyDays=days(p[0][0],today);
 const highest=Math.max(cur,it.originalPrice||0,...p.map(x=>x[2]));
 return{lowestEver,lowest30d,historyDays,
  historicalLow:historyDays>=7&&cur<=lowestEver&&highest>cur,
  low30d:historyDays>=1&&cur<=lowest30d&&Math.max(it.originalPrice||0,...win)>cur,
  priceRise:detectRise(p,it)};
}

