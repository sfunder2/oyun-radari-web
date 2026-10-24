-- v25: arama anahtar tablosu kaynak tablolardan yeniden kurulur, materialized view yenilemesi kalkar.
-- Neden: "refresh materialized view concurrently" her çalışmada eski ve yeni içeriği karşılaştırmak için
-- diske büyük geçici dosyalar yazıyordu (toplam ~6,7 GB). Sunucunun disk kapasitesi tükenince her şey durdu.
-- Yeni yol: search_keys tablosu kaynak tablolardan tek seferde yeni bir tabloya yazılır, sonra adı değiştirilir.
-- Karşılaştırma yok, geçici dosya yok; ~20 MB yazma. Geniş market_search_rows artık okunmaz.

create or replace function public.rebuild_search_keys() returns integer
 language plpgsql set search_path to 'public' set work_mem to '32MB' as $function$
declare n integer;
begin
 drop table if exists public.search_keys_new;
 create table public.search_keys_new as
  select o.platform||':'||o.store_id as id, o.platform, o.store_id,
         (o.title_key = '' or not exists (select 1 from ps_products p where p.title_key = o.title_key)) as in_all,
         case when o.title_key <> '' then o.title_key else o.platform||':'||o.store_id end as grp,
         o.title_key, coalesce(o.name_search, lower(o.name)) as searchable,
         o.price, (o.currency = 'USD') as usd, o.discount_percent, o.original_price,
         greatest(gs.metacritic, gs.opencritic) as best_score, o.first_seen, o.name, gm.turkish,
         extract(year from gm.release_date)::int as release_year,
         case when cardinality(coalesce(gm.genres,'{}') || o.genres) > 0 then array(select distinct x from unnest(coalesce(gm.genres,'{}') || o.genres) x order by x)
              else (select pg.ps_genres from ps_products pg where o.title_key <> '' and pg.title_key = o.title_key and cardinality(pg.ps_genres) > 0 limit 1) end as genres,
         gm.developers,
         coalesce(gm.tags,'{}') || coalesce(gm.categories,'{}') || o.tags as taste_tags
  from store_offers o
  left join game_scores gs on gs.title_key = o.title_key
  left join game_meta   gm on gm.title_key = o.title_key
  union all
  select p.id, 'playstation', p.id, true, p.id, p.title_key,
         regexp_replace(coalesce(p.name_search,''),'[^a-z0-9 ]','','g'),
         p.price, false, p.discount_percent, p.original_price,
         greatest(gs.metacritic, gs.opencritic), p.first_seen, p.name, gm.turkish,
         extract(year from gm.release_date)::int,
         array(select distinct x from unnest(coalesce(gm.genres,'{}') || p.ps_genres) x order by x),
         gm.developers,
         coalesce(gm.tags,'{}') || coalesce(gm.categories,'{}') || coalesce(p.ps_tags,'{}')
  from ps_products p
  left join game_scores gs on gs.title_key = p.title_key
  left join game_meta   gm on gm.title_key = p.title_key;
 create unique index on public.search_keys_new (id);
 analyze public.search_keys_new;
 grant select on public.search_keys_new to anon, authenticated;
 select count(*) into n from public.search_keys_new;
 -- Yalnız ad değişimi kısa bir kilit alır; okuyan aramalar en fazla birkaç milisaniye bekler.
 drop table if exists public.search_keys;
 alter table public.search_keys_new rename to search_keys;
 return n;
