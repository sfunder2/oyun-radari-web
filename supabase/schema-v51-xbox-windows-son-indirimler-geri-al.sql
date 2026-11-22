-- v51'i geri alır.
do $do$
declare def text; nd text;
begin
 if to_regproc('public.catalog_recent_deals') is null then return; end if;
 def := pg_get_functiondef('public.catalog_recent_deals'::regproc);
 nd := replace(def, 'when dev=''pc'' then (d.platform not in (''playstation'',''xbox'',''switch'') or (d.platform=''xbox'' and m=''xbox''))',
                    'when dev=''pc'' then d.platform not in (''playstation'',''xbox'',''switch'')');
 nd := replace(nd, 'when d.platform=''xbox'' then (dev in (''xbox_one'',''xbox_series'') or (dev=''pc'' and m=''xbox'')) and o.devices',
                   'when d.platform=''xbox'' then dev in (''xbox_one'',''xbox_series'') and o.devices');
 if nd <> def then execute nd; end if;
end$do$;
