import {appendFile} from 'node:fs/promises';
import {supabase} from './supabase.mjs';
import {runMarketBatch} from './market-batch.mjs';
const {SUPABASE_URL,SUPABASE_SERVICE_KEY}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
const r=await runMarketBatch({sb:supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY),pages:Number(process.env.MARKET_PAGES||3)});
console.log(JSON.stringify(r));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`### Market katalogları\n\n${Object.entries(r.stats).map(([k,v])=>`- ${k}: ${v} kayıt`).join('\n')}\n${r.errors.map(e=>`- Hata: ${e.source}: ${e.error}`).join('\n')}\n`);
process.exitCode=r.status==='failed'?1:0;
