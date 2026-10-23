-- v21: search_market taban satırları önceden hazırlanır (market_search_rows, 3 dakikada bir yenilenir).
-- Neden: store_offers ~35 bin satıra çıkınca her istekte tüm katalog taranıyor, misafir (anon) 3 sn sınırı aşılıyordu.
-- Önceki tanım search_market_old olarak saklanır.

set statement_timeout = '120s';
create materialized view if not exists public.market_search_rows as
  select o.platform||':'||o.store_id as id, o.platform, o.store_id, o.title_key, o.name,
         coalesce(o.name_search, lower(o.name)) as searchable, o.image, o.price, o.original_price, o.discount_percent, o.currency, o.url, o.edition,
         o.checked_at, o.first_seen, gs.metacritic as mc_score, gs.opencritic as oc_score, gs.opencritic_reviews,
         greatest(gs.metacritic, gs.opencritic) as best_score,
         case when cardinality(coalesce(gm.genres,'{}') || o.genres) > 0 then array(select distinct x from unnest(coalesce(gm.genres,'{}') || o.genres) x order by x)
              else (select pg.ps_genres from ps_products pg where o.title_key <> '' and pg.title_key = o.title_key and cardinality(pg.ps_genres) > 0 limit 1) end as genres,
         gm.release_date, gm.developers, gm.turkish, gm.turkish_audio, gm.age,
         coalesce(gm.tags,'{}') || array(select x from unnest(o.tags) x where not x = any(coalesce(gm.tags,'{}'))) as tags,
         coalesce(gm.tags,'{}') || coalesce(gm.categories,'{}') || o.tags as taste_tags,
         (o.currency = 'USD') as usd,
         (o.title_key = '' or not exists (select 1 from ps_products p where p.title_key = o.title_key)) as in_all
  from store_offers o
  left join game_scores gs on gs.title_key = o.title_key
  left join game_meta   gm on gm.title_key = o.title_key
  union all
  select l.id, 'playstation'::text, l.id, l.title_key, l.name,
         regexp_replace(coalesce(l.name_search,''),'[^a-z0-9 ]','','g'), l.image, l.price, l.original_price, l.discount_percent, l.currency, l.url, l.edition,
         l.checked_at, l.first_seen, l.mc_score, l.oc_score, null::integer, l.best_score, l.genres, l.release_date, l.developers,
         l.turkish, l.turkish_audio, l.age, coalesce(lm.tags,'{}'), coalesce(lm.tags,'{}') || coalesce(lm.categories,'{}') || coalesce(l.ps_tags,'{}'),
         false, true
  from library l left join game_meta lm on lm.title_key = l.title_key;
-- concurrently yenileme için tekil indeks gerekir.
create unique index if not exists market_search_rows_id on public.market_search_rows (id);
create index if not exists market_search_rows_platform on public.market_search_rows (platform);
grant select on public.market_search_rows to anon, authenticated;
analyze public.market_search_rows;

