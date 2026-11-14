-- v50'yi geri alır: özet yine yalnızca Supabase'teki tablolardan hesaplanır.
drop function if exists public.push_admin_snapshot(text,jsonb);
drop function if exists radar_ops.push_admin_snapshot(text,jsonb);
create or replace function radar_ops.refresh_admin_snapshots() returns void language plpgsql security definer set search_path='' set statement_timeout='120s' as $$
begin
 if not pg_try_advisory_xact_lock(hashtext('admin-snapshots')) then return; end if;
 insert into radar_ops.admin_snapshots(name,value) values
 ('sync_stats',radar_ops.collect_sync_stats()),('site_health',radar_ops.collect_site_health()),('operational_health',radar_ops.collect_operational_health())
 on conflict(name) do update set value=excluded.value,updated_at=now();
end$$;
revoke all on function radar_ops.refresh_admin_snapshots() from public,anon,authenticated;
grant execute on function radar_ops.refresh_admin_snapshots() to service_role;
