-- Şema v37: "Şu an Twitch'te en çok izlenenler" (Keşfet bölümü ve kartlardaki izleyici rozeti).
-- Kaynak: Twitch Helix API (games/top + streams), IGDB toplayıcısıyla aynı Twitch uygulaması.
--
-- twitch_top_games: son turun anlık görüntüsü, en çok ~40 satır (birkaç KB). Toplayıcı her 30 dakikada tüm satırları
-- yeniden yazar ve bu turda görünmeyenleri siler; geçmiş tutulmaz.
--   rank        izleyiciye göre sıra (1 = en çok izlenen)
--   viewers     o oyundaki canlı yayınların izleyici toplamı (en çok 500 yayın okunur, kuyruk ihmal edilir)
--   streams     sayılan canlı yayın sayısı
--   title_key   katalog eşleşmesi (IGDB kimliği game_ttb üzerinden, yoksa ad); katalogda yoksa boş
--   item        sitenin oyun ayrıntısını açtığı mağaza ürünü (Steam öncelikli); katalogda yoksa boş
-- Satırı yalnız toplayıcı (service role) yazar; herkes okuyabilir. Başka tabloya ve fonksiyona dokunmaz.
-- Geri almak için: drop table if exists public.twitch_top_games;

create table if not exists public.twitch_top_games (
 twitch_id text primary key,
 rank integer not null check (rank > 0),
 name text not null,
 igdb_id integer,
 box_art text,
 viewers integer not null default 0 check (viewers >= 0),
 streams integer not null default 0 check (streams >= 0),
 title_key text,
 item jsonb,
 updated_at timestamptz not null default now()
);
alter table public.twitch_top_games enable row level security;
drop policy if exists twitch_top_games_read on public.twitch_top_games;
create policy twitch_top_games_read on public.twitch_top_games for select to anon, authenticated using (true);
revoke all on public.twitch_top_games from public, anon, authenticated;
grant select on public.twitch_top_games to anon, authenticated;
grant all on public.twitch_top_games to service_role;
create index if not exists twitch_top_games_title_key on public.twitch_top_games (title_key) where title_key is not null;
