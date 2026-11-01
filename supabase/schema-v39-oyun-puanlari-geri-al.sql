-- schema-v39-oyun-puanlari.sql'i geri alır: arama fonksiyonlarındaki "userScore" sıralamasını çıkarır, igdb_user_rank ve game_igdb_score'u siler.
-- game_ttb ve v35/v36'nın süre eklemelerine dokunmaz.
do $undo$
declare r record; def text;
begin
 for r in select * from (values
  ('public.search_games_t(text,integer,integer,jsonb,text,boolean)',  $a$ case when sort_order='userScore' then public.igdb_user_rank(title_key) end desc nulls last,$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)', $a$ case when sort_order = 'userScore' then score_m end desc nulls last,$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)', $a$ case when sort_order = 'userScore' then public.igdb_user_rank(f.title_key) end as score_m,$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)', $a$ case when sort_order = 'userScore' then score_m end desc nulls last,$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)', $a$ case when sort_order = 'userScore' then public.igdb_user_rank(f.title_key) end as score_m,$a$)
 ) v(fn, piece)
 loop
  def := pg_get_functiondef(r.fn::regprocedure);
  if position(r.piece in def) > 0 then execute replace(def, r.piece, ''); end if;
 end loop;
end $undo$;
drop function if exists public.igdb_user_rank(text);
drop table if exists public.game_igdb_score;
