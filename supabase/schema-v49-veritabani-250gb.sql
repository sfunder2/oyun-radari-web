-- Veritabanı kapasitesi: yönetici panelindeki "veritabanı" kartının toplam alanı 500 MB (Supabase ücretsiz plan)
-- yerine 250 GB olur. Yalnızca 'limitBytes' değeri değişir; arayüz bunu otomatik GB olarak gösterir ve yüzdeyi hesaplar.
-- Not: 500*1024*1024 sabiti hem public.admin_site_health() içinde hem de v32'deki radar_ops.collect_site_health() kopyasında gömülüdür.
do $do$
declare fn text; def text;
begin
 foreach fn in array array['public.admin_site_health()','radar_ops.collect_site_health()'] loop
  if to_regprocedure(fn) is null then continue; end if;
  def:=pg_get_functiondef(fn::regprocedure);
  if position('500*1024*1024' in def)>0 then
   execute replace(def,'500*1024*1024','250::bigint*1024*1024*1024');
  end if;
 end loop;
end$do$;
-- Önbellekteki özeti hemen yenile (yoksa en geç 5 dakikada bir kendiliğinden yenilenir).
do $do$ begin
 if to_regprocedure('radar_ops.refresh_admin_snapshots()') is not null then perform radar_ops.refresh_admin_snapshots(); end if;
end$do$;
