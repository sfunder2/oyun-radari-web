import {appendFile} from 'node:fs/promises';
import {supabase} from './supabase.mjs';
import {runMarketBatch} from './market-batch.mjs';
const {SUPABASE_URL,SUPABASE_SERVICE_KEY}=process.env;
if(!SUPABASE_URL||!SUPABASE_SERVICE_KEY){console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli');process.exit(2)}
// MARKET_ONLY=itad: yalnız ITAD fiyatları (ayrı imleç kaydı: market_itad). ITAD_API_KEY yoksa ITAD işi atlanır.
const only=process.env.MARKET_ONLY?process.env.MARKET_ONLY.split(','):null,itadOnly=only?.length===1&&only[0]==='itad';
if(itadOnly&&!process.env.ITAD_API_KEY){console.error('ITAD_API_KEY gerekli');process.exit(2)}
const r=await runMarketBatch({sb:supabase(SUPABASE_URL,SUPABASE_SERVICE_KEY),pages:(n=>({steam:n,xbox:n,switch:Number(process.env.MARKET_SWITCH_PAGES||25),epic:n,gog:n,itad:n}))(Number(process.env.MARKET_PAGES||3)),itadKey:process.env.ITAD_API_KEY||'',only,stateKey:itadOnly?'market_itad':'market',deadlineMs:Number(process.env.MARKET_DEADLINE_MS||0)});
console.log(JSON.stringify(r));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`### Market katalogları\n\n${Object.entries(r.stats).map(([k,v])=>`- ${k}: ${v} kayıt`).join('\n')}\n${r.errors.map(e=>`- Hata: ${e.source}: ${e.error}`).join('\n')}\n`);
process.exitCode=r.status==='failed'?1:0;
