import test from 'node:test';
import assert from 'node:assert/strict';
import {filterLibrary,LIBRARY_STATUS_LABELS} from '../scripts/library-panel.mjs';
const games=[{platform:'steam',game_title:'Portal 2',play_status:'completed'},{platform:'xbox',game_title:'Halo Infinite',play_status:'playing'}];
test('Turkish search and status filtering for game library UI',()=>{
 assert.equal(filterLibrary(games,{text:'PORTAL'}).length,1);
 assert.equal(filterLibrary(games,{status:'playing'})[0].platform,'xbox');
 assert.equal(filterLibrary(games,{text:'halo',status:'completed'}).length,0);
 assert.equal(Object.keys(LIBRARY_STATUS_LABELS).length,5);
 assert.throws(()=>filterLibrary(games,{status:'invalid'}),TypeError);
});
