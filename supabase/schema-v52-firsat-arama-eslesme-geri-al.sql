-- v52'yi geri alır: catalog_recent_deals'i yedekten geri yükler (yedek: public.function_backups).
do $do$
declare d text;
begin
 select def into d from public.function_backups where name = 'catalog_recent_deals@v52' order by saved_at limit 1;
 if d is null then raise exception 'yedek bulunamadı'; end if;
 execute d;
end$do$;
drop function if exists public.radar_text_match(text, text, boolean);
