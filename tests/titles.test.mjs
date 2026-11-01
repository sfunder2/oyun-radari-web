import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {titleKey} from '../scripts/titles.mjs';
import {titleKeySql} from '../scripts/title-key-sql.mjs';

test('GTA V: PlayStation, Xbox, Steam/Epic ve PC kayıtları aynı anahtarda birleşir',()=>{
 const keys=['Grand Theft Auto V (PS4™ ve PS5™)','Grand Theft Auto V (Xbox One & Xbox Series X|S)','Grand Theft Auto V Enhanced','Grand Theft Auto V Enhanced (PC)'].map(titleKey);
 assert.deepEqual(new Set(keys),new Set(['grand theft auto v']));
 assert.equal(titleKey('Grand Theft Auto Online (PlayStation®5)'),titleKey('Grand Theft Auto Online'));
});

test('platform etiketleri atılır',()=>{
 for(const [name,key] of [
  ['Forza Horizon 5 (Windows)','forza horizon 5'],['Halo (Xbox One+Xbox Series+Windows)','halo'],['Synchro Hedgehogs (for Windows 10)','synchro hedgehogs'],
  ['Dreamwalker: Never Fall Asleep (Xbox One Version)','dreamwalker never fall asleep'],['Swapshot (Xbox & PC)','swapshot'],
  ['HOT WHEELS UNLEASHED™ - Xbox Series X|S','hot wheels unleashed'],['Goat Simulator 3 – Starter Edition: Windows Edition','goat simulator 3 starter'],
  ['The Callisto Protocol™ for Xbox One','the callisto protocol'],['MLB® The Show™ 22 Xbox One','mlb the show 22'],['Pixel Gun 3D: PC Edition','pixel gun 3d'],
  ['Roguebook - Deluxe Edition Xbox Series X|S & Xbox One','roguebook deluxe'],['Grounded 2 (Game Preview)','grounded 2'],['PAO PAO (Oyun Ön İzleme)','pao pao'],
  ['Oyun - PS4 & PS5','oyun'],['Hades (PS4™ ve PS5™)','hades'],
 ])assert.equal(titleKey(name),key,name);
});

test('farklı ürünler ayrı kalır',()=>{
 assert.notEqual(titleKey('Grand Theft Auto V'),titleKey('Grand Theft Auto V ve Great White Shark Kartı Paketi'));
 assert.notEqual(titleKey('Grand Theft Auto V'),titleKey('Grand Theft Auto VI'));
 assert.notEqual(titleKey('Control'),titleKey('Control Ultimate Edition - Xbox Series X|S'));
 assert.equal(titleKey('Game - Xbox Series X|S Upgrade Pack'),'game xbox series x s upgrade pack');
 assert.equal(titleKey('Foo - PlayStation Plus'),'foo playstation plus');
 assert.equal(titleKey('Nintendo Switch Sports'),'nintendo switch sports');
 assert.equal(titleKey('Enhanced'),'enhanced');
});

test('veritabanı göçü titles.mjs ile aynı radar_title_key fonksiyonunu içerir',()=>{
 const sql=readFileSync(new URL('../supabase/schema-v44-oyun-anahtari.sql',import.meta.url),'utf8');
 assert.ok(sql.includes(titleKeySql()),'node scripts/title-key-sql.mjs çıktısını schema-v44 dosyasına yeniden yapıştır');
 assert.ok(!titleKeySql().includes(String.raw`\b`),'Postgres kelime sınırı \\y olmalı');
});
