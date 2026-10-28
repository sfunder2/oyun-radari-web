create table if not exists radar_ops.admin_snapshots(name text primary key,value jsonb not null,updated_at timestamptz not null default now());
alter table radar_ops.admin_snapshots enable row level security;
revoke all on radar_ops.admin_snapshots from public,anon,authenticated;
do $do$
declare name text; def text;
begin
 foreach name in array array['sync_stats','site_health','operational_health'] loop
  if to_regprocedure('radar_ops.collect_'||name||'()') is not null then continue; end if;
  def:=pg_get_functiondef(('public.admin_'||name||'()')::regprocedure);
  def:=replace(def,'FUNCTION public.admin_'||name||'()','FUNCTION radar_ops.collect_'||name||'()');
  def:=regexp_replace(def,'if [^\n]*is_radar_admin\(\)[\s\S]*?end if;','','i');
  execute def;
  execute format('revoke all on function radar_ops.collect_%I() from public,anon,authenticated',name);
 end loop;
end$do$;
create or replace function radar_ops.refresh_admin_snapshots() returns void language plpgsql security definer set search_path='' set statement_timeout='120s' as $$
begin
 if not pg_try_advisory_xact_lock(hashtext('admin-snapshots')) then return; end if;
 insert into radar_ops.admin_snapshots(name,value) values
 ('sync_stats',radar_ops.collect_sync_stats()),('site_health',radar_ops.collect_site_health()),('operational_health',radar_ops.collect_operational_health())
 on conflict(name) do update set value=excluded.value,updated_at=now();
end$$;
revoke all on function radar_ops.refresh_admin_snapshots() from public,anon,authenticated;
grant execute on function radar_ops.refresh_admin_snapshots() to service_role;
create or replace function radar_ops.admin_snapshot(p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;
begin
 perform radar_ops.require_admin();
 select value into v from radar_ops.admin_snapshots where name=p_name;
 if v is null then raise exception 'Admin özeti hazırlanıyor. Biraz sonra tekrar deneyin.'; end if;
 return v;
end$$;
revoke all on function radar_ops.admin_snapshot(text) from public,anon;
grant execute on function radar_ops.admin_snapshot(text) to authenticated;
create or replace function public.admin_sync_stats() returns jsonb language sql security invoker set search_path='' as $$select radar_ops.admin_snapshot('sync_stats')$$;
create or replace function public.admin_site_health() returns jsonb language sql security invoker set search_path='' as $$select radar_ops.admin_snapshot('site_health')$$;
create or replace function public.admin_operational_health() returns jsonb language sql security invoker set search_path='' as $$select radar_ops.admin_snapshot('operational_health')$$;
select cron.schedule('oyun-radari-admin-snapshots','2-59/5 * * * *','select radar_ops.refresh_admin_snapshots()');
