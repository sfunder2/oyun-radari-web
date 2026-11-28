# Performans (hız) çalışması

Ölçüm: `node scripts/perf-measure.mjs --runs 5` (repo olduğu gibi) ve `--optimized` (GitHub Pages'in gerçekte yayınladığı,
dağıtım adımından geçmiş kopya). Playwright/Chromium, mobil = Slow-4G + CPU 4x, masaüstü = kablo. Harici servisler
(Supabase, fontlar) anında yanıtlanır; "Günün fırsatı" için gerçekçi örnek veri verilir. **Laboratuvar ölçümüdür, saha verisi değildir.**

| Ölçüm (5 koşunun ortancası) | Önce | Sonra |
|---|---|---|
| Mobil LCP | 5108 ms | 4080 ms |
| Mobil FCP | 1708 ms | 1656 ms |
| Mobil TBT (ana iş parçacığı bloklanması) | 194 ms | 128 ms |
| Masaüstü LCP | 1160 ms | 1068 ms |
| Masaüstü FCP | 352 ms | 292 ms |
| CLS (mobil / masaüstü) | 0.013 / 0 | 0.010 / 0 |
| İlk yükte istek sayısı | 84 | 46 |
| Render'ı engelleyen CSS dosyası | 41 | 2 |
| Aktarılan veri (gzip) | 604 KB | 585 KB |

## Ne değişti
- **Dağıtımda CSS birleştirme** (`scripts/build-perf.mjs`, `pages.yml` içinde): 40 küçük `*-2026….css` dosyası sırası bozulmadan tek
  `site-<hash>.css` olur. Depodaki dosyalar ve `index.html` aynı kalır; bu yüzden diğer işlerle çakışmaz, testler değişmez, paket bayatlayamaz.
  Ekran görüntüsü birleştirmeden önce/sonra piksel piksel aynıdır.
- **Kritik olmayan modüller boşta yüklenir** (`catalog-tools, hub, detail-tidy, detail, kisisel, visuals, motion`): `load` sonrası
  `requestIdleCallback` ile, eski sırayla. İlk boyama için gerekenler (`neon-gateway, home-search, cards, polish, mobile, design-system`) normal kalır.
- **Kabuk iskeleti**: `#root` içine HTML+inline CSS ile çizilen iskelet (JS gerekmez); uygulama bağlanınca React yerine koyar. Kritik CSS yalnızca bu iskelet kadardır (~1 KB, satır içi).
- **Core Web Vitals + bütçe** (`assets/perf-20261128.js`): LCP, INP, CLS, FCP, TTFB ölçülür; bütçe 2500 / 200 / 0.1 / 1800 / 800. Değerler yalnızca cihazda
  (`window.__radarVitals`, `sessionStorage['radar-vitals']`); bütçe aşılırsa konsola `[perf-budget]` uyarısı. `?perf=1` ekranda rozet gösterir. Sunucuya veri gitmez.
  CI tarafı: `tests/perf.test.mjs` kritik yol bütçesini (engelleyen CSS gzip < 80 KB, giriş JS gzip < 200 KB) denetler.
- **Veri tasarrufu modu**: tarayıcı Veri Tasarrufu, 2G/slow-2g veya downlink < 0.7 Mbps ise otomatik açılır; animasyon, bulanıklık, gölge kapanır, görseller
  geç/düşük öncelikle yüklenir; alttaki çipten kapatılır. `?lite=1|0` veya `radarLite.set(true|false|null)` ile elle yönetilir.
- **Service worker**: yalnızca adı içerik özetiyle biten dosyalar (`index-BplIVz6G.js` gibi, asla değişmez) önce önbellekten verilir; tarihli adlar (`cards-20261122.js`) önbelleğe alınmaz.

## Zaten var olanlar (bu iş değiştirmedi)
- Arama: ana uygulamada 150 ms debounce + `AbortController` (eski istek iptal, eski sonuç yazılmaz); katalog araçlarında 280 ms debounce.
- Üçüncü taraf: yalnızca Google Fonts (zaten `preload`+`onload`, `display=swap`) ve YouTube (iframe yalnızca oynat tıklanınca oluşur).
- Rota bazlı kod bölme: Deals, Favorites, PlayerSpace vb. zaten ayrı parçalar.

## Bu depodan yapılamayanlar (dürüst not)
- **Cache-Control / ETag / Brotli**: statik dosyalar GitHub Pages'ten gelir; başlıkları (gzip, ETag, `max-age=600`) GitHub belirler, depodan değiştirilemez. Brotli için bir CDN (ör. Cloudflare) önüne konmalı.
- **API brotli ve sayfalama**: veri Supabase / Neon / Mac mini PostgREST'ten gelir; sıkıştırma ve `limit/offset` bu servislerde. Ana liste zaten `page_size`/`limit` kullanıyor.
- Saha (gerçek kullanıcı) verisi için `__radarVitals` değerlerini toplayan bir uç nokta gerekir; gizlilik için şimdilik eklenmedi.
