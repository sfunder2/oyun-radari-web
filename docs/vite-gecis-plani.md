# Vite + TypeScript kaynak yapısına geçiş planı

**Durum: bilerek ŞİMDİ yapılmadı.** Depo derlenmiş çıktı gibi duruyor (`assets/index-*.js` ham paket, kaynak yok; her özellik `assets/<ad>-<tarih>.js/.css` eki olarak React paketinin üstüne biniyor). Kaynak yapısına geçmek bütün dosyaları değiştirir ve aynı anda açık olan işlerle (`release/mega-update`) kesin çakışır. Geçiş, açık işler birleşip dondurulduktan sonra tek başına bir sürüm olarak yapılmalı.

## Önkoşullar
1. `release/mega-update` ana dala birleşti, açık dal yok (ya da hepsi dondurulmuş).
2. Paketin kaynağı bulundu. **En büyük risk budur:** `assets/index-BplIVz6G.js` derlenmiş. Kaynak (React bileşenleri) başka bir depoda ya da yerel bir klasörde duruyorsa oradan alınmalı; yoksa paket kaynağa "geri çevrilemez", yalnızca ekler (aşağıdaki Aşama 2) taşınır ve paket olduğu gibi kalır.
3. Dağıtım sözleşmesi yazıldı: GitHub Pages `/oyun-radari-web/` altında, `index.html` elle bakımlı satır içi `<style>` ve `<script>` blokları içeriyor; hangilerinin üretilen çıktıdan, hangilerinin elle yazıldığından emin olunmalı.

## Aşamalar (her biri ayrı PR, her biri geri alınabilir)
| # | Aşama | Çıktı | Doğrulama |
|---|---|---|---|
| 0 | Dondurma ve envanter | `assets/` içindeki hangi dosya hangi sürümde yüklü (`index.html` bağlantılarından), kullanılmayan eski karma dosyaların listesi | `scripts/check-publish.mjs` yeşil |
| 1 | Araç zinciri yan yana | `package.json`e `vite`, `typescript` (devDependencies); `vite.config.ts` ile `base: '/oyun-radari-web/'`, çıktı `dist/`. **Mevcut `assets/` dokunulmaz.** | `npm run build` boş bir `src/main.ts` ile geçer |
| 2 | Ekleri kaynağa taşı | Her `assets/<ad>-<tarih>.js` → `src/layers/<ad>.ts` (saf yardımcılar ayrı dosya: zaten `tests/*.test.mjs` bunları içe aktarıyor). CSS → `src/layers/<ad>.css`. Tarihli dosya adı yerine içerik karması; `index.html`deki elle yazılan `<link>`/`<script>` listesi `index.html` şablonuna girer | Aynı ekran görüntüsü matrisi (`scripts/visual-check.mjs`) önce/sonra aynı |
| 3 | Tür güvenliği | `// @ts-check` ile başla, sonra `.ts`; öncelik: saf yardımcılar (fiyat, sıralama, tarih) | `tsc --noEmit`, mevcut 440+ test |
| 4 | Paket kaynağı | Madde 2'deki kaynak bulunduysa React uygulaması `src/app/` altına; bulunmadıysa bu aşama atlanır ve paket `public/legacy/` altında dondurulur | Tam tarayıcı taraması |
| 5 | Dağıtım | `pages.yml` `npm ci && npm run build` sonrası `dist/`i yayımlar; SW ve manifest `public/`ten kopyalanır | `pages-smoke.yml` ve `check-publish` yeşil |

## Dikkat edilecekler
- **Service worker kapsamı** (`/oyun-radari-web/`) ve `manifest.webmanifest` yolları değişmemeli; `sw.js` karma adlı dosyaları önbelleğe almıyor (yalnız çevrimdışı sayfa), bu yüzden risk düşük.
- **`?v=` sorgu parametreleriyle** önbellek kırma yerine içerik karmasına geçilince `index.html` her derlemede değişir; `Cache-Control` GitHub Pages'te sabit (10 dk), bu yüzden eski HTML + yeni dosya adı uyumsuzluğu olmaz ama eski HTML'in eski dosyaları 404 verebilir. Çözüm: bir sürüm boyunca eski karma dosyaları da yayımda tut.
- `import map` ve `neon-gateway-*.js` gibi elle yazılmış satır içi parçalar derlemeye girmeden önce `index.html` şablonuna taşınmalı.
- `tests/*.test.mjs` doğrudan `assets/*.js` dosyalarını içe aktarıyor; yol değişince hepsi güncellenmeli (Aşama 2'nin en sıkıcı kısmı).
- Geçişten önce `docs/performance.md`deki Core Web Vitals bütçeleri ölçülüp kaydedilmeli; geçiş sonrası aynı bütçeler tutmalı.

## Ne kazanılır?
Tarih ekli dosya adı yerine karma, ölü kod ayıklama, tür denetimi, tek `npm run dev` ile sıcak yenileme, katmanların birbirini ezmesinin (son yüklenen kazanır) yerine açık CSS `@layer` sıralaması. Ne kazanılmaz: kullanıcıya görünen bir özellik yok; bu yüzden yalnızca açık işler dindiğinde değer.
