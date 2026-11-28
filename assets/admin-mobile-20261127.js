// Admin paneli mobil iş akışı (27 Kasım 2026): üstte sağlık özeti (alarm, durmuş mağaza/iş, veritabanı doluluğu),
// sekme çubuğu mobilde yapışkan ve parmakla kaydırılabilir (admin-mobile-20261127.css).
// Veri: oturumlu yöneticinin zaten çağırdığı admin_workbench RPC'si; yanıt biçimi farklıysa özet gizlenir, panel bozulmaz.
// Eşikler yönetici paneliyle aynı: mağaza güncelliği <%80 uyarı, <%50 kritik; iş başarısız/kısmi/gecikmiş; veritabanı >=%70 uyarı, >=%85 kritik.
const SUPABASE = 'https://dsosckshigzijnsxmlwh.supabase.co';
const ANON = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';

export const TEXT = {
  tr: { title: 'Sağlık özeti', alarms: 'alarm', stores: 'durmuş mağaza', jobs: 'geciken iş', db: 'Veritabanı', ok: 'Her şey yolunda', refresh: 'Yenile', open: 'Alarmları aç', loading: 'Özet yükleniyor…', failed: 'Özet alınamadı', checked: 'Kontrol' },
  en: { title: 'Health summary', alarms: 'alerts', stores: 'stalled stores', jobs: 'late jobs', db: 'Database', ok: 'All clear', refresh: 'Refresh', open: 'Open alerts', loading: 'Loading summary…', failed: 'Could not load summary', checked: 'Checked' },
};

const pct = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 100) : null);

/** admin_workbench yanıtından özet. Tanımsız alanlar sessizce atlanır. */
export function summarizeAdmin(data, now = Date.now()) {
  const d = data && typeof data === 'object' ? data : {};
  const ops = d.operations || d;
  const stores = Array.isArray(ops.stores) ? ops.stores : [];
  const stalled = [];
  for (const s of stores) {
    const p = pct(s.fresh24h, s.total);
    if (p != null && p < 80) stalled.push({ platform: String(s.platform || '?'), percent: p, level: p < 50 ? 'danger' : 'warn' });
  }
  const lateJobs = [];
  const state = (d.sync && d.sync.state) || {};
  for (const [name, j] of Object.entries(state)) {
    if (!j || typeof j !== 'object') continue;
    const interval = Number(j.intervalMinutes) || 0;
    const at = Date.parse(j.finishedAt);
    const late = interval > 0 && Number.isFinite(at) && now - at > interval * 2.5 * 60000;
    if (j.status === 'failed' || j.status === 'partial' || late) lateJobs.push({ name, level: j.status === 'failed' ? 'danger' : 'warn' });
  }
  const db = d.health && d.health.database;
  const dbPct = db && db.limitBytes > 0 ? Math.round((db.bytes / db.limitBytes) * 100) : null;
  const dbLevel = dbPct == null ? null : dbPct >= 85 ? 'danger' : dbPct >= 70 ? 'warn' : 'ok';
  const alarms = stalled.length + lateJobs.length + (dbLevel && dbLevel !== 'ok' ? 1 : 0);
  const worst = [...stalled, ...lateJobs, ...(dbLevel && dbLevel !== 'ok' ? [{ level: dbLevel }] : [])].some((x) => x.level === 'danger') ? 'danger' : alarms ? 'warn' : 'ok';
  return { alarms, stalled, lateJobs, dbPct, dbLevel, level: worst, known: stores.length > 0 || Object.keys(state).length > 0 || dbPct != null };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'tr');
  let busy = false, last = null;

  function token() {
    try { return JSON.parse(localStorage.getItem('radar-auth') || sessionStorage.getItem('radar-auth') || 'null')?.access_token || null; } catch { return null; }
  }

  async function fetchSummary() {
    const tk = token();
    if (!tk) throw new Error('auth');
    const res = await fetch(SUPABASE + '/rest/v1/rpc/admin_workbench', { method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return summarizeAdmin(await res.json());
  }

  function card(host) {
    let c = host.querySelector(':scope > .admin-health');
    if (!c) {
      c = document.createElement('section');
      c.className = 'admin-health';
      c.setAttribute('aria-label', TEXT[lang()].title);
      (host.querySelector('.admin-head') || host.firstElementChild)?.after(c);
    }
    return c;
  }

  function paint(host, state, err) {
    const t = TEXT[lang()], c = card(host);
    c.className = 'admin-health ' + (state ? 'h-' + state.level : 'h-none');
    c.replaceChildren();
    const h = document.createElement('b'); h.textContent = t.title; c.append(h);
    const body = document.createElement('p'); body.setAttribute('role', 'status');
    if (err) body.textContent = t.failed;
    else if (!state) body.textContent = t.loading;
    else if (!state.known) { c.remove(); return; }
    else if (!state.alarms) body.textContent = t.ok + (state.dbPct != null ? ` · ${t.db} %${state.dbPct}` : '');
    else body.textContent = [state.alarms + ' ' + t.alarms, state.stalled.length ? state.stalled.length + ' ' + t.stores : '', state.lateJobs.length ? state.lateJobs.length + ' ' + t.jobs : '', state.dbPct != null ? t.db + ' %' + state.dbPct : ''].filter(Boolean).join(' · ');
    c.append(body);
    const row = document.createElement('div'); row.className = 'admin-health-actions';
    const alertsTab = host.querySelector('#admin-tab-alerts');
    if (alertsTab && state?.alarms) { const b = document.createElement('button'); b.type = 'button'; b.textContent = t.open; b.addEventListener('click', () => alertsTab.click()); row.append(b); }
    const r = document.createElement('button'); r.type = 'button'; r.textContent = t.refresh; r.addEventListener('click', () => run(host, true)); row.append(r);
    c.append(row);
  }

  async function run(host, force) {
    if (busy || (!force && last && Date.now() - last < 120000)) return;
    busy = true; paint(host, null, false);
    try { paint(host, await fetchSummary(), false); last = Date.now(); } catch (e) { paint(host, null, e.message !== 'auth'); if (e.message === 'auth') host.querySelector('.admin-health')?.remove(); } finally { busy = false; }
  }

  let pending = 0;
  new MutationObserver(() => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      const host = document.querySelector('.admin-workbench');
      if (host && !host.querySelector(':scope > .admin-health')) run(host, false);
    });
  }).observe(document.body, { childList: true, subtree: true });
}
