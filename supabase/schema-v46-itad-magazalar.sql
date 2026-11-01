-- Şema v46: IsThereAnyDeal (ITAD) üzerinden beş anahtar mağazası: Fanatical, Humble, Green Man Gaming, WinGameStore, GamesPlanet.
-- Toplayıcı: scripts/itad.mjs (GitHub Actions: .github/workflows/itad-prices.yml, 30 dakikada bir). Satırlar store_offers'a
-- yeni platform adlarıyla yazılır; ad, görsel, tür ve etiketler eşleşen Steam satırından gelir, böylece title_key aynıdır ve
-- en ucuz teklif birleştirmesi (market_offers, search_keys grupları) ek bir iş yapmadan yeni mağazaları görür.
-- Ölçüm (1 Kasım 2026, 300 Steam oyunu, TR): beş mağaza TL fiyat veriyor; mevcut en ucuzu (Steam/GOG/Epic) 39 kez geçiyorlar.
--
-- Bu dosya:
--  1. store_offers.platform kısıtına yeni platformları ekler.
--  2. public.itad_games: Steam appid -> ITAD oyun kimliği önbelleği (eşleşmeyen oyunlar 30 günde bir yeniden sorulur).
--  3. search_market_r, search_market_d ve search_market_s'de market listesine yeni platformları, cihaz süzgecinde "pc"ye ekler
--     (fonksiyonlar yerinde yamalanır; beklenen metin bulunmazsa dosya hata verip durur).
-- Hiçbir mevcut satır değişmez. Geri almak için: supabase/schema-v46-itad-magazalar-geri-al.sql

alter table public.store_offers drop constraint if exists store_offers_platform_check;
alter table public.store_offers add constraint store_offers_platform_check
 check (platform in ('steam','xbox','switch','epic','gog','fanatical','humble','gmg','wingamestore','gamesplanet'));

create table if not exists public.itad_games (
 steam_appid text primary key,
 itad_id     text,
 checked_at  timestamptz not null default now()
);
create index if not exists itad_games_itad_id on public.itad_games (itad_id);
alter table public.itad_games enable row level security;
revoke all on public.itad_games from public, anon, authenticated;

do $d$
declare f text; def text; patched text;
 old_m  constant text := $s$'all','steam','xbox','switch','epic','gog')$s$;
 new_m  constant text := $s$'all','steam','xbox','switch','epic','gog','fanatical','humble','gmg','wingamestore','gamesplanet')$s$;
 old_pa constant text := $s$array['steam','epic','gog']$s$;
 new_pa constant text := $s$array['steam','epic','gog','fanatical','humble','gmg','wingamestore','gamesplanet']$s$;
 old_pi constant text := $s$platform in ('steam','epic','gog') then dev = 'pc'$s$;
 new_pi constant text := $s$platform in ('steam','epic','gog','fanatical','humble','gmg','wingamestore','gamesplanet') then dev = 'pc'$s$;
begin
 foreach f in array array['public.search_market_r(text,text,integer,integer,jsonb,text,boolean)',
                          'public.search_market_d(text,text,integer,integer,jsonb,text,boolean)',
                          'public.search_market_s(text,text,integer,integer,jsonb,text,boolean)'] loop
  if to_regprocedure(f) is null then raise exception '% bulunamadı', f; end if;
  def := pg_get_functiondef(f::regprocedure);
  if position(new_m in def) > 0 then continue; end if; -- zaten yamalı
  if position(old_m in def) = 0 then raise exception '% market listesi beklenen biçimde değil', f; end if;
  patched := replace(replace(replace(def, old_m, new_m), old_pa, new_pa), old_pi, new_pi);
  if f not like '%search_market_s%' and (position(new_pa in patched) = 0 or position(new_pi in patched) = 0) then
   raise exception '% cihaz süzgeci beklenen biçimde değil', f;
  end if;
  execute patched;
 end loop;
end $d$;