CREATE OR REPLACE FUNCTION public.search_market_mv(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
declare
 m text := lower(coalesce(nullif(market,''),'all'));
 q text := left(trim(regexp_replace(lower(coalesce(query_text,'')),'[^a-z0-9 ]',' ','g')),120);
 opts jsonb := coalesce(filter_options,'{}'::jsonb);
 fx numeric := coalesce(nullif(opts->>'usdTry','')::numeric, 40);
 pref_g text[] := public.taste_list(opts->'preferGenres', false);
 pref_t text[] := public.taste_list(opts->'preferTags', true);
 per integer := greatest(1, least(page_size, 50));
 pg integer := greatest(0, least(page_number, 10000));
 result jsonb;
begin
 q := trim(regexp_replace(q,'\s+',' ','g'));
 if m not in ('all','steam','xbox','switch','epic','gog') then m := 'all'; end if;
 -- Taban satırlar market_search_rows (materialized view, cron ile yenilenir) içinde hazır; burada yalnız süzme, sıralama ve sayfalama yapılır.
 with base as (
  select r.*, r.price * case when r.usd then fx else 1 end as price_try
  from market_search_rows r
  where (m = 'all' and r.in_all) or r.platform = m
 ), filtered as (
  select * from base b
  where (not deals_only or (b.discount_percent > 0 and b.original_price > b.price))
    and (coalesce(nullif(opts->>'minScore','')::numeric,0) <= 0 or b.best_score >= (opts->>'minScore')::numeric)
    and (nullif(opts->>'maxPrice','') is null or b.price_try <= (opts->>'maxPrice')::numeric)
    and (coalesce(opts->>'genre','') = '' or b.genres @> array[opts->>'genre'])
    and (coalesce(opts->>'developer','') = '' or b.developers @> array[opts->>'developer'])
    and (coalesce(opts->>'year','') = '' or extract(year from b.release_date) = (opts->>'year')::integer)
    and (coalesce(opts->>'turkish','false') <> 'true' or b.turkish is true)
    and (coalesce(opts->>'tag','') = '' or exists (select 1 from unnest(b.taste_tags) t where lower(t) = lower(opts->>'tag')))
    and (jsonb_typeof(opts->'ids') is distinct from 'array' or b.id in (select jsonb_array_elements_text(opts->'ids')))
 ), matched as (
  select f.*, case when sort_order = 'foryou' then public.taste_score(f.genres, f.taste_tags, f.best_score, f.discount_percent, pref_g, pref_t) end as taste_score,
   case when q = '' then 0 when f.title_key = q or f.searchable = q then 0 when f.searchable like q||'%' then 1
        when f.searchable like '%'||q||'%' then 2 when f.searchable like split_part(q,' ',1)||'%' then 3 else 4 end as relevance,
   case when q = '' then true else not exists (select 1 from unnest(string_to_array(q,' ')) w where strpos(f.searchable, w) = 0) end as token_match
  from filtered f
 ), eligible as (
  -- Tümü: aynı oyun birden çok PC/konsol mağazasında filtreleri geçiyorsa yalnız en ucuz teklif listelenir; diğerleri 'offers' içinde kalır.
  select * from (select mt.*, row_number() over (partition by case when m = 'all' and mt.platform <> 'playstation' and mt.title_key <> '' then mt.title_key else mt.id end
                                                 order by mt.price_try asc nulls last, mt.id) as store_rank
                 from matched mt where mt.token_match) x
  where store_rank = 1
 ), sorted as (
  select e.*, row_number() over (order by
   case when q <> '' and sort_order in ('default','foryou') then relevance end asc nulls last,
   case when sort_order = 'foryou' then taste_score end desc nulls last,
   case when sort_order in ('score','gems') then best_score end desc nulls last,
   case when sort_order = 'discount' or (sort_order = 'default' and q = '' and deals_only) then discount_percent end desc nulls last,
   case when sort_order = 'priceAsc'  then price_try end asc  nulls last,
   case when sort_order = 'priceDesc' then price_try end desc nulls last,
   case when sort_order = 'default' and q = '' and not deals_only then first_seen end desc nulls last,
   name asc, id asc) as result_number
  from eligible e
 ), paged as (
  select * from sorted where result_number > pg * per and result_number <= (pg + 1) * per
 )
 select jsonb_build_object(
  'items', coalesce((select jsonb_agg(
     case when p.platform = 'playstation' then (select to_jsonb(l) || jsonb_build_object('tags', coalesce(lm.tags,'{}'), 'categories', coalesce(lm.categories,'{}'), 'platform', 'playstation') from library l left join game_meta lm on lm.title_key = l.title_key where l.id = p.id)
     else jsonb_build_object('id',p.id,'platform',p.platform,'store_id',p.store_id,'title_key',p.title_key,'name',p.name,'image',p.image,'price',p.price,
       'original_price',p.original_price,'discount_percent',p.discount_percent,'currency',p.currency,'url',p.url,'edition',p.edition,'checked_at',p.checked_at,
       'first_seen',p.first_seen,'mc_score',p.mc_score,'oc_score',p.oc_score,'opencritic_reviews',p.opencritic_reviews,'best_score',p.best_score,
       'genres',p.genres,'tags',p.tags,'release_date',p.release_date,'developers',p.developers,'turkish',p.turkish,'turkish_audio',p.turkish_audio,'age',p.age,
       'offers',public.market_offers(p.title_key,p.platform)) end
     order by p.result_number) from paged p), '[]'::jsonb),
  'total', (select count(*) from eligible),
  'query', q,
  'personalized', sort_order = 'foryou' and cardinality(pref_g) + cardinality(pref_t) > 0) into result;
 return result;
end;
$function$;
grant execute on function public.search_market_mv(text,text,integer,integer,jsonb,text,boolean) to anon, authenticated;

-- Canlıya geçiş: önceki tanımı yedekle, hızlı sürümü search_market adına kopyala, yenilemeyi zamanla.
do $$ begin execute replace(pg_get_functiondef('public.search_market'::regproc), 'public.search_market(', 'public.search_market_old('); end $$;
do $$ begin execute replace(pg_get_functiondef('public.search_market_mv'::regproc), 'public.search_market_mv(', 'public.search_market('); end $$;
select cron.schedule('oyun-radari-search-rows', '*/3 * * * *', $c$set statement_timeout='120s'; refresh materialized view concurrently public.market_search_rows$c$);
notify pgrst, 'reload schema';
-- Geri alma: do $$ begin execute replace(pg_get_functiondef('public.search_market_old'::regproc),'public.search_market_old(','public.search_market('); end $$;
