-- Şema v45 geri alma: search_market ve search_market_v2 sarmalayıcıları yeniden search_market_s / search_market_d'yi çağırır
-- (v45 öncesi tanımlar, önbellek önekleri m: ve d:). v45'in eklediği yardımcı fonksiyonlar kaldırılır. Tablolara dokunulmaz.

create or replace function public.search_market(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare ck text := 'm:'||md5(concat_ws('|',market,query_text,page_number,page_size,coalesce(filter_options,'{}'::jsonb)::text,sort_order,deals_only)); r jsonb; ts timestamptz;
begin
 -- Aynı istek (çoğunlukla sayfa açılışları) 5 dakika boyunca önbellekten döner. Hesaplama zaman aşımına uğrarsa eski sonuç verilir.
 select c.v, c.at into r, ts from search_cache c where c.k = ck;
 if found and ts > now() - interval '5 minutes' then return r; end if;
 begin
  r := public.search_market_s(market, query_text, page_number, page_size, filter_options, sort_order, deals_only);
 exception when query_canceled then
  if ts is not null then return r; end if;
  raise;
 end;
 insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
 if random() < 0.02 then delete from search_cache where at < now() - interval '24 hours'; end if;
 return r;
end $function$;

create or replace function public.search_market_v2(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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

drop function if exists public.search_market_r(text,text,integer,integer,jsonb,text,boolean);
drop function if exists public.radar_search_kind(text);
drop function if exists public.radar_num_alt(text);
drop function if exists public.radar_search_expand(text);
