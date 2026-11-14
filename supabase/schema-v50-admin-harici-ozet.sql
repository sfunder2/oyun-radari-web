-- Şema v50: admin "Mağaza/toplayıcı tazeliği" özeti artık Mac mini'den gelebilir.
-- Sorun: toplayıcılar Mac mini'ye yazıyor ama admin_sync_stats() Supabase'teki tablolardan hesaplanıyordu; Supabase'e yazılmayan
-- mağazalar (Ubisoft, WinGameStore ...) "Durmuş görünüyor" diye yanlış uyarı veriyordu.
-- Çözüm: Mac mini kendi özetini hesaplayıp bu fonksiyonla Supabase'in özet önbelleğine yazar (yalnız service_role).
-- Yönetici verisi herkese açık bir uca çıkmaz; panel yine admin_sync_stats() ile (yönetici girişiyle) okur.
-- Mac özeti 30 dakikadan eskiyse (Mac susarsa) Supabase kendi hesabına döner; böylece panel boş kalmaz.
create or replace function radar_ops.push_admin_snapshot(p_name text,p_value jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_name<>'sync_stats' then raise exception 'Desteklenmeyen özet: %',p_name; end if;
 insert into radar_ops.admin_snapshots(name,value) values(p_name,p_value||jsonb_build_object('source','macmini'))
 on conflict(name) do update set value=excluded.value,updated_at=now();
end$$;
revoke all on function radar_ops.push_admin_snapshot(text,jsonb) from public,anon,authenticated;
grant execute on function radar_ops.push_admin_snapshot(text,jsonb) to service_role;
-- PostgREST yalnızca public şemasını sunar; ince bir sarmalayıcı.
create or replace function public.push_admin_snapshot(p_name text,p_value jsonb) returns void language sql security invoker set search_path='' as $$select radar_ops.push_admin_snapshot(p_name,p_value)$$;
revoke all on function public.push_admin_snapshot(text,jsonb) from public,anon,authenticated;
grant execute on function public.push_admin_snapshot(text,jsonb) to service_role;

create or replace function radar_ops.refresh_admin_snapshots() returns void language plpgsql security definer set search_path='' set statement_timeout='120s' as $$
declare mac_fresh boolean;
begin
 if not pg_try_advisory_xact_lock(hashtext('admin-snapshots')) then return; end if;
 select coalesce(value->>'source'='macmini' and updated_at>now()-interval '30 minutes',false) into mac_fresh from radar_ops.admin_snapshots where name='sync_stats';
 if not coalesce(mac_fresh,false) then
  insert into radar_ops.admin_snapshots(name,value) values('sync_stats',radar_ops.collect_sync_stats())
  on conflict(name) do update set value=excluded.value,updated_at=now();
 end if;
 insert into radar_ops.admin_snapshots(name,value) values
 ('site_health',radar_ops.collect_site_health()),('operational_health',radar_ops.collect_operational_health())
 on conflict(name) do update set value=excluded.value,updated_at=now();
end$$;
revoke all on function radar_ops.refresh_admin_snapshots() from public,anon,authenticated;
grant execute on function radar_ops.refresh_admin_snapshots() to service_role;
