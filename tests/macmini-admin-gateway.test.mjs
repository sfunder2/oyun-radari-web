import test from 'node:test';
import assert from 'node:assert/strict';
import { install } from '../assets/neon-gateway-20261108c.js';

const REST = 'https://dsosckshigzijnsxmlwh.supabase.co/rest/v1/';

test('admin_sync_stats goes to Mac mini with anon key, never Supabase', async () => {
  const calls = [];
  const fake = async (u, i) => { calls.push([u, i]); return new Response('{"ok":1}', { status: 200 }); };
  const g = globalThis.fetch; globalThis.fetch = fake; install(fake); const w = globalThis.fetch; globalThis.fetch = g;
  const r = await w(REST + 'rpc/admin_sync_stats', { method: 'POST', headers: { Authorization: 'Bearer user.jwt.token', apikey: 'x' } });
  assert.equal(r.status, 200);
  assert.match(calls[0][0], /arif-mac-mini\.tail34cd8a\.ts\.net\/rest\/v1\/rpc\/admin_sync_stats/);
  assert.notEqual(calls[0][1].headers.Authorization, 'Bearer user.jwt.token');
  assert.equal(calls[0][1].headers.apikey, undefined);
});

test('admin_sync_stats does not fall back to frozen Supabase', async () => {
  const calls = [];
  const fake = async (u) => { calls.push(u); throw new Error('down'); };
  const g = globalThis.fetch; globalThis.fetch = fake; install(fake); const w = globalThis.fetch; globalThis.fetch = g;
  const r = await w(REST + 'rpc/admin_sync_stats', { method: 'POST', headers: { Authorization: 'Bearer u' } });
  assert.equal(r.status, 503);
  assert.ok(calls.every(u => u.includes('mac-mini')));
});

test('other admin RPCs stay on Supabase', async () => {
  const calls = [];
  const fake = async (u) => { calls.push(u); return new Response('{}'); };
  const g = globalThis.fetch; globalThis.fetch = fake; install(fake); const w = globalThis.fetch; globalThis.fetch = g;
  await w(REST + 'rpc/admin_site_health', { method: 'POST', headers: { Authorization: 'Bearer u' } });
  assert.ok(calls[0].startsWith(REST));
});

test('admin_operational_health also goes to Mac mini', async () => {
  const calls = [];
  const fake = async (u) => { calls.push(u); return new Response('{}'); };
  const g = globalThis.fetch; globalThis.fetch = fake; install(fake); const w = globalThis.fetch; globalThis.fetch = g;
  await w(REST + 'rpc/admin_operational_health', { method: 'POST', headers: { Authorization: 'Bearer u' } });
  assert.match(calls[0], /mac-mini/);
});
