import test from 'node:test';
import assert from 'node:assert/strict';
import {userLibraryApi} from '../scripts/library-api.mjs';
import {libraryClient} from '../scripts/library.mjs';

test('uses current user JWT and public anon key for RLS-scoped library operations',async()=>{
 const calls=[];let token='token1';
 const f=async(url,opts)=>{calls.push({url,opts});return new Response('[]',{status:200,headers:{'Content-Type':'application/json'}});};
 const api=userLibraryApi({url:'https://unit.supabase.co',anonKey:'public-anon',getAccessToken:async()=>token,fetchImpl:f});
 const lib=libraryClient(api,'user-a');
 await lib.listPage({limit:2});
 token='token2';await lib.add({platform:'steam',game_id:'620',game_title:'Portal 2'});
 assert.equal(calls[0].opts.headers.Authorization,'Bearer token1');
 assert.equal(calls[1].opts.headers.Authorization,'Bearer token2');
 assert.equal(calls[2].opts.headers.Authorization,'Bearer token2');
 assert.equal(calls[2].opts.headers.apikey,'public-anon');
 assert.equal(calls[2].opts.headers.Prefer,'resolution=ignore-duplicates,return=minimal');
 assert.match(calls[2].url,/\/rest\/v1\/user_game_library\?/);
 assert.equal(JSON.parse(calls[2].opts.body)[0].user_id,'user-a');
});
test('rejects missing sessions, non-TLS remote endpoints, and cross-table operations',async()=>{
 assert.throws(()=>userLibraryApi({url:'http://evil.example',anonKey:'anon',getAccessToken:()=>''}),TypeError);
 const api=userLibraryApi({url:'https://unit.supabase.co',anonKey:'anon',getAccessToken:()=>''});
 await assert.rejects(()=>api.select('user_game_library?select=*'),/Sign in required/);
 await assert.rejects(()=>api.select('linked_accounts?select=*'),TypeError);
 await assert.rejects(()=>api.upsert('other',[],''),TypeError);
});
