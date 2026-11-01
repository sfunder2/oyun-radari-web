-- Şema v41: oyun modları (tek kişilik, co-op, bölünmüş ekran, çok oyunculu, MMO, battle royale) ve tema etiketleri (IGDB),
-- Keşfet'te "Oyun modu" ve "Tema" filtreleri.
-- Kaynak: IGDB API (Twitch). Eşleştirme oyun süresiyle ortaktır: toplayıcı game_ttb.igdb_id'yi kullanır (schema-v35 gerekli).
--
-- 1) game_modes: başlık anahtarı başına tek satır.
--      modes  : solo, coop, split, multi, mmo, br   (IGDB game_modes + multiplayer_modes bayrakları)
--      themes : fantasy, scifi, horror, thriller, survival, historical, stealth, comedy, business, drama, nonfiction,
--               sandbox, educational, kids, openworld, warfare, party, 4x, mystery, romance, action
--    Satırı yalnız toplayıcı (service role) yazar; herkes okuyabilir. 30 günde bir yenilenir.
--    Disk: ~15 bin satır × ~90 bayt ≈ 1,5 MB.
-- 2) gmode_ok(title_key, mod, tema): filtre yardımcısı. İkisi de boşsa her zaman true döner, yani filtre seçilmediğinde
--    aramanın sonucu ve hızı değişmez.
-- 3) Canlı arama fonksiyonlarına tek koşul eklenir (yerinde yama, v35'teki süre koşulunun hemen yanına):
--      search_games_s2 / search_games_s : "gmode" ya da "gtheme" seçiliyse filtreli yola (search_games_t) geçer, "ttb" gibi.
--      search_games_t, search_market_s, search_market_d : "and public.gmode_ok(<title_key>, opts->>'gmode', opts->>'gtheme')".
--    Her yama noktası tam bir kez eşleşmek zorundadır; eşleşmezse hiçbir şey değişmez ve hata verilir.
--    Önbellek (search_cache) anahtarı filtreleri içerdiği için ayrıca temizlemek gerekmez.
--    Geri almak için: supabase/schema-v41-oyun-modu-tema-geri-al.sql

create table if not exists public.game_modes (
 title_key text primary key,
 igdb_id integer not null,
 modes text[] not null default '{}',
 themes text[] not null default '{}',
 checked_at timestamptz not null default now()
);
alter table public.game_modes enable row level security;
drop policy if exists game_modes_read on public.game_modes;
create policy game_modes_read on public.game_modes for select to anon, authenticated using (true);
revoke all on public.game_modes from public, anon, authenticated;
grant select on public.game_modes to anon, authenticated;
grant all on public.game_modes to service_role;
create index if not exists game_modes_checked on public.game_modes (checked_at);

create or replace function public.gmode_ok(key text, mode text, theme text) returns boolean
language sql stable set search_path = '' as $$
 select (coalesce(mode, '') = '' and coalesce(theme, '') = '') or exists (
  select 1 from public.game_modes m
  where m.title_key = key
    and (coalesce(mode, '') = '' or mode = any (m.modes))
    and (coalesce(theme, '') = '' or theme = any (m.themes)))
$$;
grant execute on function public.gmode_ok(text, text, text) to anon, authenticated, service_role;

do $patch$
declare
 r record; def text; n integer;
begin
 if to_regclass('public.game_ttb') is null then raise exception 'Önce schema-v35-oyun-suresi.sql çalıştırılmalı'; end if;
 for r in select * from (values
  ('public.search_games_s2(text,integer,integer,jsonb,text,boolean)',
   $a$or coalesce(opts->>'ttb','')<>''$a$,
   $a$or coalesce(opts->>'ttb','')<>'' or coalesce(opts->>'gmode','')<>'' or coalesce(opts->>'gtheme','')<>''$a$),
  ('public.search_games_s(text,integer,integer,jsonb,text,boolean)',
   $a$or coalesce(opts->>'ttb','')<>''$a$,
   $a$or coalesce(opts->>'ttb','')<>'' or coalesce(opts->>'gmode','')<>'' or coalesce(opts->>'gtheme','')<>''$a$),
  ('public.search_games_t(text,integer,integer,jsonb,text,boolean)',
   $a$and public.ttb_ok(l.title_key, opts->>'ttb')$a$,
   $a$and public.ttb_ok(l.title_key, opts->>'ttb') and public.gmode_ok(l.title_key, opts->>'gmode', opts->>'gtheme')$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)',
   $a$and public.ttb_ok(b.title_key, opts->>'ttb')$a$,
   $a$and public.ttb_ok(b.title_key, opts->>'ttb') and public.gmode_ok(b.title_key, opts->>'gmode', opts->>'gtheme')$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)',
   $a$and public.ttb_ok(b.title_key, opts->>'ttb')$a$,
   $a$and public.ttb_ok(b.title_key, opts->>'ttb') and public.gmode_ok(b.title_key, opts->>'gmode', opts->>'gtheme')$a$)
 ) v(fn, anchor, repl)
 loop
  def := pg_get_functiondef(r.fn::regprocedure);
  if position('gmode' in def) > 0 then continue; end if; -- zaten yamalı
  n := (length(def) - length(replace(def, r.anchor, ''))) / length(r.anchor);
  if n <> 1 then raise exception 'Fonksiyon biçimi değişmiş (% içinde % eşleşme): %', r.fn, n, r.anchor; end if;
  execute replace(def, r.anchor, r.repl);
 end loop;
end $patch$;
