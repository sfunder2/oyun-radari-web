# Ortak arayüz takımı (ui-kit-20261128)

Diğer modüller (mobil, özellik, altyapı) yeni stil yazarken **jeton** kullanmalı; renk, boşluk ve süre değerleri sabit yazılmamalı.

## Jetonlar (`--ui-*`, `assets/ui-kit-20261128.css`)
- Boşluk (4/8 ritmi): `--ui-1` 4px, `--ui-2` 8, `--ui-3` 12, `--ui-4` 16, `--ui-5` 24, `--ui-6` 32, `--ui-7` 48, `--ui-8` 64
- Yüzey katmanları: `--ui-surface-0` (zemin) < `-1` (panel) < `-2` (yükseltilmiş) < `-3` (kaplama); `--ui-border`, `--ui-border-strong`
- Hareket: `--ui-dur-1..4` (120/200/320/520ms), `--ui-ease`, `--ui-ease-in`, `--ui-ease-spring`. Hareket azaltılınca süreler ~0'dır, ayrıca kural yazmaya gerek yok.
- Yazı: `--ui-font-body` (Manrope), `--ui-font-display` (Space Grotesk; başlık ve sayılar), `--ui-fs-xs..2xl` (clamp)
- Katman: `--ui-z-header` 80, `--ui-z-sheet` 300, `--ui-z-modal` 320, `--ui-z-toast` 360
- Mobil: `--ui-dock-h` (alt gezinme yüksekliği, ≤700px'te 72px) ve `--ui-safe-b` (safe-area). Toast bu iki değerin üstünde durur; mobil modül alt çubuğu değiştirirse yalnız `--ui-dock-h` değerini ezmesi yeter.
- Anlam renkleri: `--ui-good`, `--ui-warn`, `--ui-bad`, `--ui-info`; vurgu `--lime`.

## Bileşenler (`window.radarUI` ya da `import` ile)
```js
radarUI.toast("Kaydedildi", "good", { title, action: { label, onClick }, duration });   // good | warn | bad | info
radarUI.modal({ title, content, actions: [{ label, value, kind: "primary" | "danger" | "ghost" }] }).done  // Promise<value|undefined>
radarUI.sheet({ ... })        // mobilde alttan açılan sayfa (tutamaktan sürükleyerek kapanır), masaüstünde modal
radarUI.confirm({ title, message, danger })   // Promise<boolean>
radarUI.icon("heart", { fill: true, size: 18 })   // SVG metni; adlar: Object.keys(radarUI.ICONS)
```
Odak tuzağı, Esc, odağı geri verme ve `aria` öznitelikleri hazırdır. `radar:ui-kit` olayı kit yüklenince yayılır.
Kural: sınıf adı olarak `header`/`footer` gibi küresel olarak biçimlenen etiketleri bileşen içinde kullanma (`.ui-head`, `.ui-foot` kullanıldı).
