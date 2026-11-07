import {runMarketBatch} from '../../../scripts/market-batch.mjs';
import {runPsBatch} from '../../../scripts/run-ps-batch.mjs';
import {fetchGrid,fetchConcepts,fetchConceptProducts,fetchEndTime} from '../../../scripts/ps-store.mjs';
import {neonDb} from '../../../scripts/neon-db.mjs';
import {httpRun} from '../../lib/neon-http.mjs';
import {runEnrichBatch,loadOcIndex} from '../../../scripts/enrich-batch.mjs';
import {runGenreSweep} from '../../../scripts/ps-genres.mjs';
// GitHub Actions'ın */5 cron'u geç ya da hiç çalışabildiği için fiyat toplayıcıları Neon'un kendi zamanlayıcısıyla çalışır.
// Function Trigger (cron) /job/<ad> yoluna POST eder: ps-prices (PlayStation fiyatları) ve markets (Steam, Xbox, Switch, Epic, GOG).
// Ortam: DATABASE_HOST, DATABASE_URL (radar_jobs yetkili ayrı rol). Aynı işin üst üste binmesini bellekte tek kilit önler.
const sb=()=>neonDb('',{retries:3,run:httpRun({host:process.env.DATABASE_HOST,connectionString:process.env.DATABASE_URL})});
const JOBS={
  'ps-prices':()=>runPsBatch({sb:sb(),fetchGrid,fetchConcepts,fetchConceptProducts,fetchEndTime}),
  'enrich':async()=>{const d=sb();const r=await runEnrichBatch({sb:d,batch:60,say:()=>{},deadlineMs:150000,ocIndex:await loadOcIndex(d)});return{status:r.errors?'partial':'ok',stats:r,errors:[]};},
  'genres':async()=>{const r=await runGenreSweep({sb:sb(),deadlineMs:150000,maxPages:1000,restMs:0});return{status:'ok',stats:r&&typeof r==='object'?r:{done:true},errors:[]};},
  'markets':()=>{const n=3;return runMarketBatch({sb:sb(),pages:{steam:60,xbox:100,switch:25,epic:n,gog:40,itad:0},deadlineMs:180000,say:()=>{}});},
};
const running=new Set();
export default{
  async fetch(request){
    if(!request.headers.get('x-neon-trigger-invocation-id'))return Response.json({error:'Unauthorized'},{status:401});
    const name=new URL(request.url).pathname.replace(/^\/job\//,''),job=request.method==='POST'&&JOBS[name];
    if(!job)return Response.json({error:'Unknown job'},{status:404});
    if(running.has(name))return Response.json({ok:true,job:name,skipped:'already running'});
    running.add(name);const started=Date.now();
    try{
      const r=await job();
      console.log(JSON.stringify({job:name,ok:true,status:r.status,stats:r.stats||r.refreshed,errors:(r.errors||[]).slice(0,3),ms:Date.now()-started}));
      return Response.json({ok:true,job:name,status:r.status});
    }catch(e){
      console.error(JSON.stringify({job:name,ok:false,error:String(e.message).slice(0,300),ms:Date.now()-started}));
      return Response.json({ok:false,job:name,error:'job failed'});
    }finally{running.delete(name);}
  },
};
