// Metacritic puanı tamamlayıcısı (scripts/metacritic.mjs). Kullanım: node scripts/metacritic-run.mjs
// Ortam: METACRITIC_WIKIPEDIA_LIMIT (varsayılan 400 oyun), SUPABASE_URL + SUPABASE_SERVICE_KEY ya da NEON_DATABASE_URL. METACRITIC_STEAM_LIMIT (varsayılan 300), METACRITIC_MINUTES (varsayılan 8),
// METACRITIC_WIKIDATA=1 Wikidata'yı haftalık süreyi beklemeden yeniden okur.
import {supabase} from './supabase.mjs';
import {runMetacritic} from './metacritic.mjs';
import {appendFile} from 'node:fs/promises';
const {SUPABASE_URL,SUPABASE_SERVICE_KEY}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
const sb=supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY);
const log=[],say=m=>{console.log(m);log.push(m)};
await runMetacritic({sb,say,steamLimit:Number(process.env.METACRITIC_STEAM_LIMIT??300),deadlineMs:Number(process.env.METACRITIC_MINUTES||8)*60e3,wikipediaLimit:Number(process.env.METACRITIC_WIKIPEDIA_LIMIT??400),forceWikidata:process.env.METACRITIC_WIKIDATA==='1'});
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'### Metacritic\n\n'+log.map(l=>'- '+l).join('\n')+'\n');
process.exit(0);
