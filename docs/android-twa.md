# Android: Trusted Web Activity (TWA) ve Capacitor seçenekleri

Mevcut `android/` klasörü zaten çalışan, imzalı bir **WebView kabuğu** (`MainActivity.java`, `oyunradari-sideload.keystore`; `android.yml` derliyor; `android/oyun-radari.apk` yan yükleme için). Bu belge, Play Store'a ya da daha iyi tarayıcı entegrasyonuna gidilirse hangi yolun seçileceğini anlatır. **Kod değişikliği yapılmadı**; imza parmak izi ve mağaza hesabı kullanıcıdan gelmeden TWA tamamlanamaz.

## Karar özeti
| Seçenek | Ne zaman | Artı | Eksi |
|---|---|---|---|
| Şimdiki WebView kabuğu | Yan yükleme, hızlı denemeler | Zaten var; tam kontrol | Chrome'un özellikleri (Web Push, `setAppBadge`, Paylaş menüsü) sınırlı; çerezler ayrı |
| **TWA (önerilen)** | Play Store'da yayın | Gerçek Chrome motoru; PWA özellikleri (App Shortcuts, rozet, push) çalışır; adres çubuğu yok; küçük APK | Alan adı doğrulaması (Digital Asset Links) şart; `sfunder2.github.io` kök dizinine dosya konamaz (aşağıya bak) |
| Capacitor | Yerel eklenti gerekirse (yerel bildirim, paylaşım hedefi, biyometrik) | Yerel API köprüsü; iOS'a da uzanır | Ayrı Node/Gradle araç zinciri; web kodu pakete gömülür, sürümleme iki katlı |

## TWA için gerekenler
1. **Alan adı sorunu:** Digital Asset Links, `https://<alan>/.well-known/assetlinks.json` ister. GitHub Pages proje sitesi (`sfunder2.github.io/oyun-radari-web/`) bu dosyayı kök alan adının altına koyamaz; yalnız kullanıcı sitesi deposu (`sfunder2.github.io` deposu) koyabilir. Seçenekler: (a) `sfunder2.github.io` adlı bir kullanıcı sitesi deposu açıp `/.well-known/assetlinks.json` oraya koymak; (b) kendi alan adı bağlamak. **Kullanıcıdan karar gerekir.**
2. `assetlinks.json` şablonu:
```json
[{"relation":["delegate_permission/common.handle_all_urls"],
  "target":{"namespace":"android_app","package_name":"io.github.sfunder2.oyunradari",
            "sha256_cert_fingerprints":["<Play Console > Uygulama imzalama > SHA-256>"]}}]
```
3. **Bubblewrap ile paket:** `npx @bubblewrap/cli init --manifest https://sfunder2.github.io/oyun-radari-web/manifest.webmanifest` → `bubblewrap build`. Manifest'te `id`, `start_url`, `scope`, maskable ikon ve `shortcuts` zaten var (App Shortcuts uzun basınca görünür).
4. Play Console: uygulama imzalama anahtarı Play'e verilir (parmak izi `assetlinks.json`a Play'in anahtarıyla yazılır, yükleme anahtarıyla değil).
5. Bildirim: Web Push istemcisi `touch-20261128.js` içinde (`window.radarPush`); TWA'da Chrome üzerinden çalışır, ek kod gerekmez.

## Uygulama rozeti
`assets/modern-20261128.js`, hedef fiyata inen favori sayısını `navigator.setAppBadge()` ile gösterir. Yüklü PWA'da (Chrome/Edge masaüstü, Android Chrome) çalışır; iOS 16.4+ yalnız ana ekrana eklenmiş PWA'da ve bildirim izniyle.

## Capacitor'a gidilecekse
`npm i @capacitor/core @capacitor/cli @capacitor/android`, `npx cap init`, `server.url` yerine `webDir: 'dist'` (Vite geçişinden sonra; bkz. `docs/vite-gecis-plani.md`). Önce Vite geçişi bitmeli, yoksa Capacitor'un gömdüğü kopya her sürümde bayatlar.
