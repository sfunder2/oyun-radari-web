-- v32 (2026-10-30'da uygulandı): Misafir (anon) sorgu süre sınırı 3 sn -> 8 sn (giriş yapmış kullanıcılarla aynı).
-- Neden: v30 sonrası ölçümde arama isteklerinin %13–15'i hâlâ 500 dönüyordu, yoğunluk düşükken bile.
-- Önbellekte olmayan aramalar (cihaz süzgeci, "Sana özel" kişisel listeler, yazılan aramalar) soğuk
-- çalışmada 4–6 sn sürüyor; ısıtma bunları kapsayamıyor çünkü her kullanıcı ve cihaz için farklılar.
-- Ölçüm (uygulamadan önceki 24 saat): 385 arama isteğinin 50'si 500.
alter role anon set statement_timeout = '8s';
notify pgrst, 'reload config';

-- Geri alma:
--   alter role anon set statement_timeout = '3s'; notify pgrst, 'reload config';
