// Cüzdan koçu: Kişisel merkez > Bütçe sekmesinin hesapları. Kayıtlar radar-lifestyle-v1 içindeki purchases
// ({id,name,amount,date,normal?}) ve limits[ay] alanlarıdır; normal, isteğe bağlı indirimsiz fiyattır.
// Sunucuya istek yapılmaz.
const money=v=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(v);
const r2=v=>Math.round(v*100)/100;
const valid=p=>p&&Number.isFinite(p.amount)&&p.amount>0&&/^\d{4}-\d{2}-\d{2}$/.test(p.date||'');
export const savingOf=p=>valid(p)&&Number.isFinite(p.normal)&&p.normal>p.amount?r2(p.normal-p.amount):0;
export const istanbulDay=(now=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const daysIn=month=>{const[y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0)).getUTCDate()};
export function walletSummary(purchases,month,limit,now=Date.now()){
 const all=(purchases||[]).filter(valid),list=all.filter(p=>p.date.slice(0,7)===month);
 const spent=r2(list.reduce((a,p)=>a+p.amount,0)),saved=r2(list.reduce((a,p)=>a+savingOf(p),0)),budget=Number.isFinite(limit)&&limit>0?limit:null;
 const today=istanbulDay(now),current=today.slice(0,7)===month,days=daysIn(month),day=current?Number(today.slice(8,10)):days;
 return{month,current,count:list.length,discounted:list.filter(p=>savingOf(p)>0).length,spent,saved,budget,remaining:budget===null?null:r2(Math.max(0,budget-spent)),over:budget===null?0:r2(Math.max(0,spent-budget)),used:budget?spent/budget:0,day,days,left:days-day,totalSaved:r2(all.reduce((a,p)=>a+savingOf(p),0))};
}
/** Koçun notları, en önemlisi önce. Her metin tek parçadır ki İngilizce sözlük kalıbı eşleşsin. */
export function walletNotes(s){
 const out=[];
 if(s.budget===null)out.push({tone:'info',text:'Aylık bütçeni yaz; harcadığını ve indirimle kazandığını birlikte takip edelim.'});
 else if(s.over>0)out.push({tone:'warn',text:`Bütçeyi ${money(s.over)} aştın. Bir dahakine istek listende “İndirim bekliyorum” önceliği ver, indirime girince haber verelim.`});
 else if(!s.count)out.push({tone:'good',text:`Bu ay henüz alım yok. Bütçenin tamamı (${money(s.budget)}) seni bekliyor.`});
 else if(s.current&&s.used>s.day/s.days+0.25&&s.left>3)out.push({tone:'warn',text:`Ayın ${s.day}. günündesin ama bütçenin %${Math.round(s.used*100)} kadarını kullandın. Sıradaki alım için indirim beklemek iyi olabilir.`});
 else if(s.current)out.push({tone:'good',text:`Bütçende ${money(s.remaining)} kaldı, ayın bitmesine ${s.left} gün var.`});
 else out.push({tone:'good',text:`Bu ayı bütçe içinde kapattın: ${money(s.remaining)} arttı.`});
 if(s.count>=2&&s.discounted===s.count)out.push({tone:'good',text:`Bu ay aldığın ${s.count} oyunun hepsi indirimliydi. Tam bir fırsat avcısısın!`});
 else if(s.count-s.discounted>0&&s.discounted>0)out.push({tone:'info',text:`Bu ay ${s.count-s.discounted} oyunu indirimsiz aldın. İstek listende takip edersen indirime girince haber veririz.`});
 return out;
}
/** Seçili ay dâhil son n ayın harcama ve tasarrufu, eskiden yeniye. */
export function walletHistory(purchases,month,n=6){
 const list=(purchases||[]).filter(valid),[y,m]=month.split('-').map(Number),out=[];
 for(let i=n-1;i>=0;i--){const key=new Date(Date.UTC(y,m-1-i,1)).toISOString().slice(0,7),items=list.filter(p=>p.date.slice(0,7)===key);out.push({month:key,spent:r2(items.reduce((a,p)=>a+p.amount,0)),saved:r2(items.reduce((a,p)=>a+savingOf(p),0))})}
 return out;
}
/** İstek listesinden alım taslağı: tutar, oyunu eklerken kaydedilen TL fiyatıdır (kullanıcı düzeltebilir). */
export function favoriteDraft(f){const price=f&&f.currency==='TRY'&&Number.isFinite(f.price)&&f.price>0?f.price:null;return{name:String(f?.name||'').slice(0,120),amount:price===null?'':String(price),normal:''}}
