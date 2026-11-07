-- v48'i geri alır: admin özeti yine 5 dakikada bir, search_market ve warm_home_showcase v47 hâline döner,
-- yeni indeksler ve vacuum ayarları kaldırılır. Veri silinmez (yalnız arama önbelleği boşaltılır, kendini yeniden doldurur).

select cron.alter_job(jobid, schedule := '2-59/5 * * * *')
from cron.job where jobname = 'oyun-radari-admin-snapshots';

create or replace function public.search_market(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare ck text := 'r:'||md5(concat_ws('|',market,query_text,page_number,page_size,coalesce(filter_options,'{}'::jsonb)::text,sort_order,deals_only)); r jsonb; ts timestamptz;
begin
 -- Aynı istek 5 dakika boyunca önbellekten döner. Hesaplama zaman aşımına uğrarsa eski sonuç verilir.
 -- v45: cihaz süzgeci olmadan da search_market_r (search_market_s ile aynı sonuç kümesi, yeni arama sıralaması).
 select c.v, c.at into r, ts from search_cache c where c.k = ck;
 if found and ts > now() - (case when sort_order='recentDiscount' then interval '1 minute' else interval '5 minutes' end) then return r; end if;
 begin
  if sort_order = 'recentDiscount' then r := public.catalog_recent_deals(market,query_text,page_number,page_size,filter_options); else r := public.search_market_r(market, query_text, page_number, page_size, coalesce(filter_options,'{}'::jsonb) - 'device', sort_order, deals_only); end if;
 exception when query_canceled then
  if ts is not null then return r; end if;
  raise;
 end;
 insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
 if random() < 0.02 then delete from search_cache where at < now() - interval '24 hours'; end if;
 return r;
end;
$function$;

create or replace function public.warm_home_showcase()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
 s record; r jsonb; ck text; n integer := 0;
begin
 for s in select * from (values
   ('g','',      '{"minScore":80}'::jsonb,  'score'),
   ('g','',      '{}'::jsonb,               'default'),
   ('m','steam', '{"minScore":80}'::jsonb,  'score'),
   ('m','xbox',  '{"minScore":80}'::jsonb,  'score'),
   ('m','switch','{"minScore":80}'::jsonb,  'score'),
   ('m','epic',  '{"minScore":80}'::jsonb,  'score'),
   ('m','gog',   '{"minScore":80}'::jsonb,  'score')) v(kind, market, opts, sort_order)
 loop
  begin
   if s.kind = 'm' then
    ck := 'm:'||md5(concat_ws('|', s.market, '', 0, 25, s.opts::text, s.sort_order, false));
    r := public.search_market_s(s.market, '', 0, 25, s.opts, s.sort_order, false);
   else
    ck := 'g:'||md5(concat_ws('|', '', 0, 25, s.opts::text, s.sort_order, false));
    r := public.search_games_s2('', 0, 25, s.opts, s.sort_order, false);
   end if;
   insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
   n := n + 1;
  exception when others then
   -- Bir vitrin hesaplanamazsa eski önbellek kaydı kalır; diğerleri yine ısıtılır.
   raise warning 'warm_home_showcase %/% : %', s.kind, s.market, sqlerrm;
  end;
 end loop;
 return n;
end $function$;

drop function if exists public.search_market_cache_key(text,text,integer,integer,jsonb,text,boolean);
drop index if exists public.search_keys_platform_score;
drop index if exists public.radar_lists_user_id;
alter table public.search_keys  reset (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
alter table public.store_offers reset (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
delete from public.search_cache;
