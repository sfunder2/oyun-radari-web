-- Şema v42: IGDB çıkış tarihi ve fragman (YouTube) verisi. Oyun süresi (v35, game_ttb) tablosundan ayrı tutulur.
-- Kaynak: IGDB API (Twitch). Toplayıcı: scripts/igdb-release.mjs, iş akışı: .github/workflows/igdb-release.yml
--
-- game_igdb_info: başlık anahtarı başına tek satır.
--   release_date      : IGDB'deki en erken çıkış (kesinlik "day" değilse dönemin ilk günü: 2027 -> 2027-01-01, 2027 Q3 -> 2027-07-01)
--   release_precision : day | month | quarter | year | tbd
--   platform_dates    : mağaza ailesi başına gün kesinliğinde çıkış tarihi, ör. {"steam":"2026-11-20","playstation":"2026-11-20","xbox":"2026-12-01","switch":"2027-02-01"}
--   trailer_youtube   : IGDB "videos" kaydındaki YouTube video kimliği (11 karakter); trailer_name videonun IGDB'deki adı
--   igdb_id boşsa oyun IGDB'de bulunamadı demektir; toplayıcı yeniden dener.
-- Satırları yalnız toplayıcı (service role) yazar; herkes okuyabilir. Mağaza tablolarına (upcoming_games vb.) dokunulmaz:
-- eksik ve yanlış tarihler arayüzde bu tablodan tamamlanır, mağazanın kendi verisi olduğu gibi kalır.
-- Disk: ~20 bin satır × ~150 bayt ≈ 3 MB.
-- Geri almak için: supabase/schema-v42-igdb-cikis-fragman-geri-al.sql

create table if not exists public.game_igdb_info (
 title_key text primary key,
 igdb_id integer,
 release_date date,
 release_precision text check (release_precision in ('day','month','quarter','year','tbd')),
 platform_dates jsonb not null default '{}'::jsonb check (jsonb_typeof(platform_dates) = 'object'),
 trailer_youtube text check (trailer_youtube is null or trailer_youtube ~ '^[A-Za-z0-9_-]{11}$'),
 trailer_name text check (trailer_name is null or length(trailer_name) <= 120),
 matched_by text check (matched_by in ('steam','name','ttb')),
 checked_at timestamptz not null default now()
);
alter table public.game_igdb_info enable row level security;
drop policy if exists game_igdb_info_read on public.game_igdb_info;
create policy game_igdb_info_read on public.game_igdb_info for select to anon, authenticated using (true);
revoke all on public.game_igdb_info from public, anon, authenticated;
grant select on public.game_igdb_info to anon, authenticated;
grant all on public.game_igdb_info to service_role;
create index if not exists game_igdb_info_checked on public.game_igdb_info (checked_at);
