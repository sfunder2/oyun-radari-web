// Benzer oyun toplayıcısı (IGDB). Kullanım: node scripts/similar-run.mjs
// Gerekenler: SUPABASE_URL, SUPABASE_SERVICE_KEY, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET (oyun süresiyle aynı anahtarlar).
// Twitch anahtarları yoksa ya da v35/v38 SQL'i çalıştırılmamışsa sessizce çıkar.
import {supabase} from './supabase.mjs';
import {igdbClient} from './ttb.mjs';
import {runSimilar} from './similar.mjs';
import {appendFile} from 'node:fs/promises';
const {SUPABASE_URL,SUPABASE_SERVICE_KEY,TWITCH_CLIENT_ID,TWITCH_CLIENT_SECRET}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
if(!TWITCH_CLIENT_ID||!TWITCH_CLIENT_SECRET){console.log('TWITCH_CLIENT_ID ve TWITCH_CLIENT_SECRET tanımlı değil; benzer oyunlar toplanmadı.');process.exit(0)}
const sb=supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY);
for(const [table,file] of [['game_ttb','schema-v35-oyun-suresi.sql'],['game_similar','schema-v38-benzer-oyunlar.sql']]){
 try{await sb.select(table+'?select=title_key&limit=1')}catch(e){if(/404|PGRST205/.test(e.message)){console.log(`supabase/${file} henüz çalıştırılmamış; benzer oyunlar atlandı.`);process.exit(0)}throw e}
}
const log=[],say=m=>{console.log(m);log.push(m)};
const query=await igdbClient(TWITCH_CLIENT_ID.trim(),TWITCH_CLIENT_SECRET.trim());
await runSimilar({sb,query,say,limit:Number(process.env.SIMILAR_LIMIT||Infinity)});
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'### Benzer oyunlar (IGDB)\n\n'+log.map(l=>'- '+l).join('\n')+'\n');
