-- Supabase v18: Epic Games Store ve GOG mağazaları. SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak güvenlidir.
-- store_offers.platform artık 'epic' ve 'gog' değerlerini de kabul eder (toplayıcı: scripts/market-catalog.mjs).
-- Keşfet'te Epic/GOG market seçimi ve Tümü'nde aynı oyunun tek satırda (en ucuz TL teklif) gösterilmesi
-- search_market tanımındadır; güncel tanım schema-v16.sql içindedir. Bu dosya o fonksiyonu yeniden tanımlamaz.
alter table store_offers drop constraint if exists store_offers_platform_check;
alter table store_offers add constraint store_offers_platform_check check (platform in ('steam','xbox','switch','epic','gog'));
