// Deterministic, network-free price parser benchmark for performance regressions.
// Run: node scripts/benchmark-pricing.mjs
import {performance} from 'node:perf_hooks';
import {parseSteamPrice,parseEpicPrice,COUNTRIES} from './regional.mjs';
const us=COUNTRIES.find(c=>c.cc==='US');
const steam={620:{success:true,data:{price_overview:{currency:'USD',initial:1999,final:999}}}};
const epic={data:{Catalog:{searchStore:{elements:[{id:'epic-game',productSlug:'example',price:{totalPrice:{discountPrice:999,originalPrice:1999,currencyCode:'USD',currencyInfo:{decimals:2}}}}]}}}};
function benchmark(name,fn,iterations=20000){
 for(let i=0;i<1000;i++)fn();
 const start=performance.now();
 for(let i=0;i<iterations;i++)fn();
 return{name,iterations,ms:Math.round((performance.now()-start)*100)/100};
}
const result=[
 benchmark('steam parse',()=>parseSteamPrice(steam,'620',us)),
 benchmark('epic parse',()=>parseEpicPrice(epic,'epic-game',us))
];
console.log(JSON.stringify({environment:process.version,benchmarks:result},null,2));
