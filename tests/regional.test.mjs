import test from 'node:test';import assert from 'node:assert/strict';
import {COUNTRIES,parseSteamPrice,parseXboxPrice,parseGogPrice,parseEpicPrice,psPrice,matchPsProduct,conceptProductIds,psRegionPrice,parseTcmb,parseErApi,regionalPrices,isFreshRate} from '../scripts/regional.mjs';
const C=Object.fromEntries(COUNTRIES.map(c=>[c.cc,c]));
const res=(body,status=200)=>({ok:status<400,status,json:async()=>body,text:async()=>typeof body==='string'?body:JSON.stringify(body)});
test('steam: kuruş → birim, indirim; satılmayan oyun null',()=>{
 const o=parseSteamPrice({1091500:{success:true,data:{price_overview:{currency:'UAH',initial:139900,final:41900,discount_percent:70}}}},'1091500',C.UA);
 assert.deepEqual([o.price,o.original_price,o.discount_percent,o.currency],[419,1399,70,'UAH']);assert.match(o.url,/cc=ua$/);
 assert.equal(parseSteamPrice({1:{success:true,data:[]}},'1',C.US),null);assert.equal(parseSteamPrice({1:{success:false}},'1',C.US),null);
 assert.throws(()=>parseSteamPrice({},'1',C.US),/okunamadı/);
});
test('xbox: satın alınabilir, deneme ve üyelik koşulu olmayan en ucuz teklif',()=>{
 const av=(price,extra={})=>({Actions:['Details','Purchase'],OrderManagementData:{Price:{ListPrice:price,MSRP:59999,CurrencyCode:'BRL'}},...extra});
 const j={Products:[{ProductId:'BX3',DisplaySkuAvailabilities:[{Sku:{Properties:{IsTrial:false}},Availabilities:[av(17999.7),av(9999,{RemediationRequired:true}),{Actions:['License'],OrderManagementData:{Price:{ListPrice:0,MSRP:0,CurrencyCode:'USD'}}}]},{Sku:{Properties:{IsTrial:true}},Availabilities:[av(1)]}]}]};
 const o=parseXboxPrice(j,'BX3',C.BR);assert.deepEqual([o.price,o.original_price,o.discount_percent,o.currency],[17999.7,59999,70,'BRL']);assert.equal(o.url,'https://www.xbox.com/pt-BR/games/store/x/BX3');
 assert.equal(parseXboxPrice({Products:[{ProductId:'BX3',DisplaySkuAvailabilities:[{Availabilities:[{Actions:['License']}]}]}]},'BX3',C.UA),null);
 assert.equal(parseXboxPrice({Products:[]},'BX3',C.US),null);
});
test('gog: ülkenin kendi para birimi seçilir, yoksa ilki',()=>{
 const j={_embedded:{prices:[{currency:{code:'EUR'},basePrice:'2125 EUR',finalPrice:'2125 EUR'},{currency:{code:'PLN'},basePrice:'9199 PLN',finalPrice:'4599 PLN'}]}};
 const o=parseGogPrice(j,'2071181157',C.PL);assert.deepEqual([o.price,o.original_price,o.discount_percent,o.currency],[45.99,91.99,50,'PLN']);
 assert.equal(parseGogPrice({_embedded:{prices:[{currency:{code:'USD'},basePrice:'1049 USD',finalPrice:'1049 USD'}]}},'1',C.UA).currency,'USD');
 assert.equal(parseGogPrice({message:'not found'},'1',C.US),null);
});
test('epic: kimlik birebir eşleşmeli, ondalık sayısı yanıttan',()=>{
 const j={data:{Catalog:{searchStore:{elements:[{id:'other',price:{totalPrice:{discountPrice:1,originalPrice:1,currencyCode:'USD'}}},{id:'5e02',productSlug:'cyberpunk-2077',price:{totalPrice:{discountPrice:1799,originalPrice:5999,currencyCode:'USD',currencyInfo:{decimals:2}}}}]}}}};
 const o=parseEpicPrice(j,'5e02',C.US);assert.deepEqual([o.price,o.original_price,o.discount_percent],[17.99,59.99,70]);assert.equal(o.url,'https://store.epicgames.com/en-US/p/cyberpunk-2077');
 assert.equal(parseEpicPrice(j,'yok',C.US),null);
});
test('ps: ondalık sayısı biçimli metinden; abonelik fiyatı alınmaz',()=>{
 assert.deepEqual(psPrice({price:{basePrice:'Rs 2,999',discountedPrice:'Rs 899',basePriceValue:2999,discountedValue:899,currencyCode:'INR',serviceBranding:['NONE']}}),{price:899,base:2999,currency:'INR'});
 assert.deepEqual(psPrice({price:{basePrice:'2.799,00 TL',discountedPrice:'1.119,60 TL',basePriceValue:279900,discountedValue:111960,currencyCode:'TRY',serviceBranding:['NONE']}}),{price:1119.6,base:2799,currency:'TRY'});
 assert.deepEqual(psPrice({price:{basePrice:'£39.99',discountedPrice:'Included',basePriceValue:3999,discountedValue:0,currencyCode:'GBP',serviceBranding:['PS_PLUS'],isTiedToSubscription:true}}),{price:39.99,base:39.99,currency:'GBP'});
 assert.equal(psPrice({price:{basePrice:'Unavailable',basePriceValue:null,currencyCode:null}}),null);
});
test('ps: başka bölgede aynı ad + aynı konsol kuşağı eşleşir',()=>{
 const us=[{id:'UP4497-CUSA16596_00-0000000000000004',name:'Cyberpunk 2077'},{id:'UP4497-PPSA03974_00-0000000000000CP1',name:'Cyberpunk 2077'},{id:'UP4497-PPSA03974_00-EXPANSION1B00000',name:'Cyberpunk 2077: Ultimate Edition (PS5)'}];
 assert.equal(matchPsProduct(us,{id:'EP4497-PPSA04027_00-00000000000000N1',name:'Cyberpunk 2077'}).id,'UP4497-PPSA03974_00-0000000000000CP1');
 assert.equal(matchPsProduct(us,{id:'EP4497-PPSA04027_00-EXPANSION1B00000',name:'Cyberpunk 2077: Ultimate Edition (PS5)'}).id,'UP4497-PPSA03974_00-EXPANSION1B00000');
 assert.equal(matchPsProduct(us,{id:'EP1-PPSA1_00-X',name:'Başka Oyun'}),null);
 assert.deepEqual(conceptProductIds('"id":"UP4497-PPSA03974_00-0000000000000CP1","x":1,"id":"UP4497-PPSA03974_00-0000000000000CP1","id":"234567"'),['UP4497-PPSA03974_00-0000000000000CP1']);
});
test('ps: Avrupa kimliği geçmeyen ülkede concept sayfasından bulunur',async()=>{
 const pr=(id,name,cur,base,disc)=>({id,name,price:{basePrice:'x'+(base/100).toFixed(2),discountedPrice:'x'+(disc/100).toFixed(2),basePriceValue:base,discountedValue:disc,currencyCode:cur,serviceBranding:['NONE']}});
 const calls=[];
 const f=async(url,init)=>{calls.push(url);const loc=init?.headers?.['x-psn-store-locale-override'];
  if(url.includes('/concept/234567'))return res('<html>"id":"UP4497-PPSA03974_00-0000000000000CP1"</html>');
  const pid=JSON.parse(new URL(url).searchParams.get('variables')).productId;
  if(loc==='tr-tr')return res({data:{productRetrieve:{concept:{id:'234567',selectableProducts:{purchasableProducts:[pr('EP4497-PPSA04027_00-00000000000000N1','Cyberpunk 2077','TRY',279900,111960)]}}}}});
  if(loc==='en-us'&&pid.startsWith('UP'))return res({data:{productRetrieve:{concept:{id:'234567',selectableProducts:{purchasableProducts:[pr('UP4497-PPSA03974_00-0000000000000CP1','Cyberpunk 2077','USD',4999,1999)]}}}}});
  return res({errors:[{message:'Product not available for [EP, US, en]'}],data:{productRetrieve:null}});
 };
 const ctx={},o=await psRegionPrice('EP4497-PPSA04027_00-00000000000000N1',C.US,f,ctx);
 assert.deepEqual([o.price,o.original_price,o.currency,o.url],[19.99,49.99,'USD','https://store.playstation.com/en-us/product/UP4497-PPSA03974_00-0000000000000CP1']);
 const tr=await psRegionPrice('EP4497-PPSA04027_00-00000000000000N1',C.TR,f,ctx);assert.equal(tr.price,1119.6);
 assert.equal(calls.filter(u=>u.includes('graphql')&&!u.includes('UP4497')).length,2); // TR kaydı tek kez okunur
});
test('kur: TCMB (birim dahil) ve open.er-api tersine çevrilir',()=>{
 const t=parseTcmb('<Tarih_Date Tarih="24.10.2026"><Currency CurrencyCode="USD"><Unit>1</Unit><ForexSelling>49.7</ForexSelling></Currency><Currency CurrencyCode="JPY"><Unit>100</Unit><ForexSelling>33</ForexSelling></Currency></Tarih_Date>');
 assert.deepEqual(t,{rates:{USD:49.7},date:'24.10.2026'});
 const e=parseErApi({result:'success',base_code:'TRY',rates:{TRY:1,UAH:0.909,INR:2},time_last_update_utc:'Sun'});assert.equal(Math.round(e.rates.UAH*1000)/1000,1.1);assert.equal(e.rates.INR,0.5);
 assert.deepEqual(parseErApi({result:'error'}).rates,{});
});
test('regionalPrices: ülke hatası diğerlerini durdurmaz, TL karşılığı ve kullanılan kurlar döner',async()=>{
 const f=async url=>{const cc=new URL(url).searchParams.get('cc');if(cc==='de')return res({},500);if(cc==='ua')return res({1:{success:true,data:[]}});return res({1:{success:true,data:{price_overview:{currency:cc==='tr'?'USD':'GBP',initial:2000,final:1000}}}});};
 const r=await regionalPrices({platform:'steam',id:'1',f,countries:[C.TR,C.DE,C.GB,C.UA],rates:{TRY:{rate:1},USD:{rate:40,source:'TCMB',date:'25.10.2026'},GBP:{rate:50,source:'TCMB',date:'25.10.2026'}},now:()=>'2026-10-25T00:00:00.000Z'});
 assert.deepEqual(r.countries.map(x=>x.status),['ok','error','ok','none']);assert.equal(r.countries[0].price_try,400);assert.equal(r.countries[2].price_try,500);
 assert.deepEqual(Object.keys(r.fx).sort(),['GBP','USD']);assert.equal(r.checkedAt,'2026-10-25T00:00:00.000Z');
 await assert.rejects(regionalPrices({platform:'switch',id:'1',f}),/bölge fiyatı yok/);
});

