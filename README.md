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

## Admin paneli: site sağlığı

`supabase/schema-v27-admin-saglik.sql` ikinci bir yönetici RPC'si ekler: `admin_site_health()`. Panel bunu `admin_sync_stats()` ile yan yana çağırır; kurulu değilse yalnız "Site sağlığı" bölümü uyarı gösterir. Gösterilenler: veritabanı boyutu (500 MB sınırına karşı) ve en büyük tablolar, hesap/favori/fiyat alarmı/Steam bağlantısı sayıları, `search_games` ortalama ve en yavaş süresi (pg_stat_statements), son 7 günün mağaza başına fiyat değişikliği sayısı (`schema-v28-fiyat-degisim-sayaci.sql`: `price_change_daily` tablosu, `ps_products` ve `store_offers` üzerinde deyim başına çalışan sayaç tetikleyicisi) ve her Supabase Cron işinin son 24 saatteki başarı/hata sayısı. Büyük tablolar sayılmaz; boyut ve satır tahmini katalogdan okunur.

Açmak için SQL Editor'da sırayla `supabase/schema-v27-admin-saglik.sql` ve `supabase/schema-v28-fiyat-degisim-sayaci.sql` dosyalarını çalıştır.

## Mağaza fiyat geçmişi

`supabase/schema-v29-magaza-fiyat-gecmisi.sql`, Steam, Xbox, Switch, Epic ve GOG için `offer_price_history` tablosunu kurar (PlayStation'daki `ps_price_history` ile aynı biçim: `price`, `base_price`, `low_price`). `store_offers` üzerindeki iki deyim tetikleyicisi yeni ürün eklenince ve fiyatı değişince o güne bir nokta yazar; toplayıcı kodu değişmez. 365 günden eski noktaları her gece `oyun-radari-offer-history-prune` cron işi siler.

## Arkadaşla ortak liste

`supabase/schema-v34-ortak-liste.sql` tek bir `party_lists` tablosu kurar (liste başına tek satır; oyunlar en çok 30, oy veren en çok 20, jsonb içinde). Tablo istemcilere tamamen kapalıdır; listeler yalnız kimliği bilen `party_get` ve `party_update` uçlarıyla okunur ve değiştirilir, `party_create` için giriş gerekir (hesap başına en çok 10 liste). Liste kimliği sunucuda üretilen 122 bit rastgele bir koddur; sahibin hesabı ve oy verenlerin tarayıcı anahtarı yanıtlarda dönmez. 60 gün kullanılmayan listeleri `oyun-radari-party-prune` cron işi her gece siler. `tests/party-lists-rls.sql` erişim kurallarını doğrular (her şey geri alınır).

Açmak için SQL Editor'da `supabase/schema-v34-ortak-liste.sql` dosyasını çalıştır. Arayüz `assets/party-20261030.js` modülüyle eklenir (kaynak: oyun-radari `app/Party.tsx`, `scripts/inject-party.mjs`); SQL kurulmadan sayfa açılırsa "Ortak liste şu an güncellenemedi" uyarısı görünür, sitenin geri kalanı etkilenmez.

## Oyun süresi (IGDB)

Kartlarda ve oyun ayrıntısında oyunun bitirme süresi, Keşfet'te "Oyun süresi" filtresi (Kısa: 8 saate kadar, Orta: 8–20, Uzun: 20–50, Çok uzun: 50 saatten fazla). Süreler IGDB'nin "time to beat" verisidir (ana hikâye, ana + yan içerik, tamamlama); HowLongToBeat'in resmi API'si olmadığı için kullanılmaz. Kova "ana + yan içerik" süresine göre seçilir, yoksa ana hikâye süresine göre.

- `supabase/schema-v35-oyun-suresi.sql`: `game_ttb` tablosu (başlık anahtarı başına tek satır, herkes okur, yalnız toplayıcı yazar), `ttb_ok()` filtre yardımcısı ve canlı arama fonksiyonlarına (`search_games_s2/_s/_t`, `search_market_s/_d`) yerinde eklenen tek `ttb` koşulu. Filtre seçilmediğinde arama değişmez. Geri almak için `schema-v35-oyun-suresi-geri-al.sql`.
- `scripts/ttb.mjs` ve `scripts/ttb-run.mjs`: Steam kimliği olan oyunlar IGDB `external_games` ile toplu eşlenir, kalanlar adla aranır ve başlık anahtarı birebir aynıysa kabul edilir. Bulunamayanlar 30 gün sonra yeniden denenir. `tests/ttb.test.mjs` ile sınanır.
- `.github/workflows/ttb.yml`: 6 saatte bir çalışır. `TWITCH_CLIENT_ID` ve `TWITCH_CLIENT_SECRET` Actions gizli anahtarları gerekir (dev.twitch.tv'de ücretsiz uygulama); yoksa iş sessizce atlanır.
- Arayüz `assets/ttb-20261101.js` modülüyle eklenir (kaynak: oyun-radari `app/ttb-parts.tsx`, `scripts/inject-ttb.mjs`). SQL kurulmadan sayfa açılırsa rozet ve panel görünmez, sitenin geri kalanı etkilenmez.

Sıralama ("Süre: kısadan uzuna" / "uzundan kısaya") için `supabase/schema-v36-oyun-suresi-siralama.sql` (`ttb_min()` ve `search_games_t`, `search_market_s/_d` sıralamasına iki satır; süresi olmayanlar sonda; geri alma: `schema-v36-oyun-suresi-siralama-geri-al.sql`). Menü seçenekleri oyun-radari `scripts/inject-ttb-sort.mjs` ile eklenir.

Açmak için sırayla: SQL Editor'da `supabase/schema-v35-oyun-suresi.sql` dosyasını çalıştır, Twitch anahtarlarını ekle, **Game length (IGDB time to beat)** iş akışını elle bir kez başlat.

## Oyun puanları (IGDB)

Kartlarda IGDB oyuncu puanı rozeti (en az 5 oy varsa), oyun ayrıntısında oyuncu ve eleştirmen puanı paneli (0–100, oy ve eleştiri sayısıyla), Keşfet sıralamasında "Oyuncu puanı: en yüksek". Mevcut "En yüksek puan" sıralaması Metacritic/OpenCritic'e göre kalır.

- `supabase/schema-v39-oyun-puanlari.sql`: `game_igdb_score` tablosu (başlık anahtarı başına tek satır, herkes okur, yalnız toplayıcı yazar), `igdb_user_rank()` ve `search_games_t`, `search_market_s/_d` sıralamasına "userScore" satırı. Sıralama az oylu uç puanları 70'e doğru çeker: (oy × puan + 10 × 70) / (oy + 10); puanı olmayanlar sonda. Geri almak için `schema-v39-oyun-puanlari-geri-al.sql`. `game_ttb` ve süre eklemelerine dokunmaz.
- `scripts/igdb-score.mjs` ve `scripts/igdb-score-run.mjs`: eşleştirmeyi yeniden yapmaz, oyun süresi toplayıcısının `game_ttb.igdb_id` değerini okur ve IGDB `games` uç noktasından 500'lük parçalarla puanları alır. Puanlar 7 günde bir yenilenir. `tests/igdb-score.test.mjs` ile sınanır.
- `.github/workflows/igdb-score.yml`: günde bir çalışır, aynı `TWITCH_CLIENT_ID` ve `TWITCH_CLIENT_SECRET` anahtarlarını kullanır.
- Arayüz `assets/score-20261101.js` modülüyle eklenir (kaynak: oyun-radari `app/score-parts.tsx`, `scripts/inject-score.mjs`). SQL kurulmadan sayfa açılırsa rozet ve panel görünmez, sitenin geri kalanı etkilenmez.

Açmak için sırayla: SQL Editor'da `supabase/schema-v39-oyun-puanlari.sql` dosyasını çalıştır, **Game ratings (IGDB)** iş akışını elle bir kez başlat.

## Seri ve DLC (IGDB)

Oyun ayrıntısında iki bölüm: **Serideki diğer oyunlar** (IGDB serisi, çıkış yılına göre zaman çizelgesi; "Bu oyun" işaretli) ve **DLC ve genişlemeler** (DLC, genişleme, bağımsız genişleme; 6'sı görünür, "Tümünü göster" ile en yeni 60'a kadar). Açılan oyun bir ek paketse ana oyunu da gösterilir. Katalogda bulunan oyun ve DLC'ler (başlık anahtarıyla, PlayStation ya da diğer mağazalar) fiyatıyla gösterilir ve tıklanınca kendi ayrıntısı açılır.

- `supabase/schema-v40-seri-dlc.sql`: yalnız yeni bir `game_family` tablosu (başlık anahtarı başına tek satır, herkes okur, yalnız toplayıcı yazar). Canlı fonksiyonlara dokunmaz. Geri almak için `schema-v40-seri-dlc-geri-al.sql`. Gerekli: `schema-v35-oyun-suresi.sql`.
- `scripts/family.mjs`, `scripts/family-run.mjs`: IGDB kimliğini oyun süresi tablosundan (`game_ttb.igdb_id`) alır, oyunları yeniden eşleştirmez. Seri yoksa marka (franchise) kullanılır. Seri üyeleri yalnız konsol ve PC oyunlarıdır (ana oyun, yeniden yapım, remaster). Her oyun 30 günde bir yenilenir. `tests/family.test.mjs` ile sınanır.
- `.github/workflows/family.yml`: 6 saatte bir (oyun süresinden farklı dakikada), tur başına en çok 3000 oyun. Oyun süresiyle aynı `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` anahtarlarını kullanır; tablo ya da anahtar yoksa sessizce atlanır.
- Arayüz `assets/family-20261101.js` ve `.css` modülüyle eklenir. IGDB serisi yoksa ya da SQL kurulmamışsa eski "Seri zaman çizelgesi" (ada göre tahmin) aynen görünür; DLC bölümü görünmez.

Açmak için sırayla: SQL Editor'da `supabase/schema-v40-seri-dlc.sql` dosyasını çalıştır, **Series and DLC (IGDB)** iş akışını elle bir kez başlat (oyun süresi toplayıcısı en az bir kez çalışmış olmalı).

## Çıkış tarihi ve fragman (IGDB)

Mağazada tarihi olmayan ya da yer tutucu tarih gösteren yaklaşan oyunların tarihi IGDB'den tamamlanır; fragmanı olmayan oyunlara IGDB'deki YouTube fragmanı eklenir. Mağaza tabloları değişmez, düzeltme arayüzde yapılır.

- `supabase/schema-v42-igdb-cikis-fragman.sql`: `game_igdb_info` tablosu (başlık anahtarı başına tek satır: en erken çıkış ve kesinliği, mağaza ailesi başına kesin tarih, YouTube fragman kimliği). Herkes okur, yalnız toplayıcı yazar. Geri almak için `schema-v42-igdb-cikis-fragman-geri-al.sql`.
- `scripts/igdb-release.mjs`, `scripts/igdb-release-run.mjs`, `.github/workflows/igdb-release.yml`: günde bir çalışır. Yaklaşan oyunlar Steam kimliğiyle ya da adla (aynı adlı eski oyun değil, yenisi) eşlenir; katalogdaki oyunlar oyun süresi toplayıcısının bulduğu IGDB kimlikleriyle 14 günde bir tazelenir. Oyun süresiyle aynı `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` anahtarlarını kullanır. `tests/igdb-release.test.mjs` ile sınanır.
- Arayüz `assets/igdb-20261101.js/.css` modülüyle eklenir (`releases-20261101.js` ve ana paketteki takvim bunu kullanır). Kurallar: tarihsiz satıra aynı platformun IGDB kesin tarihi yazılır, yoksa "2027 3. çeyrek" gibi dönem bilgisi gösterilir; Nintendo'nun 31 Aralık yer tutucusu IGDB tarihiyle değişir ya da yalnız yıl gösterilir; Xbox satırında IGDB'nin Xbox tarihi tercih edilir; Steam ve PlayStation tarihlerine dokunulmaz. Geri sayımda "Tarih IGDB'den" etiketi ve "Fragmanı izle" düğmesi, oyun ayrıntısında PlayStation fragmanı yoksa YouTube fragmanı (çerezsiz alan adı, yalnız tıklayınca yüklenir). SQL kurulmadan sayfa açılırsa her şey eskisi gibi çalışır.

Açmak için sırayla: SQL Editor'da `supabase/schema-v42-igdb-cikis-fragman.sql` dosyasını çalıştır, **Release dates and trailers (IGDB)** iş akışını elle bir kez başlat.
