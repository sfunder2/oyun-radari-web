-- Supabase v15: çıkış takvimi için Steam ön sipariş fiyatı ve "çok beklenen" sırası.
-- SQL Editor'de bir kez çalıştırın (önce v4). Tekrar çalıştırmak güvenlidir.
-- Yeni sütunlar mevcut okuma kuralıyla anonim olarak okunabilir; yazma yalnız toplayıcıdadır (service_role).
alter table public.upcoming_games
 add column if not exists price numeric,
 add column if not exists original_price numeric,
 add column if not exists discount_percent integer not null default 0,
 add column if not exists currency text,
 add column if not exists wishlist_rank integer;
-- Toplayıcı listeyi günde bir yeniler; bu satır silinince bir sonraki çalıştırmada (5 dk içinde) hemen yeniler.
delete from public.ps_state where key='upcoming';
