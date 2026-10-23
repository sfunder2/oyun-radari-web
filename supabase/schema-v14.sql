-- Supabase v14: admin paneli. SQL Editor'de bir kez çalıştırın (önce v2-v13).
-- Yöneticiler radar_admins tablosunda tutulur; tabloyu yalnızca service_role/SQL Editor değiştirebilir.
-- Panel tek bir RPC çağırır: admin_sync_stats(). Yönetici olmayan oturumlar 42501 (yetki yok) alır.
create table if not exists public.radar_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 added_at timestamptz not null default now()
);
alter table public.radar_admins enable row level security;
revoke all on public.radar_admins from anon,authenticated;
grant all on public.radar_admins to service_role;

create or replace function public.is_radar_admin() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from radar_admins where user_id=(select auth.uid()));
$$;

create or replace function public.admin_sync_stats() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare stores jsonb; jobs jsonb := '[]'::jsonb; result jsonb;
begin
 if not public.is_radar_admin() then raise exception 'Yönetici yetkisi gerekli' using errcode='42501'; end if;
 select jsonb_agg(s order by s->>'platform') into stores from (
  select jsonb_build_object('platform','playstation','total',count(*),
   'fresh1h',count(*) filter (where checked_at>now()-interval '1 hour'),
   'fresh24h',count(*) filter (where checked_at>now()-interval '24 hours'),
   'new24h',count(*) filter (where first_seen>now()-interval '24 hours'),
   'discounted',count(*) filter (where discount_percent>0),
   'lastChecked',max(checked_at)) as s from ps_products
  union all
  select jsonb_build_object('platform',platform,'total',count(*),
   'fresh1h',count(*) filter (where checked_at>now()-interval '1 hour'),
   'fresh24h',count(*) filter (where checked_at>now()-interval '24 hours'),
   'new24h',count(*) filter (where first_seen>now()-interval '24 hours'),
   'discounted',count(*) filter (where discount_percent>0),
   'lastChecked',max(checked_at)) from store_offers group by platform
 ) t;
 -- Zamanlanmış işler (pg_cron). Uzantı yoksa liste boş kalır.
 begin
  select coalesce(jsonb_agg(jsonb_build_object('name',j.jobname,'schedule',j.schedule,'active',j.active,
    'lastStart',r.start_time,'lastEnd',r.end_time,'lastStatus',r.status,'lastMessage',left(r.return_message,160)) order by j.jobname),'[]'::jsonb)
  into jobs from cron.job j
  left join lateral (select d.start_time,d.end_time,d.status,d.return_message from cron.job_run_details d where d.jobid=j.jobid order by d.start_time desc limit 1) r on true;
 exception when others then jobs := '[]'::jsonb; end;
 select jsonb_build_object(
  'generatedAt',now(),
  'stores',coalesce(stores,'[]'::jsonb),
  'matched',(select count(*) from ps_products p where p.title_key is not null and exists(select 1 from store_offers o where o.title_key=p.title_key)),
  'enriched',(select count(*) from ps_products where enriched_at is not null),
  'scores',(select count(*) from game_scores),
  'state',(select coalesce(jsonb_object_agg(key,value - 'cursors'),'{}'::jsonb) from ps_state where key in ('batch','market','enrich_batch','news','upcoming','oc_index')),
  'jobs',jobs
 ) into result;
 return result;
end;
$$;
revoke all on function public.is_radar_admin(),public.admin_sync_stats() from public,anon;
grant execute on function public.is_radar_admin(),public.admin_sync_stats() to authenticated;

-- Kendi hesabını yönetici yap (e-postayı değiştirin; bu dosyaya gerçek adres yazmayın):
-- insert into public.radar_admins(user_id) select id from auth.users where email='SENIN_EPOSTAN' on conflict do nothing;
