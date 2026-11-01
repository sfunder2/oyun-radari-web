-- v47'yi geri alır: on yeni mağazanın satırlarını siler, arama fonksiyonlarını ve platform kısıtını v46 hâline getirir.
-- Önce scripts/itad.mjs ITAD_SHOPS listesinden bu mağazaları çıkar (ya da itad-prices iş akışını durdur), yoksa kısıt yazmayı reddeder.
do $d$
declare f text; def text;
begin
 foreach f in array array['public.search_market_r(text,text,integer,integer,jsonb,text,boolean)',
                          'public.search_market_d(text,text,integer,integer,jsonb,text,boolean)',
                          'public.search_market_s(text,text,integer,integer,jsonb,text,boolean)'] loop
  def := pg_get_functiondef(f::regprocedure);
  def := replace(def, $s$,'gamebillet','dreamgame','allyouplay','gamersgate','indiegala','planetplay','playsum','playerland','ubisoft','blizzard'$s$, '');
  execute def;
 end loop;
end $d$;
delete from public.store_offers where platform in ('gamebillet','dreamgame','allyouplay','gamersgate','indiegala','planetplay','playsum','playerland','ubisoft','blizzard');
alter table public.store_offers drop constraint if exists store_offers_platform_check;
alter table public.store_offers add constraint store_offers_platform_check
 check (platform in ('steam','xbox','switch','epic','gog','fanatical','humble','gmg','wingamestore','gamesplanet'));
set statement_timeout = '180s';
select public.refresh_search_keys();
delete from public.search_cache;
