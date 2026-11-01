-- Şema v36: Keşfet'te oyun süresine göre sıralama ("ttbAsc": kısadan uzuna, "ttbDesc": uzundan kısaya).
-- Ölçü v35'teki filtreyle aynı: ana hikâye + yan içerik, yoksa ana hikâye süresi. Süresi olmayan oyunlar her iki yönde de sonda kalır.
-- Gerekli: schema-v35-oyun-suresi.sql (game_ttb). Canlı arama fonksiyonlarına yerinde eklenir (v35 gibi); her yama noktası tam bir kez
-- eşleşmezse hiçbir şey değişmez. Başka sıralamalar etkilenmez: süre yalnız bu iki sıralamada hesaplanır.
--  * search_games_t   : sıralamaya iki satır (PS; search_games_s2/_s bilinmeyen sıralamayı zaten buraya yollar).
--  * search_market_s/d: "matched" adımına ttb_m sütunu ve sıralamaya iki satır.
-- Geri almak için: supabase/schema-v36-oyun-suresi-siralama-geri-al.sql

create or replace function public.ttb_min(key text) returns integer
language sql stable set search_path = '' as $$
 select coalesce(t.normally_min, t.hastily_min) from public.game_ttb t where t.title_key = key
$$;
grant execute on function public.ttb_min(text) to anon, authenticated, service_role;

do $patch$
declare
 r record; def text; n integer;
begin
 for r in select * from (values
  ('public.search_games_t(text,integer,integer,jsonb,text,boolean)',
   $a$case when sort_order='priceDesc' then price end desc nulls last,$a$,
   $a$case when sort_order='priceDesc' then price end desc nulls last, case when sort_order='ttbAsc' then public.ttb_min(title_key) end asc nulls last, case when sort_order='ttbDesc' then public.ttb_min(title_key) end desc nulls last,$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)',
   $a$case when sort_order = 'priceDesc' then price_try end desc nulls last,$a$,
   $a$case when sort_order = 'priceDesc' then price_try end desc nulls last, case when sort_order = 'ttbAsc' then ttb_m end asc nulls last, case when sort_order = 'ttbDesc' then ttb_m end desc nulls last,$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)',
   $a$f.first_seen,$a$,
   $a$f.first_seen, case when sort_order in ('ttbAsc','ttbDesc') then public.ttb_min(f.title_key) end as ttb_m,$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)',
   $a$case when sort_order = 'priceDesc' then price_try end desc nulls last,$a$,
   $a$case when sort_order = 'priceDesc' then price_try end desc nulls last, case when sort_order = 'ttbAsc' then ttb_m end asc nulls last, case when sort_order = 'ttbDesc' then ttb_m end desc nulls last,$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)',
   $a$f.first_seen,$a$,
   $a$f.first_seen, case when sort_order in ('ttbAsc','ttbDesc') then public.ttb_min(f.title_key) end as ttb_m,$a$)
 ) v(fn, anchor, repl)
 loop
  def := pg_get_functiondef(r.fn::regprocedure);
  if position(r.repl in def) > 0 then continue; end if; -- zaten yamalı
  n := (length(def) - length(replace(def, r.anchor, ''))) / length(r.anchor);
  if n <> 1 then raise exception 'Fonksiyon biçimi değişmiş (% içinde % eşleşme): %', r.fn, n, r.anchor; end if;
  execute replace(def, r.anchor, r.repl);
 end loop;
end $patch$;
