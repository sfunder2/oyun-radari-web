// Oyun Radarı performans katmanı: (1) Core Web Vitals ölçümü + bütçe, (2) zayıf bağlantıda veri tasarrufu modu.
// Klasik betik (modül değil), defer ile yüklenir. Hiçbir veri sunucuya gönderilmez; ölçümler yalnızca bu cihazda
// window.__radarVitals ve sessionStorage('radar-vitals') içinde durur. ?perf=1 ile ekranda küçük bir rozet görünür.
(function () {
  'use strict';
  var root = document.documentElement;
  var en = root.lang === 'en';
  var T = function (tr, e) { return en ? e : tr; };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- Bütçeler (Google "iyi" eşikleri; FCP için 1.8 sn) ---------- */
  var BUDGET = { LCP: 2500, INP: 200, CLS: 0.1, FCP: 1800, TTFB: 800 };
  var v = { LCP: null, INP: null, CLS: 0, FCP: null, TTFB: null };
  window.__radarVitals = { values: v, budget: BUDGET, over: function () {
    return Object.keys(BUDGET).filter(function (k) { return v[k] !== null && v[k] > BUDGET[k]; });
  } };
  function observe(type, cb, opts) {
    try {
      var po = new PerformanceObserver(function (l) { l.getEntries().forEach(cb); });
      po.observe(Object.assign({ type: type, buffered: true }, opts || {}));
    } catch (e) { /* tarayıcı desteklemiyor */ }
  }
  try { var nav = performance.getEntriesByType('navigation')[0]; if (nav) v.TTFB = Math.round(nav.responseStart); } catch (e) {}
  observe('paint', function (e) { if (e.name === 'first-contentful-paint') v.FCP = Math.round(e.startTime); });
  observe('largest-contentful-paint', function (e) { v.LCP = Math.round(e.startTime); });
  // CLS: 1 sn aralıklı, en çok 5 sn'lik "oturum penceresi" (web-vitals ile aynı tanım).
  var sess = 0, first = 0, last = 0;
  observe('layout-shift', function (e) {
    if (e.hadRecentInput) return;
    if (sess && e.startTime - last < 1000 && e.startTime - first < 5000) sess += e.value;
    else { sess = e.value; first = e.startTime; }
    last = e.startTime;
    if (sess > v.CLS) v.CLS = Math.round(sess * 1000) / 1000;
  });
  // INP: etkileşimlerin en yavaşı (çok az etkileşimde p98 ≈ en yavaş).
  var inter = {};
  observe('event', function (e) {
    if (!e.interactionId) return;
    var d = inter[e.interactionId];
    if (!d || e.duration > d) inter[e.interactionId] = e.duration;
    var all = Object.keys(inter).map(function (k) { return inter[k]; }).sort(function (a, b) { return b - a; });
    v.INP = Math.round(all[Math.min(all.length - 1, Math.floor(all.length / 50))]);
  }, { durationThreshold: 40 });

  var reported = false;
  function report() {
    if (reported && !window.__radarVitalsForce) return;
    reported = true;
    try { sessionStorage.setItem('radar-vitals', JSON.stringify({ t: Date.now(), path: location.pathname, v: v })); } catch (e) {}
    var over = window.__radarVitals.over();
    if (over.length && typeof console !== 'undefined') console.warn('[perf-budget] bütçe aşıldı:', over.map(function (k) { return k + '=' + v[k] + ' (>' + BUDGET[k] + ')'; }).join(', '));
    paint();
  }
  addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { reported = false; report(); } });
  addEventListener('pagehide', function () { reported = false; report(); });

  var badge;
  function paint() {
    if (!/[?&]perf=1(&|$)/.test(location.search)) return;
    if (!badge) { badge = document.createElement('pre'); badge.className = 'perf-badge'; document.body.appendChild(badge); }
    badge.textContent = Object.keys(v).map(function (k) { return k + ' ' + (v[k] === null ? '–' : v[k]) + (v[k] !== null && v[k] > BUDGET[k] ? ' ✗' : ' ✓'); }).join('\n');
  }
  if (/[?&]perf=1(&|$)/.test(location.search)) { addEventListener('load', function () { setInterval(paint, 1000); }); }

  /* ---------- Veri tasarrufu modu ---------- */
  // Açılış: kullanıcı seçimi (radar-lite=1/0) her şeyden üstündür; yoksa tarayıcının "Veri Tasarrufu"
  // ayarı ya da 2G/yavaş-3G ağ bilgisi. ?lite=1 / ?lite=0 seçimi kaydeder.
  try { var qs = new URLSearchParams(location.search).get('lite'); if (qs === '1' || qs === '0') set('radar-lite', qs); } catch (e) {}
  var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  function weak() {
    if (!c) return false;
    return !!c.saveData || /(^|-)2g$/.test(c.effectiveType || '') || (typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 0.7);
  }
  var chip;
  function apply() {
    var pref = get('radar-lite');
    var on = pref === '1' || (pref !== '0' && weak());
    var was = root.dataset.lite === '1';
    if (on) root.dataset.lite = '1'; else delete root.dataset.lite;
    window.__radarLite = on;
    if (on && !was && pref !== '1') showChip();
    if (!on && chip) { chip.remove(); chip = null; }
  }
  function showChip() {
    if (chip || !document.body) return;
    chip = document.createElement('div');
    chip.className = 'perf-lite-chip';
    chip.setAttribute('role', 'status');
    var msg = document.createElement('span');
    msg.textContent = T('Zayıf bağlantı: veri tasarrufu açık', 'Slow connection: data saver on');
    var off = document.createElement('button');
    off.type = 'button';
    off.textContent = T('Kapat', 'Turn off');
    off.addEventListener('click', function () { set('radar-lite', '0'); apply(); });
    chip.append(msg, off);
    document.body.appendChild(chip);
  }
  apply();
  if (c && c.addEventListener) c.addEventListener('change', apply);
  addEventListener('load', function () { if (root.dataset.lite === '1' && get('radar-lite') !== '1') showChip(); });
  // Dışarıdan aç/kapat (ör. menüden): window.radarLite.set(true|false|null)
  window.radarLite = { set: function (on) { if (on === null) { try { localStorage.removeItem('radar-lite'); } catch (e) {} } else set('radar-lite', on ? '1' : '0'); apply(); }, active: function () { return root.dataset.lite === '1'; } };

  // Veri tasarrufunda kaydırmayla gelen resimleri geç yükle ve düşük öncelikli yap.
  function lazify(img) { if (!img.loading) img.loading = 'lazy'; if (!img.decoding) img.decoding = 'async'; if (!img.getAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low'); }
  var mo;
  function watchImages() {
    if (root.dataset.lite !== '1') { if (mo) { mo.disconnect(); mo = null; } return; }
    if (mo) return;
    mo = new MutationObserver(function (list) { list.forEach(function (m) { m.addedNodes.forEach(function (n) {
      if (n.nodeType !== 1) return;
      if (n.tagName === 'IMG') lazify(n); else if (n.querySelectorAll) n.querySelectorAll('img').forEach(lazify);
    }); }); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
  setInterval(watchImages, 1500); watchImages();
})();
