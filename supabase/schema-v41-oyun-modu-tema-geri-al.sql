-- schema-v41-oyun-modu-tema.sql'i geri alır: arama fonksiyonlarındaki mod/tema koşulunu çıkarır, gmode_ok ve game_modes'u siler.
-- Oyun süresi (v35/v36) yerinde kalır.
do $undo$
declare r record; def text;
begin
 for r in select * from (values
  ('public.search_games_s2(text,integer,integer,jsonb,text,boolean)', $a$ or coalesce(opts->>'gmode','')<>'' or coalesce(opts->>'gtheme','')<>''$a$),
  ('public.search_games_s(text,integer,integer,jsonb,text,boolean)',  $a$ or coalesce(opts->>'gmode','')<>'' or coalesce(opts->>'gtheme','')<>''$a$),
  ('public.search_games_t(text,integer,integer,jsonb,text,boolean)',  $a$ and public.gmode_ok(l.title_key, opts->>'gmode', opts->>'gtheme')$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)', $a$ and public.gmode_ok(b.title_key, opts->>'gmode', opts->>'gtheme')$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)', $a$ and public.gmode_ok(b.title_key, opts->>'gmode', opts->>'gtheme')$a$)
 ) v(fn, piece)
 loop
  def := pg_get_functiondef(r.fn::regprocedure);
  if position(r.piece in def) > 0 then execute replace(def, r.piece, ''); end if;
 end loop;
end $undo$;
drop function if exists public.gmode_ok(text, text, text);
drop table if exists public.game_modes;
