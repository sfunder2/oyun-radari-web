-- Supabase şeması v2: diğer mağaza teklifleri, puanlar ve "library" görünümü. SQL Editor'de bir kez çalıştırın.
alter table ps_products add column if not exists title_key  text;
alter table ps_products add column if not exists enriched_at timestamptz;
create index if not exists ps_products_title_key on ps_products (title_key);
create index if not exists ps_products_enriched  on ps_products (enriched_at nulls first, discount_percent desc);

create table if not exists store_offers (            -- Steam / Xbox / Switch teklifleri (başlık anahtarıyla PlayStation'a eşlenir)
  platform         text not null check (platform in ('steam','xbox','switch')),
  store_id         text not null,
  title_key        text not null,
  name             text not null,
  image            text,
  price            numeric(12,2),
  original_price   numeric(12,2),
  discount_percent integer not null default 0,
  currency         text,
  url              text not null,
  edition          text,
  checked_at       timestamptz not null,
  primary key (platform, store_id)
);
create index if not exists store_offers_title_key on store_offers (title_key);

create table if not exists game_scores (             -- Metacritic (PC, Steam üzerinden) ve OpenCritic
  title_key           text primary key,
  metacritic          integer,
  metacritic_platform text,
  metacritic_url      text,
  opencritic          integer,
  opencritic_reviews  integer,
  opencritic_url      text,
  checked_at          timestamptz not null
);

create table if not exists oc_index (                -- OpenCritic herkese açık site haritasından oyun dizini
  id        integer primary key,
  slug      text not null,
  title_key text not null
);
create index if not exists oc_index_title_key on oc_index (title_key);

alter table store_offers enable row level security;
alter table game_scores  enable row level security;
alter table oc_index     enable row level security;
create policy "herkese okuma" on store_offers for select using (true);
create policy "herkese okuma" on game_scores  for select using (true);
create policy "herkese okuma" on oc_index     for select using (true);

create or replace view library with (security_invoker = true) as
select p.*,
       coalesce((select jsonb_agg(to_jsonb(o) - 'title_key') from store_offers o where o.title_key = p.title_key), '[]'::jsonb) as offers,
       (select to_jsonb(s) - 'title_key' from game_scores s where s.title_key = p.title_key) as scores
from ps_products p;
grant select on library to anon, authenticated;
