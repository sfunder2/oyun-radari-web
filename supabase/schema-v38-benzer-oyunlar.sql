-- Şema v38: benzer oyunlar (IGDB "similar_games").
-- Kaynak: IGDB API (Twitch). Toplayıcı: scripts/similar-run.mjs (.github/workflows/similar.yml).
-- Gerekli: schema-v35-oyun-suresi.sql (game_ttb). IGDB oyun kimlikleri oyun süresi toplayıcısının game_ttb.igdb_id
-- eşleşmesinden okunur; bu tablo yalnız benzer oyun listesini tutar, game_ttb'ye ve arama fonksiyonlarına dokunulmaz.
--
-- game_similar: başlık anahtarı başına tek satır.
--    similar_keys : IGDB'nin benzer bulduğu ve bizim katalogda da olan oyunların başlık anahtarları, IGDB sırasıyla (en çok 20).
--    similar_total: IGDB'deki benzer oyun sayısı (katalogda olmayanlar dahil).
--    Satırı yalnız toplayıcı (service role) yazar; herkes okuyabilir. Toplayıcı 30 günde bir yeniler.
--    Disk: ~30 bin satır × ~250 bayt ≈ 8 MB.
-- Geri almak için: supabase/schema-v38-benzer-oyunlar-geri-al.sql

create table if not exists public.game_similar (
 title_key text primary key,
 igdb_id integer not null,
 similar_keys text[] not null default '{}' check (cardinality(similar_keys) <= 20),
 similar_total integer not null default 0,
 checked_at timestamptz not null default now()
);
alter table public.game_similar enable row level security;
drop policy if exists game_similar_read on public.game_similar;
create policy game_similar_read on public.game_similar for select to anon, authenticated using (true);
revoke all on public.game_similar from public, anon, authenticated;
grant select on public.game_similar to anon, authenticated;
grant all on public.game_similar to service_role;
create index if not exists game_similar_checked on public.game_similar (checked_at);
