// Oyun modu ve tema toplayıcısı (IGDB). Kullanım: node scripts/playmodes-run.mjs
// Gerekenler: SUPABASE_URL, SUPABASE_SERVICE_KEY, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET (oyun süresiyle aynı anahtarlar). Yoksa sessizce çıkar.
import {supabase} from './supabase.mjs';
import {igdbClient,runPlayModes} from './playmodes.mjs';
import {appendFile} from 'node:fs/promises';
const {SUPABASE_URL,SUPABASE_SERVICE_KEY,TWITCH_CLIENT_ID,TWITCH_CLIENT_SECRET}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
if(!TWITCH_CLIENT_ID||!TWITCH_CLIENT_SECRET){console.log('TWITCH_CLIENT_ID ve TWITCH_CLIENT_SECRET tanımlı değil; oyun modları toplanmadı.');process.exit(0)}
const sb=supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY);
try{await sb.select('game_modes?select=title_key&limit=1')}catch(e){if(/404|PGRST205/.test(e.message)){console.log('supabase/schema-v41-oyun-modu-tema.sql henüz çalıştırılmamış; oyun modları atlandı.');process.exit(0)}throw e}
const log=[],say=m=>{console.log(m);log.push(m)};
const query=await igdbClient(TWITCH_CLIENT_ID.trim(),TWITCH_CLIENT_SECRET.trim());
await runPlayModes({sb,query,say,limit:Number(process.env.PLAYMODES_LIMIT||Infinity)});
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'### Oyun modu ve tema (IGDB)\n\n'+log.map(l=>'- '+l).join('\n')+'\n');
