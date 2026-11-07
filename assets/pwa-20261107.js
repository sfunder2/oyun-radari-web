// Makes the site an installable app: registers the service worker and, on iPad/iPhone Safari
// and Android browsers, shows a one-time hint on how to put Oyun Radarı on the home screen.
(function () {
  if ('serviceWorker' in navigator) {
    addEventListener('load', function () {
      navigator.serviceWorker.register('/oyun-radari-web/sw.js', { scope: '/oyun-radari-web/' }).catch(function () {});
    });
  }

  var KEY = 'radar-install-hint';
  var ua = navigator.userAgent || '';
  var standalone = navigator.standalone === true ||
    (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (standalone || /OyunRadariAndroid/.test(ua)) return;
  try { if (localStorage.getItem(KEY)) return; } catch (e) { return; }

  // iPadOS Safari reports itself as a Mac; touch support gives it away.
  var ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var iosSafari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  var android = /Android/.test(ua);
  if (!iosSafari && !android) return;

  var en = document.documentElement.lang === 'en';
  var deferred = null;
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });

  function close(bar) {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    bar.remove();
  }

  function show() {
    if (document.getElementById('radar-install')) return;
    var bar = document.createElement('div');
    bar.id = 'radar-install';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', en ? 'Install the app' : 'Uygulamayı yükle');
    var share = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style="vertical-align:-3px"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9"/></svg>';
    var text, actions = '';
    if (iosSafari) {
      text = en
        ? 'Add Oyun Radarı to your Home Screen: tap <span style="white-space:nowrap">' + share + ' <b>Share</b></span>, then <b>Add to Home Screen</b>.'
        : 'Oyun Radarı\'nı uygulama gibi kullanın: <span style="white-space:nowrap">' + share + ' <b>Paylaş</b>\'a</span>, sonra <b>Ana Ekrana Ekle</b>\'ye dokunun.';
    } else {
      text = en ? 'Use Oyun Radarı as an app on your Android device.' : 'Oyun Radarı\'nı Android cihazınızda uygulama olarak kullanın.';
      actions =
        '<a class="ri-go" href="https://github.com/sfunder2/oyun-radari-web/releases/latest" target="_blank" rel="noopener">' + (en ? 'Get the APK' : 'APK\'yı indir') + '</a>' +
        (deferred ? '<button type="button" class="ri-add">' + (en ? 'Add to Home screen' : 'Ana ekrana ekle') + '</button>' : '');
    }
    bar.innerHTML =
      '<img src="/oyun-radari-web/icons/icon-192.png" alt="" width="40" height="40">' +
      '<div class="ri-text">' + text + (actions ? '<div class="ri-actions">' + actions + '</div>' : '') + '</div>' +
      '<button type="button" class="ri-x" aria-label="' + (en ? 'Close' : 'Kapat') + '">×</button>';
    var css = document.createElement('style');
    css.textContent =
      '#radar-install{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:300;max-width:480px;margin:0 auto;display:flex;gap:12px;align-items:flex-start;padding:12px 12px 12px 14px;border-radius:16px;background:#121922;color:#eef2f6;border:1px solid rgba(196,248,91,.35);box-shadow:0 12px 32px rgba(0,0,0,.45);font:14px/1.45 Manrope,system-ui,sans-serif}' +
      '#radar-install img{flex:none;border-radius:10px}' +
      '#radar-install .ri-text{flex:1}' +
      '#radar-install .ri-actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}' +
      '#radar-install .ri-go,#radar-install .ri-add{padding:7px 12px;border-radius:10px;border:0;background:#c4f85b;color:#090d12;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}' +
      '#radar-install .ri-add{background:transparent;color:#c4f85b;border:1px solid #c4f85b}' +
      '#radar-install .ri-x{flex:none;width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:#9aa7b4;font-size:22px;line-height:1;cursor:pointer}';
    bar.appendChild(css);
    bar.querySelector('.ri-x').onclick = function () { close(bar); };
    var add = bar.querySelector('.ri-add');
    if (add) add.onclick = function () { deferred.prompt(); deferred.userChoice.finally(function () { close(bar); }); };
    var go = bar.querySelector('.ri-go');
    if (go) go.onclick = function () { close(bar); };
    document.body.appendChild(bar);
  }

  // Let the page settle before offering, so the hint never covers the first look at the catalogue.
  addEventListener('load', function () { setTimeout(show, 6000); });
})();
