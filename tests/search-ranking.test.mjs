// The suggestion client preserves the order returned by the search endpoint.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const bundle = readFileSync(new URL('../assets/index-BplIVz6G.js', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/schema-v45-arama-siralama.sql', import.meta.url), 'utf8');
const undo = readFileSync(new URL('../supabase/schema-v45-arama-siralama-geri-al.sql', import.meta.url), 'utf8');

test('suggestions use the lightweight endpoint and preserve server order', async () => {
  const start = bundle.indexOf('function radarSearchSignal(');
  const end = bundle.indexOf('async function Jr(', start);
  assert.ok(start >= 0 && end > start);
  const items = [{name:'Zelda'}, {name:'Animal Crossing'}];
  const calls = [];
  const fetch = async (url, request) => {
    calls.push([url, JSON.parse(request.body)]);
    return {ok:true, json:async () => items};
  };
  const suggest = new Function('on', 'cr', 'lr', 'Ur', 'fetch', bundle.slice(start,end) + 'return qr;')(
    text => text.trim(), 'https://example.invalid', 'test-key', item => item, fetch
  );
  assert.deepEqual(await suggest('zelda'), {items, total:null});
  assert.deepEqual(calls, [['https://example.invalid/rest/v1/rpc/search_suggestions', {query_text:'zelda'}]]);
});

test('v45 wrappers use the ranked search and a fresh cache prefix; undo restores the old ones', () => {
  assert.match(sql, /'r:'\|\|md5\([\s\S]*public\.search_market_r\(/);
  assert.match(sql, /'r2:'\|\|md5\([\s\S]*public\.search_market_r\(/);
  assert.match(sql, /if q0 = '' then\s+return public\.search_market_d\(/);
  assert.match(undo, /'m:'\|\|md5\([\s\S]*public\.search_market_s\(/);
  assert.match(undo, /'d:'\|\|md5\([\s\S]*public\.search_market_d\(/);
  for (const f of ['search_market_r', 'radar_search_kind', 'radar_num_alt', 'radar_search_expand']) assert.match(undo, new RegExp('drop function if exists public\\.' + f + '\\('));
});
