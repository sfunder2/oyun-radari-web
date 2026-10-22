import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordHistory,computeStats} from '../scripts/ps-history.mjs';
import {mergeScores} from '../scripts/score-merge.mjs';
import {runPsBatch} from '../scripts/run-ps-batch.mjs';
test('same day price increase preserves the earlier daily low',()=>{const h={};recordHistory(h,[{id:'a',price:80}], '2026-10-21');recordHistory(h,[{id:'a',price:50}], '2026-10-22');recordHistory(h,[{id:'a',price:100}], '2026-10-22');const s=computeStats(h.items.a,{price:100},'2026-10-22');assert.equal(s.lowestEver,50);assert.equal(s.lowest30d,50);assert.equal(h.items.a.p.at(-1)[1],100);});
test('a failed score source cannot erase a previous score',()=>{const result=mergeScores({opencritic:90,opencritic_url:'old'},{metacritic:85,opencritic:null,checked_at:'now'});assert.equal(result.opencritic,90);assert.equal(result.opencritic_url,'old');assert.equal(result.metacritic_checked_at,'now');});
function db(fail=false){const writes=[];return{writes,rpc:async name=>name==='claim_ps_batch',select:async path=>path.includes('cursors')?[{value:{newest:20,discounts:10}}]:[],selectAll:async()=>[],upsert:async(t,r)=>{if(fail&&t==='ps_products')throw Error('write failed');writes.push([t,r]);}};}
const item={id:'EP1_TEST',name:'Test',price:50,checkedAt:'2026-10-22T00:00:00Z'};
test('batch revisits latest releases and advances persisted cursors',async()=>{const sb=db(),calls=[];const r=await runPsBatch({sb,pagesPerKind:1,sleep:async()=>{},fetchGrid:async(k,p)=>(calls.push([k,p]),{items:[item],hasMore:true})});assert.equal(r.status,'ok');assert.deepEqual(calls,[['newest',1],['discounts',10],['newest',20]]);assert.ok(sb.writes.some(([t,rows])=>t==='ps_state'&&rows[0].key==='cursors'&&rows[0].value.newest===21));});
test('failed persistence cannot advance discovery cursors and releases lease',async()=>{const sb=db(true);let released=false;sb.rpc=async n=>n==='claim_ps_batch'?true:(released=true);const r=await runPsBatch({sb,pagesPerKind:1,sleep:async()=>{},fetchGrid:async()=>({items:[item],hasMore:true})});assert.equal(r.status,'failed');assert.ok(!sb.writes.some(([t,rows])=>t==='ps_state'&&rows[0].key==='cursors'));assert.ok(released);});
test('overlapping batch is skipped without reading or writing data',async()=>{const sb={rpc:async()=>false};assert.equal((await runPsBatch({sb})).status,'skipped');});
