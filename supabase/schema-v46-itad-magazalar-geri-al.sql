-- v46'yı geri alır: ITAD mağazalarının satırlarını siler, arama fonksiyonlarını ve platform kısıtını eski hâline getirir.
-- itad_games önbelleği bırakılır (zararsız); tamamen kaldırmak için sondaki satırın yorumunu aç.
-- Önce .github/workflows/itad-prices.yml iş akışını devre dışı bırak, yoksa satırlar yeniden yazılır (kısıt yazmayı reddeder).
do $d$
declare f text; def text;
begin
 foreach f in array array['public.search_market_r(text,text,integer,integer,jsonb,text,boolean)',
                          'public.search_market_d(text,text,integer,integer,jsonb,text,boolean)',
                          'public.search_market_s(text,text,integer,integer,jsonb,text,boolean)'] loop
  def := pg_get_functiondef(f::regprocedure);
  def := replace(def, $s$,'fanatical','humble','gmg','wingamestore','gamesplanet'$s$, '');
  execute def;
 end loop;
end $d$;
delete from public.store_offers where platform in ('fanatical','humble','gmg','wingamestore','gamesplanet');
alter table public.store_offers drop constraint if exists store_offers_platform_check;
alter table public.store_offers add constraint store_offers_platform_check check (platform in ('steam','xbox','switch','epic','gog'));
delete from public.ps_state where key = 'market_itad';
set statement_timeout = '180s';
select public.refresh_search_keys();
delete from public.search_cache;
-- drop table if exists public.itad_games;
