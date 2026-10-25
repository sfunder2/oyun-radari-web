import test from 'node:test';
import assert from 'node:assert/strict';
import {filterLibrary,LIBRARY_STATUS_LABELS,mergeLibraryPage,nextLibraryOffset} from '../scripts/library-panel.mjs';
const games=[{platform:'steam',game_title:'Portal 2',play_status:'completed'},{platform:'xbox',game_title:'Halo Infinite',play_status:'playing'}];
test('Turkish search and status filtering for game library UI',()=>{
 assert.equal(filterLibrary(games,{text:'PORTAL'}).length,1);
 assert.equal(filterLibrary(games,{status:'playing'})[0].platform,'xbox');
 assert.equal(filterLibrary(games,{text:'halo',status:'completed'}).length,0);
 assert.equal(Object.keys(LIBRARY_STATUS_LABELS).length,5);
 assert.throws(()=>filterLibrary(games,{status:'invalid'}),TypeError);
});

test('library pages are merged without duplicate platform-game identities',()=>{
 const a=[{platform:'steam',game_id:'1',game_title:'A'}];
 const b=[{platform:'steam',game_id:'1',game_title:'A duplicate'},{platform:'xbox',game_id:'1',game_title:'B'}];
 const out=mergeLibraryPage(a,b);
 assert.equal(out.length,2);
 assert.equal(out[0].game_title,'A');
 assert.equal(out[1].platform,'xbox');
});

test('deduplicates games repeated inside the same incoming page',()=>{
 const page=[{platform:'steam',game_id:'620',game_title:'Portal 2'},
 {platform:'steam',game_id:'620',game_title:'Duplicate'},
 {platform:'xbox',game_id:'620',game_title:'Different platform'}];
 const out=mergeLibraryPage([],page);
 assert.equal(out.length,2);
 assert.deepEqual(out.map(x=>x.game_title),['Portal 2','Different platform']);
});

test('pagination offset tracks received rows even when UI deduplicates them',()=>{
 const first=[{platform:'steam',game_id:'1'},{platform:'steam',game_id:'1'}];
 const visible=mergeLibraryPage([],first);
 assert.equal(visible.length,1);
 assert.equal(nextLibraryOffset(0,first),2);
 assert.equal(nextLibraryOffset(2,[{platform:'xbox',game_id:'2'}]),3);
 assert.throws(()=>nextLibraryOffset(-1,first),TypeError);
});
