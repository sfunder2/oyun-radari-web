// Mac mini'nin mağaza/toplayıcı tazelik özetini Supabase'in admin önbelleğine yazar (yönetici paneli bunu okur).
// Mac mini üzerinde dakikada/5 dakikada bir çalıştırın (cron/launchd). Gizli anahtarlar yalnızca ortam değişkenlerinden okunur.
// Ortam: MACMINI_URL + MACMINI_SERVICE_KEY (Mac PostgREST, collect_sync_stats'ı çağırır), SUPABASE_URL + SUPABASE_SERVICE_KEY (Supabase).
import {supabase} from './supabase.mjs';
const need=n=>{const v=process.env[n];if(!v){console.error(`${n} tanımlı değil`);process.exit(1);}return v;};
const mac=supabase(need('MACMINI_URL'),need('MACMINI_SERVICE_KEY'));
const sb=supabase(need('SUPABASE_URL'),need('SUPABASE_SERVICE_KEY'));
const stats=await mac.rpc('collect_sync_stats');
if(!stats||!Array.isArray(stats.stores))throw new Error('Mac özeti beklenen biçimde değil');
await sb.rpc('push_admin_snapshot',{p_name:'sync_stats',p_value:stats});
console.log(`Özet yazıldı: ${stats.stores.length} mağaza, ${stats.generatedAt}`);
