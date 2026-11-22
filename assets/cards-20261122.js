// Kart ve liste cilası (22 Kasım 2026). Hepsi DOM'u izleyen bu modülde; paketin React koduna dokunulmaz.
//  1 Kapak oranı 16:9 + yüklenirken bulanık, vurgu renkli önizleme (görsel gelince netleşir)
//  2 Fiyat bloğu: eski fiyat üstü çizili, yeni fiyat büyük, indirim tek rozet
//  3 İndirim rozetinde %20 / %50 / %75 renk kademeleri
//  4 Köşe şeritleri: "Tüm zamanların en düşüğü" (radarın kayıtları) ve "Yeni indirim" (son ziyaretten beri düşen fiyat)
//  5 Fiyat değişimi: küçük ok ve yüzde etiketi (son ziyaretinize göre)
//  6 Kapaktan otomatik vurgu rengi (--cd-accent)
//  7 Fareyle üzerine gelince hızlı özet (puan, tür, en düşük fiyat)
//  8 Platform simgeleri tek sırada (PC, PS, Xbox, Switch)
//  9 Favori kalbine basınca parıltı ve istek listesi sayacında vurgu
// 10 Mağaza noktaları yerine tek tip küçük simge seti (CSS) ve sıkı liste satırları (CSS)
// Hareket azaltılmışsa (sistem ayarı ya da sitenin kendi "hareketi azalt" ayarı) animasyonlar başlamaz.

// ---- Saf yardımcılar (Node'da sınanır) ----

// İndirim kademesi: 0 (yok/küçük), 1 (≥20), 2 (≥50), 3 (≥75).
export function discountTier(pct) {
  const p = Number(pct);
  if (!Number.isFinite(p) || p < 20) return 0;
  if (p >= 75) return 3;
  if (p >= 50) return 2;
  return 1;
}

// "%75 indirim", "−%75", "-%20" gibi metinden yüzde.
export function parsePct(text) {
  const m = /(\d{1,3})/.exec(String(text || ''));
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 && n <= 100 ? n : null;
}

// "₺1.299,00", "$9.99", "1,299.00 TL" -> sayı. Belirsiz metinde null.
export function parseMoney(text) {
  const s = String(text || '').replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return null;
  const lastDot = s.lastIndexOf('.'), lastCom = s.lastIndexOf(',');
  let norm;
  if (lastDot > -1 && lastCom > -1) norm = lastDot > lastCom ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  else if (lastCom > -1) norm = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (lastDot > -1) norm = /\.\d{1,2}$/.test(s) && s.split('.').length === 2 ? s : s.replace(/\./g, '');
  else norm = s;
  const v = Number(norm);
  return Number.isFinite(v) ? v : null;
}

// Son görülen fiyata göre değişim. Yalnız gerçek (>%0,5) değişim sayılır.
export function priceDelta(prev, next) {
  if (!Number.isFinite(prev) || !Number.isFinite(next) || prev <= 0 || next < 0) return { dir: 'none', pct: 0 };
  const d = next - prev;
  if (Math.abs(d) / prev < 0.005) return { dir: 'none', pct: 0 };
  return { dir: d < 0 ? 'down' : 'up', pct: Math.max(1, Math.round((Math.abs(d) / prev) * 100)) };
}

// Köşe şeridi: all-time-low radarın kendi rozetinden, "yeni" son ziyarete göre düşüşten gelir.
export function ribbonKind({ atl, delta, ageMs }) {
  if (atl) return 'atl';
  if (delta && delta.dir === 'down' && delta.pct >= 3 && ageMs <= 72 * 3600 * 1000) return 'new';
  return null;
}

// Piksel verisinden (RGBA, düz dizi) vurgu rengi: doygun ve çok koyu/açık olmayan pikseller öne alınır.
export function accentFromPixels(data) {
  let r = 0, g = 0, b = 0, w = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2], A = data[i + 3];
    if (A < 200) continue;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 510, s = mx === 0 ? 0 : (mx - mn) / mx;
    if (l < 0.12 || l > 0.9) continue;
    const wt = 0.15 + s * s;
    r += R * wt; g += G * wt; b += B * wt; w += wt;
  }
  if (w <= 0) return null;
  const c = [r / w, g / w, b / w].map(v => Math.round(v));
  // Okunur kalması için parlaklığı bir aralığa getir.
  const mx = Math.max(...c);
  const k = mx < 110 ? 110 / Math.max(mx, 1) : mx > 235 ? 235 / mx : 1;
  return '#' + c.map(v => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0')).join('');
}

