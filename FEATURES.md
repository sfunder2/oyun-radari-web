# Oyun Radarı 2.0 — İstenen geliştirmelerin durumu

Bu dosya, 23 Ekim 2026 sürümünde gerçekten çalışan davranışı ve dış bağımlılıkları açıklar. Kişisel kayıtlar cihazda tutulur; giriş yapan oyuncunun kayıtları ayrıca yalnız kendisinin okuyabildiği hesap satırına senkronlanır. Açık topluluk paylaşımları Supabase'de tutulur. Eksik veri üretilmez.

## Görsel deneyim

| İstek | Uygulama |
|---|---|
| Holografik / 3D kart | Fare konumuyla sınırlı perspektif eğimi ve ışık katmanı; dokunmatik ve azaltılmış harekette kapalı. |
| Akışkan tipografi | Ana başlık, bölüm, kart, modal ve metinlerde clamp ile sürekli ölçek. |
| Görsel tür filtreleri | Keşfet ve Fırsatlar'da arama çubuğunun altında her zaman görünen tür şeridi (Aksiyon, Macera, RPG, Strateji, Simülasyon, Spor, Yarış, Bağımsız, Rahat, MMO). Türler PlayStation Store'un kendi tür listesinden (oyun-radari-web refresh-genres, schema-v19-turler.sql) ve Steam eşleşmesinden gelir. Xbox, Switch, Epic ve GOG tekliflerinde mağazanın kendi tür ve etiketleri de kullanılır (schema-v20-magaza-turleri.sql). |
| Oyuncu tarzı (persona) | Kayıt formunda veya ilk girişte en çok 3 tarz seçilir (Hikâye avcısı, Aksiyon tutkunu, Stratejist, Kâşif, Rekabetçi, Rahat oyuncu, Birlikte oynayan, Gerilim seven, Bağımsız ruh). Seçim hesaba senkronlanır, Keşfet'teki şeritten düzenlenir. |
| Sana göre sıralama | Tarz seçilince Keşfet varsayılan olarak "Sana göre" sıralanır: tarzın türleri ve Steam etiketleri puanla birlikte öne çekilir (supabase/schema-v16.sql). Uyan kartlarda "Tarzına uygun" etiketi görünür; favori yoksa öneri şeridi de tarzı kullanır. |
| Dergi inceleme düzeni | Oyun dosyasında asimetrik görsel, büyük alıntı, serif metin, kaynak etiketi ve kişisel editör notu. Steam özeti bağımsız inceleme gibi sunulmaz. |
| 90+ Metacritic parlaması | Sadece gerçek Metacritic puanı 90+ olduğunda altın çerçeve/parlama. |
| Retro yükleme sanatı | Kodla çizilmiş özgün piksel yolcu ve yürüyüş animasyonu; oyun ipuçları. |
| Zen | Kapak odaklı gezinme; kalıcı çıkış düğmesi ve Escape. |
| Kapak fragmanı | Fareyle kapakta kısa bir an durunca sessiz PlayStation fragmanı yumuşakça açılır; fragmanı olmayan kapaklarda yavaş yakınlaşma ve ışık geçişi. Dokunmatik ve azaltılmış harekette kapalı. |
| Platform rozetleri | Kapakta oyunun eşleşmiş teklifi olan mağazalar (PS, Xbox, Steam, Switch) renkli cam rozetlerle gösterilir. |
| Sinema bantları | Fragman üzerinde sinematik bantlar ve okurken küçük oynatıcı. |
| Negatif boşluk | Uyumlu geniş aralıklar, rahat filtreler ve okuma sütunu. |
| Glitch | Cyberpunk/Sci-Fi başlıklarda kısa, hafif hover efekti. |
| Maske / parallax | Katmanlı modal arka planı, kaydırmaya bağlı kapak ve maskeli/sticky resmî görsel. |

## Akıcı kullanım

