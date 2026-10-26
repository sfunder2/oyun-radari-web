import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAuthenticatedLibrary,shouldCloseLibrarySession} from '../scripts/library-session.mjs';
test('mount requires authenticated Supabase interface and a root',async()=>{
 await assert.rejects(()=>mountAuthenticatedLibrary(null,{}),TypeError);
 const auth={getUser:async()=>({data:{user:null}}),getSession:async()=>({data:{session:null}})};
 await assert.rejects(()=>mountAuthenticatedLibrary({replaceChildren(){}},{supabase:{auth},url:'https://x.supabase.co',publishableKey:'public'}),/Sign in required/);
});

test('auth lifecycle only closes for sign out or a different user',()=>{
 assert.equal(shouldCloseLibrarySession('SIGNED_OUT',null,'alice'),true);
 assert.equal(shouldCloseLibrarySession('SIGNED_IN',{user:{id:'bob'}},'alice'),true);
 assert.equal(shouldCloseLibrarySession('TOKEN_REFRESHED',{user:{id:'alice'}},'alice'),false);
 assert.equal(shouldCloseLibrarySession('INITIAL_SESSION',null,'alice'),false);
 assert.equal(shouldCloseLibrarySession('SIGNED_IN',{},'alice'),false);
});
