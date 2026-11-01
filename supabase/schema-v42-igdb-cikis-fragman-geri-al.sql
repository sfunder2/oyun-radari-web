-- Şema v42'yi geri alır: IGDB çıkış tarihi ve fragman tablosunu siler. Arayüz tablo yokken mağaza verisiyle çalışmaya devam eder.
drop table if exists public.game_igdb_info;
