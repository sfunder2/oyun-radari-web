-- Supabase şeması v4: oyun ayrıntıları (tür, çıkış tarihi, geliştirici, yaş, Türkçe) ve yaklaşan oyunlar. SQL Editor'de bir kez çalıştırın.
create table if not exists game_meta (
  title_key     text primary key,
  steam_appid   integer,
  genres        text[] not null default '{}',
  release_date  date,
  release_text  text,
  developers    text[] not null default '{}',
  publishers    text[] not null default '{}',
  turkish       boolean not null default false,   -- arayüz veya altyazı
  turkish_audio boolean not null default false,   -- seslendirme
  age           text,
  checked_at    timestamptz not null
);
create index if not exists game_meta_genres on game_meta using gin (genres);
create index if not exists game_meta_release on game_meta (release_date);

create table if not exists upcoming_games (
  id           text primary key,                   -- Steam uygulama kimliği
  name         text not null,
  image        text,
  release_text text,
  release_date date,
  url          text not null,
  checked_at   timestamptz not null
);
create index if not exists upcoming_release on upcoming_games (release_date nulls last);

alter table game_meta      enable row level security;
alter table upcoming_games enable row level security;
create policy "herkese okuma" on game_meta      for select using (true);
create policy "herkese okuma" on upcoming_games for select using (true);

drop view if exists library;
create view library with (security_invoker = true) as
select p.*,
       coalesce((select jsonb_agg(to_jsonb(o) - 'title_key') from store_offers o where o.title_key = p.title_key), '[]'::jsonb) as offers,
       (select to_jsonb(s) - 'title_key' from game_scores s where s.title_key = p.title_key) as scores,
       gs.metacritic as mc_score,
       gs.opencritic as oc_score,
       greatest(gs.metacritic, gs.opencritic) as best_score,
       gm.genres, gm.release_date, gm.developers, gm.publishers,
       gm.turkish, gm.turkish_audio, gm.age
from ps_products p
left join game_scores gs on gs.title_key = p.title_key
left join game_meta   gm on gm.title_key = p.title_key;
grant select on library to anon, authenticated;