| İstek | Uygulama |
|---|---|
| Quick Look | Karttaki göz düğmesiyle mevcut sayfada oyun dosyası. |
| Ctrl/Cmd+K | Klavye ile komut araması, oklar, Enter ve Escape; odak yönetimi. |
| Kart aksiyonları | Favori, oynadım, iki oyun kıyasına ekle ve hızlı bakış. |
| Mobil alt menü | Beş ana hedef ve güvenli alan boşluğu. |
| Kaydırma jesti | Sağa favori, sola ilgilenmiyorum; 85px eşik, dikey jest koruması, gizlemeyi geri alma. |
| Kaldığın yer | Modal açılışında liste korunur; tarayıcı Geri modalı kapatır ve kaydırma konumunu geri getirir. Sekme gezinmesi History API kullanır. |
| Okuma süresi | Doğrulanmış metnin kelime sayısından hesaplanan yaklaşık süre. |
| Sticky TOC | Oyun özeti, puan, geçmiş ve sistem gereksinimlerine kayan içindekiler. |
| İki oyun karşılaştırma | En çok iki seçimin puan, fiyat, dil, tür, yıl ve PC gereksinimleri yan yana. |
| TL/USD/EUR | TCMB döviz satış kurları; olmayan kurda sahte dönüşüm yapılmaz. Kart komisyonu dahil değildir. |
| Sadede gel | Doğrudan puan/fiyat bölümüne geçiş. |
| Breadcrumb | Ana sekme ve oyun dosyasında konum takibi. |
| Terim ipuçları | Metascore, Rogue-like ve kaynak açıklamalarında erişilebilir başlık ipuçları. |
| Boş arama | Benzer yazım araması ve gerçek yüksek puanlı katalogdan alternatifler. |
| İlerlemeli profil | İlk girişte ruh hali, birkaç keşiften sonra isteğe bağlı favori tür sorusu. |
| Okunabilir koyu tema | Kırık beyaz metin, ölçülü kontrast, renk yerine yazı/ikon desteği. |
| Taslak uyarıları | Günlük/inceleme taslağında çıkış ve uygulama içi gezinme uyarısı. |
| Akıllı sıralama | Gerçek inceleme sayısına göre tartışma; puan >=80 ve 1–30 OpenCritic incelemesi olanlar. Az bilinirlik iddia edilmez. |
| Video PiP | Desteklenen tarayıcıda kullanıcı düğmesiyle PiP; ayrıca kaydırırken uygulama içinde küçük oynatıcı. |
| Tam satır tıklama | Etkileşimli alt öğeleri bozmadan satırın boş alanından ve Enter ile hızlı bakış. |

## Etkileşim ve oyunlaştırma

| İstek | Uygulama |
|---|---|
| Günlük seri | Türkiye gün sınırı, günde tek kayıt ve arada gün kaçırınca sıfırlama. |
| XP / seviye | Tekrarlı tıklamalarla XP çoğaltılamaz; kişisel, 1–99 seviye. |
| Rozetler | Gerçek kişisel ziyaret, tür, tamamlanan oyun, seri ve Top 10 eşikleri. |
| Hype | Hesap başına oyun başına en fazla 5 ortak puan; girişsiz heyecan yalnız cihazda. Tek ortak istekle yüklenir. |
| Ne oynasam testi | Dört soru; ruh hali, mağaza (PlayStation, Steam, Xbox, Switch, Epic, GOG ya da hepsi), puan ve varsa kişisel süre kayıtları. |
| Sürpriz slot | Gerçek katalog kapaklarından rastgele seçim; bahis/ödül yok. |
| Oyun radarı | Alanım > Oyun radarı: dönen radarda indirimdeki oyunlar (yeşil) ve 45 gün içinde çıkacak oyunlar (mavi) parlayan nokta olarak görünür; dokununca oyun kartı açılır. Yeni sorgu yok: Fırsatlar'ın indirim listesi ve takvim tablosu okunur, 10 dk saklanır. Ayrı modül: assets/radar-20261030.js (kaynak: oyun-radari scripts/inject-radar.mjs). |
| Günün oyunu | Her mağazadan sırayla seçilen yüksek puanlı oyunlar; oyuncu tarzı seçildiyse tarza uyanlar. Tarihe bağlı günlük seçim. |
| Fiyat tahmin oyunu | Oyun sayfasında "Bu oyun 30 gün içinde indirime girer mi?" tahmini; yalnız giriş yapan oyuncu, şu an indirimde olmayan ve fiyat geçmişi tutulan oyunlarda. Tahminler hesap satırında (radar_user_data) durur, yeni tablo yok. Sonuç, kart ya da Alanım > Tahminlerim açılınca mevcut fiyat geçmişinden tek ürünlük tarih aralıklı sorguyla bulunur (tahmin başına en çok 12 saatte bir, tek seferde en çok 3). Doğru tahmin 30 XP; İlk Kehanet ve İndirim Kâhini rozetleri. Kaynak: oyun-radari app/Predict.tsx, scripts/inject-predict.mjs. |
| Versus | Ortak oy, kullanıcı başına tek seçim; yüzdeler oy verdikten sonra açılır. |
| Easter egg | “do a barrel roll” komutu; azaltılmış hareket tercihi uygulanır. |
| Backlog görevi | Gerçek kişisel bitirme oranı, oynadım işaretinde konfeti. |
| Yorum oylama | Hesaba bağlı yukarı/aşağı oy ve net oyla sıralama. |
| Topluluk hedefi | Son 7 gündeki açıkça paylaşılmış favori etkinlikleri; otomatik özel veri paylaşımı yok, tekrar kayıt engeli var. |
| Top 10 | Sürükle ve oklarla sırala, PNG dışa aktar; isteğe bağlı açık liste paylaşımı. |
| Mikro ses | Web Audio ile özgün kısa ton; başlangıçta kapalı. |
| Yükleme trivia | Dönen oyun/veri ipuçları. |
| Başarım bildirimi | Ekran içi, kapatılabilir başarı/toast mesajları. |
| Roadmap | Hesaba bağlı ortak özellik oyları. |
| Sanal raf | Kişisel favori kapakları, raf dokusu ve bitirme işaretleri. |
| Avatar kilitleri | XP ile açılan özgün piksel karakterler; seviye gerilemez. |
| Exit intent | Birkaç keşiften sonra, form odağında değilken seyrek ve engellemeyen veda mesajı. |

