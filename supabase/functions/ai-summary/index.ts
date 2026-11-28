// Oyun ayrıntısındaki "AI özeti: kime uygun?" kartı (assets/modern-20261128.js). Claude API'sini çağırır.
// Kurulum: `supabase secrets set ANTHROPIC_API_KEY=...` ve `supabase functions deploy ai-summary --no-verify-jwt`.
// Anahtar yoksa 503 döner; site bu durumda kartı 6 saat boyunca gizler. Tarayıcıya anahtar ASLA gitmez.
// Gönderilen veri yalnız oyunun adı, etiketleri ve ayrıntı sayfasındaki tanıtım metnidir; kişisel veri alınmaz ve saklanmaz.
// Sınırlar: IP başına saatte 10 istek, günde en çok AI_DAILY_CAP (varsayılan 500) üretim; sonuçlar 24 saat bellekte durur.
const ALLOWED = new Set(['https://sfunder2.github.io', 'https://oyun-radari-tr.gokhangozcu.chatgpt.site', 'http://localhost:8124']);
const MODEL = Deno.env.get('AI_MODEL') || 'claude-haiku-5-5';
const DAILY_CAP = Number(Deno.env.get('AI_DAILY_CAP') || 500);
const HOUR = 3600000;
const cache = new Map<string, { at: number; data: unknown }>();
const hits = new Map<string, number[]>();
let day = '', used = 0;

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED.has(origin) ? origin : 'https://sfunder2.github.io',
    'Access-Control-Allow-Headers': 'content-type,authorization,apikey',
    'Vary': 'Origin',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return Response.json({ error: 'Yalnız POST desteklenir' }, { status: 405, headers });
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return Response.json({ error: 'not_configured' }, { status: 503, headers });

  const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < HOUR);
  if (recent.length >= 10) return Response.json({ error: 'Çok fazla istek; biraz sonra dene' }, { status: 429, headers });
  hits.set(ip, [...recent, now]);
  if (hits.size > 5000) hits.clear();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: 'Geçersiz istek' }, { status: 400, headers }); }
  const title = clean(body.title, 120);
  const about = clean(body.about, 1500);
  const tags = Array.isArray(body.tags) ? body.tags.slice(0, 8).map(t => clean(t, 30)).filter(Boolean) : [];
  const locale = body.locale === 'en' ? 'en' : 'tr';
  if (!title) return Response.json({ error: 'Oyun adı gerekli' }, { status: 400, headers });

  const ck = locale + '|' + title.toLocaleLowerCase('tr');
  const old = cache.get(ck);
  if (old && now - old.at < 24 * HOUR) return Response.json(old.data, { headers });

  const today = new Date().toISOString().slice(0, 10);
  if (day !== today) { day = today; used = 0; }
  if (used >= DAILY_CAP) return Response.json({ error: 'Günlük sınır doldu' }, { status: 429, headers });
  used++;

  const system = (locale === 'en' ? 'Reply in English.' : 'Türkçe yanıtla.') +
    ' You write a short, neutral "who is this game for" note for a price-tracking site. Use ONLY the facts given plus well-known general knowledge about the title; if you are unsure, say so in the summary instead of inventing details. Never mention prices, discounts or scores. ' +
    'Return ONLY JSON: {"summary": string (max 2 sentences), "good_for": string[] (2-4 items), "not_for": string[] (1-3 items)}.';
  const user = `Title: ${title}\nTags: ${tags.join(', ') || '-'}\nStore description: ${about || '-'}`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages: [{ role: 'user', content: user }] }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) { console.error('AI özeti:', res.status); return Response.json({ error: 'Özet şu anda üretilemedi' }, { status: 503, headers }); }
    const out = await res.json();
    const text = String(out?.content?.[0]?.text || '');
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const list = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n).map(x => clean(x, 160)).filter(Boolean) : []);
    const data = { summary: clean(json.summary, 400), good_for: list(json.good_for, 4), not_for: list(json.not_for, 3) };
    if (!data.summary) throw new Error('boş özet');
    cache.set(ck, { at: now, data });
    if (cache.size > 800) cache.delete(cache.keys().next().value!);
    return Response.json(data, { headers });
  } catch (e) {
    console.error('AI özeti:', (e as Error).message);
    return Response.json({ error: 'Özet şu anda üretilemedi' }, { status: 503, headers });
  }
});
