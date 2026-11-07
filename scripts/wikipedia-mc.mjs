// Metacritic puanı: İngilizce Wikipedia'daki "Video game reviews" tablosunun MC alanı ("MC = PS5: 94/100<ref>…</ref>").
// Wikidata yeni büyük oyunların çoğunda puanı tutmuyor; Wikipedia makaleleri tutuyor. İçerik CC BY-SA, MediaWiki API ile okunur.
// Yalnız puanı eksik ve eleştirmen puanı olan (OpenCritic ya da IGDB eleştirmen puanı) oyunlar sorulur; var olan puanların üzerine yazılmaz.
// Makale adı oyunun mağaza adından denenir: "Ad (YIL video game)", "Ad (video game)", "Ad". Makalede "Infobox video game" olmalı ve
// yönlendirme sonrası makale başlığının anahtarı oyunun anahtarıyla aynı olmalı; başka oyuna ya da seriye giden yönlendirme kabul edilmez.
import {titleKey,cleanTitle} from './titles.mjs';
export const WIKIPEDIA_DAYS=7,TITLES_PER_REQUEST=48;
const UA='OyunRadari/1.0 (https://github.com/sfunder2/oyun-radari-web; metacritic score sync)';
// Site PlayStation ağırlıklı: aynı makalede birden çok platform puanı varsa önce PS5, sonra PS4, sonra PC.
const PLATFORMS=[[/^(ps5|playstation 5)$/i,'PS5'],[/^(ps4|playstation 4)$/i,'PS4'],[/^(pc|win|windows|microsoft windows)$/i,'PC'],[/^(xsxs|xsx|xss|xbox series x\/?s?|xbox series x and series s|xbox series)$/i,'Xbox Series'],[/^(xone|xbo|xb1|xbox one)$/i,'Xbox One'],[/^(ns2|switch 2|nintendo switch 2)$/i,'Switch 2'],[/^(ns|nsw|switch|nintendo switch)$/i,'Switch'],[/^(ps3|playstation 3)$/i,'PS3'],[/^(x360|xbox 360)$/i,'Xbox 360']];
function platform(label){const t=String(label||'').trim();if(!t)return{name:null,rank:PLATFORMS.length};const i=PLATFORMS.findIndex(([re])=>re.test(t));return i<0?{name:t.slice(0,30),rank:PLATFORMS.length+1}:{name:PLATFORMS[i][1],rank:i};}
/** {{…}} şablonlarını içten dışa siler (iç içe olabilir). */
function dropTemplates(s){let prev;do{prev=s;s=s.replace(/\{\{[^{}]*\}\}/g,'');}while(s!==prev);return s;}
/** "Video game reviews" şablonunun MC alanının ham metni; yoksa null. */
export function mcField(wikitext){
 const t=String(wikitext||'');const start=t.search(/\{\{\s*Video game reviews\b/i);if(start<0)return null;
 // Şablonun sonunu süslü parantez sayarak bul
 let depth=0,end=t.length;
 for(let i=start;i<t.length-1;i++){if(t[i]==='{'&&t[i+1]==='{'){depth++;i++;}else if(t[i]==='}'&&t[i+1]==='}'){depth--;i++;if(depth===0){end=i+1;break;}}}
 const body=t.slice(start,end);
 // Üst düzeydeki "|" ayraçlarına göre alanlara böl (ref ve cite içindeki "|" sayılmaz)
 const fields=[];let cur='',d=0,inRef=false;
 for(let i=0;i<body.length;i++){
  if(body.startsWith('<ref',i)&&!/^<ref[^>]*\/>/.test(body.slice(i,i+300)))inRef=true;
  if(inRef&&body.startsWith('</ref>',i)){inRef=false;cur+='</ref>';i+=5;continue;}
  const two=body.slice(i,i+2);
  if(two==='{{'||two==='[['){d++;cur+=two;i++;continue;}
  if(two==='}}'||two===']]'){d--;cur+=two;i++;continue;}
  if(body[i]==='|'&&d===1&&!inRef){fields.push(cur);cur='';continue;}
  cur+=body[i];
 }
 fields.push(cur);
 const mc=fields.find(x=>/^\s*MC\s*=/.test(x));
 return mc?mc.replace(/^\s*MC\s*=/,'').replace(/\}\}\s*$/,''):null;
}
/** MC alanı -> {score,platform,url}; birden çok platform varsa PS5 > PS4 > PC > diğerleri. */
export function parseMcField(raw){
 if(!raw)return null;
 const url=raw.match(/https?:\/\/(?:www\.)?metacritic\.com\/game\/[^\s|\]}<"]+/i)?.[0]?.replace(/^http:/,'https:').replace(/\/\/metacritic/,'//www.metacritic').split('?')[0]||null;
 let s=raw.replace(/<ref[^>]*\/>/gi,'').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi,'');
 s=s.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'');
 s=dropTemplates(s).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g,'$1').replace(/'{2,}/g,'');
 let best=null;
 for(const line of s.split(/\n|;|•/)){
  for(const m of line.matchAll(/(?:\(?\s*([A-Za-z][A-Za-z0-9 .\/]{0,40}?)\s*\)?\s*[:\-–]?\s*)?\b(\d{1,3})\s*\/\s*100\b(?:\s*\(([^)]{1,40})\))?/g)){
   const score=Number(m[2]);if(!(score>0&&score<=100))continue;
   const p=platform(m[3]||m[1]);const cand={score,platform:p.name,rank:p.rank};
   if(!best||cand.rank<best.rank)best=cand;
  }
 }
 return best?{score:best.score,platform:best.platform,url}:null;
}
export const isGameArticle=w=>/\{\{\s*Infobox[ _]video[ _]game\s*(\||\n|\}\})/i.test(String(w||''));
const stripParen=t=>String(t||'').replace(/\s*\([^)]*\)\s*$/,'');
/** Bir oyun için denenecek makale adları (sırayla). */
export function candidateTitles(name,year){
 const base=cleanTitle(String(name||'')).replace(/[™®©]/g,'').replace(/\s+/g,' ').trim();if(!base)return[];
 // Mağazalar adı sık sık büyük harfle yazar ("ASTRO BOT", "DOOM Eternal"); Wikipedia başlıkları ilk harf dışında büyük/küçük harf duyarlıdır.
 const tc=base.replace(/\b([A-Z])([A-Z]{2,})\b/g,(m,a,b)=>/^[IVXLC]+$/.test(m)?m:a+b.toLowerCase());
 const out=[];for(const n of [base,tc]){if(year)out.push(`${n} (${year} video game)`);out.push(`${n} (video game)`,n);}
 return[...new Set(out)];
}
/** MediaWiki yanıtı -> istenen başlık -> {title,wikitext} (normalize ve yönlendirmeler uygulanır; bölüm yönlendirmesi atılır). */
export function resolvePages(json,requested){
 const q=json?.query||{},norm=new Map((q.normalized||[]).map(n=>[n.from,n.to])),red=new Map((q.redirects||[]).map(r=>[r.from,r]));
 const pages=new Map((q.pages||[]).filter(p=>!p.missing&&!p.invalid).map(p=>[p.title,p]));
 const out=new Map();
 for(const t of requested){
  let cur=norm.get(t)||t;const r=red.get(cur);if(r){if(r.tofragment)continue;cur=r.to;}
  const p=pages.get(cur);const w=p?.revisions?.[0]?.slots?.main?.content??p?.revisions?.[0]?.content;
  if(w)out.set(t,{title:p.title,wikitext:w});
 }
 return out;
}
export async function fetchPages(titles,f=fetch){
 const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',prop:'revisions',rvprop:'content',rvslots:'main',maxlag:'5',titles:titles.join('|')});
 const r=await f('https://en.wikipedia.org/w/api.php?'+params,{headers:{'User-Agent':UA,'Api-User-Agent':UA},signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw new Error('Wikipedia HTTP '+r.status);
 const j=await r.json();if(j?.error)throw new Error('Wikipedia '+(j.error.code||'hata'));
 return resolvePages(j,titles);
}
/** Oyunlar [{key,name,year}] -> [{key,score,platform,url,title}] */
export async function lookupGames(games,{f=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),gapMs=1000,deadline=Infinity}={}){
 const found=[];let asked=0;
 const queue=games.map(g=>({...g,titles:candidateTitles(g.name,g.year)})).filter(g=>g.titles.length);
 for(let i=0;i<queue.length;){
  if(Date.now()>deadline)break;
  const batch=[];let n=0;while(i<queue.length&&n+queue[i].titles.length<=TITLES_PER_REQUEST){batch.push(queue[i]);n+=queue[i].titles.length;i++;}
  if(!batch.length){batch.push(queue[i]);i++;}
  const pages=await fetchPages(batch.flatMap(g=>g.titles),f);asked+=batch.length;
  for(const g of batch)for(const t of g.titles){
   const p=pages.get(t);if(!p||!isGameArticle(p.wikitext))continue;
   if(titleKey(stripParen(p.title))!==g.key)continue;
   const mc=parseMcField(mcField(p.wikitext));
   if(mc){found.push({key:g.key,...mc,title:p.title,url:mc.url||`https://www.metacritic.com/search/${encodeURIComponent(stripParen(p.title))}/?category=13`});break;}
  }
  await sleep(gapMs);
 }
 return{found,asked,done:queue.length?Math.min(asked,queue.length):0,last:queue[Math.min(asked,queue.length)-1]?.key||null};
}
