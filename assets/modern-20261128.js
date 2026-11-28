// Modern katman (28 Kasım 2026). modern-20261128.css ile birlikte. Paketin React koduna dokunmaz; DOM'u izler.
// Yeni olanlar: eylem paleti (Ctrl/Cmd+Shift+K), tek tuş kısayolları ve yardım penceresi,
// kayıtlı filtre görünümleri, sürükle-bırak istek listesi sırası, canlı sayı animasyonu, ağır sayfa parçalarını önceden ısıtma,
// görsel öncelikleri, uygulama rozeti sayacı, isteğe bağlı gerçek zamanlı fiyat ve AI oyun özeti.
// Zaten var olanlar tekrar edilmez: Ctrl/Cmd+K oyun araması, View Transitions sayfa geçişi (genel-20261128), tembel görsel (touch-20261128), doğal dille arama, canlı öneri listesi, sürpriz slot, mobil haptik.
// Her özellik kendi try/catch'inde başlar: biri çalışmazsa diğerleri etkilenmez. Hareketler azaltılmış harekette kapanır; metinler TR/EN.

// ---------------------------------------------------------------------------------------------
// Saf yardımcılar (tests/modern.test.mjs)
// ---------------------------------------------------------------------------------------------
const FOLD = { 'ı': 'i', 'İ': 'i', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u', 'ş': 's', 'Ş': 's', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c' };
/** Türkçe harfleri ve aksanları yok sayan küçük harfli metin. */
export const fold = s => String(s ?? '').replace(/[ıİğĞüÜşŞöÖçÇ]/g, c => FOLD[c]).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Palet araması: tüm sözcükler geçmeli; başta eşleşen ve kısa olan önde. Eşleşmezse null. */
export function fuzzyScore(query, text) {
  const q = fold(query).trim();
  const t = fold(text);
  if (!q) return 0;
  let score = 0;
  for (const w of q.split(/\s+/)) {
    const i = t.indexOf(w);
    if (i < 0) return null;
    score += i === 0 ? 3 : (t[i - 1] === ' ' ? 2 : 1);
  }
  return score - t.length / 1000;
}

/** "1.234,5 TL" ya da "777 B" gibi metindeki ilk sayıyı çözer. Sayı yoksa null. */
export function parseCountText(text, lang = 'tr') {
  const m = /^([^\d]*)(\d[\d.,   ]*\d|\d)(.*)$/s.exec(String(text ?? ''));
  if (!m) return null;
  const dec = lang === 'en' ? '.' : ',';
  const thou = lang === 'en' ? ',' : '.';
  const raw = m[2].replace(/[   ]/g, '');
  const at = raw.lastIndexOf(dec);
  let decimals = 0;
  let intPart = raw;
  let fracPart = '';
  if (at >= 0 && raw.length - at - 1 <= 2 && raw.indexOf(dec) === at) {
    intPart = raw.slice(0, at);
    fracPart = raw.slice(at + 1);
    decimals = fracPart.length;
  }
  intPart = intPart.split(thou).join('');
  if (!/^\d+$/.test(intPart) || (fracPart && !/^\d+$/.test(fracPart))) return null;
  const value = Number(intPart + (fracPart ? '.' + fracPart : ''));
  return Number.isFinite(value) ? { prefix: m[1], value, decimals, suffix: m[3] } : null;
}
export function formatCount(value, decimals, lang = 'tr') {
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}
/** 0 → hedef arası yumuşak ilerleme (easeOutCubic). */
export const easeOut = p => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);

/** Kayıtlı sıraya göre kimlikleri dizer; sırada olmayanlar özgün sırasıyla sona gider. */
export function applyOrder(ids, saved) {
  const rank = new Map((Array.isArray(saved) ? saved : []).map((id, i) => [id, i]));
  return ids.map((id, i) => ({ id, i })).sort((a, b) => (rank.has(a.id) ? rank.get(a.id) : 1e6 + a.i) - (rank.has(b.id) ? rank.get(b.id) : 1e6 + b.i)).map(x => x.id);
}
/** `id` öğesini `before` öğesinin yerine taşır. */
export function moveId(order, id, before) {
  const list = order.filter(x => x !== id);
  const at = list.indexOf(before);
  if (at < 0 || !order.includes(id)) return order.slice();
  const from = order.indexOf(id);
  const to = order.indexOf(before);
  list.splice(from < to ? at + 1 : at, 0, id);
  return list;
}
export function stepId(order, id, dir) {
  const i = order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return order.slice();
  const out = order.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** Kayıtlı görünümleri temizler: ad ≤ 40, en çok 12 görünüm, değerler yalnız metin. */
export function sanitizeViews(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const v of raw) {
    if (!v || typeof v.id !== 'string' || typeof v.name !== 'string' || !v.values || typeof v.values !== 'object') continue;
    const values = {};
    for (const k of Object.keys(v.values).slice(0, 40)) if (typeof v.values[k] === 'string' || typeof v.values[k] === 'boolean') values[k.slice(0, 80)] = v.values[k];
    out.push({ id: v.id.slice(0, 40), name: v.name.trim().slice(0, 40) || '—', values });
    if (out.length >= 12) break;
  }
  return out;
}

