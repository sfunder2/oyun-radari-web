import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryClient,normalizeLibraryGame} from '../scripts/library.mjs';

test('library game input is normalized and checked',()=>{
 assert.deepEqual(normalizeLibraryGame({platform:'steam',game_id:'620',game_title:' Portal 2 '}),{platform:'steam',game_id:'620',game_title:'Portal 2',play_status:'backlog'});
 assert.throws(()=>normalizeLibraryGame({platform:'unknown',game_id:'620',game_title:'x'}),TypeError);
 assert.throws(()=>normalizeLibraryGame({platform:'steam',game_id:'620',game_title:'  '}),TypeError);
 assert.throws(()=>normalizeLibraryGame({platform:'steam',game_id:'620',game_title:'x',play_status:'hacked'}),TypeError);
});
test('library operations remain scoped to authenticated user and encode ids',async()=>{
 const calls=[];
 const api={select:async p=>(calls.push(['select',p]),[]),
  insert:async(...x)=>calls.push(['insert',...x]),patch:async(...x)=>calls.push(['patch',...x]),del:async p=>calls.push(['delete',p])};
 const c=libraryClient(api,'u-123');
 await c.list();
 await c.add({platform:'steam',game_id:'620',game_title:'Portal 2'});
 await c.setStatus('steam','id & ?','playing');
 await c.remove('steam','id & ?');
 assert.match(calls[0][1],/user_id=eq.u-123/);
 assert.match(calls[1][1],/game_id=eq.620/);
 assert.deepEqual(calls[2][2][0].user_id,'u-123');
 assert.match(calls[3][1],/game_id=eq.id%20%26%20%3F/);
 assert.match(calls[4][1],/game_id=eq.id%20%26%20%3F/);
 await assert.rejects(()=>c.setStatus('steam','620','invalid'),TypeError);
});

test('library pagination is deterministic, bounded and status-filtered',async()=>{
 const requests=[];const api={select:async path=>(requests.push(path),[])};
 const c=libraryClient(api,'test-user');
 await c.listPage({offset:200,limit:50,status:'playing'});
 assert.match(requests[0],/order=updated_at.desc,platform.asc,game_id.asc/);
 assert.match(requests[0],/play_status=eq.playing/);
 assert.match(requests[0],/limit=50&offset=200/);
 await assert.rejects(()=>c.listPage({offset:-1}),RangeError);
 await assert.rejects(()=>c.listPage({limit:201}),RangeError);
 await assert.rejects(()=>c.listPage({status:'not-real'}),TypeError);
});

test('duplicate add preserves existing playing status without writing',async()=>{
 let writes=0;
 const api={select:async()=>[{game_id:'620'}],insert:async()=>{writes++;}};
 const result=await libraryClient(api,'user-a').add({platform:'steam',game_id:'620',game_title:'Portal 2'});
 assert.equal(result.alreadyExists,true);
 assert.equal(writes,0);
});
