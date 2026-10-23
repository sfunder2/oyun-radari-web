-- Supabase v12: market katalogları ve zenginleştirme işleri Supabase Cron'a taşınır.
-- Neden: GitHub Actions'ın zamanlanmış çalışmaları bu repoda güvenilir tetiklenmiyor (bir günde yalnızca birkaç kez).
-- ÖNCE iki fonksiyonu yayınlayın (JWT doğrulaması AÇIK kalsın, refresh-ps-prices ile aynı):
--     supabase functions deploy refresh-markets
--     supabase functions deploy refresh-enrich
-- Sonra bu dosyayı SQL Editor'de çalıştırın. Yeni işler, mevcut PS fiyat işinin komutunu (adres, yetki başlığı ve Vault gizli anahtarı dahil)
-- kopyalayıp yalnızca fonksiyon adını değiştirir; gizli bilgi bu dosyada yoktur.
select cron.unschedule(jobname) from cron.job where jobname in ('oyun-radari-markets','oyun-radari-enrich');

select cron.schedule('oyun-radari-markets', '1-59/5 * * * *', replace(command, 'refresh-ps-prices', 'refresh-markets'))
from cron.job where jobname = 'oyun-radari-ps-prices';

select cron.schedule('oyun-radari-enrich', '3-59/5 * * * *', replace(command, 'refresh-ps-prices', 'refresh-enrich'))
from cron.job where jobname = 'oyun-radari-ps-prices';

-- Kontrol: üç iş görünmeli (ps-prices, markets, enrich)
select jobid, jobname, schedule, active, left(command, 110) as command from cron.job order by jobid;