## Keşif ve içerik

| İstek | Uygulama / bağımlılık |
|---|---|
| Sonsuz tavsiye | Tür/stüdyo/renk yakınlığı; veri eksikse doğrulanmış yüksek puanlı alternatifler. |
| Konsept etiketleri | Steam'in gerçek etiketleri ve kişisel/topluluk etiketleri. |
| Stüdyo sayfaları | Geliştiriciye göre sunucu filtresi ve yıllara göre zaman çizelgesi; daha fazla yükleme. |
| Ne kadar sürer | Kullanıcının günlüğe girdiği süre tahminine göre <=5 veya >=100 saat. Lisanslı genel süre kaynağı henüz bağlı değil. |
| Tematik koleksiyonlar | Rahat oyunlar, doğrulanmış Co-op, Competitive, Cyberpunk etiketleri. |
| Bağlantı grafiği | Gerçek tür/geliştirici ve varsa renk verisinden etkileşimli bağlantılar. Görsel yapay zekâ benzerliği iddia edilmez. |
| Film/dizi çaprazlaması | Seçilmiş oyunlarda açıkça tematik Radar önerileri. |
| Soundtrack | Spotify bağlantısından gerçek embed; API arama ve parça önizleme kodu hazır. API için SPOTIFY_CLIENT_ID ve SPOTIFY_CLIENT_SECRET gerekiyor. Önizleme her parçada sunulmayabilir. |
| Zaman tüneli | Yıl slider'ı ve Steam PC çıkış yılı filtresi. |
| Konsept sanatı galerisi | Resmî ekran görüntüleri ayrı etiketli; kullanıcının izinli konsept görsellerini özel galerisine eklemesi. Lisanslı genel konsept sanat kataloğu henüz yok. |
| Hikâye sırası | Resident Evil için Village'e kadar genel rota; kaynak bağlantısı ve 2/3 örtüşme notu. Diğer serilerde çıkış zaman çizelgesi var; kapsamlı tüm-seri hikâye veritabanı henüz yok. |
| Görsel stil | Doğrulanmış Pixel Graphics, Anime, Realistic, Cartoon, Hand-drawn etiketleri. |
| Topluluk etiketleri | Hesapla açık etiket ekleme ve gerçek kullanım sayıları. |
| Arkadaş akışı | Takip edilen hesapların açıkça paylaştığı etkinlikler; özel oynama verisi izlenmez. |
| Sessiz fragman | Günün oyununda kaynak fragman varsa hover ile sessiz önizleme. |
| Editör notu | Oyuncunun kendi özel notu; kurucunun oynamış gibi uydurulmuş yorumu yok. |
| E-spor keşfi | Competitive etiketli koleksiyon; oyunların lig varlığı tahmin edilmez. |
| Görsel benzerlik | Varsa gerçek kapak rengi, tür ve stüdyo sinyallerini birlikte kullanır. |
| Trending | Twitch anlık ve YouTube son 48 saat arayüzü ve sunucu kodu hazır; TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, YOUTUBE_API_KEY olmadan kapalı. Twitch için 48 saatlik büyüme geçmişi henüz biriktirilmiyor. |
| Dünya atlası | Kullanıcının izinli haritasını bağlayıp sürükleme, yakınlaştırma ve kişisel işaret bırakması. Her oyuna ait lisanslı harita otomatik sağlanmaz. |

## Kişiselleştirme ve bağlılık

| İstek | Uygulama |
|---|---|
| Duygusal etiketler | Özel “Stres Atmalık”, “Beni Ağlattı”, “Beyin Yakan” vb. |
| Dinamik karşılama | Türkiye saatine göre sabah/gün/akşam/gece metni. |
| Mood Board | Ruh haline göre vurgu rengi ve keşif filtresi. |
| Oyun günlüğü | Kişisel, tarihlenmiş özel kayıtlar; kaydetme/çıkış uyarısı. |
| Hava senkronizasyonu | İsteğe bağlı şehir, Open-Meteo, yağış doğrulanınca arka plan yağmuru; cihaz konumu istenmez. |
| Platform hafızası | Son mağaza seçimi hatırlanır ve sonraki açılışta kullanılır. |
| Dashboard düzeni | Modül tutamacı sürükle-bırak ve klavye erişimli taşıma okları. |
| Yıl dönümü | Takibe alınan gerçek çıkış tarihiyle girişte hatırlatma. Site kapalıyken sunucu push'u henüz yok. |
| Wrapped | Bu cihazdaki gerçek yıl kayıtlarından görsel özet hikâyesi. |
| Koleksiyon adı | Takma ad ve özel raf/arşiv adı. |
| Retro arayüz | CRT tarama çizgisi, monospace başlıklar, isteğe bağlı aç/kapa. |
| Oyun anıları | Hesapla açık anı paylaşımı ve listeleme. |
| Samimi onboarding | Piksel yolcu ve tek ruh hali sorusu; atlanabilir. |
| FOMO / ücretsiz oyun | Epic TR gerçek aktif promosyonu ve gerçek bitiş zamanından geri sayım. Süresi bitince gizlenir. |
| Renk körlüğü | Protanopi, döteranopi, tritanopi için alternatif vurgu paletleri; yüksek kontrast ve hareket azaltma. Klinik bir görme düzeltmesi iddia edilmez. |
| Dinamik favicon | Ruh hali / tema vurgusuna göre sekme simgesi. |
| Wishlist dip alarmı | Son 24 saatte kontrol edilmiş, yeterli geçmişi olan gerçek dip fiyat veya kişisel hedef; tekrarlı uyarı koruması. |
| Bırakma noktası empatisi | Özel checkpoint / motivasyon notu; isteğe bağlı açık cesaret notları. Genel bırakma istatistiği uydurulmaz. |
| Changelog | Kullanıcı fikirlerinden sürüm notları ve ayrı gezinme hedefi. |

