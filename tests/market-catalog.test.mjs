import test from 'node:test';import assert from 'node:assert/strict';
import {parseSteam,parseXbox,parseSwitch,parseEpic,parseGog,fetchEpicPage,fetchGogPage} from '../scripts/market-catalog.mjs';
test('steam: price, discount, free games; rows without a price are skipped',()=>{
 const html=`<a href="x" data-ds-appid="1145360" class="search_result_row"><img src="https://cdn/hades.jpg"><span class="title">Hades&reg;</span><div class="discount_block" data-price-final="1237" data-price-original="2475"><div class="discount_original_price">$24.75</div></div></a>
 <a data-ds-appid="570" class="search_result_row"><span class="title">Dota 2</span><div>Free To Play</div></a>
 <a data-ds-appid="9" class="search_result_row"><span class="title">No Price Yet</span><div>Coming soon</div></a>`;
 const {rows,total}=parseSteam({results_html:html,total_count:3},'T');
 assert.equal(rows.length,2);assert.deepEqual([rows[0].price,rows[0].original_price,rows[0].discount_percent,rows[0].currency],[12.37,24.75,50,'USD']);
 assert.equal(rows[0].name,'Hades');assert.equal(rows[0].title_key,'hades');assert.equal(rows[0].name_search,'hades');assert.equal(rows[1].price,0);assert.equal(rows[0].url,'https://store.steampowered.com/app/1145360/');assert.equal(total,3);
});
test('xbox: TRY purchase offers only, continuation token is returned',()=>{
 const j={channels:{c:{products:[{productId:'A'},{productId:'B'},{productId:'C'}],encodedCT:'TOKEN'}},productSummaries:[{productId:'A',title:'Cuphead'},{productId:'B',title:'USD Only'},{productId:'C',title:'Dlc'}],
  availabilitySummaries:[{productId:'A',actions:['Purchase'],price:{currency:'TRY',listPrice:300,msrp:400,eligibilityInfo:{eligibility:'None'}}},{productId:'B',actions:['Purchase'],price:{currency:'USD',listPrice:5,eligibilityInfo:{eligibility:'None'}}}]};
 const r=parseXbox(j,'T');assert.equal(r.rows.length,1);assert.equal(r.rows[0].platform,'xbox');assert.equal(r.rows[0].discount_percent,25);assert.equal(r.next,'TOKEN');
 assert.throws(()=>parseXbox({}),/okunamadı/);
});
test('switch: US store prices in USD, paging info',()=>{
 const r=parseSwitch({page:2,nbPages:10,hits:[{objectID:'1',urlKey:'hades-switch',title:'Hades',price:{finalPrice:12.49,regPrice:24.99},editions:['Standard']},{objectID:'2',urlKey:'x',title:'No price'}]},'T');
 assert.equal(r.rows.length,1);assert.deepEqual([r.rows[0].price,r.rows[0].original_price,r.rows[0].discount_percent],[12.49,24.99,50]);assert.equal(r.page,2);assert.equal(r.pages,10);assert.equal(r.rows[0].url,'https://www.nintendo.com/us/store/products/hades-switch/');
});
test('epic: TR prices in minor units, discounts, slug and image; unpriced rows skipped',()=>{
 const el=(o)=>({title:'Hades',id:'off1',namespace:'ns',productSlug:'hades/home',keyImages:[{type:'Thumbnail',url:'https://cdn/t.jpg'},{type:'OfferImageWide',url:'https://cdn/w.jpg'}],catalogNs:{mappings:[{pageSlug:'hades',pageType:'productHome'}]},price:{totalPrice:{discountPrice:22950,originalPrice:45900,currencyCode:'TRY',currencyInfo:{decimals:2}}},...o});
 const j={data:{Catalog:{searchStore:{elements:[el(),el({id:'off2',title:'Free Game',catalogNs:{mappings:[]},productSlug:'free-game',price:{totalPrice:{discountPrice:0,originalPrice:0,currencyCode:'TRY',currencyInfo:{decimals:2}}}}),el({id:'off3',price:null}),el({id:'off4',price:{totalPrice:{discountPrice:5,originalPrice:5,currencyCode:'EUR'}}})],paging:{count:40,total:812}}}}};
 const r=parseEpic(j,'T');assert.equal(r.total,812);assert.equal(r.rows.length,2);
 assert.deepEqual([r.rows[0].platform,r.rows[0].store_id,r.rows[0].price,r.rows[0].original_price,r.rows[0].discount_percent,r.rows[0].currency],['epic','off1',229.5,459,50,'TRY']);
 assert.equal(r.rows[0].url,'https://store.epicgames.com/tr/p/hades');assert.equal(r.rows[0].image,'https://cdn/w.jpg');assert.equal(r.rows[0].title_key,'hades');
 assert.equal(r.rows[1].price,0);assert.equal(r.rows[1].original_price,null);assert.equal(r.rows[1].url,'https://store.epicgames.com/tr/p/free-game');
 assert.throws(()=>parseEpic({errors:[{message:'blocked'}]}),/Epic kataloğu okunamadı: blocked/);
});
test('gog: TRY prices, discounts, store link; products without a price are skipped',()=>{
 const j={pages:137,productCount:6553,currentPage:2,products:[
  {id:'2099051765',slug:'9_years_of_shadows',title:'9 Years of Shadows',coverHorizontal:'https://img/h.png',storeLink:'https://www.gog.com/en/game/9_years_of_shadows',price:{finalMoney:{amount:'367.25',currency:'TRY'},baseMoney:{amount:'918.15',currency:'TRY'}}},
  {id:'1207659178',slug:'99_levels',title:'99 Levels to Hell',storeLink:'https://www.gog.com/en/game/99_levels',price:{finalMoney:{amount:'229.19',currency:'TRY'},baseMoney:{amount:'229.19',currency:'TRY'}}},
  {id:'3',slug:'soon',title:'Coming Soon',price:null}]};
 const r=parseGog(j,'T');assert.equal(r.rows.length,2);assert.equal(r.pages,137);
 assert.deepEqual([r.rows[0].platform,r.rows[0].price,r.rows[0].original_price,r.rows[0].discount_percent,r.rows[0].currency,r.rows[0].url,r.rows[0].image],['gog',367.25,918.15,60,'TRY','https://www.gog.com/en/game/9_years_of_shadows','https://img/h.png']);
 assert.equal(r.rows[1].original_price,null);assert.equal(r.rows[1].discount_percent,0);
 assert.throws(()=>parseGog({}),/GOG kataloğu okunamadı/);
});
test('epic/gog fetchers: request shape and paging',async()=>{
 const calls=[];const f=body=>async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify(body))};
 const e=await fetchEpicPage(2,40,f({data:{Catalog:{searchStore:{elements:[],paging:{total:200}}}}}));
 const v=JSON.parse(calls[0].init.body).variables;assert.equal(calls[0].init.method,'POST');assert.deepEqual([v.country,v.start,v.count,v.category],['TR',80,40,'games/edition/base']);assert.equal(e.hasMore,true);
 const g=await fetchGogPage(136,f({pages:137,products:[]}));const u=new URL(calls[1].url);
 assert.deepEqual([u.searchParams.get('page'),u.searchParams.get('countryCode'),u.searchParams.get('currencyCode'),u.searchParams.get('productType')],['137','TR','TRY','in:game']);assert.equal(g.hasMore,false);
});
