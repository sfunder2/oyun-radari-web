-- schema-v36-oyun-suresi-siralama.sql'i geri alır.
do $undo$
declare r record; def text;
begin
 for r in select * from (values
  ('public.search_games_t(text,integer,integer,jsonb,text,boolean)', $a$ case when sort_order='ttbAsc' then public.ttb_min(title_key) end asc nulls last, case when sort_order='ttbDesc' then public.ttb_min(title_key) end desc nulls last,$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)', $a$ case when sort_order = 'ttbAsc' then ttb_m end asc nulls last, case when sort_order = 'ttbDesc' then ttb_m end desc nulls last,$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)', $a$ case when sort_order in ('ttbAsc','ttbDesc') then public.ttb_min(f.title_key) end as ttb_m,$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)', $a$ case when sort_order = 'ttbAsc' then ttb_m end asc nulls last, case when sort_order = 'ttbDesc' then ttb_m end desc nulls last,$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)', $a$ case when sort_order in ('ttbAsc','ttbDesc') then public.ttb_min(f.title_key) end as ttb_m,$a$)
 ) v(fn, piece)
 loop
  def := pg_get_functiondef(r.fn::regprocedure);
  if position(r.piece in def) > 0 then execute replace(def, r.piece, ''); end if;
 end loop;
end $undo$;
drop function if exists public.ttb_min(text);