## Hesap ve senkron

| İstek | Uygulama |
|---|---|
| Her yerden giriş | Üst menüde Giriş yap / avatar düğmesi; hesap penceresi her sekmeden açılır. |
| Beni hatırla | Açıkken oturum tarayıcı kapansa da sürer, kapalıyken yalnız o sekmede kalır. Jeton süresi dolmadan otomatik yenilenir. |
| Parola sıfırlama | E-postaya sıfırlama bağlantısı; dönüşte yeni parola formu açılır. Doğrulama bağlantısı da doğrudan giriş yapar. |
| Hesaba senkron | Favoriler, oyuncu alanı, günlük ve XP `radar_user_data` satırına yazılır (RLS: yalnız sahibi). İlk eşleşmede cihaz ve hesap kayıpsız birleşir; sonra hesaptaki daha yeni kayıt esas alınır. Zen, ses, renk modu gibi cihaz tercihleri senkronlanmaz. |
| Steam hesabı bağlama | Oyuncu alanı · Steam kütüphanem. Steam'in kendi giriş sayfasıyla (OpenID) bağlanır, şifre alınmaz; `steam-account` fonksiyonu dönüşü Steam'e doğrulatır ve yalnız SteamID'yi `linked_accounts` satırına yazar (RLS: yalnız sahibi okur ve siler). Oyunlar, süreler ve oyun başına açılan başarımlar Steam Web API'den okunur, veritabanına yazılmaz. Steam'de "Oyun ayrıntıları" gizliyse uyarı gösterilir. Xbox ve PlayStation resmî kütüphane API'si sunmadığı için yok. |

## Canlılık katmanı (vivid)

`assets/vivid-20261108.js` ve `.css`. Klasik görünüm doygun renk ve parıltı, Sade görünüm aynı yapının sönük, ölçülü hâlidir. Tüm hareketler `prefers-reduced-motion` ya da sitenin "hareketi azalt" ayarında kapanır; renkler kalır.

| Özellik | Davranış |
|---|---|
| Kart hover | Kart 4 px yükselir, kapağın baskın rengi (`accent_color`) ve türün rengiyle parlar; kapak yavaşça yakınlaşır. Yalnız fareli cihazlarda. Liste satırında renkli sol şerit ve küçük resim yakınlaşması. |
| Aşamalı belirme | Kartlar ve satırlar görünür alana girince 55 ms arayla (en çok 9 adım) yukarıdan süzülür. |
| Fiyat sayacı | Belirirken indirimli fiyat eski fiyattan yeni fiyata, diğerleri %18 yukarıdan iner (650 ms). React metni değiştirirse sayaç hemen bırakır. |
| İndirim rozeti | %1–24 mavi, 25–49 yeşil, 50–74 turuncu, 75+ kırmızı-pembe. 25+ rozet halka nabzı atar (50+ dört kez, 75+ sürekli). Sade'de aynı renkler açık zeminde sönük. |
| Tür renkleri | Kartta üst şerit, çerçeve ve tür etiketi; satırda sol şerit. 15 tür (aksiyon, macera, RPG, strateji, simülasyon, spor, yarış, bağımsız, korku, rahat, nişancı, dövüş, bulmaca, platform, MMO). |
| Fiyat sıcaklığı | Soğuk buz mavisi, ılık amber, sıcak kırmızı (parıltılı); ayrıntıdaki ölçek şeridi mavi-yeşil-sarı-turuncu-kırmızı. |
| Favori patlaması | Favoriye eklenince (çıkarılınca değil) kalpten küçük konfeti. |
| Başarım kutlaması | Başarım ve seviye bildirimi gelince konfeti, halka dalgası; destansı ve efsanevi başarımda ikinci bir patlama. |
| Sayfa geçişi | Sekme değişimi, ayrıntı penceresi ve Sade/Klasik geçişi yumuşak belirir. |
| Parıltılı iskeletler | Liste yükleme satırları ve kart iskeletleri ışık süpürür. |
| Gradyanlar | Klasik'te üst çubuk çizgisi, logo, ana düğme ve seçili sekme gradyan. |
| Ayrıntıda kapak rengi | Oyun ayrıntısı kapağın baskın renginden üst şerit ve yumuşak ışık alır. |
| Sade/Klasik değiştirici | Masaüstünde üst çubukta, mobilde ve açılış sayfasında yüzen bir düğme olarak her zaman görünür; menüye girmek gerekmez. `radar:ui-set` olayıyla paketin kendi mod durumunu değiştirir ve `?gorunum=` parametresini adresten siler ki seçim yenilemede kalsın. |

