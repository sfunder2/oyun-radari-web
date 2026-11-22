// Kullanım: node scripts/digest-run.mjs [--weekly] [--push] [--dry]
//  --weekly  haftalık e-posta özeti (günde bir çalıştırmak yeter; 6,5 günden sık göndermez)
//  --push    telefona bildirim (30 dakikada bir çalıştırmak uygundur; aynı olayı iki kez göndermez)
//  --dry     hiçbir şey göndermez ve kayıt yazmaz, yalnız ne gideceğini yazar
// Gerekli: SUPABASE_URL, SUPABASE_SERVICE_KEY. E-posta için RESEND_API_KEY ve DIGEST_FROM (yoksa özet atlanır, uyarı yazılır).
import { supabase } from './supabase.mjs';
import { runWeekly, runPush, resendMailer, ntfySender } from './digest.mjs';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, DIGEST_FROM } = process.env;
const args = new Set(process.argv.slice(2));
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('SUPABASE_URL ve SUPABASE_SERVICE_KEY gerekli'); process.exit(1); }
if (!args.has('--weekly') && !args.has('--push')) { console.error('--weekly ve/veya --push ver'); process.exit(1); }
const sb = supabase(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const get = u => fetch(u, { signal: AbortSignal.timeout(15000) }).then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))));
const log = m => console.log(m);
const dry = args.has('--dry');
if (args.has('--weekly')) {
  if (!RESEND_API_KEY && !dry) console.log('RESEND_API_KEY yok: haftalık özet atlandı (deneme için --dry kullan).');
  else {
    const mail = RESEND_API_KEY ? resendMailer({ key: RESEND_API_KEY, from: DIGEST_FROM || 'Oyun Radarı <onboarding@resend.dev>' }) : async () => {};
    console.log('Haftalık özet:', JSON.stringify(await runWeekly({ sb, get, mail, log, dry })));
  }
}
if (args.has('--push')) console.log('Telefon bildirimi:', JSON.stringify(await runPush({ sb, get, ntfy: ntfySender(), log, dry })));
