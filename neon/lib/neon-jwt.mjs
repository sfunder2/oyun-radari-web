// Neon Auth JWT doğrulaması (JWKS, WebCrypto). Dönen değer kullanıcı kimliği (sub) ya da null.
let jwks = { at: 0, keys: [] };
const b64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0));
async function keys(url, force) {
  if (!force && Date.now() - jwks.at < 10 * 60000 && jwks.keys.length) return jwks.keys;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('jwks ' + r.status);
  jwks = { at: Date.now(), keys: (await r.json()).keys || [] };
  return jwks.keys;
}
export async function verifyNeonJwt(token, { jwksUrl }) {
  const [h, p, s] = String(token || '').split('.');
  if (!h || !p || !s) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64(h)));
    const list = await keys(jwksUrl, false);
    let jwk = list.find(k => k.kid === header.kid) || (await keys(jwksUrl, true)).find(k => k.kid === header.kid);
    if (!jwk) return null;
    const algo = header.alg === 'EdDSA' ? { name: 'Ed25519' } : header.alg === 'RS256' ? { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } : header.alg === 'ES256' ? { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' } : null;
    if (!algo) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, algo.name === 'ECDSA' ? { name: 'ECDSA', namedCurve: 'P-256' } : algo, false, ['verify']);
    const ok = await crypto.subtle.verify(algo, key, b64(s), new TextEncoder().encode(h + '.' + p));
    if (!ok) return null;
    const c = JSON.parse(new TextDecoder().decode(b64(p)));
    if (!c.exp || c.exp * 1000 < Date.now() || !c.sub) return null;
    return String(c.sub);
  } catch { return null; }
}