## Tasarım yenilikleri (17 Kasım 2026)

`assets/tasarim-20261117.js` ve `.css`. Tercihler (yoğunluk, yazı boyutu, modül düzeni) yalnız bu cihazda tutulur, hesaba senkronlanmaz. Hareketler azaltılmış harekette kapanır.

| Özellik | Davranış |
|---|---|
| Fiyat grafiğinde dönemler | Grafikte mağazaların her yıl genelde indirim yaptığı haftalar (Bahar, Days of Play, Yaz, Kara Cuma, Yılbaşı) gölgeli ve "yaklaşık" diye anılır. Seçili dönemin en düşük fiyatı yeşil kesikli bantla, şu an en düşükteyse "Şu an gördüğümüz en düşükte" yazısıyla gösterilir. Grafiğin altında sıradaki büyük indirime kaç gün kaldığı yazar. |
| Kart yoğunluğu | Liste araçlarında ve menüde Kompakt / Rahat / Büyük. Kompakt mobilde 3 sütun, Büyük mobilde tek sütun. |
| Kapak rengine boyanan ayrıntı | Oyun ayrıntısında çerçeve, başlıklar, bölüm zeminleri, en ucuz mağaza satırı ve odak halkası kapağın baskın rengini alır. Sade'de aynı renk sönük. |
| Mobil filtre çekmecesi | 700 px altında "Diğer filtreler" alttan açılan çekmecede açılır; tutamaçtan aşağı çekince, arka plana dokununca, Escape ya da "Bitti" ile kapanır. |
| Kıyas radarı | İki oyun kıyasında Metacritic, OpenCritic, fiyat avantajı (aynı para biriminde), indirim ve yenilik eksenli radar; her oyunun önde olduğu eksenler işaretlenir. Bilinmeyen eksen tahmin edilmez. |
| Paylaşım kartı | Oyun ayrıntısında "Paylaşım kartı": 1080×1350 PNG cihazda canvas ile üretilir, destekleyen cihazda paylaşılır, diğerlerinde indirilir. Kapak görseli izin vermezse baş harf kullanılır. |
| Dip–normal şeridi | Fırsat satırında ve kartta, en az 14 günlük PlayStation fiyat geçmişi varsa fiyatın gördüğümüz en düşük ile normal fiyat arasındaki yeri. |
| Mikro etkileşimler | Üst menü, alt menü, çıkış sekmeleri, grafik dönemi ve yoğunluk düğmelerinde kayan seçim göstergesi; düğmelerde basma tepkisi; açılan ayrıntılarda yumuşak belirme. |
| Keşfet modül düzeni | Her modülde boyut (Geniş / Yarım / Daraltılmış; yarım yalnız geniş ekranda) ve gizle düğmesi. Gizlenenler "Gizli modüller" satırından geri açılır. |
| Yazı boyutu | Menü > Görünüm'de %90–%130 kaydırıcısı ve Sıfırla. |

## Görsel panolar ve zaman çizgileri (21 Kasım 2026)

`assets/visuals-20261121.js` ve `.css`. Mevcut sayfalara DOM üzerinden eklenir; hareketler azaltılmış harekette kapanır; Klasik/Sade ve TR/EN desteklenir. Katalog verisi yalnız herkese açık okuma tablolarından ve yalnız ilgili panel açılınca okunur, 15 dk oturumda saklanır.

| Özellik | Davranış |
|---|---|
| Cüzdan koçu halkası | Alanım > Bütçe: ayın harcamaları halka dilimleri, kalan bütçe gri dilim, aşımda kırmızı çerçeve. Veri cihazdaki `radar-lifestyle-v1`. |
| Tasarruf sayacı ve konfeti | Toplam tasarruf sayaç olarak artar, sıradaki hedefe (100, 250, 500, 1.000 ...) ilerleme çubuğu. Tasarruf artınca konfeti; sayaca basınca tekrar. İlk açılışta konfeti yok. |
| Oyun DNA'sı radarı | DNA kartında balon haritasındaki türlerden radar (3+ tür gerekir, en az 5 eksen). |
| İndirim takvimi ısı haritası | Fırsatlar: 10 haftalık takvimde PlayStation TR indirimlerinin mağazanın bildirdiği bitiş günleri. Yalnız bitiş günü bilinen veri. |
| Tür haritası | Fırsatlar: türlere göre indirimli teklif sayısı balonları; balona basınca Tür filtresi uygulanır. |
| Fiyat düşüşü şelalesi | Ana sayfa: PlayStation fiyat geçmişinde önceki farklı fiyattan gerçekten düşenler. Tam katalog dökümü olan günler sayılmaz. |
| Çıkış zaman çizgisi | Takvim: önümüzdeki 60 günün çıkış günleri yatay kaydırmalı çizgide, günde en çok 4 oyun. |
| İndirim geri sayım halkası | "İndirim: ... kaldı" satırında kalan süre halkası (7 güne göre), yaklaştıkça sarı, turuncu, kırmızı. |
| Kütüphane değeri | Steam kütüphanem: listede görünen oyunların normal Steam fiyat toplamı, oynanmamışların değeri, saat başı maliyet. Ödenen tutar değildir. |

