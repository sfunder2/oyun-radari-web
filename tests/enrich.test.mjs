import test from 'node:test';import assert from 'node:assert/strict';
import {titleKey,cleanTitle} from '../scripts/titles.mjs';
import {parseXbox,ocFromHtml,parseOcSitemap,pickExact} from '../scripts/stores.mjs';
import {enrichProduct} from '../scripts/enrich.mjs';
test('title keys match across stores but keep distinct products apart',()=>{
 assert.equal(titleKey('Hades (PS4™ ve PS5™)'),'hades');assert.equal(titleKey('HADES'),titleKey('Hades Standard Edition'));
 assert.equal(titleKey('EA SPORTS FC™ 27 Ultimate Sürüm PS4 ve PS5'),titleKey('EA SPORTS FC 27 Ultimate Edition'));
 assert.notEqual(titleKey('Hades'),titleKey('Hades II'));assert.notEqual(titleKey('Hades'),titleKey('Hades Deluxe Edition'));assert.equal(cleanTitle('Oyun (PS5)'),'Oyun');
});
test('xbox parser keeps purchasable TRY offers',()=>{
 const j={channels:{c:{products:[{productId:'A'},{productId:'B'}]}},productSummaries:[{productId:'A',title:'Hades'},{productId:'B',title:'Free Thing'}],
  availabilitySummaries:[{productId:'A',actions:['Purchase'],price:{currency:'TRY',listPrice:600,msrp:900,eligibilityInfo:{eligibility:'None'}}},{productId:'B',actions:['Purchase'],price:{currency:'USD',listPrice:1,eligibilityInfo:{eligibility:'None'}}}]};
 const r=parseXbox(j);assert.equal(r.length,1);assert.equal(r[0].price,600);assert.equal(r[0].discount_percent,33);
});
test('opencritic json-ld requires matching title and 0-100 scale',()=>{
 const h=(n,s)=>`<script type="application/ld+json">${JSON.stringify({'@type':'VideoGame',name:n,aggregateRating:{ratingValue:s,bestRating:100,reviewCount:80,name:'OpenCritic Rating'}})}</script>`;
 assert.deepEqual(ocFromHtml(h('Hades',93),'hades'),{score:93,reviews:80});assert.equal(ocFromHtml(h('Hades II',93),'hades'),null);
});
test('sitemap parsing builds title keys',()=>{assert.deepEqual(parseOcSitemap('<loc>https://opencritic.com/game/10181/hades</loc><loc>https://opencritic.com/game/1/x-y</loc>').map(e=>[e.id,e.title_key]),[[10181,'hades'],[1,'x y']])});
test('enrich writes exact matches only and survives a failing source',async()=>{
 const f=async(url)=>{url=String(url);
  if(url.includes('storesearch'))return new Response(JSON.stringify({items:[{type:'app',id:1145350,name:'Hades II',price:{currency:'USD',initial:1499,final:1499},metascore:'94'},{type:'app',id:1145360,name:'Hades',price:{currency:'USD',initial:825,final:825},metascore:'93'}]}));
  if(url.includes('xboxservices'))return new Response('x',{status:500});
  if(url.includes('algolia'))return new Response(JSON.stringify({hits:[{objectID:'9',urlKey:'hades-switch',title:'Hades',price:{finalPrice:24.99,regPrice:24.99}}]}));
  if(url.includes('opencritic.com/game'))return new Response(`<script type="application/ld+json">${JSON.stringify({'@type':'VideoGame',name:'Hades',aggregateRating:{ratingValue:93.2,bestRating:100,reviewCount:70,name:'OpenCritic'}})}</script>`);
  throw new Error('beklenmeyen '+url)};
 const r=await enrichProduct({id:'EP1',name:'Hades (PS4™ ve PS5™)'},{f,ocIndex:new Map([['hades',{id:10181,slug:'hades'}]]),now:'T'});
 assert.deepEqual(r.offers.map(o=>[o.platform,o.store_id,o.price]),[['steam','1145360',8.25],['switch','hades-switch',24.99]]);
 assert.equal(r.scores.metacritic,93);assert.equal(r.scores.metacritic_platform,'PC');assert.equal(r.scores.opencritic,93);assert.match(r.errors[0],/xbox/);
});


test('OpenCritic sitemap review subpages cannot contaminate matching keys',()=>{assert.deepEqual(parseOcSitemap('<loc>https://opencritic.com/game/10181/hades/reviews</loc><loc>https://opencritic.com/game/10181/hades</loc>'),[{id:10181,slug:'hades',title_key:'hades'}]);});
