// Genel arama (v45): sunucu sıralı sonuç döndürünce öneri kutusu sırayı yeniden kurmaz.
// Yeni arama yanıtında "fuzzy" alanı vardır; eski yanıtta (v45 öncesi) yoktur ve eski istemci sıralaması sürer.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const bundle = readFileSync(new URL('../assets/index-BplIVz6G.js', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/schema-v45-arama-siralama.sql', import.meta.url), 'utf8');
const undo = readFileSync(new URL('../supabase/schema-v45-arama-siralama-geri-al.sql', import.meta.url), 'utf8');

test('suggestions keep server order when the server ranked them', () => {
  assert.match(bundle, /total:i\.total\|\|0,ranked:`fuzzy`in i\}/);
  assert.match(bundle, /if\(direct\.items\?\.length\)\{if\(direct\.ranked\)return direct;let ranked=radarRankSuggestions/);
});

test('v45 wrappers use the ranked search and a fresh cache prefix; undo restores the old ones', () => {
  assert.match(sql, /'r:'\|\|md5\([\s\S]*public\.search_market_r\(/);
  assert.match(sql, /'r2:'\|\|md5\([\s\S]*public\.search_market_r\(/);
  assert.match(sql, /if q0 = '' then\s+return public\.search_market_d\(/);
  assert.match(undo, /'m:'\|\|md5\([\s\S]*public\.search_market_s\(/);
  assert.match(undo, /'d:'\|\|md5\([\s\S]*public\.search_market_d\(/);
  for (const f of ['search_market_r', 'radar_search_kind', 'radar_num_alt', 'radar_search_expand']) assert.match(undo, new RegExp('drop function if exists public\\.' + f + '\\('));
});
