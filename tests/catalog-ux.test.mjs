import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, distance, rankSuggestions, offerKind, groupEditions, togetherMatch, compatibility, profileSignature } from '../assets/catalog-ux-20261029.js';

test('typos and transposed letters prefer the intended base game',()=>{
 assert.equal(normalize('İstek™'),'istek');
 assert.equal(distance('elden rnig','elden ring'),1);
 assert.equal(rankSuggestions('elden rnig',[{id:'night',name:'ELDEN RING NIGHTREIGN'},{id:'base',name:'ELDEN RING PS4 & PS5'}])[0].id,'base');
});
test('editions share a card while sequel, DLC and distinct offer data remain separate',()=>{
 const input=[{id:'deluxe',name:'Game Deluxe Edition',price:200},{id:'standard',name:'Game Standard Edition',price:100},{id:'sequel',name:'Game 2'},{id:'dlc',name:'Game DLC'}];
 const result=groupEditions(input);
 assert.equal(result.length,3);
 assert.deepEqual(result[0].uxVariants.map(v=>[v.id,v.price]),[['deluxe',200],['standard',100]]);
 assert.equal(input[0].uxVariants,undefined);
});
test('zero price does not establish a free full game or subscription entitlement',()=>{
 assert.equal(offerKind({name:'Game',price:0}).key,'unknown');
 assert.equal(offerKind({name:'Game',edition:'PS4/PS5 · Tam Sürüm Oyun'}).key,'game');
 assert.equal(offerKind({name:'Game Upgrade'}).key,'upgrade');
 assert.equal(offerKind({name:'Game',subscriptionRequired:true}).key,'subscription');
});
test('co-op filters require evidence for the exact play mode',()=>{
 assert.equal(togetherMatch({categories:['Online Co-op']},'online'),true);
 assert.equal(togetherMatch({tags:['Local Co-Op']},'local'),true);
 assert.equal(togetherMatch({tags:['Co-op']},'local'),false);
 assert.equal(togetherMatch({tags:[]},'cross'),false);
});
test('compatibility remains unknown until confirmed and confirmation is tied to hardware',()=>{
 const item={name:'Game',requirements:{min:[['Memory','16 GB RAM'],['Storage','80 GB available space']]}};
 const state={pc:{cpu:'CPU',gpu:'GPU',os:'Windows',ram:'8',disk:'100'},confirmed:{}};
 assert.equal(compatibility(item,state),'below');
 state.pc.ram='16'; assert.equal(compatibility(item,state),'unknown');
 state.confirmed.game=profileSignature(state.pc); assert.equal(compatibility(item,state),'confirmed');
 state.pc.gpu='Other GPU'; assert.equal(compatibility(item,state),'unknown');
});
