-- Şema v47: ITAD üzerinden on mağaza daha. v46'nın (Fanatical, Humble, GMG, WinGameStore, GamesPlanet) üzerine kurulur.
-- Toplayıcı değişmez (scripts/itad.mjs, ITAD_SHOPS listesi büyür; .github/workflows/itad-prices.yml 30 dakikada bir).
-- Ölçüm (1 Kasım 2026, 597 Steam oyunu, TR, scripts/itad-probe-all.mjs): ITAD'in Türkiye listesindeki 35 mağazadan
-- mevcut en ucuzu (Steam/GOG/Epic + v46 mağazaları) en az bir kez geçen sekiz anahtar mağazası:
--   GameBillet, Dreamgame, AllYouPlay, GamersGate, IndieGala, PlanetPlay, Playsum, PlayerLand
-- ve iki resmî yayıncı mağazası: Ubisoft Store, Blizzard (Battle.net). Hepsi TL fiyat veriyor.
-- Microsoft Store eklenmez (Xbox Store TR toplayıcısı aynı kataloğu getiriyor); EA Store, Nuuvem, JoyBuggy, Newegg
-- Türkiye'de 0 oyun listeliyor; DLGamer, Zapagames, Gamesload, MacGameStore örneklemde hiç daha ucuz değildi.
--
-- Bu dosya v46 ile aynı üç işi yapar: platform kısıtı, search_market_r/_d/_s market listesi ve "pc" cihaz süzgeci.
-- Hiçbir mevcut satır değişmez. Geri almak için: supabase/schema-v47-itad-magazalar-2-geri-al.sql

alter table public.store_offers drop constraint if exists store_offers_platform_check;
alter table public.store_offers add constraint store_offers_platform_check
 check (platform in ('steam','xbox','switch','epic','gog','fanatical','humble','gmg','wingamestore','gamesplanet',
                     'gamebillet','dreamgame','allyouplay','gamersgate','indiegala','planetplay','playsum','playerland','ubisoft','blizzard'));

do $d$
declare f text; def text; patched text;
 add    constant text := $s$,'gamebillet','dreamgame','allyouplay','gamersgate','indiegala','planetplay','playsum','playerland','ubisoft','blizzard'$s$;
 old_m  constant text := $s$'wingamestore','gamesplanet')$s$;
 old_pa constant text := $s$'wingamestore','gamesplanet']$s$;
 old_pi constant text := $s$'wingamestore','gamesplanet') then dev = 'pc'$s$;
begin
 foreach f in array array['public.search_market_r(text,text,integer,integer,jsonb,text,boolean)',
                          'public.search_market_d(text,text,integer,integer,jsonb,text,boolean)',
                          'public.search_market_s(text,text,integer,integer,jsonb,text,boolean)'] loop
  if to_regprocedure(f) is null then raise exception '% bulunamadı', f; end if;
  def := pg_get_functiondef(f::regprocedure);
  if position($s$'playerland'$s$ in def) > 0 then continue; end if; -- zaten yamalı
  if position(old_m in def) = 0 then raise exception '% v46 market listesi bulunamadı (önce schema-v46-itad-magazalar.sql)', f; end if;
  -- old_pi, old_m'yi de içerir; tek replace hepsini kapsar: ...'gamesplanet' + yeni adlar + ) / ] kapanışı.
  patched := replace(replace(def, old_m, $s$'wingamestore','gamesplanet'$s$ || add || ')'), old_pa, $s$'wingamestore','gamesplanet'$s$ || add || ']');
  if f not like '%search_market_s%' and (position($s$'blizzard']$s$ in patched) = 0 or position($s$'blizzard') then dev = 'pc'$s$ in patched) = 0) then
   raise exception '% cihaz süzgeci beklenen biçimde değil', f;
  end if;
  execute patched;
 end loop;
end $d$;

set statement_timeout = '180s';
delete from public.search_cache;
