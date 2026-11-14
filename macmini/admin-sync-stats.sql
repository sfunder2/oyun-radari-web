-- Mac mini (Postgres + PostgREST): admin paneli mağaza sağlığı kartları artık doğrudan buradan okunur.
-- Yalnızca toplu sayılar döner (oyun adı, kullanıcı verisi yok), bu yüzden anon rolüne açıktır.
-- Çıktı şekli Supabase'teki admin_sync_stats() ile aynıdır; panel kodu değişmeden çalışır.
-- Kurulum: psql <db> -f macmini/admin-sync-stats.sql   (ardından: notify pgrst, 'reload schema')
create or replace function public.admin_sync_stats() returns jsonb
language plpgsql stable security definer set search_path=public set statement_timeout='20s' as $$
declare stores jsonb; st jsonb := '{}'::jsonb;
begin
 select jsonb_agg(s order by s->>'platform') into stores from (
  select jsonb_build_object('platform','playstation','total',count(*),
   'fresh1h',count(*) filter (where checked_at>now()-interval '1 hour'),
   'fresh24h',count(*) filter (where checked_at>now()-interval '24 hours'),
   'new24h',count(*) filter (where first_seen>now()-interval '24 hours'),
   'discounted',count(*) filter (where discount_percent>0),
   -- PlayStation: tetikleyici fiyatı değişmeyen satırın checked_at'ini 6 saate kadar yazmaz; son kontrol olarak toplayıcının son BAŞARILI bitiş saati esas alınır.
   'lastChecked',greatest(max(checked_at),(select (value->>'finishedAt')::timestamptz from ps_state where key='batch' and value->>'status' in ('ok','partial'))),
   'lastRunAt',(select (value->>'finishedAt')::timestamptz from ps_state where key='batch')) as s from ps_products
  union all
  select jsonb_build_object('platform',platform,'total',count(*),
   'fresh1h',count(*) filter (where checked_at>now()-interval '1 hour'),
   'fresh24h',count(*) filter (where checked_at>now()-interval '24 hours'),
   'new24h',count(*) filter (where first_seen>now()-interval '24 hours'),
   'discounted',count(*) filter (where discount_percent>0),
   'lastChecked',max(checked_at),
   -- Toplayıcı başına tek bitiş saati tutulur: market (steam, gog, xbox, switch, epic) ve market_itad (diğer mağazalar).
   'lastRunAt',(select (value->>'finishedAt')::timestamptz from ps_state where key=case when platform in ('steam','gog','xbox','switch','epic') then 'market' else 'market_itad' end)) from store_offers group by platform
 ) t;
 begin
  select coalesce(jsonb_object_agg(key,value - 'cursors'),'{}'::jsonb) into st
  from ps_state where key in ('batch','market','enrich_batch','news','upcoming','oc_index');
 exception when others then st := '{}'::jsonb; end;
 return jsonb_build_object('generatedAt',now(),'source','macmini',
  'stores',coalesce(stores,'[]'::jsonb),
  'matched',(select count(*) from ps_products p where p.title_key is not null and exists(select 1 from store_offers o where o.title_key=p.title_key)),
  'enriched',(select count(*) from ps_products where enriched_at is not null),
  'scores',(select count(*) from game_scores),
  'state',st,'jobs','[]'::jsonb);
end$$;
revoke all on function public.admin_sync_stats() from public;
grant execute on function public.admin_sync_stats() to anon;
