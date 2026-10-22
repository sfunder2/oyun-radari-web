const origin='https://psdeals.net';
const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n));
const text=s=>decode(String(s||'').replace(/<[^>]*>/g,'')).trim();
export function parseTRY(s){s=text(s);if(/^(FREE|ÜCRETSİZ)$/i.test(s))return 0;if(!/[₺]|TL|TRY/.test(s))return null;const v=Number(s.replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'));return Number.isFinite(v)&&v>=0?v:null;}
export function parsePSCatalog(html,page=0){
 const items=[];
 for(const m of html.matchAll(/<a\b[^>]*class="game-collection-item-link"[^>]*href="(\/tr-store\/game\/(\d+)\/[^"?#]+)"[^>]*>([\s\S]*?)<\/a>/g)){
  const body=m[3],name=text(body.match(/itemprop="name"[^>]*>([\s\S]*?)<\/span>/)?.[1]);if(!name)continue;
  const type=text(body.match(/class="game-collection-item-type[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1]);
  if(/demo|trial|add.on|DLC/i.test(type))continue;
  // The schema price may be the PS Plus price. Read only the regular offer span.
  const regular=body.match(/<span\b[^>]*class="game-collection-item-price(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/span>/)?.[1];
  const price=parseTRY(regular),image=decode(body.match(/<img[^>]*itemprop="image"[^>]*content="([^"]+)"/)?.[1]||body.match(/<img[^>]*itemprop="image"[^>]*data-src="([^"]+)"/)?.[1]);
  const console=text(body.match(/class="game-collection-item-top-platform"[^>]*>([\s\S]*?)<\/span>/)?.[1]);
  items.push({id:'playstation:psdeals:'+m[2],providerId:m[2],storeId:m[2],platform:'playstation',name,image,price,currency:price===null?null:'TRY',region:'TR',edition:console+' · '+type,url:origin+decode(m[1]),source:origin+decode(m[1]),sourceKind:'psdeals',sourceLabel:'PS Deals · TR',checkedAt:new Date().toISOString(),purchaseEligible:!!regular&&price!==null});
 }
 const count=html.match(/We found\s+([\d,.\s]+)\s+results/i)?.[1];
 const hasMore=/<li\b[^>]*class="next"/.test(html);if(!/class="game-collection-item-link"/.test(html)&&!/We found\s+0\s+results|No results|No games found/i.test(html))throw new Error('PlayStation fiyat kataloğu okunamadı');
 return {platform:'playstation',items,total:count?Number(count.replace(/\D/g,'')):null,hasMore,page,status:'ok',sourceKind:'psdeals',sourceLabel:'PS Deals · TR',source:origin+'/tr-store/all-games',checkedAt:new Date().toISOString(),message:'PS Deals Türkiye kataloğu. Abonelik fiyatları karşılaştırmaya alınmaz; ödeme öncesi resmî mağazada doğrulayın.'};
}
