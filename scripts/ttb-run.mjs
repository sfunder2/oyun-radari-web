// Oyun bitirme süresi toplayıcısı (IGDB). Kullanım: node scripts/ttb-run.mjs
// Gerekenler: SUPABASE_URL, SUPABASE_SERVICE_KEY, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET. Twitch anahtarları yoksa sessizce çıkar.
import {supabase} from './supabase.mjs';
import {igdbClient,runTtb} from './ttb.mjs';
import {appendFile} from 'node:fs/promises';
const {SUPABASE_URL,SUPABASE_SERVICE_KEY,TWITCH_CLIENT_ID,TWITCH_CLIENT_SECRET}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
if(!TWITCH_CLIENT_ID||!TWITCH_CLIENT_SECRET){console.log('TWITCH_CLIENT_ID ve TWITCH_CLIENT_SECRET tanımlı değil; oyun süresi toplanmadı.');process.exit(0)}
const sb=supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY);
try{await sb.select('game_ttb?select=title_key&limit=1')}catch(e){if(/404|PGRST205/.test(e.message)){console.log('supabase/schema-v35-oyun-suresi.sql henüz çalıştırılmamış; oyun süresi atlandı.');process.exit(0)}throw e}
const log=[],say=m=>{console.log(m);log.push(m)};
const query=await igdbClient(TWITCH_CLIENT_ID,TWITCH_CLIENT_SECRET);
await runTtb({sb,query,say,steamLimit:Number(process.env.TTB_STEAM_LIMIT||Infinity),nameLimit:Number(process.env.TTB_NAME_LIMIT||800)});
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'### Oyun süresi (IGDB)\n\n'+log.map(l=>'- '+l).join('\n')+'\n');