## Hareket cilası (21 Kasım 2026)

`assets/motion-20261121.js` ve `.css`. Paketin React koduna dokunmaz; DOM'u izler. Sistemin ya da sitenin "hareketi azalt" ayarı açıksa hiçbir hareket başlamaz (`<html class="mo-par">` yalnız hareket serbestken konur, tüm hareket kuralları buna bağlıdır). Klasik ve Sade, Türkçe ve İngilizce, masaüstü ve mobilde çalışır.

| Özellik | Davranış |
|---|---|
| Fiyat düşüşü | Canlı güncellemede fiyat eskisinden yenisine sayarak iner, yanında yeşil "▼ fark" çipi çıkar, kart bir kez yeşil parlar. İlk açılıştaki sayaç (vivid) bununla karışmaz; metin 320 ms durulunca karşılaştırılır. |
| İndirim rozeti | İndirim yüzdesi artınca ya da ekrandaki karta sonradan rozet gelince zıplar ve üstünden parıltı geçer. |
| Canlanan favori kalbi | Favorideki oyunun fiyatı düşünce kalp üç kez atar ve minik kalpler saçar. İndirimdeki favori kartlarda kalp yavaşça nabız gibi atar. |
| İskelet kartlar ve ilerleme çubuğu | Kart ızgarası yüklenirken parıltılı iskelet kartlar, üstte ince bir ilerleme çubuğu. Çubuk menü/gezinme tıklamalarında ve `pushState` geçişlerinde de çalışır. Ana bloklar sayfa değişince sırayla belirir. |
| Paralaks kapaklar | Kart kapağı kaydırdıkça kart içinde ±%5 kayar (yalnız ekrandaki kartlar, tek `requestAnimationFrame`). |
| Favoriye uçan kapak | Favoriye eklenince kapak yay çizerek üst gezinmedeki "İstek Listem"e (mobilde alt gezinme ya da Menü) uçar; hedef zıplar ve küçük bir konfeti çıkar. |
| Işık süpürmesi | Sade/Klasik, OLED ya da site teması değişince ekranı soldan sağa bir ışık şeridi geçer (Klasik'te parlak, Sade'de mor-pembe tonlu). Açılışta çalışmaz. |
| Başarım rozetleri | Rozetler sırayla belirir; nadir ve üstü kazanılmış rozetlerde yıldız parıltıları, efsanevide ışıma. Yeni kazanılan rozet açılma animasyonuyla (dönerek büyür, halka, konfeti) görünür. Görülen rozetler yalnız bu cihazda (`radar-mo-badges`) tutulur; ilk ziyarette hiçbiri "yeni" sayılmaz. |

## Fırsat merkezi (21 Kasım 2026)

`assets/hub-20261121.js` ve `.css`; sol altta zil düğmesi (mobilde alt menünün üstünde). Sade/Klasik, TR/EN, masaüstü/mobil. Mevcut alarm mantığı (favoride hedef fiyat, site açıkken 5 dakikalık kontrol) aynen çalışır; merkez onun üstüne ek bakış ve sunucu tarafı ekler. Hiçbir sekme veri uydurmaz: veri yoksa "veri az" ya da "bitiş saati bilinmiyor" yazar.

