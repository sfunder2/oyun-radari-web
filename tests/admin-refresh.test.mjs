import test from 'node:test';import assert from 'node:assert/strict';
import {createAdminRefreshHandler} from '../scripts/admin-refresh-handler.mjs';
import {readAdminPrice,validOffer} from '../scripts/admin-price.mjs';
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const request=(body={},headers={})=>new Request('https://example.test/refresh',{method:'POST',headers:{Origin:'https://sfunder2.github.io',Authorization:'Bearer user-token','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('admin refresh rejects missing sessions and non-admin users before any store fetch',async()=>{
 let storeCalls=0;
 const f=async url=>url.includes('/auth/')?response({id:'u'}):response(false);
 const h=createAdminRefreshHandler({url:'https://db.test',serviceKey:'secret',fetchImpl:f,readPrice:async()=>{storeCalls++}});
 assert.equal((await h(request({}, {Authorization:''}))).status,401);
 assert.equal((await h(request({platform:'steam',id:'10'}))).status,403);assert.equal(storeCalls,0);
});
test('admin refresh authorizes with user token, only finish uses service role, retains failed price',async()=>{
 const calls=[];
 const f=async(url,o)=>{calls.push({url,auth:o.headers.Authorization,body:o.body&&JSON.parse(o.body)});if(url.includes('/auth/'))return response({id:'u'});if(url.endsWith('is_radar_admin'))return response(true);if(url.endsWith('admin_begin_refresh'))return response({id:5,item:{platform:'steam',store_id:'10',name:'Game'}});if(url.endsWith('admin_finish_refresh'))return response({id:5,status:'failed'});throw Error('unexpected')};
 const h=createAdminRefreshHandler({url:'https://db.test',serviceKey:'secret',fetchImpl:f,readPrice:async()=>null});
 const r=await h(request({platform:'steam',id:'10'}));assert.equal(r.status,200);
 assert.equal(calls.find(x=>x.url.endsWith('admin_begin_refresh')).auth,'Bearer user-token');
 const finish=calls.find(x=>x.url.endsWith('admin_finish_refresh'));assert.equal(finish.auth,'Bearer secret');assert.equal(finish.body.p_offer,null);
 assert.equal((await r.json()).status,'failed');
});
test('source failure is audited and does not leak secrets or overwrite price',async()=>{
 let finish;
 const f=async(url,o)=>{if(url.includes('/auth/'))return response({id:'u'});if(url.endsWith('is_radar_admin'))return response(true);if(url.endsWith('admin_begin_refresh'))return response({id:6,item:{platform:'steam',store_id:'10'}});finish=JSON.parse(o.body);return response({status:'failed'})};
 const h=createAdminRefreshHandler({url:'https://db.test',serviceKey:'secret',fetchImpl:f,readPrice:async()=>{throw Error('sensitive upstream message')}});
 const r=await h(request({platform:'steam',id:'10'}));assert.equal(r.status,502);assert.equal(finish.p_offer,null);assert.doesNotMatch(await r.text(),/sensitive|secret/);
});
test('origin and input checks reject unsupported calls',async()=>{
 const h=createAdminRefreshHandler({url:'https://db.test',serviceKey:'secret',fetchImpl:async url=>response(url.includes('/auth/')?{id:'u'}:true)});
 assert.equal((await h(request({}, {Origin:'https://evil.test'}))).status,403);
 assert.equal((await h(request({platform:'arbitrary',id:'x'}))).status,400);
});
test('price adapters preserve exact product identity and explicit zero prices',async()=>{
 const free=await readAdminPrice({platform:'steam',store_id:'10'},async()=>response({10:{success:true,data:{is_free:true}}}));
 assert.equal(free.price,0);assert.equal(free.currency,'TRY');
 assert.equal(await readAdminPrice({platform:'steam',store_id:'10'},async()=>response({10:{success:false}})),null);
 assert.equal(validOffer({price:-1,discount_percent:0,currency:'TRY'}),false);
 assert.equal(validOffer({price:10,original_price:5,discount_percent:10,currency:'TRY'}),false);
 assert.equal(validOffer({price:0,original_price:null,discount_percent:0,currency:'USD'}),true);
});
