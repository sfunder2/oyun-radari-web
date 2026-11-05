import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSmartSearch} from '../assets/smart-search-20261105.js';

test('recognizes device, cooperative play and localized budget', () => {
  assert.deepEqual(parseSmartSearch("PS5 iki kişilik 1.250,50 TL'nin altı"), {
    query:'', maxPrice:'1250.5', platform:'ps5', gmode:'coop', smart:true,
  });
});
test('recognizes shop, language, genre and sale without swallowing a game title', () => {
  assert.deepEqual(parseSmartSearch('Steam Türkçe korku'), {query:'', market:'steam', turkish:true, tag:'Horror', smart:true});
  assert.deepEqual(parseSmartSearch('Elden Ring indirimde mi?'), {query:'Elden Ring', deals:true, smart:true});
  assert.deepEqual(parseSmartSearch("Steam'de RPG oyunları"), {query:'', market:'steam', genre:'RPG', smart:true});
  assert.deepEqual(parseSmartSearch('SteamWorld Dig'), {query:'SteamWorld Dig'});
  assert.deepEqual(parseSmartSearch('RPG Maker MV'), {query:'RPG Maker MV'});
  assert.deepEqual(parseSmartSearch('"Switch" indirimde'), {query:'Switch', deals:true, smart:true});
});
