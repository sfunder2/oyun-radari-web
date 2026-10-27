import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPriceCard} from '../scripts/price-card-panel.mjs';
function fakeRoot(){
 const document={createElement(tag){return {tag,textContent:'',children:[],attributes:{},listeners:{},addEventListener(event,fn){this.listeners[event]=fn;},setAttribute(k,v){this.attributes[k]=v;},append(node){this.children.push(node);}};}};
 return {ownerDocument:document,children:[],replaceChildren(...nodes){this.children=nodes;}};
}
test('renders verified store offers into a DOM root without markup injection',()=>{
 const root=fakeRoot();
 const model=renderPriceCard(root,[{store:'Steam',price:750,currency:'TRY'},{store:'Xbox',price:1000,currency:'TRY'}]);
 assert.equal(model.state,'ready');
 assert.equal(root.children[0].tag,'section');
 assert.equal(root.children[0].children[1].children.length,2);
 assert.match(root.children[0].children[0].textContent,/Steam/);
});
test('renders currency ambiguity without claiming a winner',()=>{
 const root=fakeRoot();
 const model=renderPriceCard(root,[{store:'Steam',price:20,currency:'USD'},{store:'Xbox',price:500,currency:'TRY'}]);
 assert.equal(model.state,'choose-currency');
 assert.equal(root.children[0].children[0].attributes.role,'status');
 assert.equal(root.children[0].children.some(x=>x.tag==='h3'),false);
});
test('rejects missing DOM host',()=>assert.throws(()=>renderPriceCard(null,[]),TypeError));

test('currency selector re-renders real offers in selected currency',()=>{
 const root=fakeRoot();
 renderPriceCard(root,[{store:'Steam',price:10,currency:'USD'},{store:'Xbox',price:500,currency:'TRY'}]);
 const select=root.children[0].children.find(x=>x.tag==='select');
 assert.ok(select);
 assert.deepEqual(select.children.map(x=>x.value),['','TRY','USD']);
 select.value='TRY';
 select.listeners.change();
 assert.match(root.children[0].children[0].textContent,/Xbox/);
 assert.equal(root.children[0].children.some(x=>x.tag==='select'),false);
});