| Özellik | Davranış |
|---|---|
| Alarmlar | Hedef koyduğun favoriler: Hedefte / Yaklaştı (%15 içinde) / Bekliyor / Fiyat yok (24 saatten eski ya da para birimi farklı). Son uyarılar, tarayıcı bildirimi izni. Zil rozeti hedefe inenleri ve süresi dolmak üzere ücretsiz oyunları sayar. |
| Al / bekle | Favori başına fiyat geçmişinden Şimdi al (kayıtlı dibin %8 içinde), Makul, Bekle (dibin %25 üstü ya da 21 gün içinde büyük indirim haftası). En az 14 gün ve 5 kayıt yoksa "Veri az". Gerekçe cümleleri yazılır ve "fiyat tahmini değildir" der. |
| Paylaşım kartı | Al/bekle satırında "Paylaş": tasarım modülünün cihazda ürettiği 1080×1350 PNG'si (`openShare`). |
| Ücretsiz oyunlar | Epic gerçek bitişle (`radar-services?action=epic`), Steam/Xbox/GOG'da fiyatı 0 ve orijinal fiyatı olan, son 24 saatte doğrulanmış teklifler. Bitişi bilinmeyen oyunda süre yazılmaz. Epic için 24 sa ve 2 sa kala bildirim (site açıkken, izinle). |
| Bölge | Favori başına `regional-prices`; başka ülke TR'den en az %15 ve 20 TL ucuzsa gösterilir (eski kur ve hatalı satırlar atılır). Kart komisyonu ve ülke kısıtı dahil değildir. |
| Özet | Giriş yapmış kullanıcı için haftalık e-posta özeti ve site kapalıyken telefona bildirim (ntfy). Tercihler `radar_digest` tablosunda; e-posta adresini istemci seçemez (tetikleyici `auth.users`'tan alır). |

Sunucu tarafı (`scripts/digest.mjs`, çalıştırıcı `scripts/digest-run.mjs`): `--weekly` günde bir çalıştırılır ve bir kullanıcıya 6,5 günden sık göndermez; haber yoksa e-posta yollamaz. `--push` yarım saatte bir çalıştırılır; hedefe inen favoriyi günde bir kez, Epic ücretsiz oyununu 24 sa / 2 sa eşiğinde bir kez yollar. `--dry` hiçbir şey göndermez. Gerekli kurulum için README "Fırsat merkezi" bölümüne bak.
## Kişisel merkez (21 Kasım 2026)

`assets/kisisel-20261121.js` ve `.css`. Üst menüde ve Menü'de "Senin için" düğmesi, Oyunlar sayfasında bir öneri şeridi. Veri sitenin `search_market` RPC'si ve `game_ttb` tablosundan okunur; fiyat, resmî mağazalardaki (PlayStation, Steam, Xbox, Switch, Epic, GOG) en ucuz TL karşılığıdır, anahtar satıcılar sayılmaz. Kur alınamazsa yalnız TL fiyatlı teklifler gösterilir. Tercihler yalnız bu cihazda tutulur.

| Özellik | Davranış |
|---|---|
| Senin için fırsatlar | Oyuncu tarzı, favori türler ve seçilen ek türlerden zevk profili; indirimdeki oyunlar tür/etiket örtüşmesi, puan ve indirimle sıralanır, "neden" satırı gösterilir. Ana sayfada 8 oyunluk şerit. |
| Bütçeye göre sepet | Bütçe ve en çok oyun sayısı verilir; 0/1 sırt çantasıyla toplamı aşmayan, kaliteyi sayıdan üstün tutan sepet çıkar. Toplam, kalan, indirimle tasarruf; liste kopyalama; "başka bir sepet". |
| Gizli hazine | Puan ≥80, OpenCritic'te 1–30 inceleme (sitenin Akıllı sıralama tanımı), seçilen fiyatın altında, türe göre süzülür. İnceleme sayısı bilinmeyen oyun listelenmez. |
| Ortak istek listesi ve hediye | "İstiyorum" listesi sunucusuz tek bağlantıya sıkıştırılır (`?hediye=`), arkadaş hesapsız açar, güncel fiyatları görür. Bütçe ve sevilen türe göre hediye önerisi; arkadaşın listesindekiler önce gelir. |
| Karşılaştırma | 2–3 oyun yan yana: fiyat, indirim, puan, bitirme süresi, saat başı maliyet, yıl, topluluk oyu. Satır kazananı yalnız en az iki oyunda değer varsa işaretlenir. Kartlardaki "Kıyasla" ve ayrıntıdaki düğmeyle eklenir. |
| Saat başı maliyet | Oyun ayrıntısında ve kartlarda: en ucuz resmî fiyat ÷ ortalama bitirme süresi (normal, yoksa hızlı). Süre verisi yoksa hesaplanmaz. |
| Fiyatına değer mi? | Ayrıntıda evet/hayır oyu; yüzde en az 5 oyla görünür. Oy veren, ortak listeyle aynı tarayıcı anahtarıyla tanınır, sunucuda yalnız özeti saklanır. **`supabase/schema-v50-fiyata-deger-mi.sql` uygulanmadan oylama gizli kalır**, diğer özellikler çalışır. Geri alma: `...-geri-al.sql`. |

## Dağıtım ve doğrulama

- Kaynak: `sfunder2/oyun-radari`, yayın ve toplayıcılar: `sfunder2/oyun-radari-web`.
- PS fiyat zamanlayıcısı ve dağıtılmış kilidi korunur. Tüm katalog aynı 5 dakikalık turda yenilenmez.
- Topluluk yazıları Supabase Auth oturumu ve sahiplik RLS politikalarıyla korunur. E-posta sağlayıcısının doğrulama ve gönderim koşulları geçerlidir.
- Yorum ve oy için gerçek kullanıcı girişi gerekir. Test hesabı, sahte inceleme, sahte oy veya sahte takipçi üretim verisine eklenmez.
- `supabase/account-sync-v1.sql` hesap senkron tablosunu kurar; `tests/account-sync-rls.sql` başka kullanıcının ve anonim erişimin engellendiğini doğrular.
- `tests/experience-rls.sql` iki kullanıcılı yetki testini tek işlemde çalıştırır ve bütün kayıtları geri alır.
- `tests/experience.test.mjs` seri, XP tekrarları, kur doğruluğu, swipe eşikleri, yedek doğrulama, yıl dönümü ve güvenli medya bağlantılarını kontrol eder.

## Fiyat grafikleri ve karşılaştırmalar (21 Kasım 2026)

| İstek | Uygulama |
|---|---|
| Animasyonlu fiyat geçmişi | Çizgi soldan sağa çizilir, en düşük nokta parlar; dönem değişince yeniden oynar. Azaltılmış harekette durağan. |
| Sıcaklık göstergesi | Ayrıntıdaki panelde ibreli kadran (soğuk mavi, ılık sarı, sıcak kırmızı); ibre sallanarak yerine oturur. |
| Mağaza fiyat çubukları | Her mağaza satırının altında fiyatla orantılı çubuk büyüyerek açılır; en ucuz yeşil. |
| Fiyat yarışı | Mağazalar şeritte yarışır: en ucuz bitişte, diğerleri fiyat farı oranında geride; "Tekrar oynat" düğmesi. |
| Güven bandı | Önümüzdeki 90 gün için geçmiş indirimlerden gölgeli aralık (en iyi indirim – normal fiyat) ve güven düzeyi. Söz değildir; en az 30 gün kayıt ister. |
| Tüm zamanların en düşüğü | Fiyat radarın kayıtlarındaki en düşükse ayrıntıda büyük, kartta kısa altın rozet. Yalnız ≥14 günlük kayıtta. |

Kod: `assets/charts-20261121.js/.css`, testler: `tests/charts.test.mjs`.

## Katalog araçları (21 Kasım 2026)

Menüdeki "Katalog araçları" bölümünden (ya da `?arac=dlc|sezon|gereksinim|seri` adresiyle) açılan tek pencerede dört araç. Kaynak: `assets/catalog-tools-20261121.js` ve `.css`; yeni tablo ya da SQL gerekmez. Kişisel kayıtlar yalnız bu cihazda tutulur.

| Araç | Veri | Eksik / sınır |
|---|---|---|
| Ek paket ve DLC takibi | `game_family.dlcs` (IGDB) + `library`/`store_offers` fiyatları; PlayStation `edition` metni ("Eklenti", "Oyun Paketi", "Premium Sürüm") ek paketi ve tam sürüm paketini ayırır. Takip listesi `radar-tools-track-v1`, eklerkenki fiyata göre değişimi gösterir. İndirimdeki ek paketler akışı. | IGDB'nin listelediği DLC'lerin yaklaşık %6'sının katalogda fiyatı var (7.630 DLC anahtarından ~470 PlayStation, ~680 diğer mağaza). Paketin içeriği bilinmediği için "paket daha ucuz" karşılaştırması gösterge niteliğindedir. Ek paket indirim akışı yalnız PlayStation. |
| İndirim takvimi ve hazırlık listesi | Tasarım modülündeki yaklaşık sezon tarihleri (`SALE_SEASONS`); istek listesi `radar-fav-v3`; PlayStation kayıtları için güncel fiyat. Liste ve bütçe `radar-tools-prep-v1`. | Tarihler her yıl aynı haftalar varsayılarak yaklaşıktır; kesin gün mağazalardan gelmez. Geçmiş sezonlardaki gerçek dip oranı henüz hesaplanmıyor. |
| Bilgisayarım çalıştırır mı? | `library.requirements` (Steam; ~22.700 oyunda var). RAM, depolama ve işletim sistemi kesin; işlemci ve ekran kartı yerleşik yaklaşık skor tablosuyla (~). Sistem `radar-tools-sys-v1`. | Tablo dışı ya da çok yeni modeller "doğrulanamadı" çıkar, karar bunlarla yükseltilmez. Yalnız Steam eşleşmesi olan oyunlar. |
| Oyun serisi sayfası | `game_family.series_name/series` (IGDB, ~4.500 oyunda seri var) + katalogdaki en ucuz TRY fiyat. | Toplam yalnız TRY fiyatlı oyunları sayar; Steam/Switch fiyatları dolar olduğu için toplama girmez, ayrıca belirtilir. Katalogda olmayan oyun "Fiyat yok" görünür. |

## Kart ve liste cilası (22 Kasım 2026)

`assets/cards-20261122.js` ve `.css` (paket koduna dokunmaz, DOM'u izler): kapak 16:9 ve yüklenirken bulanık önizleme; eski fiyat üstü çizili, yeni fiyat büyük; indirim rozeti %20 / %50 / %75 kademeli renk; köşe şeritleri ("Tüm zamanların en düşüğü" radarın kendi kaydından, "Yeni indirim" son ziyaretten beri düşen fiyattan, 72 saat); son ziyarete göre ▼/▲ yüzde etiketi (yalnız bu cihazda, `radar-cd-prices`); kapaktan vurgu rengi; fareyle hızlı özet (puan, tür, en düşük fiyat); platform simgeleri tek sırada (PC, PS, Xbox, Switch); favori parıltısı ve sayaç vurgusu; mağaza noktaları yerine tek tip simgeler; sıkı liste satırı. Hareket azaltılmışsa animasyonlar kapalıdır.
