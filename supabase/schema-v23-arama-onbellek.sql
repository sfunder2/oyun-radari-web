-- v23: arama önbelleği ve dar arama tabloları.
-- Neden: veritabanı sunucusu disk ve işlemci sıkıntısındayken geniş market_search_rows (~50 MB) diskten okunuyor,
-- misafir (anon) 3 sn sınırı aşılıyordu. Çözüm üç katmanlı:
--  1) market_search_keys2: süzme/sıralama için gereken dar kolonlar (bellekte kalır); geniş tablo yalnız sayfadaki satırlar için okunur.
--  2) search_cache: aynı istek 5 dakika önbellekten döner; hesaplama zaman aşımına uğrarsa son kayıtlı sonuç verilir.
--  3) refresh_search_tables(): cron 10 dakikada bir yalnız bu fonksiyonu çağırır.
-- Önceki tanımlar: search_market_mv / search_games_t (önbelleksiz), search_market_old / search_games_old.
-- market_search_keys ve search_market_f / search_games_f ara adımdır; yalnız market_search_keys yenilemede kalır.

set statement_timeout = '180s';

create materialized view if not exists public.market_search_keys as
 select id, platform, in_all, case when platform <> 'playstation' and title_key <> '' then title_key else id end as grp,
        price, usd, discount_percent, original_price, best_score, first_seen, name, turkish, extract(year from release_date)::int as release_year
 from public.market_search_rows;
create unique index if not exists market_search_keys_id on public.market_search_keys (id);
grant select on public.market_search_keys to anon, authenticated;

create materialized view if not exists public.market_search_keys2 as
 select id, platform, in_all, case when platform <> 'playstation' and title_key <> '' then title_key else id end as grp, title_key, searchable,
        price, usd, discount_percent, original_price, best_score, first_seen, name, turkish, extract(year from release_date)::int as release_year,
        genres, developers, taste_tags
 from public.market_search_rows;
create unique index if not exists market_search_keys2_id on public.market_search_keys2 (id);
grant select on public.market_search_keys2 to anon, authenticated;

-- Arama tablolarını sırayla yeniler; cron yalnız bu fonksiyonu çağırır, böylece tablo eklemek cron değişikliği gerektirmez.
create or replace function public.refresh_search_tables() returns void language plpgsql set search_path to 'public' as $function$
begin
 refresh materialized view concurrently public.market_search_rows;
 refresh materialized view concurrently public.market_search_keys;
 refresh materialized view concurrently public.market_search_keys2;
end $function$;
revoke execute on function public.refresh_search_tables() from public, anon, authenticated;

-- taste_score ile aynı; SET search_path olmadığı için satır başına ayrı fonksiyon çağrısı maliyeti yok.
create or replace function public.taste_score_i(genres text[], tags text[], best_score numeric, discount integer, pref_genres text[], pref_tags text[])
 returns numeric language sql immutable as $function$
 select 12 * least((select count(*) from pg_catalog.unnest(coalesce(genres,'{}')) g where g = any(pref_genres)), 2)
      + 8 * least((select count(distinct pg_catalog.lower(t)) from pg_catalog.unnest(coalesce(tags,'{}')) t where pg_catalog.lower(t) = any(pref_tags)), 3)
      + 0.4 * coalesce(best_score, 60)
      + case when coalesce(discount, 0) > 0 then 2 else 0 end;