test('sprint 02: Steam explicitly free game is represented as zero, missing game remains null',()=>{
 const free=parseSteamPrice({10:{success:true,data:{is_free:true}}},'10',C.US);
 assert.equal(free.price,0);assert.equal(free.currency,'USD');
 assert.equal(parseSteamPrice({10:{success:true,data:{}}},'10',C.US),null);
});
test('sprint 02: PlayStation cross generation and ambiguous edition are rejected',()=>{
 const t={id:'EP4497-PPSA04027_00-00000000000000N1',name:'Cyberpunk 2077'};
 assert.equal(matchPsProduct([{id:'UP4497-CUSA16596_00-0000000000000004',name:t.name}],t),null);
 assert.equal(matchPsProduct([{id:'UP4497-PPSA03974_00-A',name:t.name},{id:'UP4497-PPSA03974_00-B',name:t.name}],t),null);
});
test('sprint 02: GOG malformed formatted amounts cannot be shown as prices',()=>{
 const price=value=>({_embedded:{prices:[{currency:{code:'USD'},finalPrice:value,basePrice:'1299 USD'}]}});
 assert.equal(parseGogPrice(price('12,99 USD'),'id',C.US),null);
 assert.equal(parseGogPrice(price('abc USD'),'id',C.US),null);
 assert.equal(parseGogPrice(price('-100 USD'),'id',C.US),null);
});

