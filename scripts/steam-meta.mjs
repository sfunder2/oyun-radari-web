// Steam'den: yaklaşan oyunlar listesi ve oyun ayrıntıları (tür, çıkış tarihi, geliştirici, yaş sınırı, Türkçe desteği)
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MONTHS={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
export const GENRE_TR={Action:'Aksiyon',Adventure:'Macera',RPG:'RPG',Strategy:'Strateji',Simulation:'Simülasyon',Sports:'Spor',Racing:'Yarış',Indie:'Bağımsız',Casual:'Rahat','Massively Multiplayer':'MMO','Free To Play':'Ücretsiz','Early Access':'Erken Erişim'};
// "22 Oct, 2026" | "Oct 22, 2026" -> "2026-10-22". Ay veya çeyrek bilgisi tek başına gün vermez.
export function parseReleaseDate(text){
 const t=String(text||'').trim();
 let m=t.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*,?\s+(\d{4})$/)||null,d,mo,y;
 if(m){d=+m[1];mo=MONTHS[m[2].toLowerCase()];y=+m[3];}
 else if((m=t.match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})$/))){mo=MONTHS[m[1].toLowerCase()];d=+m[2];y=+m[3];}
 else return null;
 if(mo===undefined||!d||!y)return null;
 return new Date(Date.UTC(y,mo,d)).toISOString().slice(0,10);
}
const strip=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
export function parseUpcoming(html,now=new Date().toISOString()){
 const out=[];
 for(const m of String(html).matchAll(/<a\b[^>]*data-ds-appid="(\d+)"[^>]*>([\s\S]*?)<\/a>/g)){
  const body=m[2],name=strip(body.match(/class="title"[^>]*>([\s\S]*?)<\/span>/)?.[1]);if(!name)continue;
  const rel=strip(body.match(/search_released[^>]*>([\s\S]*?)<\/div>/)?.[1]);
  const img=body.match(/<img[^>]*src="([^"]+)"/)?.[1];
  out.push({id:m[1],name,image:img||null,release_text:rel||null,release_date:parseReleaseDate(rel),url:`https://store.steampowered.com/app/${m[1]}/`,checked_at:now});
 }
 return out;
}
export async function fetchUpcoming(pages=3,f=fetch){
 const all=new Map();
 for(let i=0;i<pages;i++){
  const r=await f(`https://store.steampowered.com/search/results/?query&start=${i*50}&count=50&filter=popularcomingsoon&cc=tr&l=english&infinite=1`,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw new Error('Steam yaklaşan oyunlar HTTP '+r.status);
  for(const g of parseUpcoming((await r.json()).results_html))all.set(g.id,g);
  await new Promise(x=>setTimeout(x,800));
 }
 return[...all.values()];
}
const REQ_TR={'OS':'İşletim sistemi','Processor':'İşlemci','Memory':'Bellek','Graphics':'Ekran kartı','DirectX':'DirectX','Storage':'Depolama','Network':'Ağ','Sound Card':'Ses kartı','Additional Notes':'Not'};
// Steam'in HTML gereksinim listesi -> [[etiket, değer], ...]
export function parseRequirements(html){
 const rows=[];
 for(const m of String(html||'').matchAll(/<li[^>]*>\s*<strong>([^<]*?)\s*\*?:?\s*<\/strong>\s*:?\s*([\s\S]*?)<\/li>/g)){
  const label=m[1].replace(/[*:]/g,'').trim(),value=strip(m[2].replace(/<br\s*\/?>/g,' ')).replace(/\s+/g,' ');
  if(label&&value&&!/^(minimum|recommended)$/i.test(label))rows.push([REQ_TR[label]||label,value.slice(0,160)]);
 }
 return rows;
}
export function parseDetails(d,titleKey,now=new Date().toISOString()){
 if(!d||d.type!=='game')return null;
 const langs=String(d.supported_languages||''),rel=d.release_date||{};
 const pegi=d.ratings?.pegi?.rating,esrb=d.ratings?.esrb?.rating;
 const age=pegi?'PEGI '+pegi:esrb?'ESRB '+String(esrb).toUpperCase():Number(d.required_age)>0?Number(d.required_age)+'+':null;
 return{title_key:titleKey,steam_appid:Number(d.steam_appid)||null,
  genres:(d.genres||[]).map(g=>GENRE_TR[g.description]||g.description).filter(Boolean),
  release_date:rel.coming_soon?null:parseReleaseDate(rel.date),release_text:rel.date||null,
  developers:d.developers||[],publishers:d.publishers||[],
  turkish:/Turkish/.test(langs),turkish_audio:/Turkish<strong>\*<\/strong>/.test(langs),age,
  requirements:(()=>{const r=d.pc_requirements;if(!r||Array.isArray(r))return null;const min=parseRequirements(r.minimum),rec=parseRequirements(r.recommended);return min.length||rec.length?{min,rec}:null;})(),
  dlc_count:Array.isArray(d.dlc)?d.dlc.length:0,checked_at:now};
}
export async function fetchDetails(appid,titleKey,f=fetch){
 const r=await f(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr&l=english`,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error('Steam ayrıntı HTTP '+r.status);
 const j=await r.json();const e=j[appid];return e?.success?parseDetails(e.data,titleKey):null;
}

// Geliştirici duyuruları / yama notları: en son 3 başlık
export function parseNews(j){
 return(j?.appnews?.newsitems||[]).slice(0,3).map(n=>({title:strip(n.title).slice(0,140),url:n.url,date:n.date?new Date(n.date*1000).toISOString().slice(0,10):null,label:n.feedlabel||null})).filter(n=>n.title&&/^https:\/\//.test(n.url||''));
}
export async function fetchNews(appid,f=fetch){
 const r=await f(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=3&maxlength=0&feeds=steam_community_announcements`,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error('Steam haber HTTP '+r.status);return parseNews(await r.json());
}
