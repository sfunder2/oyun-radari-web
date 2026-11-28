// Çalışma zamanı ayarları (herkese açık değerler). Dağıtım sırasında scripts/write-config.mjs bu dosyayı
// GitHub "Variables" değerleriyle yeniden yazar; boş bırakılan özellik kapalı kalır.
window.RADAR_CONFIG = Object.assign({ sentryDsn: '', sentryEnv: 'production', analyticsEndpoint: '', googleLogin: false, appleLogin: false, magicLink: true, release: '' }, window.RADAR_CONFIG || {});