$function$;
grant execute on function public.taste_score_i(text[],text[],numeric,integer,text[],text[]) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_market_k(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
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
 -- Süzme ve sıralama bellekte kalan dar market_search_keys2 tablosunda; geniş market_search_rows yalnız sayfadaki satırlar için okunur.
 with filtered as (
  select b.*, b.price * case when b.usd then fx else 1 end as price_try from market_search_keys2 b
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
  select s.result_number, r.* from sorted s join market_search_rows r on r.id = s.id
  where s.result_number > pg * per and s.result_number <= (pg + 1) * per
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
grant execute on function public.search_market_k(text,text,integer,integer,jsonb,text,boolean) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_games_k(query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
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
 -- Arama metni, etiket/platform süzgeci ya da gems/discussed sıralaması yoksa PS satırları dar market_search_keys2 tablosundan seçilir.
 if q<>'' or sort_order not in ('default','score','discount','priceAsc','priceDesc','foryou') or coalesce(opts->>'tag','')<>'' or opts?'ids'
    or coalesce(opts->>'platform','')<>'' then
  return public.search_games_t(query_text,page_number,page_size,filter_options,sort_order,deals_only);
 end if;
 with eligible as (
  select k.id,k.name,k.price,k.best_score,k.discount_percent,k.first_seen,
   case when sort_order='foryou' then public.taste_score_i(k.genres,k.taste_tags,k.best_score,k.discount_percent,pref_g,pref_t) end as taste_score
  from market_search_keys2 k
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
grant execute on function public.search_games_k(text,integer,integer,jsonb,text,boolean) to anon, authenticated;

-- Sonuç önbelleği: yalnız tanımlayıcı (security definer) fonksiyonlar okur/yazar.
create table if not exists public.search_cache (k text primary key, v jsonb not null, at timestamptz not null default now());
alter table public.search_cache enable row level security;
revoke all on public.search_cache from anon, authenticated;

create or replace function public.search_market_c(market text default 'all', query_text text default '', page_number integer default 0, page_size integer default 25, filter_options jsonb default '{}'::jsonb, sort_order text default 'default', deals_only boolean default false)
 returns jsonb language plpgsql volatile security definer set search_path to 'public','extensions' as $function$
declare ck text := 'm:'||md5(concat_ws('|',market,query_text,page_number,page_size,coalesce(filter_options,'{}'::jsonb)::text,sort_order,deals_only)); r jsonb; ts timestamptz;
begin
 -- Aynı istek (çoğunlukla sayfa açılışları) 5 dakika boyunca önbellekten döner. Hesaplama zaman aşımına uğrarsa eski sonuç verilir.
 select c.v, c.at into r, ts from search_cache c where c.k = ck;
 if found and ts > now() - interval '5 minutes' then return r; end if;
 begin
  r := public.search_market_k(market, query_text, page_number, page_size, filter_options, sort_order, deals_only);
 exception when query_canceled then
  if ts is not null then return r; end if;
  raise;
 end;
 insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
 if random() < 0.02 then delete from search_cache where at < now() - interval '2 hours'; end if;
 return r;
end $function$;

create or replace function public.search_games_c(query_text text default '', page_number integer default 0, page_size integer default 25, filter_options jsonb default '{}'::jsonb, sort_order text default 'default', deals_only boolean default false)
 returns jsonb language plpgsql volatile security definer set search_path to 'public','extensions' as $function$
declare ck text := 'g:'||md5(concat_ws('|',query_text,page_number,page_size,coalesce(filter_options,'{}'::jsonb)::text,sort_order,deals_only)); r jsonb; ts timestamptz;
begin
 select c.v, c.at into r, ts from search_cache c where c.k = ck;
 if found and ts > now() - interval '5 minutes' then return r; end if;
 begin
  r := public.search_games_k(query_text, page_number, page_size, filter_options, sort_order, deals_only);
 exception when query_canceled then
  if ts is not null then return r; end if;
  raise;
 end;
 insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
 if random() < 0.02 then delete from search_cache where at < now() - interval '2 hours'; end if;
 return r;
end $function$;
grant execute on function public.search_market_c(text,text,integer,integer,jsonb,text,boolean) to anon, authenticated;
grant execute on function public.search_games_c(text,integer,integer,jsonb,text,boolean) to anon, authenticated;

-- Canlıya geçiş: önbellekli sürümleri canlı adlara kopyala, yenilemeyi fonksiyona bağla.
do $$ begin
 execute replace(pg_get_functiondef('public.search_market_c'::regproc), 'public.search_market_c(', 'public.search_market(');
 execute replace(pg_get_functiondef('public.search_games_c'::regproc), 'public.search_games_c(', 'public.search_games(');
end $$;
select cron.alter_job((select jobid from cron.job where jobname='oyun-radari-search-rows'), schedule := '*/10 * * * *',
  command := $c$set statement_timeout='180s'; select public.refresh_search_tables()$c$);
notify pgrst, 'reload schema';
-- Geri alma (önbelleksiz v21 davranışı):
--   do $$ begin execute replace(pg_get_functiondef('public.search_market_mv'::regproc),'public.search_market_mv(','public.search_market('); execute replace(pg_get_functiondef('public.search_games_t'::regproc),'public.search_games_t(','public.search_games('); end $$;
