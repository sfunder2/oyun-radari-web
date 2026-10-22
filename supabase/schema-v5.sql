-- Supabase şeması v5: sistem gereksinimleri, DLC sayısı, duyurular ve haber şeridi. SQL Editor'de bir kez çalıştırın (önce v3 ve v4).
alter table game_meta add column if not exists requirements jsonb;
alter table game_meta add column if not exists dlc_count    integer not null default 0;
alter table game_meta add column if not exists news         jsonb;

create table if not exists news_items (
  url          text primary key,
  source       text not null,
  title        text not null,
  published_at timestamptz not null,
  checked_at   timestamptz not null
);
create index if not exists news_items_published on news_items (published_at desc);
alter table news_items enable row level security;
create policy "herkese okuma" on news_items for select using (true);

drop view if exists library;
create view library with (security_invoker = true) as
select p.*,
       coalesce((select jsonb_agg(to_jsonb(o) - 'title_key') from store_offers o where o.title_key = p.title_key), '[]'::jsonb) as offers,
       (select to_jsonb(s) - 'title_key' from game_scores s where s.title_key = p.title_key) as scores,
       gs.metacritic as mc_score,
       gs.opencritic as oc_score,
       greatest(gs.metacritic, gs.opencritic) as best_score,
       gm.genres, gm.release_date, gm.developers, gm.publishers,
       gm.turkish, gm.turkish_audio, gm.age,
       gm.steam_appid, gm.requirements, gm.dlc_count, gm.news
from ps_products p
left join game_scores gs on gs.title_key = p.title_key
left join game_meta   gm on gm.title_key = p.title_key;
grant select on library to anon, authenticated;