/** Rozet sayacı: hedef fiyatına inmiş favori sayısı (kayıtlı fiyat ≤ hedef). */
export function badgeCount(favs) {
  if (!Array.isArray(favs)) return 0;
  return favs.filter(f => f && Number.isFinite(f.target) && Number.isFinite(f.price) && f.price <= f.target).length;
}

/** Ana paketin içinden tembel yüklenen parça adlarını okur: "./Deals-AbC123xy.js" → "Deals-AbC123xy.js". */
export function chunkNames(bundleText) {
  const out = new Set();
  for (const m of String(bundleText || '').matchAll(/["'`]\.\/([A-Za-z][A-Za-z0-9_]*-[A-Za-z0-9_-]{6,12}\.js)["'`]/g)) out.add(m[1]);
  return [...out];
}
export const chunksFor = (names, prefix) => names.filter(n => n.startsWith(prefix + '-'));

/** Tek tuş kısayolu: "g" sonra bir harf. Bilinmeyen harf null. */
export const GO_KEYS = { h: 0, d: 1, w: 2, f: 3 };
export const goIndex = key => (Object.prototype.hasOwnProperty.call(GO_KEYS, key) ? GO_KEYS[key] : null);

/** Gerçek zamanlı satır değişikliğinden bildirim metni (yalnız fiyat gerçekten düştüyse). */
export function priceDropMessage(change, lang = 'tr') {
  const r = change && change.record;
  const o = change && change.old_record;
  if (!r || !o || !Number.isFinite(Number(r.price)) || !Number.isFinite(Number(o.price))) return null;
  const now = Number(r.price);
  const before = Number(o.price);
  if (!(now < before) || typeof r.name !== 'string') return null;
  const cur = r.currency === 'USD' ? 'USD' : r.currency === 'EUR' ? 'EUR' : 'TRY';
  const fmt = n => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'tr-TR', { style: 'currency', currency: cur }).format(n);
  return `${r.name.slice(0, 60)}: ${fmt(before)} → ${fmt(now)}`;
}

// ---------------------------------------------------------------------------------------------
// Tarayıcı kodu (Node'da çalışmaz)
// ---------------------------------------------------------------------------------------------
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const R = document.documentElement;
  const BASE = '/oyun-radari-web/';
  const FN = 'https://dsosckshigzijnsxmlwh.supabase.co/functions/v1/';
  const en = () => R.lang === 'en';
  const L = (tr, e) => (en() ? e : tr);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || R.dataset.reduceMotion === 'true';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* özel pencere */ } },
  };
  const buzz = (n = 8) => { try { navigator.vibrate && navigator.vibrate(n); } catch { /* desteklenmiyor */ } };
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn('[modern] ' + name + ':', e && e.message); } };
  const typing = t => !!t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable);
  const idle = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 300));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // Ortak toast (ui-kit-20261128.js, window.radarUI) varsa onu kullanır; yoksa kendi küçük bildirimini gösterir.
  function toast(text) {
    if (window.radarUI && typeof window.radarUI.toast === 'function') { window.radarUI.toast(text); return; }
    $$('.mx-toast').forEach(n => n.remove());
    const n = document.createElement('div');
    n.className = 'mx-toast';
    n.setAttribute('role', 'status');
    n.setAttribute('translate', 'no');
    n.textContent = text;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4200);
  }

  // ----- Sayfa eylemleri: başlık gezinmesi, tema, dil, görünüm -----
  const navButtons = () => $$('#root>header nav button, #root>header nav a');
  function goIdx(i) {
    const b = navButtons()[i];
    if (b) b.click();
    else { $('.radar-landing-links button, .bottom-nav button') && $$('.radar-landing-links button, .bottom-nav button')[Math.min(i, 2)]?.click(); }
  }
  const clickIf = sel => { const b = $(sel); if (b) { b.click(); return true; } return false; };
  const focusSearch = () => { const i = $('.csearch input, input[type=search]'); if (i) { i.focus(); i.select && i.select(); return true; } return false; };

  // ----- 2. Tek tuş kısayolları + yardım penceresi (Popover API) -----
  let helpEl;
  function help() {
    if (!helpEl) {
      helpEl = document.createElement('div');
      helpEl.className = 'mx-help';
      helpEl.id = 'mx-help';
      helpEl.setAttribute('translate', 'no');
      helpEl.setAttribute('role', 'dialog');
      helpEl.setAttribute('aria-label', L('Klavye kısayolları', 'Keyboard shortcuts'));
      if ('popover' in HTMLElement.prototype) helpEl.setAttribute('popover', 'auto');
      document.body.appendChild(helpEl);
    }
    const rows = [
      ['/', L('Aramaya git', 'Focus search')],
      ['Ctrl/⌘ K', L('Oyun araması ve hızlı bakış', 'Game search and quick look')],
      ['Ctrl/⌘ Shift K', L('Eylem paleti', 'Action palette')],
      ['g h', L('Oyunlar', 'Games')], ['g d', L('Fırsatlar', 'Deals')], ['g w', L('İstek listem', 'Wishlist')], ['g f', L('Senin için', 'For you')],
      ['t', L('Temayı değiştir', 'Cycle theme')], ['s', L('Sürpriz oyun', 'Surprise me')], ['?', L('Bu pencere', 'This window')],
    ];
    helpEl.innerHTML = `<button class="mx-help-close" aria-label="${L('Kapat', 'Close')}">×</button><h2>${L('Klavye kısayolları', 'Keyboard shortcuts')}</h2><dl>` +
      rows.map(([k, d]) => `<dt>${k.split(' ').map(x => `<kbd>${x}</kbd>`).join('')}</dt><dd>${d}</dd>`).join('') + '</dl>';
    const close = () => (helpEl.hidePopover ? helpEl.hidePopover() : (helpEl.hidden = true));
    $('.mx-help-close', helpEl).onclick = close;
    if (helpEl.showPopover) helpEl.showPopover(); else { helpEl.hidden = false; helpEl.style.display = 'block'; }
    $('.mx-help-close', helpEl).focus();
  }

  function surprise() {
    const pick = () => {
      const cands = $$('.deal-list-row, .cataloggrid>*, .kh-rail-card, .hs-showcase a').filter(c => !c.querySelector('.favbtn[aria-pressed=true]') && c.getBoundingClientRect().height > 0);
      if (!cands.length) return false;
      const c = cands[Math.floor(Math.random() * cands.length)];
      c.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
      const name = (c.getAttribute('aria-label') || c.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      toast(L('Sürpriz: ', 'Surprise: ') + name);
      const target = $('button.deal-game, a, button', c) || c;
      setTimeout(() => target.click(), reduced() ? 0 : 450);
      return true;
    };
    if (pick()) return;
    goIdx(0);
    let n = 0;
    const t = setInterval(() => { if (pick() || ++n > 16) clearInterval(t); }, 300);
  }

  safe('shortcuts', () => {
    let gAt = 0;
    document.addEventListener('keydown', e => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || $('dialog[open], .modal, [role=dialog]:not(.mx-help)')) return;
      const k = e.key;
      if (Date.now() - gAt < 1200) {
        gAt = 0;
        const i = goIndex(k.toLowerCase());
        if (i != null) { e.preventDefault(); goIdx(i); }
        return;
      }
      if (k === 'g') { gAt = Date.now(); return; }
      if (k === '?') { e.preventDefault(); help(); }
      else if (k === 't') { e.preventDefault(); clickIf('.ds-theme'); }
      else if (k === 's') { e.preventDefault(); surprise(); }
    });
  });

  // ----- 3. Kayıtlı filtre görünümleri (Oyunlar sayfası) -----
  const VIEWS_KEY = 'radar-mx-views-v1';
  const views = () => sanitizeViews(store.get(VIEWS_KEY, []));
  const scopeEl = () => $('section.storebrowser');
  const fieldKey = el => {
    const label = el.closest('label');
    let own = '';
    if (label) { const c = label.cloneNode(true); c.querySelectorAll('select,input,option,small').forEach(n => n.remove()); own = c.textContent; }
    const txt = (el.getAttribute('aria-label') || own || el.name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return el.tagName.toLowerCase() + ':' + (el.type || '') + ':' + txt;
  };
  const fields = () => { const s = scopeEl(); return s ? $$('select, input[type=checkbox], input[type=range], input[type=number]', s).filter(el => !el.closest('.mx-views')) : []; };
  function captureView() {
    const values = {};
    for (const el of fields()) {
      const k = fieldKey(el);
      if (k in values) continue;
      values[k] = el.type === 'checkbox' ? el.checked : el.value;
    }
    return values;
  }
  function setNative(el, value) {
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const set = Object.getOwnPropertyDescriptor(proto, el.type === 'checkbox' ? 'checked' : 'value').set;
    set.call(el, value);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', { bubbles: true }));
  }
  function applyView(v) {
    const seen = new Set();
    for (const el of fields()) {
      const k = fieldKey(el);
      if (seen.has(k) || !(k in v.values)) continue;
      seen.add(k);
      if (el.type === 'checkbox') { if (el.checked !== v.values[k]) el.click(); } else if (el.value !== v.values[k]) setNative(el, v.values[k]);
    }
    toast(L('Görünüm uygulandı: ', 'View applied: ') + v.name);
  }
  function saveView(name) {
    const list = views();
    list.push({ id: 'v' + Date.now().toString(36), name: name.trim().slice(0, 40) || L('Görünümüm', 'My view'), values: captureView() });
    store.set(VIEWS_KEY, sanitizeViews(list.slice(-12)));
    renderViews();
  }
  function renderViews() {
    const scope = scopeEl();
    if (!scope) return;
    let bar = $('.mx-views', scope);
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'mx-views';
      bar.setAttribute('translate', 'no');
      const anchor = $('.simple-primary-filters', scope) || scope.firstElementChild;
      scope.insertBefore(bar, anchor);
    }
    bar.replaceChildren();
    const lab = document.createElement('span');
    lab.className = 'mx-views-label';
    lab.textContent = L('Görünümlerim', 'My views');
    bar.append(lab);
    for (const v of views()) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'mx-chip';
      c.textContent = v.name;
      c.onclick = () => applyView(v);
      const x = document.createElement('span');
      x.className = 'mx-x';
      x.setAttribute('role', 'button');
      x.setAttribute('aria-label', L('Görünümü sil: ', 'Delete view: ') + v.name);
      x.textContent = '×';
      x.onclick = ev => { ev.stopPropagation(); store.set(VIEWS_KEY, views().filter(o => o.id !== v.id)); renderViews(); };
      c.append(x);
      bar.append(c);
    }
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'mx-chip mx-chip-add';
    add.textContent = '＋ ' + L('Bu süzgeçleri kaydet', 'Save these filters');
    add.onclick = () => {
      const f = document.createElement('form');
      const i = document.createElement('input');
      i.maxLength = 40;
      i.placeholder = L('Görünüm adı', 'View name');
      i.setAttribute('aria-label', i.placeholder);
      const ok = document.createElement('button');
      ok.className = 'mx-chip';
      ok.textContent = L('Kaydet', 'Save');
      f.append(i, ok);
      f.onsubmit = ev => { ev.preventDefault(); saveView(i.value); };
      add.replaceWith(f);
      i.focus();
    };
    bar.append(add);
  }

  // ----- 4. Eylem paleti (<dialog>) -----
  let pal, palInput, palList, palItems = [], palSel = 0;
  const ICON_GO = '→';
  function actions() {
    const a = [
      { g: L('Git', 'Go to'), t: L('Oyunlar', 'Games'), k: 'g h', i: ICON_GO, run: () => goIdx(0) },
      { g: L('Git', 'Go to'), t: L('Fırsatlar', 'Deals'), k: 'g d', i: ICON_GO, run: () => goIdx(1) },
      { g: L('Git', 'Go to'), t: L('İstek listem', 'Wishlist'), k: 'g w', i: '♥', run: () => goIdx(2) },
      { g: L('Git', 'Go to'), t: L('Senin için', 'For you'), k: 'g f', i: '✦', run: () => goIdx(3) },
      { g: L('Eylem', 'Action'), t: L('Aramaya odaklan', 'Focus search'), k: '/', i: '⌕', run: focusSearch },
      { g: L('Eylem', 'Action'), t: L('Sürpriz oyun öner', 'Suggest a surprise game'), k: 's', i: '✺', run: surprise },
      { g: L('Eylem', 'Action'), t: L('Klavye kısayolları', 'Keyboard shortcuts'), k: '?', i: '⌨', run: help },
      { g: L('Görünüm', 'Appearance'), t: L('Temayı değiştir', 'Cycle theme'), k: 't', i: '◐', run: () => clickIf('.ds-theme') },
      { g: L('Görünüm', 'Appearance'), t: L('Dili değiştir (TR/EN)', 'Switch language (TR/EN)'), i: 'A', run: () => clickIf('.ds-lang') },
      { g: L('Görünüm', 'Appearance'), t: L('Klasik görünüm', 'Classic view'), i: '▦', run: () => $$('.vv-modeswitch button')[0]?.click() },
      { g: L('Görünüm', 'Appearance'), t: L('Sade görünüm', 'Simple view'), i: '▢', run: () => $$('.vv-modeswitch button')[1]?.click() },
    ];
    for (const v of views()) a.push({ g: L('Kayıtlı görünüm', 'Saved view'), t: v.name, i: '★', run: () => { goIdx(0); setTimeout(() => applyView(v), 700); } });
    if (scopeEl()) a.push({ g: L('Eylem', 'Action'), t: L('Bu süzgeçleri görünüm olarak kaydet', 'Save these filters as a view'), i: '＋', run: () => { const b = $('.mx-chip-add'); b && (b.scrollIntoView({ block: 'center' }), b.click()); } });
    return a;
  }
  function drawPalette() {
    const q = palInput.value;
    palItems = actions().map(a => ({ a, s: fuzzyScore(q, a.t + ' ' + a.g) })).filter(x => x.s !== null).sort((x, y) => (q ? y.s - x.s : 0)).map(x => x.a);
    palSel = 0;
    palList.replaceChildren();
    if (!palItems.length) { const e = document.createElement('li'); e.className = 'mx-pal-empty'; e.textContent = L('Eşleşen eylem yok. Oyun aramak için Ctrl/⌘ K.', 'No matching action. Use Ctrl/⌘ K to search games.'); palList.append(e); return; }
    let last = '';
    palItems.forEach((a, i) => {
      if (a.g !== last) { const h = document.createElement('li'); h.className = 'mx-pal-group'; h.setAttribute('role', 'presentation'); h.textContent = last = a.g; palList.append(h); }
      const li = document.createElement('li');
      li.setAttribute('role', 'presentation');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mx-pal-item';
      b.id = 'mx-pal-' + i;
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.innerHTML = `<span class="mx-pal-ico" aria-hidden="true">${a.i}</span><span></span>${a.k ? `<small>${a.k.split(' ').map(x => `<kbd>${x}</kbd>`).join(' ')}</small>` : ''}`;
      b.children[1].textContent = a.t;
      b.onclick = () => runPalette(i);
      b.onmousemove = () => selectPalette(i, false);
      li.append(b);
      palList.append(li);
    });
    palInput.setAttribute('aria-activedescendant', 'mx-pal-0');
  }
  function selectPalette(i, scroll = true) {
    if (!palItems.length) return;
    palSel = (i + palItems.length) % palItems.length;
    $$('.mx-pal-item', palList).forEach((b, j) => b.setAttribute('aria-selected', String(j === palSel)));
    const cur = $('#mx-pal-' + palSel);
    palInput.setAttribute('aria-activedescendant', 'mx-pal-' + palSel);
    if (scroll && cur) cur.scrollIntoView({ block: 'nearest' });
  }
  function runPalette(i) {
    const a = palItems[i];
    if (!a) return;
    pal.close();
    setTimeout(() => a.run(), 30);
  }
  function openPalette() {
    if (!pal) {
      pal = document.createElement('dialog');
      pal.className = 'mx-palette';
      pal.setAttribute('translate', 'no');
      pal.setAttribute('aria-label', L('Eylem paleti', 'Action palette'));
      pal.innerHTML = `<div class="mx-pal-input"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input role="combobox" aria-expanded="true" aria-controls="mx-pal-list" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div><ul class="mx-pal-list" id="mx-pal-list" role="listbox"></ul>`;
      document.body.appendChild(pal);
      palInput = $('input', pal);
      palList = $('ul', pal);
      palInput.addEventListener('input', drawPalette);
      palInput.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); selectPalette(palSel + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); selectPalette(palSel - 1); }
        else if (e.key === 'Enter') { e.preventDefault(); runPalette(palSel); }
      });
      pal.addEventListener('click', e => { if (e.target === pal) pal.close(); });
    }
    palInput.placeholder = L('Bir eylem yaz… (ör. tema, fırsatlar, sürpriz)', 'Type an action… (e.g. theme, deals, surprise)');
    palInput.value = '';
    drawPalette();
    if (!pal.open) pal.showModal();
    palInput.focus();
  }
  safe('palette', () => {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopImmediatePropagation(); pal && pal.open ? pal.close() : openPalette(); }
    }, true);
  });

  // ----- 5. Sürükle-bırak istek listesi sırası (CSS `order`; React düğümleri taşınmaz) -----
  const ORDER_KEY = 'radar-mx-fav-order-v1';
  const itemKey = li => (li.querySelector('a[href]')?.getAttribute('href') || li.querySelector('strong')?.textContent || '').trim();
  function decorateShelf(ul) {
    const items = $$(':scope>li', ul).filter(li => itemKey(li));
    if (items.length < 2) return;
    ul.dataset.mxOrder = '1';
    const keys = items.map(itemKey);
    let order = applyOrder(keys, store.get(ORDER_KEY, []));
    const paint = () => items.forEach(li => { li.style.order = String(order.indexOf(itemKey(li))); });
    const save = () => store.set(ORDER_KEY, [...new Set([...order, ...store.get(ORDER_KEY, [])])].slice(0, 400));
    paint();
    for (const li of items) {
      if (li.querySelector(':scope>.mx-drag-handle')) continue;
      li.classList.add('mx-drag-item');
      li.style.position = li.style.position || 'relative';
      const h = document.createElement('button');
      h.type = 'button';
      h.className = 'mx-drag-handle';
      h.textContent = '⠿';
      h.setAttribute('aria-label', L('Sırayı değiştir: sürükle ya da Alt+ok tuşları', 'Reorder: drag or Alt+arrow keys'));
      h.style.cssText = 'position:absolute;top:8px;left:8px;z-index:4;width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:10px;background:var(--mx-glass-bg);color:var(--ink);cursor:grab;touch-action:none;font-size:15px';
      h.addEventListener('keydown', e => {
        if (!e.altKey || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
        e.preventDefault();
        order = stepId(order, itemKey(li), /Left|Up/.test(e.key) ? -1 : 1);
        paint(); save(); h.focus();
        toast(L('Yeni sıra: ', 'New position: ') + (order.indexOf(itemKey(li)) + 1) + '/' + order.length);
      });
      h.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        e.preventDefault();
        h.setPointerCapture(e.pointerId);
        li.classList.add('mx-dragging');
        buzz(10);
        const move = ev => {
          const over = document.elementsFromPoint(ev.clientX, ev.clientY).map(n => n.closest && n.closest('li.mx-drag-item')).find(n => n && n !== li && n.parentElement === ul);
          $$('.mx-over', ul).forEach(n => n.classList.remove('mx-over'));
          if (over) { over.classList.add('mx-over'); const next = moveId(order, itemKey(li), itemKey(over)); if (next.join() !== order.join()) { order = next; paint(); } }
        };
        const up = () => {
          h.removeEventListener('pointermove', move);
          h.removeEventListener('pointerup', up);
          h.removeEventListener('pointercancel', up);
          li.classList.remove('mx-dragging');
          $$('.mx-over', ul).forEach(n => n.classList.remove('mx-over'));
          save();
        };
        h.addEventListener('pointermove', move);
        h.addEventListener('pointerup', up);
        h.addEventListener('pointercancel', up);
      });
      li.append(h);
    }
    const wrap = ul.parentElement;
    if (wrap && !$('.mx-drag-note', wrap)) {
      const n = document.createElement('p');
      n.className = 'mx-drag-note';
      n.textContent = L('Rafı kendi sıranla diz: kapaktaki ⠿ tutamacını sürükle ya da Alt+ok tuşlarını kullan. Sıra yalnız bu cihazda tutulur.', 'Arrange your shelf: drag the ⠿ handle or use Alt+arrow keys. The order is kept on this device only.');
      wrap.insertBefore(n, ul);
    }
  }

  // ----- 6. Canlı sayı animasyonu (yalnız metin düğümünün değeri; React'in düğümü aynı kalır) -----
  const COUNT_SEL = '.tw-total, .favtabs small, .statgrid dd, #root>header nav em';
  const counted = new WeakSet();
  function countUp(el) {
    if (counted.has(el) || reduced()) return;
    const node = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.nodeValue));
    if (!node) return;
    const parsed = parseCountText(node.nodeValue, en() ? 'en' : 'tr');
    if (!parsed || parsed.value < 10) return;
    counted.add(el);
    const final = node.nodeValue;
    const t0 = performance.now();
    const dur = 900;
    const step = now => {
      if (!node.isConnected) return;
      const p = (now - t0) / dur;
      if (p >= 1) { node.nodeValue = final; return; }
      node.nodeValue = parsed.prefix + formatCount(parsed.value * easeOut(p), parsed.decimals, en() ? 'en' : 'tr') + parsed.suffix;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); countUp(e.target); } }), { threshold: 0.4 }) : null;

  // ----- 7. Görsel öncelikleri (LCP) ve ağır sayfa parçalarını önceden ısıtma -----
  const hosts = new Set();
  // Tembel yükleme ve decoding touch/perf modüllerinde zaten var; burada yalnız ilk büyük görsele öncelik ve görsel sunucularına preconnect.
  function tuneImages(scope) {
    let first = !$('img[fetchpriority=high]');
    for (const img of $$('img:not([data-mx-img])', scope)) {
      img.dataset.mxImg = '1';
      const r = img.getBoundingClientRect();
      if (first && r.top < innerHeight && r.width > 120 && r.height > 120) { img.setAttribute('fetchpriority', 'high'); img.loading = 'eager'; first = false; }
      try { const o = new URL(img.currentSrc || img.src).origin; if (o !== location.origin && hosts.size < 4 && !hosts.has(o)) { hosts.add(o); const l = document.createElement('link'); l.rel = 'preconnect'; l.href = o; l.crossOrigin = ''; document.head.appendChild(l); } } catch { /* data: gibi */ }
    }
  }
  let chunkList = null;
  const warmed = new Set();
  async function warm(prefix) {
    try {
      if (!chunkList) {
        const src = $$('script[type=module][src]').map(s => s.getAttribute('src')).find(s => /\/index-[^/]+\.js/.test(s));
        if (!src) return;
        chunkList = chunkNames(await (await fetch(src)).text());
      }
      for (const name of chunksFor(chunkList, prefix)) {
        if (warmed.has(name)) continue;
        warmed.add(name);
        const l = document.createElement('link');
        l.rel = 'modulepreload';
        l.href = BASE + 'assets/' + name;
        document.head.appendChild(l);
      }
    } catch { /* ağ yoksa sessizce vazgeç */ }
  }
  safe('prefetch', () => {
    const MAP = ['', 'Deals', 'Favorites', 'PlayerSpace'];
    const hint = ev => {
      const b = ev.target instanceof Element ? ev.target.closest('#root>header nav button, .bottom-nav button') : null;
      if (!b) return;
      const idx = navButtons().indexOf(b);
      const i = idx >= 0 ? idx : $$('.bottom-nav button').indexOf(b);
      if (i > 0 && MAP[i]) warm(MAP[i]);
    };
    document.addEventListener('pointerover', hint, { passive: true });
    document.addEventListener('touchstart', hint, { passive: true });
    document.addEventListener('focusin', hint);
    idle(() => { if (!navigator.connection || (!navigator.connection.saveData && !/2g/.test(navigator.connection.effectiveType || ''))) warm('Deals'); });
  });

  // ----- 8. Uygulama rozeti (hedef fiyata inen favori sayısı) ve kısayol dili -----
  safe('badge', () => {
    if (!('setAppBadge' in navigator)) return;
    const upd = () => {
      const n = badgeCount(store.get('radar-fav-v3', []));
      (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
    };
    upd();
    addEventListener('storage', upd);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') upd(); });
    setInterval(upd, 60000);
  });

  // ----- 9. Favori kalbi: anında geri bildirim (yerel kayıt zaten anında; burada yalnız dokunsal) -----
  safe('fav-haptics', () => {
    document.addEventListener('click', e => { if (e.target instanceof Element && e.target.closest('.favbtn')) buzz(12); }, true);
  });

  // ----- 10. İsteğe bağlı gerçek zamanlı fiyat (Supabase Realtime, kütüphanesiz) -----
  // Kapalı gelir: <meta name="radar-realtime" content="on"> ya da localStorage radar-mx-realtime="on" ister ve supabase/schema-v60-realtime.sql gerekir.
  safe('realtime', () => {
    const meta = $('meta[name=radar-realtime]');
    const on = (meta && meta.content === 'on') || store.get('radar-mx-realtime', 'off') === 'on';
    if (!on || typeof WebSocket === 'undefined') return;
    const KEY = 'sb_publishable_SjkjwIlJ_HFqd5hWhILF5g_6QJThaNO';
    let ws, hb, ref = 0, tries = 0;
    const send = (topic, event, payload) => ws.readyState === 1 && ws.send(JSON.stringify({ topic, event, payload, ref: String(++ref) }));
    const open = () => {
      if (document.visibilityState === 'hidden') { setTimeout(open, 15000); return; }
      ws = new WebSocket(`wss://dsosckshigzijnsxmlwh.supabase.co/realtime/v1/websocket?apikey=${KEY}&vsn=1.0.0`);
      ws.onopen = () => {
        tries = 0;
        send('realtime:public:store_offers', 'phx_join', { config: { postgres_changes: [{ event: 'UPDATE', schema: 'public', table: 'store_offers' }] } });
        hb = setInterval(() => send('phoenix', 'heartbeat', {}), 25000);
      };
      ws.onmessage = m => {
        let d; try { d = JSON.parse(m.data); } catch { return; }
        const change = d.payload && d.payload.data;
        if (d.event !== 'postgres_changes' || !change) return;
        window.dispatchEvent(new CustomEvent('radar:price-live', { detail: change }));
        const msg = priceDropMessage(change, en() ? 'en' : 'tr');
        if (msg) toast(L('Fiyat düştü · ', 'Price dropped · ') + msg);
      };
      ws.onclose = () => { clearInterval(hb); if (tries < 6) setTimeout(open, Math.min(60000, 2000 * 2 ** tries++)); };
      ws.onerror = () => ws.close();
    };
    open();
  });

  // ----- 11. AI oyun özeti ve "kime uygun" (Supabase fonksiyonu ai-summary; ANTHROPIC_API_KEY yoksa kart hiç görünmez) -----
  let aiOff = store.get('radar-mx-ai-off-until', 0) > Date.now();
  const aiMem = new Map();
  function gameFacts(modal) {
    const title = ($('h1, h2', modal)?.textContent || '').trim().slice(0, 120);
    const about = ($$('p', modal).map(p => p.textContent.trim()).filter(t => t.length > 60).slice(0, 3).join(' ') || '').slice(0, 1500);
    const chips = $$('.chip, .tag, .genrechip, .igdbchips span', modal).map(c => c.textContent.trim()).filter(t => t && t.length < 30).slice(0, 8);
    return { title, about, tags: chips };
  }
  function mountAi(modal) {
    if (aiOff || $('[data-dt-own=mx-ai]', modal)) return;
    const facts = gameFacts(modal);
    if (!facts.title) return;
    const box = document.createElement('section');
    box.className = 'mx-ai';
    box.dataset.dtOwn = 'mx-ai';
    box.setAttribute('translate', 'no');
    box.innerHTML = `<h3>✦ ${L('AI özeti: kime uygun?', 'AI summary: who is it for?')}</h3><div class="mx-ai-body"><button type="button" class="mx-chip mx-chip-add">${L('Özet oluştur', 'Generate summary')}</button></div>`;
    const anchor = $('.dt-tabs', modal);
    (anchor && anchor.parentElement ? anchor.parentElement : modal).insertBefore(box, anchor || modal.firstChild);
    const body = $('.mx-ai-body', box);
    const render = r => {
      body.replaceChildren();
      const p = document.createElement('p');
      p.textContent = r.summary;
      body.append(p);
      for (const [label, list] of [[L('Şunlara uygun', 'Good for'), r.good_for], [L('Pek uygun olmayabilir', 'Maybe not for'), r.not_for]]) {
        if (!Array.isArray(list) || !list.length) continue;
        const h = document.createElement('p'); const b = document.createElement('b'); b.textContent = label; h.append(b); body.append(h);
        const ul = document.createElement('ul');
        for (const s of list.slice(0, 4)) { const li = document.createElement('li'); li.textContent = String(s).slice(0, 160); ul.append(li); }
        body.append(ul);
      }
      const s = document.createElement('small');
      s.textContent = L('Yapay zekâ ile üretildi; hata içerebilir. Fiyat ve puan bilgisi için sayfadaki verilere bakın.', 'AI-generated and may contain mistakes. See the page for prices and scores.');
      body.append(s);
    };
    $('button', body).onclick = async () => {
      const key = facts.title + '|' + (en() ? 'en' : 'tr');
      if (aiMem.has(key)) return render(aiMem.get(key));
      body.innerHTML = '<div class="mx-ai-skeleton"></div><div class="mx-ai-skeleton" style="width:80%"></div><div class="mx-ai-skeleton" style="width:60%"></div>';
      try {
        const res = await fetch(FN + 'ai-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...facts, locale: en() ? 'en' : 'tr' }), signal: AbortSignal.timeout(25000) });
        if (res.status === 404 || res.status === 501 || res.status === 503) { aiOff = true; store.set('radar-mx-ai-off-until', Date.now() + 6 * 36e5); box.remove(); return; }
        const data = await res.json();
        if (!res.ok || typeof data.summary !== 'string') throw new Error(data.error || 'ai');
        aiMem.set(key, data);
        render(data);
      } catch {
        body.innerHTML = `<p>${L('Özet şu anda alınamadı.', 'The summary is unavailable right now.')}</p><button type="button" class="mx-chip mx-chip-add">${L('Tekrar dene', 'Retry')}</button>`;
        $('button', body).onclick = () => { box.remove(); mountAi(modal); };
      }
    };
  }

  // ----- Gözlemci: yalnız yeni eklenen düğümlere bakar -----
  const scan = debounce(() => {
    safe('views-ui', () => { if (scopeEl() && !$('.mx-views', scopeEl())) renderViews(); });
    safe('shelf', () => $$('ul.wishshelf:not([data-mx-order])').forEach(decorateShelf));
    safe('counts', () => io && $$(COUNT_SEL).forEach(el => { if (!counted.has(el) && !el.dataset.mxObs) { el.dataset.mxObs = '1'; io.observe(el); } }));
    safe('images', () => tuneImages(document));
    safe('ai', () => { const m = $('section.game-detail'); if (m) mountAi(m); });
  }, 120);
  const start = () => {
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    scan();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}
