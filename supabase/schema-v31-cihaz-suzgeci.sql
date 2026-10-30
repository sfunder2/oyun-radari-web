-- v31 (2026-10-25'te uygulandı): Cihaz süzgeçli arama (search_market_v2) güncel arama tablosundan okur.
-- Neden (2026-10-25 ölçümü): Keşfet'te cihaz seçilince çağrılan search_market_v2, market_search_rows
-- görünümünden okuyordu. Bu görünümün yenilenmesi kapatıldığı için son kez 2026-10-24 00:48'de yenilenmişti.
-- Sonuç: cihaz süzgecinde Steam'in 11.388 oyunundan 6.654'ü, Switch'in 6.033 oyunundan 2.683'ü görünüyor;
-- 230 üründe fiyat eski; puan sıralaması da eski puanlarla yapılıyordu.
--
-- Bu dosya:
--  1. search_market_d: search_market_s ile aynı yol (search_keys, 15 dakikada bir yenilenir) + cihaz süzgeci.
--     Ürün ayrıntıları (fiyat, görsel, bağlantı) store_offers / library'den o anda okunur.
--  2. search_market_v2'yi search_market / search_games gibi önbellekli sarmalayıcıya çevirir
--     (5 dk taze, zaman aşımında son sonuç). İmza aynı; sitede değişiklik gerekmez.
-- market_search_rows ve diğer eski görünümler silinmez (ayrı temizlik).
--
-- Karşılaştırma (canlı veri, eski -> yeni toplam): steam/pc 6654 -> 11373, tümü/switch 2680 -> 6019,
-- tümü/pc 19778 -> 19894, tümü/ps5 9963 -> 9966, tümü/xbox_series 13730 -> 13731, zelda/switch 9 -> 9.

create or replace function public.search_market_d(market text default 'all'::text, query_text text default ''::text, page_number integer default 0, page_size integer default 25, filter_options jsonb default '{}'::jsonb, sort_order text default 'default'::text, deals_only boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
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
$function$;
revoke execute on function public.search_market_d(text,text,integer,integer,jsonb,text,boolean) from public, anon, authenticated;

create or replace function public.search_market_v2(market text default 'all'::text, query_text text default ''::text, page_number integer default 0, page_size integer default 25, filter_options jsonb default '{}'::jsonb, sort_order text default 'default'::text, deals_only boolean default false)
 returns jsonb language plpgsql volatile security definer set search_path to 'public', 'extensions' as $function$
declare ck text := 'd:'||md5(concat_ws('|',market,query_text,page_number,page_size,coalesce(filter_options,'{}'::jsonb)::text,sort_order,deals_only)); r jsonb; ts timestamptz;
begin
 -- search_market ile aynı önbellek: 5 dakika taze; hesaplama zaman aşımına uğrarsa son sonuç verilir.
 select c.v, c.at into r, ts from search_cache c where c.k = ck;
 if found and ts > now() - interval '5 minutes' then return r; end if;
 begin
  r := public.search_market_d(market, query_text, page_number, page_size, filter_options, sort_order, deals_only);
 exception when query_canceled then
  if ts is not null then return r; end if;
  raise;
 end;
 insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
 if random() < 0.02 then delete from search_cache where at < now() - interval '24 hours'; end if;
 return r;
end $function$;

-- Geri alma: search_market_v2'nin eski tanımı supabase/schema-v31-onceki-search-market-v2.sql dosyasında;
-- onu çalıştırıp "drop function public.search_market_d(text,text,integer,integer,jsonb,text,boolean);".
