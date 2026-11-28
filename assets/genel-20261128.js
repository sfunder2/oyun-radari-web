// Genel cila: grafikler, hareket ve çerçeve (28 Kasım 2026). genel-20261128.css ile birlikte.
//  - Yığılmış harcama çubuğu: bütçe halkasının altına, halkanın kendi dilimlerinden (yeni veri yok)
//  - Renk körü dostu mod: ısı haritası, halka ve çizgi grafikler için Okabe-Ito dizisi + desen (data-cvd, tema menüsünden)
//  - Sayfa geçişleri: View Transitions API (destekleyen tarayıcıda; yoksa hiçbir şey olmaz)
//  - Geri sayım rakamları: değer değişince kısa çevirme animasyonu
// React düğümleri silinmez ya da değiştirilmez; yalnız öznitelik, CSS ve kendi data-gz düğümlerimiz.

// ---- Saf yardımcılar (Node'da sınanır) ----
// Okabe-Ito renk körü güvenli dizi (siyah hariç)
export const CVD_PALETTE = ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7', '#ffffff'];
// Isı haritası için tek yönde artan açıklık (koyu→açık), düzey 0-4: renk körlüğünde de sıralı okunur
export const CVD_RAMP = ['#1b2a4a', '#2f5d8a', '#3f9ab5', '#8fd3b6', '#f4f0a8'];
// Halka dilimlerinden (stroke-dasharray uzunluğu) çubuk genişliği yüzdeleri; toplam %100'ü aşmaz
export function stackWidths(lengths, circumference) {
  const out = [];
  let used = 0;
  for (const l of lengths) {
    const w = Math.max(0, Math.min(100 - used, (Number(l) / circumference) * 100));
    out.push(Number.isFinite(w) ? Math.round(w * 100) / 100 : 0);
    used += out[out.length - 1];
  }
  return out;
}
// Düzen bitene kadar bekle: DOM `quiet` ms sakin kalınca ya da `max` ms dolunca çözülür
export function settle(observeTarget, { quiet = 140, max = 700 } = {}) {
  return new Promise((resolve) => {
    let t = setTimeout(done, quiet);
    const cap = setTimeout(done, max);
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(done, quiet); });
    mo.observe(observeTarget, { childList: true, subtree: true });
    function done() { mo.disconnect(); clearTimeout(t); clearTimeout(cap); resolve(); }
  });
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const root = document.documentElement;
  const en = () => root.lang === 'en';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.reduceMotion === 'true';

  // --- Yığılmış harcama çubuğu ---
  function stack() {
    document.querySelectorAll('.vz-wallet').forEach((w) => {
      const segs = [...w.querySelectorAll('.vz-seg')];
      if (!segs.length) return;
      const R = 52, C = 2 * Math.PI * R;
      const lens = segs.map((c) => parseFloat((c.getAttribute('stroke-dasharray') || '0').split(' ')[0]) || 0);
      const sig = lens.join(',') + segs.map((c) => c.getAttribute('stroke')).join(',');
      let bar = w.querySelector(':scope > .gz-stack');
      if (bar && bar.dataset.sig === sig) return;
      const widths = stackWidths(lens, C);
      if (!bar) { bar = document.createElement('div'); bar.className = 'gz-stack'; bar.dataset.gz = ''; w.appendChild(bar); }
      bar.dataset.sig = sig;
      bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', en() ? 'Spending breakdown' : 'Harcama dağılımı');
      bar.textContent = '';
      segs.forEach((c, i) => {
        const s = document.createElement('span');
        const remain = c.classList.contains('remain');
        s.className = 'gz-seg' + (remain ? ' remain' : '');
        s.style.setProperty('--w', widths[i] + '%');
        s.style.setProperty('--i', String(i));
        if (!remain) s.style.setProperty('--c', c.getAttribute('stroke') || 'var(--lime)');
        s.title = c.querySelector('title')?.textContent || '';
        bar.appendChild(s);
      });
    });
  }

  // --- Geri sayım rakamı çevirme ---
  function ticks() {
    document.querySelectorAll('.rc-tiles b').forEach((b) => {
      const v = b.textContent;
      if (b.dataset.gzV === undefined) { b.dataset.gzV = v; return; }
      if (b.dataset.gzV !== v) {
        b.dataset.gzV = v;
        if (reduced()) return;
        b.classList.remove('gz-tick'); void b.offsetWidth; b.classList.add('gz-tick');
      }
    });
  }
  setInterval(ticks, 700);

  // --- Sayfa geçişleri ---
  const NAV = '#root>header nav button, #root>header .menu-button, .bottom-nav button, .menu-grid button, .ds-theme';
  if (typeof document.startViewTransition === 'function') {
    document.addEventListener('click', (e) => {
      const t = e.target instanceof Element ? e.target.closest(NAV) : null;
      if (!t || reduced() || root.classList.contains('gz-vt')) return;
      root.classList.add('gz-vt');
      let vt;
      try { vt = document.startViewTransition(() => settle(document.getElementById('root') || document.body)); } catch { root.classList.remove('gz-vt'); return; }
      const clear = () => root.classList.remove('gz-vt');
      vt.finished.then(clear, clear);
    }, true);
  }

  let raf = 0;
  const run = () => { raf = 0; stack(); ticks(); };
  new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(run); }).observe(document.body, { childList: true, subtree: true });
  run();
}
