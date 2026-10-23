-- Supabase v19: PlayStation Store türleri. SQL Editor'de bir kez çalıştırın (önce v2-v18). Tekrar çalıştırmak güvenlidir.
-- Neden: library.genres yalnız Steam eşleşmesinden geliyordu (16.630 oyunun ~822'si). PS Store'un kendi tür süzgeci (productGenres)
-- refresh-genres Edge Function'ı ile tür tür taranır; sonuç ps_products.ps_genres (arayüz tür adları) ve ps_tags (Steam etiketi adları) alanlarına yazılır.
-- library.genres = Steam türleri ∪ PS türleri. search_games / search_market "Sana göre" puanı ps_tags'i de kullanır.
-- search_market ayrıca tag (Konsept / Steam etiketi) ve ids (oyun süresi) filtrelerini alır; "Sana özel" sayfası her mağazayı ayrı sorgular.
-- ÖNCE fonksiyonu yayınlayın (JWT doğrulaması AÇIK, refresh-ps-prices ile aynı): supabase functions deploy refresh-genres
alter table public.ps_products add column if not exists ps_genres text[] not null default '{}';
alter table public.ps_products add column if not exists ps_tags   text[] not null default '{}';
alter table public.ps_products add column if not exists genres_checked_at timestamptz;

-- Tarayıcının yazdığı satırlar mevcut türlerle birleştirilir (silme yok). Yalnız service_role çağırabilir.
create or replace function public.merge_ps_genres(rows jsonb) returns integer
language sql security invoker set search_path = public as $$
 with src as (
  select r->>'id' as id,
         array(select distinct x from jsonb_array_elements_text(coalesce(r->'genres','[]')) x where length(x) between 2 and 40) as g,
         array(select distinct x from jsonb_array_elements_text(coalesce(r->'tags','[]')) x where length(x) between 2 and 40) as t
  from jsonb_array_elements(case when jsonb_typeof(rows) = 'array' then rows else '[]'::jsonb end) r
 ), upd as (
  update ps_products p set
   ps_genres = array(select distinct x from unnest(p.ps_genres || s.g) x order by x),
   ps_tags   = array(select distinct x from unnest(p.ps_tags || s.t) x order by x),
   genres_checked_at = now()
  from src s where p.id = s.id
  returning 1
 ) select count(*)::integer from upd;
$$;
revoke all on function public.merge_ps_genres(jsonb) from public, anon, authenticated;
grant execute on function public.merge_ps_genres(jsonb) to service_role;

-- library: sütunlar canlıdaki tanımla aynı sırada; genres birleşik, ps_tags sona eklendi.
create or replace view public.library with (security_invoker = true) as
select p.id, p.name, p.name_search, p.image, p.edition, p.price, p.original_price, p.discount_percent, p.discount_ends_at, p.currency, p.url,
       p.checked_at, p.first_seen, p.lowest_ever, p.lowest_30d, p.history_days, p.historical_low, p.low_30d, p.price_rise, p.title_key,
       p.enriched_at, p.preview_url,
       coalesce((select jsonb_agg(to_jsonb(o) - 'title_key') from store_offers o where o.title_key = p.title_key), '[]'::jsonb) as offers,
       (select to_jsonb(s) - 'title_key' from game_scores s where s.title_key = p.title_key) as scores,
       gs.metacritic as mc_score,
       gs.opencritic as oc_score,
       greatest(gs.metacritic, gs.opencritic) as best_score,
       array(select distinct x from unnest(coalesce(gm.genres,'{}') || p.ps_genres) x order by x) as genres,
       gm.release_date, gm.developers, gm.publishers,
       gm.turkish, gm.turkish_audio, gm.age, gm.age_notes,
       gm.steam_appid, gm.requirements, gm.dlc_count, gm.news,
       p.ps_tags
from ps_products p
left join game_scores gs on gs.title_key = p.title_key
left join game_meta   gm on gm.title_key = p.title_key;

create or replace function public.search_games(
 query_text text default '', page_number integer default 0, page_size integer default 25,
 filter_options jsonb default '{}'::jsonb, sort_order text default 'default', deals_only boolean default false
) returns jsonb language plpgsql stable security invoker set search_path=public,extensions as $$
declare
 q text:=left(trim(regexp_replace(lower(coalesce(query_text,'')),'[^a-z0-9 ]',' ','g')),120);
 opts jsonb:=coalesce(filter_options,'{}'::jsonb);
 pref_g text[]:=public.taste_list(opts->'preferGenres',false);
 pref_t text[]:=public.taste_list(opts->'preferTags',true);
 result jsonb;
begin
 q:=trim(regexp_replace(q,'\s+',' ','g'));
 with base as (
  select l.*,p.store_status,p.hero_url,p.accent_color,gm.tags,gm.categories,
   (select count(*) from public.radar_posts rp where rp.game_id=l.id and rp.kind='review') as discussion_count,
   regexp_replace(p.name_search,'[^a-z0-9 ]','','g') as searchable,
   public.taste_score(l.genres,coalesce(gm.tags,'{}')||coalesce(gm.categories,'{}')||coalesce(l.ps_tags,'{}'),l.best_score,l.discount_percent,pref_g,pref_t) as taste_score
  from public.library l join public.ps_products p using(id) left join public.game_meta gm on gm.title_key=l.title_key
  where (coalesce(opts->>'tag','')='' or exists(select 1 from unnest(coalesce(gm.tags,'{}')||coalesce(gm.categories,'{}')) t where lower(t)=lower(opts->>'tag')))
   and (not (opts?'ids') or l.id in(select jsonb_array_elements_text(opts->'ids')))
   and (sort_order<>'gems' or l.best_score>=80 and (l.scores->>'opencritic_reviews')::integer between 1 and 30)
   and (not deals_only or l.discount_percent>0 and l.price<l.original_price)
   and (coalesce(opts->>'platform','')='' or l.edition ilike '%'||(opts->>'platform')||'%')
   and (coalesce(nullif(opts->>'minScore','')::numeric,0)<=0 or l.best_score>=(opts->>'minScore')::numeric)
   and (nullif(opts->>'maxPrice','') is null or l.price<=(opts->>'maxPrice')::numeric)
   and (coalesce(opts->>'genre','')='' or l.genres @> array[opts->>'genre'])
   and (coalesce(opts->>'developer','')='' or l.developers @> array[opts->>'developer'])
   and (coalesce(opts->>'year','')='' or extract(year from l.release_date)=(opts->>'year')::integer)
   and (coalesce(opts->>'turkish','false')<>'true' or l.turkish is true)
 ), matched as (
  select b.*,case when q='' then 0 when b.title_key=q or b.searchable=q then 0
   when b.searchable like q||'%' then 1 when b.searchable like '%'||q||'%' then 2 when b.searchable like split_part(q,' ',1)||'%' then 3 else 4 end as relevance,
   case when q='' then true else not exists(select 1 from unnest(string_to_array(q,' ')) word where strpos(b.searchable,word)=0) end as token_match,
   public.word_similarity(q,b.searchable) as similarity_score
  from base b
 ), eligible as (
  select * from matched m where m.token_match or (length(q)>=4 and m.similarity_score>=0.56 and not exists(select 1 from matched where token_match))
 ), sorted as (
  select *,row_number() over(order by
   case when q<>'' and sort_order in('default','foryou') then relevance end asc nulls last,
   case when q<>'' and sort_order in('default','foryou') then similarity_score end desc nulls last,
   case when sort_order='foryou' then taste_score end desc nulls last,
   case when q<>'' and sort_order='default' then case when name_search~'\m(deluxe|ultimate|premium|bundle)\M' then 1 else 0 end end asc nulls last,
   case when sort_order='discussed' then discussion_count end desc nulls last,
   case when sort_order in('score','gems') then best_score end desc nulls last,
   case when sort_order='discount' or (sort_order='default' and q='' and deals_only) then discount_percent end desc nulls last,
   case when sort_order='priceAsc' then price end asc nulls last,
   case when sort_order='priceDesc' then price end desc nulls last,
   case when sort_order='default' and q='' and not deals_only then first_seen end desc nulls last,
   name asc,id asc) as result_number from eligible
 ), paged as (
  select * from sorted where result_number>greatest(0,least(page_number,10000))*greatest(1,least(page_size,50))
   and result_number<=(greatest(0,least(page_number,10000))+1)*greatest(1,least(page_size,50))
 ) select jsonb_build_object(
  'items',coalesce((select jsonb_agg(to_jsonb(p)-'searchable'-'relevance'-'token_match'-'similarity_score'-'result_number'-'taste_score' order by result_number) from paged p),'[]'::jsonb),
  'total',(select count(*) from eligible),
  'fuzzy',q<>'' and not exists(select 1 from matched where token_match) and exists(select 1 from eligible),
  'query',q,
  'personalized',sort_order='foryou' and cardinality(pref_g)+cardinality(pref_t)>0
 ) into result;
 return result;
end;
$$;
revoke all on function public.search_games(text,integer,integer,jsonb,text,boolean) from public;
grant execute on function public.search_games(text,integer,integer,jsonb,text,boolean) to anon,authenticated,service_role;

-- search_market: PS satırlarının tam kaydı (to_jsonb(library)) yalnız sayfadaki sonuçlar için kurulur; 17 bin satırda kurmak sorguyu ~7 sn'ye çıkarıp anon zaman sınırını (3 sn) aşıyordu.
-- canlıdaki tanımın (Epic/GOG marketleri ve Tümü'nde en ucuz teklif tekilleştirmesi dahil) üzerine kurulur.
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
         coalesce(nullif(gm.genres,'{}'), (select pg.ps_genres from ps_products pg where o.title_key <> '' and pg.title_key = o.title_key and cardinality(pg.ps_genres) > 0 limit 1)) as genres, gm.release_date, gm.developers, gm.turkish, gm.turkish_audio, gm.age,
         coalesce(gm.tags,'{}') as tags, coalesce(gm.tags,'{}') || coalesce(gm.categories,'{}') as taste_tags,
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

-- Zamanlama: 30 dakikada bir (tam tarama ~3 tur; bitince 12 saat dinlenir). PS fiyat işinin komutu kopyalanır, gizli bilgi bu dosyada yoktur.
select cron.unschedule(jobname) from cron.job where jobname = 'oyun-radari-genres';
select cron.schedule('oyun-radari-genres', '7,37 * * * *', replace(command, 'refresh-ps-prices', 'refresh-genres'))
from cron.job where jobname = 'oyun-radari-ps-prices';
