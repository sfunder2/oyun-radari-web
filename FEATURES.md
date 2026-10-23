# Oyun Radarı 2.0 — İstenen geliştirmelerin durumu

Bu dosya, 23 Ekim 2026 sürümünde gerçekten çalışan davranışı ve dış bağımlılıkları açıklar. Kişisel kayıtlar cihazda, açık topluluk paylaşımları Supabase'de tutulur. Eksik veri üretilmez.

## Görsel deneyim

| İstek | Uygulama |
|---|---|
| Holografik / 3D kart | Fare konumuyla sınırlı perspektif eğimi ve ışık katmanı; dokunmatik ve azaltılmış harekette kapalı. |
| Akışkan tipografi | Ana başlık, bölüm, kart, modal ve metinlerde clamp ile sürekli ölçek. |
| Görsel tür filtreleri | Kılıç, direksiyon, beyin, kupa, yaprak ve diğer tür ikonlarıyla seçilebilir düğmeler. |
| Dergi inceleme düzeni | Oyun dosyasında asimetrik görsel, büyük alıntı, serif metin, kaynak etiketi ve kişisel editör notu. Steam özeti bağımsız inceleme gibi sunulmaz. |
| 90+ Metacritic parlaması | Sadece gerçek Metacritic puanı 90+ olduğunda altın çerçeve/parlama. |
| Retro yükleme sanatı | Kodla çizilmiş özgün piksel yolcu ve yürüyüş animasyonu; oyun ipuçları. |
| Zen | Kapak odaklı gezinme; kalıcı çıkış düğmesi ve Escape. |
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
| Ne oynasam testi | Dört soru; ruh hali, konsol, puan ve varsa kişisel süre kayıtları. |
| Sürpriz slot | Gerçek katalog kapaklarından rastgele seçim; bahis/ödül yok. |
| Günün oyunu | Yüksek puanlı katalog içinden tarihe bağlı günlük seçim. |
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

## Dağıtım ve doğrulama

- Kaynak: `sfunder2/oyun-radari`, yayın ve toplayıcılar: `sfunder2/oyun-radari-web`.
- PS fiyat zamanlayıcısı ve dağıtılmış kilidi korunur. Tüm katalog aynı 15 dakikalık turda yenilenmez.
- Topluluk yazıları Supabase Auth oturumu ve sahiplik RLS politikalarıyla korunur. E-posta sağlayıcısının doğrulama ve gönderim koşulları geçerlidir.
- Yorum ve oy için gerçek kullanıcı girişi gerekir. Test hesabı, sahte inceleme, sahte oy veya sahte takipçi üretim verisine eklenmez.
- `tests/experience-rls.sql` iki kullanıcılı yetki testini tek işlemde çalıştırır ve bütün kayıtları geri alır.
- `tests/experience.test.mjs` seri, XP tekrarları, kur doğruluğu, swipe eşikleri, yedek doğrulama, yıl dönümü ve güvenli medya bağlantılarını kontrol eder.
