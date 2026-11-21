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
