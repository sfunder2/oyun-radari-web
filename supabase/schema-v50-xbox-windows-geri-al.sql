-- v50'yi geri alır: market='xbox' + device='pc' tekrar Xbox satırı döndürmez.
do $do$
declare r record; def text; nd text;
begin
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname like 'search\_market%' loop
  def := pg_get_functiondef(r.oid);
  nd := def;
  nd := regexp_replace(nd, 'when dev = ''pc'' then \(case when m = ''xbox'' then array\[([^\]]*),''xbox''\] else array\[[^\]]*\] end\)', 'when dev = ''pc'' then array[\1]');
  nd := replace(nd, 'then (dev in (''xbox_series'',''xbox_one'') or (dev = ''pc'' and m = ''xbox'')) and exists (select 1 from store_offers so',
                    'then dev in (''xbox_series'',''xbox_one'') and exists (select 1 from store_offers so');
  if nd <> def then execute nd; end if;
 end loop;
end$do$;
