-- schema-v40-seri-dlc.sql'i geri alır: game_family tablosunu siler. Başka hiçbir şey değişmez.
-- Arayüz tablo yoksa bölümleri göstermez; toplayıcı tablo yoksa sessizce atlar.
drop table if exists public.game_family;