end $function$;
revoke execute on function public.rebuild_search_keys() from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_market_s(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET work_mem TO '16MB'
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
 -- Süzme ve sıralama dar search_keys tablosunda; sayfadaki satırların ayrıntısı kaynak tablolardan okunur.
 with filtered as (
  select b.*, b.price * case when b.usd then fx else 1 end as price_try from search_keys b
  where ((m = 'all' and b.in_all) or b.platform = m)
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
  -- Tümü: aynı oyun birden çok PC/konsol mağazasında filtreleri geçiyorsa yalnız en ucuz teklif listelenir; diğerleri 'offers' içinde kalır.
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
grant execute on function public.search_market_s(text,text,integer,integer,jsonb,text,boolean) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_games_s(query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET work_mem TO '16MB'
 SET search_path TO 'public', 'extensions'
AS $function$
declare
 q text:=trim(regexp_replace(left(trim(regexp_replace(lower(coalesce(query_text,'')),'[^a-z0-9 ]',' ','g')),120),'\s+',' ','g'));
 opts jsonb:=coalesce(filter_options,'{}'::jsonb);
 pref_g text[]:=public.taste_list(opts->'preferGenres',false);
 pref_t text[]:=public.taste_list(opts->'preferTags',true);
 per integer:=greatest(1,least(page_size,50));
 pg integer:=greatest(0,least(page_number,10000));
 result jsonb;
begin
 -- Arama metni, etiket/platform süzgeci ya da gems/discussed sıralaması yoksa PS satırları dar search_keys tablosundan seçilir.
 if q<>'' or sort_order not in ('default','score','discount','priceAsc','priceDesc','foryou') or coalesce(opts->>'tag','')<>'' or opts?'ids'
    or coalesce(opts->>'platform','')<>'' then
  return public.search_games_t(query_text,page_number,page_size,filter_options,sort_order,deals_only);
 end if;
 with eligible as (
  select k.id,k.name,k.price,k.best_score,k.discount_percent,k.first_seen,
   case when sort_order='foryou' then public.taste_score_i(k.genres,k.taste_tags,k.best_score,k.discount_percent,pref_g,pref_t) end as taste_score
  from search_keys k
  where k.platform='playstation'
   and (not deals_only or k.discount_percent>0 and k.price<k.original_price)
   and (coalesce(nullif(opts->>'minScore','')::numeric,0)<=0 or k.best_score>=(opts->>'minScore')::numeric)
   and (nullif(opts->>'maxPrice','') is null or k.price<=(opts->>'maxPrice')::numeric)
   and (coalesce(opts->>'genre','')='' or k.genres @> array[opts->>'genre'])
   and (coalesce(opts->>'developer','')='' or k.developers @> array[opts->>'developer'])
   and (coalesce(opts->>'year','')='' or k.release_year=(opts->>'year')::integer)
   and (coalesce(opts->>'turkish','false')<>'true' or k.turkish is true)
 ), sorted as (
  select e.id,row_number() over(order by
   case when sort_order='foryou' then taste_score end desc nulls last,
   case when sort_order='score' then best_score end desc nulls last,
   case when sort_order='discount' or (sort_order='default' and deals_only) then discount_percent end desc nulls last,
   case when sort_order='priceAsc' then price end asc nulls last,
   case when sort_order='priceDesc' then price end desc nulls last,
   case when sort_order='default' and not deals_only then first_seen end desc nulls last,
   name asc,id asc) as result_number from eligible e
 ), paged as (
  select * from sorted where result_number>pg*per and result_number<=(pg+1)*per
 ) select jsonb_build_object(
  'items',coalesce((select jsonb_agg((select to_jsonb(r) from (select l2.*,p2.store_status,p2.hero_url,p2.accent_color,gm2.tags,gm2.categories,
      (select count(*) from public.radar_posts rp where rp.game_id=l2.id and rp.kind='review') as discussion_count
     from public.library l2 join public.ps_products p2 using(id) left join public.game_meta gm2 on gm2.title_key=l2.title_key where l2.id=p.id) r) order by result_number) from paged p),'[]'::jsonb),
  'total',(select count(*) from eligible),
  'fuzzy',false,
  'query',q,
  'personalized',sort_order='foryou' and cardinality(pref_g)+cardinality(pref_t)>0
 ) into result;
 return result;
end;
$function$;
grant execute on function public.search_games_s(text,integer,integer,jsonb,text,boolean) to anon, authenticated;

-- İlk kurulum ve canlıya geçiş (canlıda 24 Ekim 08:15 UTC'de uygulandı).
set statement_timeout = '180s';
select public.rebuild_search_keys();
do $$ begin
 execute replace(replace(pg_get_functiondef('public.search_market_c'::regproc), 'public.search_market_k(', 'public.search_market_s('), 'public.search_market_c(', 'public.search_market(');
 execute replace(replace(pg_get_functiondef('public.search_games_c'::regproc), 'public.search_games_k(', 'public.search_games_s('), 'public.search_games_c(', 'public.search_games(');
end $$;
select cron.alter_job((select jobid from cron.job where jobname='oyun-radari-search-rows'),
  schedule := '*/15 * * * *', command := $c$set statement_timeout='120s'; select public.rebuild_search_keys()$c$, active := true);
notify pgrst, 'reload schema';
-- Geri almak için (v23 hali, yenileme kapalı kalır):
--   do $$ begin execute replace(pg_get_functiondef('public.search_market_c'::regproc),'public.search_market_c(','public.search_market('); execute replace(pg_get_functiondef('public.search_games_c'::regproc),'public.search_games_c(','public.search_games('); end $$;
