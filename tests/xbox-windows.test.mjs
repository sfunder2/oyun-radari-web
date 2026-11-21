import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bundle = readFileSync(new URL('../assets/index-BplIVz6G.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('store picker offers Xbox Windows Store right after Xbox', () => {
  assert.ok(bundle.includes("[`xbox`,`Xbox`],[`xboxpc`,`Xbox Windows Store`],[`epic`"));
});

test('Xbox Windows Store maps to the Xbox market with the pc device filter', () => {
  assert.ok(bundle.includes("v===`xboxpc`?de(`xbox`,`pc`)"));
  assert.ok(bundle.includes("value:I===`xbox`&&Be===`pc`?`xboxpc`:I"));
  // plain Xbox must clear a leftover pc device so both entries stay distinct
  assert.ok(bundle.includes("v===`xbox`?de(`xbox`,Be===`pc`?``:Be)"));
});

test('bundle URL is cache-busted for the new option', () => {
  assert.match(html, /index-BplIVz6G\.js\?v=xboxpc-20261121/);
});

test('v50 migration patches the exact fragments the live search functions use', () => {
  const v45 = readFileSync(new URL('../supabase/schema-v45-arama-siralama.sql', import.meta.url), 'utf8');
  const v50 = readFileSync(new URL('../supabase/schema-v50-xbox-windows.sql', import.meta.url), 'utf8');
  assert.ok(v45.includes("when dev = 'pc' then array['steam','epic','gog']"));
  assert.ok(v45.includes("then dev in ('xbox_series','xbox_one') and exists (select 1 from store_offers so"));
  assert.ok(v50.includes("when dev = ''pc'' then array[''steam'',''epic'',''gog'']"));
  assert.ok(v50.includes("then dev in (''xbox_series'',''xbox_one'') and exists (select 1 from store_offers so"));
});