test('sprint 02 part 2: invalid Xbox prices and wrong currency are ignored',()=>{
 const avail=(n,currency='USD')=>({Actions:['Purchase'],OrderManagementData:{Price:{ListPrice:n,MSRP:500,CurrencyCode:currency}}});
 const j={Products:[{ProductId:'X',DisplaySkuAvailabilities:[{Sku:{Properties:{IsTrial:false}},Availabilities:[avail(-4),avail(0,'EUR'),avail(120)]}]}]};
 assert.equal(parseXboxPrice(j,'X',C.US).price,120);
 assert.equal(parseXboxPrice({Products:[{ProductId:'X',DisplaySkuAvailabilities:[{Availabilities:[avail(-10)]}]}]},'X',C.US),null);
});
test('sprint 02 part 2: known stale currency date must block TRY conversion',async()=>{
 assert.equal(isFreshRate('01.01.2020',new Date('2026-10-25T00:00:00Z')),false);
 assert.equal(isFreshRate('24.10.2026',new Date('2026-10-25T00:00:00Z')),true);
 const f=async()=>res({1:{success:true,data:{price_overview:{currency:'USD',initial:2000,final:1500}}}});
 const row=(await regionalPrices({platform:'steam',id:'1',f,countries:[C.US],rates:{USD:{rate:50,date:'01.01.2020'}},now:()=> '2026-10-25T00:00:00.000Z'})).countries[0];
 assert.equal(row.price_try,null);assert.equal(row.fx_stale,true);
});
test('sprint 02 part 2: discounted price above base cannot show as a valid PS deal',()=>{
 assert.equal(psPrice({price:{basePrice:'$20.00',discountedPrice:'$25.00',basePriceValue:2000,discountedValue:2500,currencyCode:'USD'}}),null);
});

test('sprint 02: undated real currency feed does not generate TRY equivalent',async()=>{
 const f=async()=>res({1:{success:true,data:{price_overview:{currency:'USD',initial:2000,final:1500}}}});
 const row=(await regionalPrices({platform:'steam',id:'1',f,countries:[C.US],rates:{USD:{rate:50,source:'TCMB döviz satış',date:null}},now:()=> '2026-10-25T00:00:00.000Z'})).countries[0];
 assert.equal(row.status,'ok');assert.equal(row.price,15);assert.equal(row.price_try,null);assert.equal(row.fx_stale,true);
});

