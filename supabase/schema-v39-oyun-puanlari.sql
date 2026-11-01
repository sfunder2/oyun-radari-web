-- Şema v39: oyun puanları (IGDB oyuncu ve eleştirmen puanı) ve Keşfet'te "Oyuncu puanı: en yüksek" sıralaması ("userScore").
-- Kaynak: IGDB API (Twitch). Eşleştirme oyun süresi toplayıcısının game_ttb.igdb_id değerinden gelir; bu dosya game_ttb'ye dokunmaz.
-- Gerekli: schema-v35-oyun-suresi.sql (game_ttb; toplayıcı igdb_id'yi oradan okur). v36 kurulu olsa da olmasa da çalışır.
--
-- 1) game_igdb_score: başlık anahtarı başına tek satır. Puanlar 0–100, bir ondalık.
--      user_rating / user_votes     = IGDB oyuncu puanı ve oy sayısı ("rating", "rating_count")
--      critic_rating / critic_votes = IGDB eleştirmen puanı ve eleştiri sayısı ("aggregated_rating", "aggregated_rating_count")
--      slug: igdb.com/games/<slug> bağlantısı için. Satırı yalnız toplayıcı (service role) yazar; herkes okuyabilir.
--      Puanlar 7 günde bir yenilenir. Disk: ~15 bin satır × ~90 bayt ≈ 1,5 MB.
-- 2) igdb_user_rank(title_key): sıralama ölçüsü. Az oyla gelen uç puanlar 70'e doğru çekilir:
--      (oy × puan + 10 × 70) / (oy + 10). Böylece 2 oyla 100 alan oyun, 5 000 oyla 90 alanın önüne geçmez. Puanı olmayanlar sonda.
-- 3) Canlı arama fonksiyonlarına yerinde ekleme (v35/v36 gibi; her yama noktası tam bir kez eşleşmezse hiçbir şey değişmez):
--      search_games_t   : sıralamaya bir satır (search_games_s2/_s bilinmeyen sıralamayı zaten buraya yollar).
--      search_market_s/d: "matched" adımına score_m sütunu ve sıralamaya bir satır. Ölçü yalnız bu sıralamada hesaplanır.
--    Geri almak için: supabase/schema-v39-oyun-puanlari-geri-al.sql

create table if not exists public.game_igdb_score (
 title_key text primary key,
 igdb_id integer,
 slug text check (slug is null or slug ~ '^[a-z0-9-]{1,200}$'),
 user_rating numeric(4,1) check (user_rating is null or user_rating between 0 and 100),
 user_votes integer not null default 0 check (user_votes >= 0),
 critic_rating numeric(4,1) check (critic_rating is null or critic_rating between 0 and 100),
 critic_votes integer not null default 0 check (critic_votes >= 0),
 checked_at timestamptz not null default now()
);
alter table public.game_igdb_score enable row level security;
drop policy if exists game_igdb_score_read on public.game_igdb_score;
create policy game_igdb_score_read on public.game_igdb_score for select to anon, authenticated using (true);
revoke all on public.game_igdb_score from public, anon, authenticated;
grant select on public.game_igdb_score to anon, authenticated;
grant all on public.game_igdb_score to service_role;
create index if not exists game_igdb_score_checked on public.game_igdb_score (checked_at);

create or replace function public.igdb_user_rank(key text) returns numeric
language sql stable set search_path = '' as $$
 select (s.user_votes * s.user_rating + 10 * 70) / (s.user_votes + 10)
 from public.game_igdb_score s where s.title_key = key and s.user_rating is not null and s.user_votes > 0
$$;
grant execute on function public.igdb_user_rank(text) to anon, authenticated, service_role;

do $patch$
declare
 r record; def text; n integer;
begin
 for r in select * from (values
  ('public.search_games_t(text,integer,integer,jsonb,text,boolean)',
   $a$case when sort_order='priceDesc' then price end desc nulls last,$a$,
   $a$case when sort_order='priceDesc' then price end desc nulls last, case when sort_order='userScore' then public.igdb_user_rank(title_key) end desc nulls last,$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)',
   $a$case when sort_order = 'priceDesc' then price_try end desc nulls last,$a$,
   $a$case when sort_order = 'priceDesc' then price_try end desc nulls last, case when sort_order = 'userScore' then score_m end desc nulls last,$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)',
   $a$f.first_seen,$a$,
   $a$f.first_seen, case when sort_order = 'userScore' then public.igdb_user_rank(f.title_key) end as score_m,$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)',
   $a$case when sort_order = 'priceDesc' then price_try end desc nulls last,$a$,
   $a$case when sort_order = 'priceDesc' then price_try end desc nulls last, case when sort_order = 'userScore' then score_m end desc nulls last,$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)',
   $a$f.first_seen,$a$,
   $a$f.first_seen, case when sort_order = 'userScore' then public.igdb_user_rank(f.title_key) end as score_m,$a$)
 ) v(fn, anchor, repl)
 loop
  def := pg_get_functiondef(r.fn::regprocedure);
  if position(r.repl in def) > 0 then continue; end if; -- zaten yamalı
  n := (length(def) - length(replace(def, r.anchor, ''))) / length(r.anchor);
  if n <> 1 then raise exception 'Fonksiyon biçimi değişmiş (% içinde % eşleşme): %', r.fn, n, r.anchor; end if;
  execute replace(def, r.anchor, r.repl);
 end loop;
end $patch$;
