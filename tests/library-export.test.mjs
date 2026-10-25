import test from 'node:test';
import assert from 'node:assert/strict';
import {exportLibraryCsv,exportLibraryJson} from '../scripts/library-export.mjs';
test('export includes only whitelisted columns',()=>{
 const row={platform:'steam',game_id:'620',game_title:'Portal 2',play_status:'completed',added_at:'2026-10-25',updated_at:'2026-10-25',token:'SECRET'};
 const j=exportLibraryJson([row]);
 assert.equal(j.includes('SECRET'),false);
 assert.equal(JSON.parse(j)[0].game_title,'Portal 2');
});
test('CSV escapes quotes and protects spreadsheet formula injection',()=>{
 const csv=exportLibraryCsv([{platform:'steam',game_id:'620',game_title:'=HYPERLINK("https://evil.test")',play_status:'backlog'}]);
 assert.match(csv,/"'=HYPERLINK\(""https:\/\/evil\.test""\)"/);
 assert.equal(exportLibraryCsv([]).split('\r\n').length,1);
 assert.throws(()=>exportLibraryCsv({}),TypeError);
});
