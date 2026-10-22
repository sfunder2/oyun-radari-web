import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parsePSCatalog} from './ps-catalog-parser.mjs';
let old={items:[],cursors:{newest:1,popular:1}};try{old=JSON.parse(await readFile('data/ps-index.json','utf8'))}catch{}
const items=new Map((old.items||[]).map(i=>[i.id,i]));const cursors=old.cursors||{newest:1,popular:1};let refreshed=0;const errors=[];
for(const key of ['newest','popular']){
 const page=cursors[key]||1;const source=`https://psdeals.net/tr-store/all-games/${page}${key==='popular'?'?sort=most-watchlisted':''}`;
 try{const r=await fetch(source,{headers:{'User-Agent':'OyunRadari/1.0 (game price comparison)','Accept-Language':'tr-TR'},signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error('HTTP '+r.status);const feed=parsePSCatalog(await r.text(),page-1);for(const item of feed.items){items.set(item.id,item);refreshed++;}cursors[key]=feed.hasMore?page+1:1;console.log(key,'page',page,feed.items.length,'products');}catch(e){errors.push({source,error:e.message});console.log('Source unavailable:',e.message);}
 await new Promise(r=>setTimeout(r,3000));
}
let links=[];try{links=JSON.parse(await readFile('ps-links.json','utf8'))}catch{}
for(const url of links){if(!/^https:\/\/store\.playstation\.com\/tr-tr\/product\/[A-Z0-9_-]+$/.test(url))continue;
 try{const r=await fetch('https://oyun-radari-tr.gokhangozcu.chatgpt.site/api/playstation?'+new URLSearchParams({url}),{headers:{'User-Agent':'OyunRadari/1.0'},signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error('Official product HTTP '+r.status);const item=await r.json();if(item.status==='ok'){items.set(item.id,{...item,purchaseEligible:true,sourceLabel:'PlayStation Store TR'});refreshed++;}}catch(e){errors.push({source:url,error:e.message});}
}
if(!refreshed)throw new Error('No prices refreshed; previous index preserved');
const data={updatedAt:new Date().toISOString(),coverage:'Kamuya açık PS Deals Türkiye katalog kayıtları ve doğrulanmış resmî ürünler; tam PSN kapsamı değildir.',cursors,errors,items:[...items.values()]};
await mkdir('data',{recursive:true});await writeFile('data/ps-index.json',JSON.stringify(data,null,2));await writeFile('data/ps-prices.json',JSON.stringify(data,null,2));console.log('Saved',items.size,'products;',refreshed,'refreshed');
