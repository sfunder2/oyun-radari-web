-- Admin operasyon görünümü. Mevcut ürünleri veya toplayıcıları değiştirmez.
-- Sabit takip başlangıcı tekrar kurulumda korunur; yeni ürünler paydadan ayrı tutulur.
insert into public.ps_state(key,value)
values ('admin_scan',jsonb_build_object('startedAt',now())) on conflict (key) do nothing;

create or replace function public.admin_operational_health() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare scan_start timestamptz; stores jsonb;
begin
 if auth.uid() is null or not public.is_radar_admin() then
  raise exception 'Yönetici yetkisi gerekli' using errcode='42501';
 end if;
 select (value->>'startedAt')::timestamptz into scan_start from public.ps_state where key='admin_scan';
 if scan_start is null then raise exception 'Tarama takip başlangıcı eksik'; end if;
 with offers as (
  select 'playstation'::text platform,price,original_price,discount_percent,currency,
   checked_at,first_seen,discount_ends_at from public.ps_products
  union all
  select platform,price,original_price,discount_percent,currency,checked_at,first_seen,
   null::timestamptz from public.store_offers
 ), totals as (
  select platform,count(*) total,
   count(*) filter(where checked_at>=now()-interval '24 hours') fresh,
   count(*) filter(where checked_at<now()-interval '24 hours') stale24,
   count(*) filter(where checked_at<now()-interval '48 hours') stale48,
   count(*) filter(where checked_at is null) unchecked,min(checked_at) oldest,
   count(*) filter(where first_seen<=scan_start or first_seen is null) scan_total,
   count(*) filter(where (first_seen<=scan_start or first_seen is null) and checked_at>=scan_start) scan_checked,
   count(*) filter(where first_seen>scan_start) new_since,
   count(*) filter(where price is null) missing_price,
   count(*) filter(where price<0 or original_price<0) negative_price,
   count(*) filter(where discount_percent<0 or discount_percent>100 or price>original_price
    or (discount_percent>0 and (original_price is null or original_price<=price))) invalid_discount,
   count(*) filter(where currency is null or btrim(currency)='') missing_currency,
   count(*) filter(where discount_percent>0 and discount_ends_at<=now()) expired_discount
  from offers group by platform
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'platform',platform,'total',total,'fresh24h',fresh,'stale24h',stale24,'stale48h',stale48,
  'unchecked',unchecked,'oldestChecked',oldest,'scanTotal',scan_total,'scanChecked',scan_checked,'newSinceScan',new_since,
  'anomalies',jsonb_build_object('missingPrice',missing_price,'negativePrice',negative_price,
   'invalidDiscount',invalid_discount,'missingCurrency',missing_currency,
   'expiredDiscount',case when platform='playstation' then expired_discount else null end)
 ) order by platform),'[]'::jsonb) into stores from totals;
 return jsonb_build_object('generatedAt',now(),'scanStartedAt',scan_start,'stores',stores);
end;
$$;
revoke all on function public.admin_operational_health() from public,anon;
grant execute on function public.admin_operational_health() to authenticated;
