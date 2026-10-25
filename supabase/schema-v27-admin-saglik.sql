-- Şema v27: admin panelinde site sağlığı (veritabanı boyutu, kullanıcılar, fiyat yazımları, cron hataları, arama hızı).
-- admin_sync_stats() olduğu gibi kalır; panel bu ikinci RPC'yi ayrıca çağırır, bu yüzden biri bozulursa diğeri görünmeye devam eder.
-- Sorgular hafiftir: tablo boyutları katalogdan, satır sayıları küçük tablolardan, arama süreleri pg_stat_statements belleğinden okunur.
-- Büyük tablolarda (ps_products, store_offers, search_keys) satır saymak yerine planlayıcı tahmini (reltuples) kullanılır.
create or replace function public.admin_site_health() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare
 tables jsonb; users jsonb; prices jsonb; cron jsonb := '[]'::jsonb; search jsonb := null;
begin
 if not public.is_radar_admin() then raise exception 'Yönetici yetkisi gerekli' using errcode='42501'; end if;

 select coalesce(jsonb_agg(jsonb_build_object('name',t.relname,'bytes',t.b,'rows',greatest(t.reltuples,0)::bigint) order by t.b desc),'[]'::jsonb)
 into tables from (
  select c.relname,c.reltuples,pg_total_relation_size(c.oid) b from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','m') order by b desc limit 8
 ) t;

 select jsonb_build_object(
  'total',count(*),
  'new7d',count(*) filter (where created_at>now()-interval '7 days'),
  'active7d',count(*) filter (where last_sign_in_at>now()-interval '7 days'),
  'synced',(select count(*) from radar_user_data),
  'favorites',(select coalesce(sum(jsonb_array_length(favorites)),0) from radar_user_data where jsonb_typeof(favorites)='array'),
  'alerts',(select count(*) from radar_user_data d,jsonb_array_elements(case when jsonb_typeof(d.favorites)='array' then d.favorites else '[]'::jsonb end) f
            where jsonb_typeof(f->'target')='number'),
  'steamLinked',(select count(*) from linked_accounts where platform='steam'),
  'profiles',(select count(*) from radar_profiles),
  'posts',(select count(*) from radar_posts),
  'posts7d',(select count(*) from radar_posts where created_at>now()-interval '7 days')
 ) into users from auth.users;

 -- ps_price_history yalnız fiyat değişince yazılır; günlük sayı, PlayStation fiyat değişikliklerini gösterir.
 select coalesce(jsonb_agg(jsonb_build_object('day',d.day::date,'rows',coalesce(h.n,0)) order by d.day),'[]'::jsonb) into prices
 from generate_series(current_date-6,current_date,interval '1 day') d(day)
 left join (select day,count(*) n from ps_price_history where day>=current_date-6 group by day) h on h.day=d.day::date;

 begin
  select coalesce(jsonb_agg(jsonb_build_object('name',j.jobname,'ok',r.ok,'failed',r.failed,'lastFailAt',r.last_fail,'lastFailMessage',left(r.msg,160)) order by j.jobname),'[]'::jsonb)
  into cron from cron.job j
  left join lateral (
   select count(*) filter (where d.status='succeeded') ok,
          count(*) filter (where d.status='failed') failed,
          max(d.start_time) filter (where d.status='failed') last_fail,
          (select d2.return_message from cron.job_run_details d2 where d2.jobid=j.jobid and d2.status='failed' order by d2.start_time desc limit 1) msg
   from cron.job_run_details d where d.jobid=j.jobid and d.start_time>now()-interval '24 hours'
  ) r on true;
 exception when others then cron := '[]'::jsonb; end;

 -- Arama süresi: search_games RPC'sinin istatistik sıfırlanmasından beri ortalaması. Uzantı yoksa boş kalır.
 begin
  execute $q$
   select jsonb_build_object('calls',coalesce(sum(calls),0),
    'meanMs',round((sum(total_exec_time)/nullif(sum(calls),0))::numeric,1),
    'maxMs',round(max(max_exec_time)::numeric),
    'since',(select stats_reset from extensions.pg_stat_statements_info))
   from extensions.pg_stat_statements where query like '%"search_games"%'
  $q$ into search;
 exception when others then search := null; end;
 search := coalesce(search,'{}'::jsonb) || jsonb_build_object(
  'cacheEntries',(select count(*) from search_cache),
  'cacheNewest',(select max(at) from search_cache));

 return jsonb_build_object(
  'generatedAt',now(),
  'database',jsonb_build_object('bytes',pg_database_size(current_database()),'limitBytes',500*1024*1024,'tables',tables),
  'users',users,
  'priceWrites',prices,
  'cron24h',cron,
  'search',search
 );
end;
$$;
revoke all on function public.admin_site_health() from public,anon;
grant execute on function public.admin_site_health() to authenticated;
