import {supabase} from './supabase.mjs';
import {runGenreSweep} from './ps-genres.mjs';
// Elle çalıştırma: SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/genres-run.mjs  (otomatik tur Supabase Cron'da, schema-v19-turler.sql)
const {SUPABASE_URL,SUPABASE_SERVICE_KEY}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
await runGenreSweep({sb:supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY),deadlineMs:Number(process.env.GENRE_DEADLINE_MS||600000),maxPages:1000,restMs:0});
