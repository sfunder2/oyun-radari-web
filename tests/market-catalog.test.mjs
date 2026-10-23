import test from 'node:test';import assert from 'node:assert/strict';
import {parseSteam,parseXbox,parseSwitch} from '../scripts/market-catalog.mjs';
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
