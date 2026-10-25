-- Şema v28: mağaza başına günlük fiyat değişikliği sayacı (admin paneli "Fiyat değişiklikleri" kartı).
-- Neden: yalnız PlayStation'ın fiyat geçmişi (ps_price_history) var; Steam, Xbox, Switch, Epic ve GOG'da fiyat değişince
-- hiçbir iz kalmıyordu. Her ürün için geçmiş tutmak disk ister; burada yalnız gün × mağaza başına tek bir sayı tutulur
-- (yılda en çok ~2.200 satır).
-- Yük: tetikleyici satır başına değil, deyim (statement) başına bir kez çalışır ve yalnız fiyatı değişen satırları sayar.
-- skip_unchanged_write (v25) atladığı satırlar zaten sayılmaz. Toplayıcı kodu değişmez.
create table if not exists public.price_change_daily (
 day date not null,
 platform text not null,
 changes integer not null default 0,
 primary key (day,platform)
);
alter table public.price_change_daily enable row level security;
revoke all on public.price_change_daily from anon,authenticated;
grant all on public.price_change_daily to service_role;

create or replace function public.count_price_changes() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if tg_table_name='ps_products' then
  insert into price_change_daily(day,platform,changes)
  select current_date,'playstation',count(*) from new_rows n join old_rows o on o.id=n.id
  where n.price is distinct from o.price
  having count(*)>0
  on conflict (day,platform) do update set changes=price_change_daily.changes+excluded.changes;
 else
  insert into price_change_daily(day,platform,changes)
  select current_date,n.platform,count(*) from new_rows n join old_rows o on o.platform=n.platform and o.store_id=n.store_id
  where n.price is distinct from o.price
  group by n.platform
  on conflict (day,platform) do update set changes=price_change_daily.changes+excluded.changes;
 end if;
 return null;
end;
$$;
revoke all on function public.count_price_changes() from public,anon,authenticated;

drop trigger if exists count_price_changes on public.ps_products;
create trigger count_price_changes after update on public.ps_products
 referencing old table as old_rows new table as new_rows
 for each statement execute function public.count_price_changes();
drop trigger if exists count_price_changes on public.store_offers;
create trigger count_price_changes after update on public.store_offers
 referencing old table as old_rows new table as new_rows
 for each statement execute function public.count_price_changes();

-- PlayStation'ın önceki günleri fiyat geçmişinden doldurulur; diğer mağazalar bu dosyanın çalıştığı günden başlar.
insert into public.price_change_daily(day,platform,changes)
select day,'playstation',count(*) from public.ps_price_history where day>=current_date-6 and day<current_date group by day
on conflict (day,platform) do nothing;

-- admin_site_health: priceWrites artık gün × mağaza listesidir: [{day, platform, rows}].
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

 select coalesce(jsonb_agg(jsonb_build_object('day',day,'platform',platform,'rows',changes) order by day,platform),'[]'::jsonb) into prices
 from price_change_daily where day>=current_date-6;

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
  'today',current_date,
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

-- Geri alma:
--   drop trigger if exists count_price_changes on public.ps_products;
--   drop trigger if exists count_price_changes on public.store_offers;
--   drop function if exists public.count_price_changes();
--   drop table if exists public.price_change_daily;
--   ve schema-v27-admin-saglik.sql yeniden çalıştırılır.
