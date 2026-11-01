-- schema-v35-oyun-suresi.sql'i geri alır: arama fonksiyonlarındaki süre koşulunu çıkarır, ttb_ok ve game_ttb'yi siler.
do $undo$
declare r record; def text;
begin
 for r in select * from (values
  ('public.search_games_s2(text,integer,integer,jsonb,text,boolean)', $a$ or coalesce(opts->>'ttb','')<>''$a$),
  ('public.search_games_s(text,integer,integer,jsonb,text,boolean)',  $a$ or coalesce(opts->>'ttb','')<>''$a$),
  ('public.search_games_t(text,integer,integer,jsonb,text,boolean)',  $a$ and public.ttb_ok(l.title_key, opts->>'ttb')$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)', $a$ and public.ttb_ok(b.title_key, opts->>'ttb')$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)', $a$ and public.ttb_ok(b.title_key, opts->>'ttb')$a$)
 ) v(fn, piece)
 loop
  def := pg_get_functiondef(r.fn::regprocedure);
  if position(r.piece in def) > 0 then execute replace(def, r.piece, ''); end if;
 end loop;
end $undo$;
drop function if exists public.ttb_ok(text, text);
drop table if exists public.game_ttb;
