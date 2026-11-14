import {appendFile} from 'node:fs/promises';import {supabase} from './supabase.mjs';import {fetchGrid,fetchConcepts,fetchConceptProducts,fetchEndTime} from './ps-store.mjs';import {runPsBatch} from './run-ps-batch.mjs';
const {SUPABASE_URL,SUPABASE_SERVICE_KEY}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
const result=await runPsBatch({sb:supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY),fetchGrid,fetchConcepts,fetchConceptProducts,fetchEndTime,pagesPerKind:Number(process.env.PS_PAGES_PER_KIND||8),endTimeLimit:Number(process.env.PS_END_TIME_LIMIT||60),sleep:ms=>new Promise(r=>setTimeout(r,Number(process.env.PS_SLEEP_MS||500)))});
console.log(JSON.stringify(result));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`### PlayStation fiyat güncellemesi\n\nDurum: ${result.status}\n\nYenilenen: ${result.refreshed||0}\n\n${(result.errors||[]).map(e=>e.source+': '+e.error).join('\n')}\n`);
process.exitCode=result.status==='failed'?1:0;
