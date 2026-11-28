import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDsn, scrubText, scrubUrl, buildErrorEvent, buildEnvelope, makeLimiter, parseConsent, canTrack, cleanProps, routeOf, buildAnalyticsEvent } from '../assets/telemetry-20261127.js';
import { isRadarKey, serializeConsent, needsBanner, collectLocalData, buildExport, clearLocalData, confirmMatches } from '../assets/privacy-20261127.js';
import { iconName, labelForIcon, lacksName, nextTabIndex, formatMoney, formatDate, formatRelative, createI18n, normalizeLang } from '../assets/access-20261127.js';
import { isEmail, oauthUrl, otpRequest, handleFor, cooldownLeft, redirectTarget } from '../assets/signin-20261127.js';
import { parseRows, levelFor, summarize } from '../assets/freshness-20261127.js';
import { summarizeAdmin } from '../assets/admin-mobile-20261127.js';
import { buildConfig, renderConfig } from '../scripts/write-config.mjs';

const memStore = (init = {}) => { const m = new Map(Object.entries(init)); return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test('parseDsn builds the envelope url and rejects junk', () => {
  const d = parseDsn('https://abc123@o1.ingest.sentry.io/4507');
  assert.equal(d.key, 'abc123'); assert.equal(d.envelopeUrl, 'https://o1.ingest.sentry.io/api/4507/envelope/');
  assert.equal(parseDsn('http://k@x/1'), null); assert.equal(parseDsn(''), null); assert.equal(parseDsn('https://x.io/12'), null);
});
test('scrub removes emails, jwts and tokens, and url queries', () => {
  assert.ok(!scrubText('mail a.b@c.com token=abc&x=1 eyJhbGciOi.eyJzdWIi.sig').match(/a\.b@c\.com|abc&|eyJhbGciOi/));
  assert.equal(scrubUrl('https://sfunder2.github.io/oyun-radari-web/oyun/1?q=gizli#access_token=zzz'), 'https://sfunder2.github.io/oyun-radari-web/oyun/1');
});
test('error event carries no user and an envelope has three lines', () => {
  const ev = buildErrorEvent(new Error('x@y.com patladı'), { url: 'https://a.b/c?d=1', lang: 'en' }, 1000);
  assert.equal(ev.user, undefined); assert.equal(ev.request.url, 'https://a.b/c'); assert.ok(!JSON.stringify(ev).includes('x@y.com'));
  assert.equal(buildEnvelope('https://k@h/1', ev, 1000).split('\n').length, 3);
});
test('limiter dedupes within the window and caps the total', () => {
  const l = makeLimiter(2, 1000);
  assert.equal(l('a', 0), true); assert.equal(l('a', 10), false); assert.equal(l('b', 20), true); assert.equal(l('c', 5000), false);
});
test('consent parse and gate', () => {
  assert.equal(parseConsent('x'), null);
  const c = parseConsent(serializeConsent({ errors: true }, 5));
  assert.equal(canTrack(c, 'errors'), true); assert.equal(canTrack(c, 'analytics'), false); assert.equal(canTrack(null, 'errors'), false);
});
test('analytics props are filtered and routes stripped to the first segment', () => {
  assert.deepEqual(cleanProps({ ok: 1, 'Bad Key': 1, mail: 'a@b.co', host: 'x.com', t: 'tokenx' }), { ok: 1, host: 'x.com' });
  assert.equal(routeOf('/oyun-radari-web/oyun/12345'), '/oyun'); assert.equal(routeOf('/oyun-radari-web/'), '/');
  assert.equal(buildAnalyticsEvent('Bad Name', {}), null);
  assert.equal(buildAnalyticsEvent('page_view', {}, { pathname: '/oyun-radari-web/ara', lang: 'en', device: 'mobile' }).device, 'mobile');
});
test('privacy: banner only when something is configured and no choice made', () => {
  assert.equal(needsBanner(null, {}), false); assert.equal(needsBanner(null, { sentryDsn: 'x' }), true); assert.equal(needsBanner({ v: 1 }, { sentryDsn: 'x' }), false);
});
test('privacy: export collects radar keys without the session; clear keeps consent', () => {
  const s = memStore({ 'radar-fav': '["a"]', 'radar-auth': '{"access_token":"t"}', 'radar-consent-v1': '{}', other: '1', 'radar-theme': 'oled' });
  const d = collectLocalData(s);
  assert.deepEqual(Object.keys(d).sort(), ['radar-consent-v1', 'radar-fav', 'radar-theme']); assert.deepEqual(d['radar-fav'], ['a']);
  assert.equal(buildExport({ local: d, now: new Date(0) }).exportedAt, '1970-01-01T00:00:00.000Z');
  assert.equal(clearLocalData(s), 3); assert.equal(s.getItem('radar-consent-v1'), '{}'); assert.equal(s.getItem('other'), '1');
  assert.ok(isRadarKey('radar_x')); assert.ok(!isRadarKey('x-radar'));
  assert.equal(confirmMatches('sil', 'SİL'), true); assert.equal(confirmMatches('x', 'SİL'), false);
});
test('access: icon labels, name check, tab keys', () => {
  assert.equal(iconName('lucide lucide-heart size-4'), 'heart'); assert.equal(labelForIcon('lucide-x', 'en'), 'Close'); assert.equal(labelForIcon('foo'), null);
  assert.equal(lacksName({ text: ' ' }), true); assert.equal(lacksName({ ariaLabel: 'a' }), false);
  assert.equal(nextTabIndex('ArrowRight', 2, 3), 0); assert.equal(nextTabIndex('ArrowLeft', 0, 3), 2); assert.equal(nextTabIndex('End', 0, 4), 3); assert.equal(nextTabIndex('a', 0, 4), -1);
});
test('access: locale formatting and i18n fallback', () => {
  assert.match(formatMoney(849, 'TRY', 'tr'), /849/); assert.equal(formatMoney('x'), '');
  assert.match(formatDate('2026-11-27T12:00:00Z', 'en'), /November/); assert.equal(formatDate('nope'), '');
  assert.match(formatRelative(0, 'en', 5 * 60000), /5 minutes ago/); assert.match(formatRelative(0, 'tr', 5 * 60000), /5 dakika önce/);
  const i = createI18n({ tr: { a: 'Merhaba {n}' }, en: { a: 'Hello {n}', b: 'Only en' } });
  assert.equal(i.t('a', { n: 'Ali' }), 'Merhaba Ali'); i.setLang('en'); assert.equal(i.t('a', { n: 'Al' }), 'Hello Al');
  i.register('de', { a: 'Hallo {n}' }); i.setLang('de'); assert.equal(i.lang(), 'de');
  assert.equal(i.t('a', { n: 'X' }, 'de'), 'Hallo X'); assert.equal(i.t('b', {}, 'de'), 'Only en'); assert.equal(i.t('zzz'), 'zzz'); assert.equal(normalizeLang('en-US'), 'en');
});
test('signin helpers', () => {
  assert.ok(isEmail('a@b.co')); assert.ok(!isEmail('a@b'));
  assert.match(oauthUrl('google', 'https://x/y'), /provider=google&redirect_to=https%3A%2F%2Fx%2Fy$/); assert.equal(oauthUrl('github', 'x'), null);
  const r = otpRequest(' a@b.co ', 'https://x/y'); assert.deepEqual(JSON.parse(r.body), { email: 'a@b.co', create_user: true }); assert.match(r.url, /\/auth\/v1\/otp\?redirect_to=/);
  assert.equal(redirectTarget({ origin: 'https://h', pathname: '/p/', hash: '#a' }), 'https://h/p/');
  assert.equal(handleFor({ email: 'ayse.k@x.com' }), 'ayse.k'); assert.match(handleFor({ id: 'ab-cd-ef', email: '@x.com' }), /^oyuncu/);
  assert.equal(cooldownLeft(1000, 1000 + 59000), 1); assert.equal(cooldownLeft(1000, 100000), 0);
});
test('freshness levels and summary', () => {
  const now = Date.parse('2026-11-28T12:00:00Z');
  const rows = [{ key: 'batch', finished: '2026-11-28T11:55:00Z', interval: '5' }, { key: 'market', finished: '2026-11-28T08:00:00Z' }, { key: 'x', finished: 'bad' }];
  assert.equal(parseRows(rows, now).length, 2);
  assert.equal(levelFor(10 * 60000, 5), 'fresh'); assert.equal(levelFor(5 * 3600000, 5), 'ok'); assert.equal(levelFor(20 * 3600000, 5), 'stale');
  const s = summarize(rows, now); assert.equal(s.newestAt, Date.parse('2026-11-28T11:55:00Z')); assert.equal(s.level, 'ok');
  assert.equal(summarize([], now), null); assert.equal(summarize(null, now), null);
});
test('admin summary mirrors panel thresholds and tolerates junk', () => {
  const now = Date.parse('2026-11-28T12:00:00Z');
  const s = summarizeAdmin({ operations: { stores: [{ platform: 'xbox', fresh24h: 40, total: 100 }, { platform: 'steam', fresh24h: 95, total: 100 }] }, sync: { state: { batch: { status: 'failed', finishedAt: '2026-11-28T11:00:00Z', intervalMinutes: 5 }, news: { status: 'ok', finishedAt: '2026-11-28T11:59:00Z', intervalMinutes: 60 } } }, health: { database: { bytes: 90, limitBytes: 100 } } }, now);
  assert.equal(s.stalled.length, 1); assert.equal(s.stalled[0].level, 'danger'); assert.equal(s.lateJobs.length, 1); assert.equal(s.dbLevel, 'danger'); assert.equal(s.alarms, 3); assert.equal(s.level, 'danger');
  assert.equal(summarizeAdmin(null).known, false); assert.equal(summarizeAdmin({ operations: { stores: [{ platform: 'a', fresh24h: 99, total: 100 }] } }).level, 'ok');
});
test('write-config only accepts https urls and escapes', () => {
  const c = buildConfig({ RADAR_SENTRY_DSN: 'http://bad', RADAR_ANALYTICS_ENDPOINT: 'https://x.co/collect', RADAR_GOOGLE_LOGIN: 'true', RADAR_SENTRY_ENV: 'pro</script>d' });
  assert.equal(c.sentryDsn, ''); assert.equal(c.analyticsEndpoint, 'https://x.co/collect'); assert.equal(c.googleLogin, true); assert.equal(c.appleLogin, false); assert.equal(c.magicLink, true); assert.equal(c.sentryEnv, 'proscriptd');
  assert.ok(!renderConfig(c).includes('</script'));
});
