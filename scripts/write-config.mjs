// assets/radar-config.js dosyasını ortam değişkenlerinden üretir (GitHub Actions "Variables").
// RADAR_SENTRY_DSN, RADAR_SENTRY_ENV, RADAR_ANALYTICS_ENDPOINT, RADAR_GOOGLE_LOGIN, RADAR_APPLE_LOGIN, RADAR_MAGIC_LINK, GITHUB_SHA
import { writeFileSync } from 'node:fs';

export function buildConfig(env = process.env) {
  const flag = (v, d) => (v == null || v === '' ? d : /^(1|true|yes)$/i.test(String(v)));
  const url = (v) => { try { const u = new URL(String(v || '')); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  return {
    sentryDsn: url(env.RADAR_SENTRY_DSN),
    sentryEnv: String(env.RADAR_SENTRY_ENV || 'production').replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || 'production',
    analyticsEndpoint: url(env.RADAR_ANALYTICS_ENDPOINT),
    googleLogin: flag(env.RADAR_GOOGLE_LOGIN, false),
    appleLogin: flag(env.RADAR_APPLE_LOGIN, false),
    magicLink: flag(env.RADAR_MAGIC_LINK, true),
    release: String(env.GITHUB_SHA || '').slice(0, 12),
  };
}

export function renderConfig(cfg) {
  return '// Otomatik üretildi (scripts/write-config.mjs).\nwindow.RADAR_CONFIG = Object.assign(' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ', window.RADAR_CONFIG || {});\n';
}

if (process.argv[1] && process.argv[1].endsWith('write-config.mjs')) {
  writeFileSync(new URL('../assets/radar-config.js', import.meta.url), renderConfig(buildConfig()));
}
