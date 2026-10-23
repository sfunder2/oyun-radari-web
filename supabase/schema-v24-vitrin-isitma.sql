-- v24: ana sayfa vitrinlerini hazır tutma (önbellek ısıtma).
-- Neden: v23'ün 5 dakikalık arama önbelleği süresi dolunca o anki ilk misafir ana sayfanın 7 arama sorgusunu
-- (Keşfet'in "Tümü" listesi + "Sana özel" vitrinindeki PS, Steam, Xbox, Switch, Epic, GOG) kendisi hesaplıyordu.
-- Sunucu yükteyken bu, 3 sn misafir sınırını aşma riskiydi. Bu iş 4 dakikada bir aynı anahtarları önceden doldurur;
-- misafir her zaman hazır sonucu okur. Canlı arama fonksiyonlarına dokunulmaz.
-- Anahtar biçimi search_market_c / search_games_c ile birebir aynı olmalı.

create or replace function public.warm_home_showcase() returns integer
 language plpgsql security definer set search_path to 'public','extensions' as $function$
declare
 s record; r jsonb; ck text; n integer := 0;
begin
 for s in select * from (values
   ('m','all',   '{}'::jsonb,               'default'),
   ('g','',      '{"minScore":80}'::jsonb,  'score'),
   ('m','steam', '{"minScore":80}'::jsonb,  'score'),
   ('m','xbox',  '{"minScore":80}'::jsonb,  'score'),
   ('m','switch','{"minScore":80}'::jsonb,  'score'),
   ('m','epic',  '{"minScore":80}'::jsonb,  'score'),
   ('m','gog',   '{"minScore":80}'::jsonb,  'score')) v(kind, market, opts, sort_order)
 loop
  begin
   if s.kind = 'm' then
    ck := 'm:'||md5(concat_ws('|', s.market, '', 0, 25, s.opts::text, s.sort_order, false));
    r := public.search_market_k(s.market, '', 0, 25, s.opts, s.sort_order, false);
   else
    ck := 'g:'||md5(concat_ws('|', '', 0, 25, s.opts::text, s.sort_order, false));
    r := public.search_games_k('', 0, 25, s.opts, s.sort_order, false);
   end if;
   insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
   n := n + 1;
  exception when others then
   -- Bir vitrin hesaplanamazsa eski önbellek kaydı kalır; diğerleri yine ısıtılır.
   raise warning 'warm_home_showcase %/% : %', s.kind, s.market, sqlerrm;
  end;
 end loop;
 return n;
end $function$;
revoke execute on function public.warm_home_showcase() from public, anon, authenticated;

-- Arama tablolarının yenilenmesi (*/10) 25 sn–2 dk sürüyor ve bu sırada hesaplama 15–30 kat yavaşlıyor.
-- Isıtma bu pencereden uzak durur (dakika sonu 3, 6, 9); aralık en çok 4 dk, böylece kayıtlar 5 dk sınırına hiç ulaşmaz
-- ve yenileme sırasında misafirler hep önbellekten okur.
select cron.schedule('oyun-radari-home-warm', '3,6,9,13,16,19,23,26,29,33,36,39,43,46,49,53,56,59 * * * *',
  $c$set statement_timeout='60s'; select public.warm_home_showcase()$c$);
select public.warm_home_showcase();
-- Ölçüm (2026-10-23): ısıtma tek seferde ~2 sn (yenileme sırasında 13–30 sn); misafir (anon, 3 sn sınırı) önbellekten 0,3–21 ms.

-- Geri alma:
--   select cron.unschedule('oyun-radari-home-warm'); drop function if exists public.warm_home_showcase();
