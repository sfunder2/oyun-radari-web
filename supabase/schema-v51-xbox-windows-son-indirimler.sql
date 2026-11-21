-- Şema v51: "Son başlayan indirimler" sıralaması (public.catalog_recent_deals) için Xbox + PC cihaz süzmesi.
-- v50, search_market_r/_d'yi düzeltmişti; bu sıralama ayrı fonksiyondan geçtiği için market='xbox' + device='pc' orada hâlâ 0 dönüyordu.
-- Yalnız market='xbox' iken 'pc' Xbox satırlarını da kabul eder; Steam/Epic/GOG/Tümü davranışı aynı kalır.
-- Geri almak için: schema-v51-xbox-windows-son-indirimler-geri-al.sql
do $do$
declare def text; nd text;
begin
 if to_regproc('public.catalog_recent_deals') is null then return; end if;
 def := pg_get_functiondef('public.catalog_recent_deals'::regproc);
 nd := replace(def, 'when dev=''pc'' then d.platform not in (''playstation'',''xbox'',''switch'')',
                    'when dev=''pc'' then (d.platform not in (''playstation'',''xbox'',''switch'') or (d.platform=''xbox'' and m=''xbox''))');
 nd := replace(nd, 'when d.platform=''xbox'' then dev in (''xbox_one'',''xbox_series'') and o.devices',
                   'when d.platform=''xbox'' then (dev in (''xbox_one'',''xbox_series'') or (dev=''pc'' and m=''xbox'')) and o.devices');
 if nd <> def then execute nd; end if;
end$do$;
