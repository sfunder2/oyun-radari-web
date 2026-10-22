// Oyun haberleri: yalnız başlık, kaynak ve bağlantı saklanır (içerik kopyalanmaz).
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
export const FEEDS=[['IGN','https://feeds.ign.com/ign/games-all'],['GameSpot','https://www.gamespot.com/feeds/news/'],['PC Gamer','https://www.pcgamer.com/rss/'],['Eurogamer','https://www.eurogamer.net/feed']];
const clean=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,v)=>{const n=v[0].toLowerCase()==='x'?parseInt(v.slice(1),16):Number(v);return n>0&&n<=0x10ffff&&! (n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):''}).replace(/&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
export function parseRss(xml,source,limit=8){
 const out=[];
 for(const m of String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)){
  const b=m[1],title=clean(b.match(/<title\b[^>]*>([\s\S]*?)<\/title>/)?.[1]);
  let link=clean(b.match(/<link\b[^>]*>([\s\S]*?)<\/link>/)?.[1])||b.match(/<link\b[^>]*href="([^"]+)"/)?.[1]||'';
  const date=new Date(clean(b.match(/<(?:pubDate|dc:date|published)\b[^>]*>([\s\S]*?)<\//)?.[1]));
  if(!title||!/^https:\/\//.test(link)||isNaN(date))continue;
  out.push({url:link,source,title:title.slice(0,180),published_at:date.toISOString()});
  if(out.length>=limit)break;
 }
 return out;
}
export async function fetchAllNews(f=fetch){
 const all=[],errors=[];
 for(const [name,url] of FEEDS){
  try{const r=await f(url,{headers:{'User-Agent':UA,Accept:'application/rss+xml,application/xml,text/xml,*/*'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('HTTP '+r.status);all.push(...parseRss(await r.text(),name));}
  catch(e){errors.push(name+': '+e.message);}
 }
 const seen=new Set();
 return{items:all.sort((a,b)=>b.published_at.localeCompare(a.published_at)).filter(x=>!seen.has(x.url)&&seen.add(x.url)).slice(0,40),errors};
}

