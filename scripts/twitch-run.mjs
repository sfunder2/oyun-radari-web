// Twitch'te en çok izlenen oyunlar toplayıcısı. Kullanım: node scripts/twitch-run.mjs
// Gerekenler: SUPABASE_URL, SUPABASE_SERVICE_KEY, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET (IGDB toplayıcısıyla aynı). Twitch anahtarları yoksa sessizce çıkar.
import {supabase} from './supabase.mjs';
import {helixClient,runTwitch} from './twitch.mjs';
import {appendFile} from 'node:fs/promises';
const {SUPABASE_URL,SUPABASE_SERVICE_KEY,TWITCH_CLIENT_ID,TWITCH_CLIENT_SECRET}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
if(!TWITCH_CLIENT_ID||!TWITCH_CLIENT_SECRET){console.log('TWITCH_CLIENT_ID ve TWITCH_CLIENT_SECRET tanımlı değil; Twitch izleyicileri toplanmadı.');process.exit(0)}
const sb=supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY);
try{await sb.select('twitch_top_games?select=twitch_id&limit=1')}catch(e){if(/404|PGRST205/.test(e.message)){console.log('supabase/schema-v37-twitch-izlenenler.sql henüz çalıştırılmamış; Twitch izleyicileri atlandı.');process.exit(0)}throw e}
const log=[],say=m=>{console.log(m);log.push(m)};
const get=await helixClient(TWITCH_CLIENT_ID.trim(),TWITCH_CLIENT_SECRET.trim());
await runTwitch({sb,get,say,limit:Number(process.env.TWITCH_TOP_LIMIT||40)});
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'### Twitch: en çok izlenenler\n\n'+log.map(l=>'- '+l).join('\n')+'\n');
