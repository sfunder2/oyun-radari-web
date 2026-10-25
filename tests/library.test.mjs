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
  upsert:async(...x)=>calls.push(['upsert',...x]),patch:async(...x)=>calls.push(['patch',...x]),del:async p=>calls.push(['delete',p])};
 const c=libraryClient(api,'u-123');
 await c.list();
 await c.add({platform:'steam',game_id:'620',game_title:'Portal 2'});
 await c.setStatus('steam','id & ?','playing');
 await c.remove('steam','id & ?');
 assert.match(calls[0][1],/user_id=eq.u-123/);
 assert.deepEqual(calls[1][2][0].user_id,'u-123');
 assert.match(calls[2][1],/game_id=eq.id%20%26%20%3F/);
 assert.match(calls[3][1],/game_id=eq.id%20%26%20%3F/);
 await assert.rejects(()=>c.setStatus('steam','620','invalid'),TypeError);
});
