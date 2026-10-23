-- Supabase v20: Xbox, Switch, Epic ve GOG'un kendi tür bilgisi. SQL Editor'de bir kez çalıştırın (önce v2-v19). Tekrar çalıştırmak güvenlidir.
-- Neden: tek mağaza sekmelerinde tür yalnız Steam (game_meta) ya da aynı adlı PS oyunundan geliyordu; Xbox'taki 4.656 teklifin ~719'unda tür vardı.
-- Toplayıcı (scripts/market-catalog.mjs + store-genres.mjs) her mağazanın tür/etiket adlarını site tür adlarına (genres) ve Steam etiketi adlarına (tags) eşleyip
-- store_offers'a yazar. Sütunlar ÖNCE eklenmeli, sonra refresh-markets yeniden yayınlanmalı. Mevcut satırlar katalog turu döndükçe dolar.
alter table public.store_offers add column if not exists genres text[] not null default '{}';
alter table public.store_offers add column if not exists tags   text[] not null default '{}';

-- search_market: v19 tanımı (PS kaydı yalnız sayfadaki sonuçlar için kurulur); market satırlarında türler = Steam ∪ mağaza (ikisi de boşsa aynı adlı PS oyununun türleri), etiketlere mağaza etiketleri eklenir.
create or replace function public.search_market(
 market text default 'all', query_text text default '', page_number integer default 0, page_size integer default 25,
 filter_options jsonb default '{}'::jsonb, sort_order text default 'default', deals_only boolean default false
) returns jsonb language plpgsql stable security invoker set search_path = public, extensions as $$
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
 with market_rows as (
  select o.platform||':'||o.store_id as id, o.platform, o.store_id, o.title_key, o.name,
         coalesce(o.name_search, lower(o.name)) as searchable, o.image, o.price, o.original_price, o.discount_percent, o.currency, o.url, o.edition,
         o.checked_at, o.first_seen, gs.metacritic as mc_score, gs.opencritic as oc_score, gs.opencritic_reviews,
         greatest(gs.metacritic, gs.opencritic) as best_score,
         case when cardinality(coalesce(gm.genres,'{}') || o.genres) > 0 then array(select distinct x from unnest(coalesce(gm.genres,'{}') || o.genres) x order by x)
              else (select pg.ps_genres from ps_products pg where o.title_key <> '' and pg.title_key = o.title_key and cardinality(pg.ps_genres) > 0 limit 1) end as genres,
         gm.release_date, gm.developers, gm.turkish, gm.turkish_audio, gm.age,
         coalesce(gm.tags,'{}') || array(select x from unnest(o.tags) x where not x = any(coalesce(gm.tags,'{}'))) as tags,
         coalesce(gm.tags,'{}') || coalesce(gm.categories,'{}') || o.tags as taste_tags,
         o.price * case when o.currency = 'USD' then fx else 1 end as price_try, null::jsonb as library_row
  from store_offers o
  left join game_scores gs on gs.title_key = o.title_key
  left join game_meta   gm on gm.title_key = o.title_key
  where (m = 'all' or o.platform = m)
    and (m <> 'all' or o.title_key = '' or not exists (select 1 from ps_products p where p.title_key = o.title_key))
 ), ps_rows as (
  select l.id, 'playstation'::text as platform, l.id as store_id, l.title_key, l.name,
         regexp_replace(coalesce(l.name_search,''),'[^a-z0-9 ]','','g') as searchable, l.image, l.price, l.original_price, l.discount_percent, l.currency, l.url, l.edition,
         l.checked_at, l.first_seen, l.mc_score, l.oc_score, null::integer as opencritic_reviews, l.best_score, l.genres, l.release_date, l.developers,
         l.turkish, l.turkish_audio, l.age, coalesce(lm.tags,'{}') as tags, coalesce(lm.tags,'{}') || coalesce(lm.categories,'{}') || coalesce(l.ps_tags,'{}') as taste_tags,
         l.price as price_try, null::jsonb as library_row
  from library l left join game_meta lm on lm.title_key = l.title_key where m = 'all'
 ), base as (
  select * from market_rows union all select * from ps_rows
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
  select f.*, public.taste_score(f.genres, f.taste_tags, f.best_score, f.discount_percent, pref_g, pref_t) as taste_score,
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
$$;

revoke all on function public.search_market(text,text,integer,integer,jsonb,text,boolean) from public;
grant execute on function public.search_market(text,text,integer,integer,jsonb,text,boolean) to anon, authenticated, service_role;
