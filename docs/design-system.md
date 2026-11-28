# Tasarım sistemi başvurusu

Tek kaynak yok: sistem, üst üste yüklenen katmanlardan oluşur ve **son yüklenen kazanır**. Bu belge hangi katmanın neyin sahibi olduğunu söyler. Yeni bileşen yazmadan önce buradaki sahibi kullanın.

## Katmanlar (yükleme sırası)
| Katman | Dosya | Sahip olduğu şey |
|---|---|---|
| Çekirdek | `index-*.css`, `index-*.js` | React uygulaması, yerleşim, form öğeleri |
| Tasarım sistemi | `design-system-20261122.css/js` | `--ds-*` jetonları (köşe, boşluk, gölge, tipografi, hareket eğrisi), tema (Klasik / gerçek siyah / Sade), yüksek kontrast, büyük yazı |
| Ortak arayüz takımı | `ui-kit-20261128.css/js` (bkz. `docs/ui-kit.md`) | SVG ikon seti, **toast / modal / sheet**, yazı tipi hiyerarşisi |
| Tema ve vurgu | `tema-20261128.*` | Vurgu rengi seçici, otomatik gün/gece, `--cd-accent` |
| Kart ve yazı | `kart-yazi-20261128.*`, `cards-20261122.*` | Kart düzeni, fiyat bloğu, rozetler |
| Genel cila | `genel-20261128.*` | Grafik renkleri (renk körü modu), **View Transitions sayfa geçişi**, geri sayım |
| Dokunmatik / PWA | `touch-20261128.*`, `mobile-20261122.*` | Alt gezinme, sheet süzgeçler, tembel görsel, `content-visibility` |
| **Modern katman** | `modern-20261128.css/js` | Bento ana sayfa, cam yüzey, kapak parıltısı, kaydırma animasyonu, eylem paleti, kısayollar, kayıtlı görünümler, sürükle-bırak istek listesi, AI özeti, rozet, gerçek zamanlı fiyat |

## Jetonlar
- **Renk:** `--bg`, `--ink`, `--muted`, `--line`, `--lime` (vurgu; tema seçicisiyle değişir), `--cd-accent` (karta/oyuna özel vurgu). Anlam renkleri yalnız fiyat/durum içindir: `--ds-good`, `--ds-warn`, `--ds-bad`.
- **Köşe:** `--ds-r-xs 6 · sm 10 · md 14 · lg 20 · pill 999` px. **Boşluk:** `--ds-sp-1..6` = 4·8·12·16·24·32 px.
- **Gölge:** `--ds-shadow-1/2/3`. **Hareket:** `--ds-ease: cubic-bezier(.2,.8,.2,1)`; süreler `--ui-dur-*` (ui-kit; azaltılmış harekette 0).
- **Modern katmanın ek jetonları** (yalnız `modern-20261128.css`te): `--mx-glass-bg`, `--mx-glass-blur` (14px), `--mx-glass-line`, `--mx-accent-soft` / `--mx-accent-line` (vurgudan `color-mix(in oklch)` ile türetilir, tema/vurgu değişince kendiliğinden uyar), `--mx-pop` (yüzen yüzey gölgesi).

## Kurallar
1. **Yeni toast / modal / sheet yazma.** `window.radarUI.toast|modal|sheet` kullan. (Modern katman toast için bunu kullanır; yalnız ui-kit yüklenmemişse kendi küçük yedeğine düşer.)
2. **Cam efekti ölçülüdür:** yalnız yüzen yüzeyler (menü, palet, bildirim, yardım penceresi). Sayfa zemini, kart ve liste satırı camlaşmaz. `prefers-reduced-transparency`, yüksek kontrast ve `data-lite` modunda düz zemine döner.
3. **Hareket:** her animasyon `prefers-reduced-motion` ve `html[data-reduce-motion=true]` altında kapanır. Kaydırma animasyonları `@supports (animation-timeline: view())` içinde; desteklemeyen tarayıcıda içerik zaten görünür.
4. **Sade (açık) ve Klasik/OLED (koyu):** renkleri sabit yazma, jeton kullan. Yeni yüzey için iki temada ve TR/EN'de ekran görüntüsü al (`node scripts/visual-check.mjs`).
5. **React düğümlerini silme/taşıma.** Katmanlar yalnız kardeş düğüm ekler, öznitelik/CSS ekler ya da `order` gibi React'in yönetmediği özellikleri değiştirir (sürükle-bırak sırası böyle).
6. **Dokunma hedefi ≥ 44 px**; odak halkası görünür; renk tek başına anlam taşımaz.
7. **Modern CSS:** container query (`.hs-genre-sec`, `.hs-strip`), `:has()` (favori satırı), `color-mix(in oklch)`, `@layer mx` (palet ve yardım penceresi bileşenleri). Katmanlı kurallar katmansız genel kurallara **yenilir**; bu yüzden palet girişinin odak çerçevesi gibi sayfa genel kurallarını ezmesi gereken parçalar katman dışındadır.

## Görsel doğrulama
`node scripts/visual-check.mjs` (Playwright kurulu olmalı): ana, Oyunlar ve Fırsatlar sayfalarını TR/EN × Klasik/Sade × masaüstü/mobil matrisinde açar (24 görüntü), mobilde yatay taşma, boş sayfa ve yakalanmamış hata denetler. `--update` görüntüleri `tests/visual/baseline/`e yazar; `--base` ile ImageMagick `compare` farkı bilgi olarak raporlanır (canlı veri değiştiği için çıkış kodunu yalnız yerleşim ihlalleri belirler).
