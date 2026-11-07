// Neon Function içinden veritabanına bağımlılıksız bağlanır: Neon'un HTTP SQL uç noktası (fetch).
// Çıktı scripts/neon-db.mjs içindeki neonDb({run}) ile birlikte kullanılır.
const TYPES = { 20: Number, 1700: Number };
export function httpRun({ host, connectionString, timeoutMs = 25000 }) {
  return async (text, params = []) => {
    const r = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': connectionString, 'Neon-Array-Mode': 'true' },
      body: JSON.stringify({ query: text, params: params.map(p => (p === null || p === undefined ? null : typeof p === 'object' ? JSON.stringify(p) : String(p))) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(body.message || `HTTP ${r.status}`); e.code = body.code; throw e; }
    const names = body.fields.map(f => f.name);
    return body.rows.map(row => !Array.isArray(row) ? row : Object.fromEntries(row.map((v, i) => [names[i], v != null && TYPES[body.fields[i].dataTypeID] ? TYPES[body.fields[i].dataTypeID](v) : v])));
  };
}
