-- Şema v50: "Xbox Windows Store" (Xbox Store TR, PC'de Xbox uygulamasıyla oynanan oyunlar) için cihaz süzmesi.
--
-- Sorun: search_market* fonksiyonları (v45 ve sonrası) 'pc' cihazını yalnız steam/epic/gog için açıyor, Xbox için yalnız
-- 'xbox_series' ve 'xbox_one' kabul ediyor. Oysa store_offers.devices içinde 4.972 Xbox ürünü 'pc' etiketli (1.019'u indirimde);
-- market='xbox' + device='pc' bu yüzden 0 sonuç dönüyordu.
--
-- Çözüm: yalnız market='xbox' seçiliyken 'pc' cihazı Xbox satırlarını da kabul eder. Market 'all' iken davranış aynı kalır
-- (Tümü + PC listesine Xbox karışmaz). Fonksiyon gövdesi canlıdan okunup değiştirilir, böylece sonraki sürümlerle çakışmaz.
-- Geri almak için: schema-v50-xbox-windows-geri-al.sql

do $do$
declare r record; def text; nd text;
begin
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname like 'search\_market%' loop
  def := pg_get_functiondef(r.oid);
  nd := def;
  nd := replace(nd, 'when dev = ''pc'' then array[''steam'',''epic'',''gog'']',
                    'when dev = ''pc'' then (case when m = ''xbox'' then array[''steam'',''epic'',''gog'',''xbox''] else array[''steam'',''epic'',''gog''] end)');
  nd := replace(nd, 'then dev in (''xbox_series'',''xbox_one'') and exists (select 1 from store_offers so',
                    'then (dev in (''xbox_series'',''xbox_one'') or (dev = ''pc'' and m = ''xbox'')) and exists (select 1 from store_offers so');
  if nd <> def and position('m text :=' in def) > 0 then execute nd; end if;
 end loop;
end$do$;
