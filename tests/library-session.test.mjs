import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAuthenticatedLibrary} from '../scripts/library-session.mjs';
test('mount requires authenticated Supabase interface and a root',async()=>{
 await assert.rejects(()=>mountAuthenticatedLibrary(null,{}),TypeError);
 const auth={getUser:async()=>({data:{user:null}}),getSession:async()=>({data:{session:null}})};
 await assert.rejects(()=>mountAuthenticatedLibrary({replaceChildren(){}},{supabase:{auth},url:'https://x.supabase.co',publishableKey:'public'}),/Sign in required/);
});
