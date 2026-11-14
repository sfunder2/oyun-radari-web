-- v49'u geri alır: veritabanı kapasitesi yine 500 MB gösterilir.
do $do$
declare fn text; def text;
begin
 foreach fn in array array['public.admin_site_health()','radar_ops.collect_site_health()'] loop
  if to_regprocedure(fn) is null then continue; end if;
  def:=pg_get_functiondef(fn::regprocedure);
  if position('250::bigint*1024*1024*1024' in def)>0 then
   execute replace(def,'250::bigint*1024*1024*1024','500*1024*1024');
  end if;
 end loop;
end$do$;
do $do$ begin
 if to_regprocedure('radar_ops.refresh_admin_snapshots()') is not null then perform radar_ops.refresh_admin_snapshots(); end if;
end$do$;
