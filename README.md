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

## Şu an Twitch'te en çok izlenenler

Keşfet'te (Oyunlar) "Şu an Twitch'te en çok izlenenler" şeridi: canlı izleyici sayısına göre ilk 20 oyun, sıra numarası ve izleyici rozetiyle; karta dokununca oyunun ayrıntısı açılır. Listedeki oyunlar katalog kartlarında da "● 45 B izliyor" rozeti taşır. Yalnız kataloğumuzdaki oyunlar gösterilir; Just Chatting gibi oyun olmayan kategoriler atılır.

- `supabase/schema-v38-twitch-izlenenler.sql`: `twitch_top_games` tablosu (son turun anlık görüntüsü, en çok ~40 satır; herkes okur, yalnız toplayıcı yazar). Başka tabloya ve fonksiyona dokunmaz. Geri almak için `drop table if exists public.twitch_top_games;`.
- `scripts/twitch.mjs` ve `scripts/twitch-run.mjs`: Twitch Helix `games/top` sırası, her oyun için en çok 500 canlı yayının izleyici toplamı. Katalog eşleşmesi önce Twitch'in verdiği IGDB kimliğiyle (`game_ttb.igdb_id` üzerinden), sonra adla. `tests/twitch.test.mjs` ile sınanır.
- `.github/workflows/twitch-top.yml`: 30 dakikada bir çalışır. Oyun süresiyle aynı `TWITCH_CLIENT_ID` ve `TWITCH_CLIENT_SECRET` gizli anahtarlarını kullanır; yoksa ya da SQL kurulmamışsa iş sessizce atlanır.
- Arayüz `assets/twitch-20261101.js` modülüyle eklenir. Tablo yoksa ya da veri 6 saatten eskiyse şerit ve rozet görünmez, sitenin geri kalanı etkilenmez.

Açmak için: SQL Editor'da `supabase/schema-v38-twitch-izlenenler.sql` dosyasını çalıştır, sonra **Twitch top watched games** iş akışını elle bir kez başlat.