// Görsel alınamazsa başlıktan sabit bir ton.
export function hueAccent(name) {
  let h = 0;
  for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) % 360;
  return `hsl(${h} 62% 58%)`;
}

// Mağaza anahtarını (class) PC / PS / Xbox / Switch grubuna indirger; sırayı korur, yinelenenleri atar.
export function platformGroups(keys) {
  const map = { steam: 'pc', epic: 'pc', gog: 'pc', pc: 'pc', 'xbox-pc': 'pc', playstation: 'ps', ps: 'ps', xbox: 'xbox', switch: 'switch', nintendo: 'switch' };
  const out = [];
  for (const k of keys) { const g = map[String(k || '').toLowerCase()]; if (g && !out.includes(g)) out.push(g); }
  const order = ['pc', 'ps', 'xbox', 'switch'];
  return out.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

// Hızlı özet için en düşük fiyat: [{text, value, store}] içinden en küçük.
export function lowestOffer(list) {
  let best = null;
  for (const o of list) if (o && Number.isFinite(o.value) && o.value >= 0 && (!best || o.value < best.value)) best = o;
  return best;
}

// Son görülen fiyat kaydı (yerel): { anahtar: [fiyat, değiştiği an, önceki fiyat] }, en çok `cap` anahtar.
// Dönen { prev, at }: son değişimden önceki fiyat ve değişimin zamanı; hiç değişmediyse null.
export function rememberPrice(store, key, price, now, cap = 600) {
  const old = store[key];
  if (!old) store[key] = [price, now, null];
  else if (old[0] !== price) store[key] = [price, now, old[0]];
  const cur = store[key];
  const keys = Object.keys(store);
  if (keys.length > cap) keys.sort((x, y) => store[x][1] - store[y][1]).slice(0, keys.length - cap).forEach(k => delete store[k]);
  return cur[2] == null ? null : { prev: cur[2], at: cur[1] };
}

// ---- Tarayıcı kısmı ----
const BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined';
if (BROWSER) boot();

function boot() {
  const root = document.documentElement;
  const isEn = () => root.lang === 'en';
  const T = (tr, en) => (isEn() ? en : tr);
  const reduceMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const motionOk = () => !(reduceMq && reduceMq.matches) && root.dataset.reduceMotion !== 'true';
  const hoverOk = () => window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const CARD = '.gamecard';
  const ROW = '.deal-list-row, .comparerow';
  const KEY = 'radar-cd-prices';
  const SVG = {
    pc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    ps: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v16l4 1.5V8c0-1 .5-1.3 1.2-1 1.4.5 2.3 1.9 2.3 3.6 0 1.6-.6 2.5-1.5 3M5 17.5l7-2.5M12.5 20.5l7-2.5"/></svg>',
    xbox: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 8l8 8M16 8l-8 8"/></svg>',
    switch: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="7" height="14" rx="3"/><rect x="14" y="5" width="7" height="14" rx="3"/><circle cx="6.5" cy="9" r="1"/><circle cx="17.5" cy="15" r="1"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
  };
  const PLAT_NAME = { pc: 'PC', ps: 'PlayStation', xbox: 'Xbox', switch: 'Switch' };

  let prices = {};
  try { prices = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { prices = {}; }
  let dirty = false;
  const save = () => { if (!dirty) return; dirty = false; try { localStorage.setItem(KEY, JSON.stringify(prices)); } catch { /* özel pencere */ } };
  setInterval(save, 4000);
  addEventListener('pagehide', save);

  const money = el => { const n = el && parseMoney(el.textContent); return n; };
  const gameName = card => {
    const h = card.querySelector('h3, .deal-game b');
    return h ? h.textContent.trim() : '';
  };

  function ensure(host, cls, build) {
    let el = host.querySelector(':scope > .' + cls);
    if (!el) { el = build(); el.classList.add(cls); el.dataset.cd = ''; host.appendChild(el); }
    return el;
  }
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // 1 + 6 — kapak
  function artSetup(card) {
    const art = card.querySelector(':scope > .art');
    if (!art) return;
    const img = art.querySelector('img');
    if (!img || art.dataset.cdArt === (img.currentSrc || img.src)) return;
    art.dataset.cdArt = img.currentSrc || img.src;
    const name = gameName(card);
    const cv = card.style.getPropertyValue('--cv');
    card.style.setProperty('--cd-accent', /^#[0-9a-f]{6}$/i.test(cv.trim()) ? cv.trim() : hueAccent(name));
    const done = () => {
      art.classList.remove('cd-loading');
      art.classList.add('cd-loaded');
      if (/^#[0-9a-f]{6}$/i.test(cv.trim())) return;
      try {
        const c = document.createElement('canvas'); c.width = c.height = 24;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0, 24, 24);
        const col = accentFromPixels(x.getImageData(0, 0, 24, 24).data);
        if (col) card.style.setProperty('--cd-accent', col);
      } catch { /* çapraz kaynak: ton başlıktan kalır */ }
    };
    if (img.complete && img.naturalWidth) { art.classList.add('cd-loaded'); done(); }
    else { art.classList.add('cd-loading'); img.addEventListener('load', done, { once: true }); img.addEventListener('error', () => { art.classList.remove('cd-loading'); art.classList.add('cd-failed'); }, { once: true }); }
  }

  // 3 — rozet kademesi
  function badgeTier(scope) {
    scope.querySelectorAll('.discountbadge, .deal-discount > b').forEach(b => {
      const p = Number(b.dataset.pct) || parsePct(b.textContent);
      const t = String(discountTier(p));
      if (b.dataset.cdTier !== t) b.dataset.cdTier = t;
    });
  }

  // 8 — platform simgeleri
  function platforms(card) {
    const art = card.querySelector(':scope > .art');
    const ul = art && art.querySelector('.platform-badges');
    if (!art || !ul) return;
    const keys = [...ul.querySelectorAll('li')].map(li => (li.className.match(/pb-([a-z-]+)/) || [])[1]);
    const groups = platformGroups(keys);
    const sig = groups.join(',');
    const have = art.querySelector(':scope > .cd-plats');
    if (have && have.dataset.sig === sig) return;
    if (have) have.remove();
    if (!groups.length) return;
    const box = h('div', 'cd-plats');
    box.dataset.cd = ''; box.dataset.sig = sig;
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', T('Platformlar: ', 'Platforms: ') + groups.map(g => PLAT_NAME[g]).join(', '));
    groups.forEach(g => { const s = h('span', 'cd-p cd-p-' + g, SVG[g]); s.title = PLAT_NAME[g]; box.appendChild(s); });
    art.appendChild(box);
  }

  // 2 + 5 + 4 — fiyat bloğu, değişim etiketi, köşe şeridi
  function priceBlock(card) {
    const priceBox = card.querySelector('.catalogprice');
    const strong = priceBox && priceBox.querySelector(':scope > strong');
    if (!strong) return;
    const now = money(strong);
    if (now == null) return;
    const name = gameName(card);
    const plat = (priceBox.querySelector('small') || {}).textContent || '';
    const key = name + '|' + plat.split('·')[0].trim();
    const before = prices[key] ? prices[key].join() : '';
    const info = rememberPrice(prices, key, now, Date.now());
    if (prices[key].join() !== before) dirty = true;
    const d2 = info ? priceDelta(info.prev, now) : { dir: 'none', pct: 0 };
    const ageMs = info ? Date.now() - info.at : Infinity;

    // değişim etiketi (fiyatın yanında)
    let chip = priceBox.querySelector(':scope > .cd-delta');
    if (d2.dir !== 'none' && ageMs <= 7 * 24 * 3600 * 1000) {
      if (!chip) { chip = h('span', 'cd-delta'); chip.dataset.cd = ''; strong.after(chip); }
      const arrow = d2.dir === 'down' ? '▼' : '▲';
      const txt = `${arrow} %${d2.pct}`;
      if (chip.textContent !== txt) chip.textContent = txt;
      chip.dataset.dir = d2.dir;
      chip.title = d2.dir === 'down' ? T('Son ziyaretinizden beri ucuzladı', 'Cheaper since your last visit') : T('Son ziyaretinizden beri zamlandı', 'Pricier since your last visit');
    } else if (chip) chip.remove();

    // köşe şeridi
    const atl = !!card.querySelector('.tz-atl, .tz-range.low');
    const kind = ribbonKind({ atl, delta: d2, ageMs });
    const art = card.querySelector(':scope > .art');
    let rb = art && art.querySelector(':scope > .cd-ribbon');
    if (art && kind) {
      if (!rb) { rb = h('span', 'cd-ribbon'); rb.dataset.cd = ''; art.appendChild(rb); }
      const lab = kind === 'atl' ? T('Tüm zamanların en düşüğü', 'All-time low') : T('Yeni indirim', 'New discount');
      if (rb.dataset.kind !== kind || rb.dataset.lang !== (isEn() ? 'en' : 'tr')) {
        rb.dataset.kind = kind; rb.dataset.lang = isEn() ? 'en' : 'tr';
        rb.innerHTML = SVG[kind === 'atl' ? 'trophy' : 'bolt'] + '<b></b><em></em>';
        rb.querySelector('b').textContent = lab;
        rb.querySelector('em').textContent = kind === 'atl' ? T('En düşük fiyat', 'All-time low') : lab;
      }
    } else if (rb) rb.remove();
    card.dataset.cdRibbon = kind || '';
  }

  // 7 — hızlı özet
  function peek(card) {
    const art = card.querySelector(':scope > .art');
    if (!art) return;
    const score = card.querySelector('.scorechips .chip.mc, .scorechips .chip');
    const genre = card.querySelector('.vv-genre');
    const offers = [];
    const main = card.querySelector('.catalogprice');
    if (main) {
      const v = money(main.querySelector(':scope > strong'));
      const st = (main.querySelector('small') || {}).textContent || '';
      if (v != null) offers.push({ value: v, text: main.querySelector(':scope > strong').textContent.trim(), store: st.split('·')[0].trim() });
    }
    card.querySelectorAll('.storeprices > span:not(.none)').forEach(s => {
      const v = parseMoney(s.textContent);
      if (v != null) offers.push({ value: v, text: s.textContent.trim(), store: s.title || '' });
    });
    const low = lowestOffer(offers);
    const sig = [score && score.textContent, genre && genre.textContent, low && low.text, low && low.store, isEn()].join('|');
    let box = art.querySelector(':scope > .cd-peek');
    if (box && box.dataset.sig === sig) return;
    if (box) box.remove();
    if (!score && !genre && !low) return;
    box = h('div', 'cd-peek');
    box.dataset.cd = ''; box.dataset.sig = sig; box.setAttribute('aria-hidden', 'true');
    const add = (k, label, val) => { const d = h('div', 'cd-pk'); const a = h('small'); a.textContent = label; const b = h('b'); b.textContent = val; d.append(a, b); box.appendChild(d); };
    if (score) add('score', T('Puan', 'Score'), score.textContent.trim());
    if (genre) add('genre', T('Tür', 'Genre'), genre.textContent.trim());
    if (low) add('low', T('En düşük', 'Lowest') + (low.store ? ' · ' + low.store : ''), low.text);
    art.appendChild(box);
  }

  // Liste satırı: platform noktaları yanında en düşük mağaza işareti için sınıf
  function rowMark(row) {
    const tag = row.querySelector('.deal-discount > b');
    if (tag) row.dataset.cdTier = tag.dataset.cdTier || '0';
  }

  function card(c) { artSetup(c); badgeTier(c); platforms(c); priceBlock(c); if (hoverOk()) peek(c); }
  function row(r) { badgeTier(r); rowMark(r); }

  let pending = false;
  function sweep() {
    pending = false;
    document.querySelectorAll(CARD).forEach(card);
    document.querySelectorAll(ROW).forEach(row);
  }
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(sweep); } };
  new MutationObserver(muts => {
    for (const m of muts) {
      const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      if (t && t.closest && t.closest('[data-cd]')) continue;
      if (m.type === 'childList' && [...m.addedNodes, ...m.removedNodes].every(n => n.nodeType === 1 && n.hasAttribute && n.hasAttribute('data-cd'))) continue;
      schedule(); return;
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  addEventListener('load', schedule);
  schedule();

  // 9 — favori kalbi parıltısı + sayaç vurgusu
  const counterEl = () => {
    for (const b of document.querySelectorAll('header button, header a')) {
      if (/İstek Listem|Wishlist/i.test(b.textContent)) return [...b.querySelectorAll('span, b, i, em')].reverse().find(e => /^\d+$/.test(e.textContent.trim())) || null;
    }
    return null;
  };
  document.addEventListener('click', e => {
    const hb = e.target.closest && e.target.closest('.heart');
    if (!hb) return;
    const wasOn = hb.getAttribute('aria-pressed') === 'true';
    if (wasOn || !motionOk()) return;
    setTimeout(() => {
      if (hb.getAttribute('aria-pressed') !== 'true') return;
      sparkle(hb);
      const c = counterEl();
      if (c) { c.classList.remove('cd-bump'); void c.offsetWidth; c.classList.add('cd-bump'); setTimeout(() => c.classList.remove('cd-bump'), 900); }
    }, 60);
  }, true);
  function sparkle(host) {
    const r = host.getBoundingClientRect();
    const s = h('span', 'cd-spark'); s.dataset.cd = '';
    s.style.left = r.left + r.width / 2 + 'px'; s.style.top = r.top + r.height / 2 + 'px';
    for (let i = 0; i < 8; i++) { const p = h('i'); p.style.setProperty('--a', i * 45 + 'deg'); p.style.setProperty('--d', 16 + (i % 2) * 8 + 'px'); s.appendChild(p); }
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 800);
  }
}
