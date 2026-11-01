-- Şema v35: oyun bitirme süresi (IGDB "time to beat") ve Keşfet'te süreye göre filtre.
-- Kaynak: IGDB API (Twitch). HowLongToBeat'in resmi API'si olmadığı için kullanılmaz.
--
-- 1) game_ttb: başlık anahtarı başına tek satır. Dakika cinsinden üç süre:
--      hastily_min   = ana hikâye, acele oynayan  (IGDB "hastily")
--      normally_min  = ana hikâye + yan içerik      (IGDB "normally")
--      completely_min= her şeyi tamamlayan          (IGDB "completely")
--    votes: IGDB'de bu süreleri girmiş oyuncu sayısı. igdb_id boşsa oyun IGDB'de bulunamadı demektir; toplayıcı
--    30 gün sonra yeniden dener. Satırı yalnız toplayıcı (service role) yazar; herkes okuyabilir.
--    Disk: ~35 bin satır × ~80 bayt ≈ 3 MB.
-- 2) ttb_ok(title_key, kova): filtre yardımcısı. Kova boşsa her zaman true döner, yani filtre seçilmediğinde
--    aramanın sonucu ve hızı değişmez.
-- 3) Canlı arama fonksiyonlarına tek koşul eklenir (yerinde yama; fonksiyonların geri kalanına dokunulmaz):
--      search_games_s2 / search_games_s : "ttb" seçiliyse filtreli yola (search_games_t) geçer, "ids" ve "tag" gibi.
--      search_games_t, search_market_s, search_market_d : "and public.ttb_ok(<title_key>, opts->>'ttb')".
--    Her yama tam bir kez eşleşmek zorundadır; fonksiyon biçimi değişmişse hiçbir şey değiştirilmez ve hata verilir.
--    Geri almak için: supabase/schema-v35-oyun-suresi-geri-al.sql
-- Kovalar (ana hikâye + yan içerik, yoksa acele süresi):
--      short  : 8 saate kadar     medium : 8–20 saat     long : 20–50 saat     epic : 50 saatten fazla

create table if not exists public.game_ttb (
 title_key text primary key,
 igdb_id integer,
 hastily_min integer check (hastily_min is null or hastily_min > 0),
 normally_min integer check (normally_min is null or normally_min > 0),
 completely_min integer check (completely_min is null or completely_min > 0),
 votes integer not null default 0,
 matched_by text check (matched_by in ('steam','name')),
 checked_at timestamptz not null default now()
);
alter table public.game_ttb enable row level security;
drop policy if exists game_ttb_read on public.game_ttb;
create policy game_ttb_read on public.game_ttb for select to anon, authenticated using (true);
revoke all on public.game_ttb from public, anon, authenticated;
grant select on public.game_ttb to anon, authenticated;
grant all on public.game_ttb to service_role;
create index if not exists game_ttb_checked on public.game_ttb (checked_at);

create or replace function public.ttb_ok(key text, bucket text) returns boolean
language sql stable set search_path = '' as $$
 select coalesce(bucket, '') = '' or exists (
  select 1 from public.game_ttb t
  where t.title_key = key
    and coalesce(t.normally_min, t.hastily_min) is not null
    and case bucket
     when 'short'  then coalesce(t.normally_min, t.hastily_min) <= 480
     when 'medium' then coalesce(t.normally_min, t.hastily_min) > 480  and coalesce(t.normally_min, t.hastily_min) <= 1200
     when 'long'   then coalesce(t.normally_min, t.hastily_min) > 1200 and coalesce(t.normally_min, t.hastily_min) <= 3000
     when 'epic'   then coalesce(t.normally_min, t.hastily_min) > 3000
     else false end)
$$;
grant execute on function public.ttb_ok(text, text) to anon, authenticated, service_role;

-- Canlı arama fonksiyonlarına süre koşulu (yerinde yama).
do $patch$
declare
 r record; def text; n integer;
begin
 for r in select * from (values
  ('public.search_games_s2(text,integer,integer,jsonb,text,boolean)',
   $a$or opts?'ids'$a$,
   $a$or opts?'ids' or coalesce(opts->>'ttb','')<>''$a$),
  ('public.search_games_s(text,integer,integer,jsonb,text,boolean)',
   $a$or opts?'ids'$a$,
   $a$or opts?'ids' or coalesce(opts->>'ttb','')<>''$a$),
  ('public.search_games_t(text,integer,integer,jsonb,text,boolean)',
   $a$l.id in(select jsonb_array_elements_text(opts->'ids')))$a$,
   $a$l.id in(select jsonb_array_elements_text(opts->'ids'))) and public.ttb_ok(l.title_key, opts->>'ttb')$a$),
  ('public.search_market_s(text,text,integer,integer,jsonb,text,boolean)',
   $a$b.id in (select jsonb_array_elements_text(opts->'ids')))$a$,
   $a$b.id in (select jsonb_array_elements_text(opts->'ids'))) and public.ttb_ok(b.title_key, opts->>'ttb')$a$),
  ('public.search_market_d(text,text,integer,integer,jsonb,text,boolean)',
   $a$b.id in (select jsonb_array_elements_text(opts->'ids')))$a$,
   $a$b.id in (select jsonb_array_elements_text(opts->'ids'))) and public.ttb_ok(b.title_key, opts->>'ttb')$a$)
 ) v(fn, anchor, repl)
 loop
  def := pg_get_functiondef(r.fn::regprocedure);
  if position('ttb' in def) > 0 then continue; end if; -- zaten yamalı
  n := (length(def) - length(replace(def, r.anchor, ''))) / length(r.anchor);
  if n <> 1 then raise exception 'Fonksiyon biçimi değişmiş (% içinde % eşleşme): %', r.fn, n, r.anchor; end if;
  execute replace(def, r.anchor, r.repl);
 end loop;
end $patch$;
