import test from 'node:test';import assert from 'node:assert/strict';
import {mapStoreGenres} from '../scripts/store-genres.mjs';
import {parseXbox,parseGog,parseEpic,parseSwitch} from '../scripts/market-catalog.mjs';
test('mapStoreGenres: İngilizce ve Xbox Türkçe adları site türlerine ve etiketlere eşlenir',()=>{
 assert.deepEqual(mapStoreGenres(['Action','Indie','Rogue-Lite','Co-op','Single Player','NFT BLOCKCHAIN']),{genres:['Aksiyon','Bağımsız'],tags:['Co-op','Roguelike']});
 assert.deepEqual(mapStoreGenres(['Atıcı','Rol oyunları','Aksiyon ve macera']),{genres:['Aksiyon','Macera','RPG'],tags:['Shooter']});
 assert.deepEqual(mapStoreGenres(['Araba yarışı ve uçak','Aile ve çocuklar']),{genres:['Rahat','Yarış'],tags:['Family Friendly','Racing']});
 assert.deepEqual(mapStoreGenres(null),{genres:[],tags:[]});
 assert.deepEqual(mapStoreGenres(['Choose your difficulty',42,'']),{genres:[],tags:[]});
});
test('Toplayıcılar mağaza türlerini satıra ekler',()=>{
 const xb=parseXbox({channels:{c:{products:[{productId:'X1'}]}},productSummaries:[{productId:'X1',title:'Halo',categories:['Atıcı']}],availabilitySummaries:[{productId:'X1',actions:['Purchase'],price:{currency:'TRY',listPrice:100,msrp:100,eligibilityInfo:{eligibility:'None'}}}]});
 assert.deepEqual([xb.rows[0].genres,xb.rows[0].tags],[[],['Shooter']]);
 const gog=parseGog({products:[{id:'1',title:'Hades',price:{finalMoney:{amount:'100',currency:'TRY'},baseMoney:{amount:'100',currency:'TRY'}},genres:[{name:'Action'}],tags:[{name:'Rogue-Lite'},{name:'Indie'}]}]});
 assert.deepEqual([gog.rows[0].genres,gog.rows[0].tags],[['Aksiyon','Bağımsız'],['Roguelike']]);
 const ep=parseEpic({data:{Catalog:{searchStore:{elements:[{title:'Superior',id:'e1',productSlug:'superior',tags:[{name:'Shooter',groupName:'genre'},{name:'Windows',groupName:'platform'},{name:'Co-op',groupName:'feature'}],price:{totalPrice:{discountPrice:1000,originalPrice:1000,currencyCode:'TRY',currencyInfo:{decimals:2}}}}],paging:{total:1}}}}});
 assert.deepEqual([ep.rows[0].genres,ep.rows[0].tags],[[],['Co-op','Shooter']]);
 const sw=parseSwitch({hits:[{title:'Mario Kart',urlKey:'mk',price:{finalPrice:60,regPrice:60},gameGenreLabels:['Racing','Party'],gameFeatureLabels:['Play for the fastest time']}]});
 assert.deepEqual([sw.rows[0].genres,sw.rows[0].tags],[['Yarış'],['Party Game','Racing']]);
});
