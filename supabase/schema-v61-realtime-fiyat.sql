-- Gerçek zamanlı fiyat bildirimi (assets/modern-20261128.js, "realtime" bölümü).
-- store_offers güncellemelerinin Supabase Realtime'a yayımlanmasını açar. İstemci varsayılan olarak KAPALIdır:
-- <meta name="radar-realtime" content="on"> eklenince ya da kullanıcı localStorage radar-mx-realtime="on" yapınca bağlanır.
-- REPLICA IDENTITY FULL, eski fiyatı da gönderir (düşüş mesajı için gerekir); yazma maliyeti hafif artar.
-- Geri almak için schema-v61-realtime-fiyat-geri-al.sql.
alter table store_offers replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'store_offers') then
    alter publication supabase_realtime add table store_offers;
  end if;
end $$;
