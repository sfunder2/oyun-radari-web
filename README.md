# Oyun Radarı

GitHub Pages yayın dosyaları. PlayStation Türkiye ürün bağlantısı ekleme, fiyat yenileme ve eşleşen oyunların platformlar arası karşılaştırması. Kayıtlı bağlantılar ziyaretçinin tarayıcısında saklanır. Tam PlayStation katalog akışı kapsam dışıdır.

## Android uygulaması

`android/` klasörü siteyi tam ekran açan küçük bir Android uygulamasıdır (WebView). `android/**` değiştiğinde **Android APK** iş akışı APK'yı derler ve `apk-N` etiketli bir GitHub Release olarak yayımlar. Her sürüm aynı anahtarla imzalanır, bu yüzden yeni APK eskisinin üzerine kurulur.

## Steam hesabı bağlama

Giriş yapan oyuncu Steam hesabını bağlayınca sahip olduğu oyunlar, oynama süreleri ve oyun başına açtığı başarımlar gösterilir. Steam şifresi ya da jetonu hiç alınmaz: oyuncu Steam'in kendi sayfasında onaylar, `steam-account` fonksiyonu dönüşü Steam'e geri sorarak (OpenID 2.0 `check_authentication`) doğrular ve yalnız SteamID'yi saklar.

- `supabase/linked-accounts-v1.sql`: kullanıcı başına tek satırlık `linked_accounts` tablosu. Satırı yalnız fonksiyon yazar; kullanıcı kendi satırını okuyabilir ve silebilir. `tests/linked-accounts-rls.sql` bunu doğrular (her şey geri alınır).
- `supabase/functions/steam-account`: `start` (Steam giriş adresi), `callback` (Steam dönüşü), `library`, `achievements&appid=`, `unlink`. Oyun listesi veritabanına yazılmaz; fonksiyon belleğinde 10 dakika tutulur.
- `scripts/steam-account.mjs`: doğrulama ve Steam Web API ayrıştırma, `tests/steam-account.test.mjs` ile sınanır.

Açmak için sırayla:

1. SQL Editor'da `supabase/linked-accounts-v1.sql` dosyasını çalıştır.
2. Fonksiyonu yayımla: `supabase functions deploy steam-account --no-verify-jwt`. Steam'den dönüş JWT taşımadığı için JWT doğrulaması kapalıdır; diğer işlemler oturum jetonunu fonksiyon içinde doğrular.
3. `STEAM_API_KEY` gizli anahtarı zaten tanımlı olmalı. İstenirse ayrı bir `STEAM_LINK_SECRET` eklenebilir; yoksa durum imzası service role anahtarından türetilir.

Steam'de profil ve "Oyun ayrıntıları" herkese açık değilse kütüphane boş döner; site bunu oyuncuya ayrıca söyler.

## Diğer ülkelerde fiyat

Oyun ayrıntısındaki "Diğer ülkelerde fiyat" paneli, seçilen mağazanın aynı ürününün Türkiye, ABD, Almanya, İngiltere, Polonya, Ukrayna, Hindistan ve Brezilya mağazalarındaki fiyatını gösterir. Veri veritabanına yazılmaz; panel açılınca `regional-prices` fonksiyonu mağazaları o an okur ve sonucu bellekte 1 saat tutar.

- `scripts/regional.mjs`: mağaza başına ülke parametreli okuyucular (Steam `cc`, Xbox `market`, GOG `countryCode`, Epic `country`, PlayStation yerel ayar başlığı) ve kur. `tests/regional.test.mjs` ile sınanır.
- PlayStation'da Avrupa ürün kimliği (EP...) TR, İngiltere, Polonya, Ukrayna ve Hindistan'da da geçerlidir; geçmediği ülkede oyunun concept sayfasından o ülkenin ürünü bulunur ve aynı ad + aynı konsol kuşağıyla eşleştirilir.
- Kur: USD, EUR, GBP TCMB döviz satıştan; PLN, UAH, INR, BRL open.er-api.com'dan.
- Yayımlama: `supabase functions deploy regional-prices` (JWT doğrulaması açık; site anon anahtarla çağırır).

## Özel domain

Site paketi `/oyun-radari-web/` tabanına göre derlenir; **Publish Oyun Radari** iş akışı yayından önce `scripts/relative-base.mjs` ile yolları göreli yapar. Böylece aynı paket hem `sfunder2.github.io/oyun-radari-web/` altında hem de özel domain'in kökünde çalışır (`tests/relative-base.test.mjs`).

Domain'i bağlamak için (aşağıda `ALANADI` yerine domain yazılır):

1. DNS kayıtları (alan adını aldığın yerde):
   - `@` (kök) için dört `A` kaydı: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - İstenirse IPv6 için dört `AAAA` kaydı: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `www` için `CNAME` → `sfunder2.github.io`
   - Cloudflare kullanılıyorsa bu kayıtlar "DNS only" (gri bulut) olmalı, yoksa GitHub sertifika çıkaramaz.
2. GitHub → repo **Settings → Pages → Custom domain**: `ALANADI` yaz, kaydet. Yayın GitHub Actions ile yapıldığı için repoya `CNAME` dosyası gerekmez; ayar buradan tutulur.
3. Sertifika hazır olunca (birkaç dakika–birkaç saat) aynı sayfada **Enforce HTTPS** işaretlenir. GitHub eski `sfunder2.github.io/oyun-radari-web/...` adreslerini kendiliğinden yeni domain'e yönlendirir.
4. Supabase → **Authentication → URL Configuration**: Site URL `https://ALANADI/`, Redirect URLs listesine `https://ALANADI/**` eklenir (kayıt ve şifre sıfırlama bağlantıları buraya döner).
5. `supabase/functions/{radar-services,regional-prices,steam-account}` içindeki `ALLOWED` listesine `https://ALANADI` eklenip fonksiyonlar yeniden yayımlanır.
6. Android: `MainActivity.java` içindeki `HOME`/`HOST`/`PATH` ve `AndroidManifest.xml` içindeki `android:host` yeni domain'e çevrilir; iş akışı yeni APK'yı yayımlar.

Not: tarayıcıda saklanan veriler (giriş oturumu, hesapsız kaydedilen listeler) adrese bağlıdır; yeni domain'de ilk açılışta yeniden giriş gerekir, hesaba senkronlanmamış yerel veriler yeni adrese taşınmaz.
