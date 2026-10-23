-- Supabase v11: Keşfet'te market seçimi (Tümü / Steam / Xbox / Switch). SQL Editor'de bir kez çalıştırın (önce v2-v10).
-- store_offers artık yalnızca PlayStation ile eşleşen teklifleri değil, mağazaların kendi kataloglarını da tutar.
alter table store_offers add column if not exists name_search text;
alter table store_offers add column if not exists first_seen  timestamptz not null default now();
update store_offers set name_search = lower(regexp_replace(name, '[^a-zA-Z0-9 ]', ' ', 'g')) where name_search is null;
create index if not exists store_offers_platform_discount on store_offers (platform, discount_percent desc);
create index if not exists store_offers_platform_seen     on store_offers (platform, first_seen desc);
create index if not exists store_offers_name_trgm         on store_offers using gin (name_search gin_trgm_ops);

-- Aynı oyunun diğer marketlerdeki teklifleri (PlayStation dahil)
create or replace function public.market_offers(tk text, plat text) returns jsonb
language sql stable security invoker set search_path = public as $$
 select coalesce(jsonb_agg(t.x), '[]'::jsonb) from (
  select jsonb_build_object('platform',o.platform,'store_id',o.store_id,'name',o.name,'image',o.image,'price',o.price,'original_price',o.original_price,
          'discount_percent',o.discount_percent,'currency',o.currency,'url',o.url,'edition',o.edition,'checked_at',o.checked_at) as x
  from store_offers o where tk <> '' and o.title_key = tk and o.platform <> plat
  union all
  select jsonb_build_object('platform','playstation','store_id',p.id,'name',p.name,'image',p.image,'price',p.price,'original_price',p.original_price,
          'discount_percent',p.discount_percent,'currency',p.currency,'url',p.url,'edition',p.edition,'checked_at',p.checked_at)
  from ps_products p where tk <> '' and p.title_key = tk and plat <> 'playstation'
 ) t;
$$;

create or replace function public.search_market(
 market text default 'all', query_text text default '', page_number integer default 0, page_size integer default 25,
 filter_options jsonb default '{}'::jsonb, sort_order text default 'default', deals_only boolean default false
) returns jsonb language plpgsql stable security invoker set search_path = public, extensions as $$
declare
 m text := lower(coalesce(nullif(market,''),'all'));
 q text := left(trim(regexp_replace(lower(coalesce(query_text,'')),'[^a-z0-9 ]',' ','g')),120);
 opts jsonb := coalesce(filter_options,'{}'::jsonb);
 fx numeric := coalesce(nullif(opts->>'usdTry','')::numeric, 40);
 per integer := greatest(1, least(page_size, 50));
 pg integer := greatest(0, least(page_number, 10000));
 result jsonb;
begin
 q := trim(regexp_replace(q,'\s+',' ','g'));
 if m not in ('all','steam','xbox','switch') then m := 'all'; end if;
 with market_rows as (
  select o.platform||':'||o.store_id as id, o.platform, o.store_id, o.title_key, o.name,
         coalesce(o.name_search, lower(o.name)) as searchable, o.image, o.price, o.original_price, o.discount_percent, o.currency, o.url, o.edition,
         o.checked_at, o.first_seen, gs.metacritic as mc_score, gs.opencritic as oc_score, gs.opencritic_reviews,
         greatest(gs.metacritic, gs.opencritic) as best_score, gm.genres, gm.release_date, gm.developers, gm.turkish, gm.turkish_audio, gm.age,
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
         l.turkish, l.turkish_audio, l.age, l.price as price_try, to_jsonb(l) as library_row
  from library l where m = 'all'
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
 ), matched as (
  select f.*,
   case when q = '' then 0 when f.title_key = q or f.searchable = q then 0 when f.searchable like q||'%' then 1
        when f.searchable like '%'||q||'%' then 2 when f.searchable like split_part(q,' ',1)||'%' then 3 else 4 end as relevance,
   case when q = '' then true else not exists (select 1 from unnest(string_to_array(q,' ')) w where strpos(f.searchable, w) = 0) end as token_match
  from filtered f
 ), eligible as (
  select * from matched where token_match
 ), sorted as (
  select e.*, row_number() over (order by
   case when q <> '' and sort_order = 'default' then relevance end asc nulls last,
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
     case when p.library_row is not null then p.library_row || jsonb_build_object('platform','playstation')
     else jsonb_build_object('id',p.id,'platform',p.platform,'store_id',p.store_id,'title_key',p.title_key,'name',p.name,'image',p.image,'price',p.price,
       'original_price',p.original_price,'discount_percent',p.discount_percent,'currency',p.currency,'url',p.url,'edition',p.edition,'checked_at',p.checked_at,
       'first_seen',p.first_seen,'mc_score',p.mc_score,'oc_score',p.oc_score,'opencritic_reviews',p.opencritic_reviews,'best_score',p.best_score,
       'genres',p.genres,'release_date',p.release_date,'developers',p.developers,'turkish',p.turkish,'turkish_audio',p.turkish_audio,'age',p.age,
       'offers',public.market_offers(p.title_key,p.platform)) end
     order by p.result_number) from paged p), '[]'::jsonb),
  'total', (select count(*) from eligible),
  'query', q) into result;
 return result;
end;
$$;
revoke all on function public.market_offers(text,text) from public;
revoke all on function public.search_market(text,text,integer,integer,jsonb,text,boolean) from public;
grant execute on function public.market_offers(text,text) to anon, authenticated, service_role;
grant execute on function public.search_market(text,text,integer,integer,jsonb,text,boolean) to anon, authenticated, service_role;
