import test from 'node:test';
import assert from 'node:assert/strict';
import { install } from '../assets/neon-gateway-20261108c.js';

const REST = 'https://dsosckshigzijnsxmlwh.supabase.co/rest/v1/';
function wrap(fake) { const g = globalThis.fetch; globalThis.fetch = fake; install(fake); const w = globalThis.fetch; globalThis.fetch = g; return w; }

test('logged-in public catalog reads go to Mac mini without the user token', async () => {
  const calls = [];
  const w = wrap(async (u, i) => { calls.push([u, i]); return new Response('[]'); });
  await w(REST + 'game_meta?select=*&limit=1', { headers: { Authorization: 'Bearer user.jwt', apikey: 'k' } });
  assert.match(calls[0][0], /mac-mini/);
  assert.notEqual(calls[0][1].headers.Authorization, 'Bearer user.jwt');
});

test('logged-in search_games RPC goes to Mac mini', async () => {
  const calls = [];
  const w = wrap(async (u) => { calls.push(u); return new Response('[]'); });
  await w(REST + 'rpc/search_games', { method: 'POST', headers: { Authorization: 'Bearer user.jwt' } });
  assert.match(calls[0], /mac-mini/);
});

test('logged-in reads of user tables stay on Supabase', async () => {
  for (const t of ['party_lists?select=*', 'linked_accounts?select=*', 'radar_votes?select=*', 'steam_link_consumed_states?select=*']) {
    const calls = [];
    const w = wrap(async (u) => { calls.push(u); return new Response('[]'); });
    await w(REST + t, { headers: { Authorization: 'Bearer user.jwt' } });
    assert.ok(calls[0].startsWith(REST), t);
  }
});
