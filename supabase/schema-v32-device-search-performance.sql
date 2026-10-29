-- Keep existing authorization and result shapes; accelerate the device-qualified catalogue.
set lock_timeout='3s';
create index if not exists search_keys_platform on public.search_keys(platform);
create index if not exists store_offers_xbox_device_cover on public.store_offers(store_id) include(devices) where platform='xbox';
CREATE OR REPLACE FUNCTION public.search_market_d(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
declare
 m text := lower(coalesce(nullif(market,''),'all'));
 q text := left(trim(regexp_replace(lower(coalesce(query_text,'')),'[^a-z0-9 ]',' ','g')),120);
 opts jsonb := coalesce(filter_options,'{}'::jsonb);
 dev text := lower(coalesce(filter_options->>'device',''));
 fx numeric := coalesce(nullif(opts->>'usdTry','')::numeric, 40);
 pref_g text[] := public.taste_list(opts->'preferGenres', false);
 pref_t text[] := public.taste_list(opts->'preferTags', true);
 per integer := greatest(1, least(page_size, 50));
 pg integer := greatest(0, least(page_number, 10000));
 result jsonb;
begin
 q := trim(regexp_replace(q,'\s+',' ','g'));
 if m not in ('all','steam','xbox','switch','epic','gog') then m := 'all'; end if;
 if dev not in ('','pc','ps5','ps4','xbox_series','xbox_one','switch') then dev := ''; end if;
 -- search_market_s ile aynı yol (search_keys, 15 dakikada bir yenilenir) + cihaz süzgeci.
 with filtered as (
  select b.*, b.price * case when b.usd then fx else 1 end as price_try from search_keys b
  -- Cihaz seçiliyken Tümü'de PS'te de bulunan mağaza oyunları da aday olur (in_all yalnız cihazsız listede tekrarı önler).
  where ((m = 'all' and (b.in_all or dev <> '')) or b.platform = m)
   -- Narrow the platform before checking store-specific devices; CASE alone scans every store.
   and (dev = '' or b.platform = any(case
     when dev = 'pc' then array['steam','epic','gog']
     when dev in ('xbox_series','xbox_one') then array['xbox']
     when dev in ('ps4','ps5') then array['playstation']
     when dev = 'switch' then array['switch'] else array[]::text[] end))
   and (dev = '' or case
         when b.platform in ('steam','epic','gog') then dev = 'pc'
         when b.platform = 'switch' then dev = 'switch'
         when b.platform = 'playstation' then dev in ('ps4','ps5') and exists (select 1 from ps_products p where p.id = b.store_id and p.edition ilike '%'||dev||'%')
         when b.platform = 'xbox' then dev in ('xbox_series','xbox_one') and exists (select 1 from store_offers so where so.platform = 'xbox' and so.store_id = b.store_id and so.devices @> array[dev])
         else false end)
   and (not deals_only or (b.discount_percent > 0 and b.original_price > b.price))
   and (coalesce(nullif(opts->>'minScore','')::numeric,0) <= 0 or b.best_score >= (opts->>'minScore')::numeric)
   and (nullif(opts->>'maxPrice','') is null or b.price * case when b.usd then fx else 1 end <= (opts->>'maxPrice')::numeric)
   and (coalesce(opts->>'genre','') = '' or b.genres @> array[opts->>'genre'])
   and (coalesce(opts->>'developer','') = '' or b.developers @> array[opts->>'developer'])
   and (coalesce(opts->>'year','') = '' or b.release_year = (opts->>'year')::integer)
   and (coalesce(opts->>'turkish','false') <> 'true' or b.turkish is true)
   and (coalesce(opts->>'tag','') = '' or exists (select 1 from unnest(b.taste_tags) t where lower(t) = lower(opts->>'tag')))
   and (jsonb_typeof(opts->'ids') is distinct from 'array' or b.id in (select jsonb_array_elements_text(opts->'ids')))
 ), matched as (
  select f.id, f.platform, f.grp, f.name, f.price_try, f.best_score, f.discount_percent, f.first_seen,
   case when sort_order = 'foryou' then public.taste_score_i(f.genres, f.taste_tags, f.best_score, f.discount_percent, pref_g, pref_t) end as taste_score,
   case when q = '' then 0 when f.title_key = q or f.searchable = q then 0 when f.searchable like q||'%' then 1
        when f.searchable like '%'||q||'%' then 2 when f.searchable like split_part(q,' ',1)||'%' then 3 else 4 end as relevance,
   case when q = '' then true else not exists (select 1 from unnest(string_to_array(q,' ')) w where strpos(f.searchable, w) = 0) end as token_match
  from filtered f
 ), eligible as (
  -- Tümü: aynı oyun birden çok PC/konsol mağazasında süzgeci geçiyorsa yalnız en ucuz teklif listelenir.
  select * from (select mt.*, row_number() over (partition by case when m = 'all' then mt.grp else mt.id end
                                                 order by mt.price_try asc nulls last, mt.id) as store_rank
                 from matched mt where mt.token_match) x
  where store_rank = 1
 ), sorted as (
  select e.id, row_number() over (order by
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
  select s.result_number, k.id, k.platform, k.store_id, k.title_key, k.genres from sorted s join search_keys k on k.id = s.id
  where s.result_number > pg * per and s.result_number <= (pg + 1) * per
 )
 select jsonb_build_object(
  'items', coalesce((select jsonb_agg(
     case when p.platform = 'playstation' then (select to_jsonb(l) || jsonb_build_object('tags', coalesce(lm.tags,'{}'), 'categories', coalesce(lm.categories,'{}'), 'platform', 'playstation') from library l left join game_meta lm on lm.title_key = l.title_key where l.id = p.id)
     else (select jsonb_build_object('id',p.id,'platform',p.platform,'store_id',o.store_id,'title_key',o.title_key,'name',o.name,'image',o.image,'price',o.price,
       'original_price',o.original_price,'discount_percent',o.discount_percent,'currency',o.currency,'url',o.url,'edition',o.edition,'checked_at',o.checked_at,
       'first_seen',o.first_seen,'mc_score',gs.metacritic,'oc_score',gs.opencritic,'opencritic_reviews',gs.opencritic_reviews,'best_score',greatest(gs.metacritic, gs.opencritic),
       'genres',p.genres,'tags',coalesce(gm.tags,'{}') || array(select x from unnest(o.tags) x where not x = any(coalesce(gm.tags,'{}'))),
       'release_date',gm.release_date,'developers',gm.developers,'turkish',gm.turkish,'turkish_audio',gm.turkish_audio,'age',gm.age,
       'offers',public.market_offers(o.title_key,o.platform))
      from store_offers o left join game_scores gs on gs.title_key = o.title_key left join game_meta gm on gm.title_key = o.title_key
      where o.platform = p.platform and o.store_id = p.store_id) end
     order by p.result_number) from paged p), '[]'::jsonb),
  'total', (select count(*) from eligible),
  'query', q,
  'personalized', sort_order = 'foryou' and cardinality(pref_g) + cardinality(pref_t) > 0) into result;
 return result;
end;
$function$
;
