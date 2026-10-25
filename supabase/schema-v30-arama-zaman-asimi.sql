-- v30: Arama zaman aşımlarını azalt (anon 3 sn sınırı).
-- Neden (2026-10-25 ölçümü): bugün 200'den fazla search_market/search_games isteği 3 sn sınırında iptal edilip 500 döndü.
-- rebuild_search_keys 15 dakikada bir search_keys tablosunu baştan kurup eskisinin yerine koyuyor; yeni tablo bellekte
-- olmadığı için ardından gelen ilk hesaplamalar yavaş (aynı sorgu ilk seferde 1,4–3,6 sn, ikincide 50–130 ms).
-- Sayfa açılışında 20–30 arama isteği aynı anda geldiğinde soğuk hesaplamalar 3 sn'yi aşıyor.
-- Zaman aşımında eski sonucu döndüren yedek yalnız son 2 saatte hesaplanmış istekler için çalışıyordu.
-- v24'teki ısıtma işi (job 'oyun-radari-home-warm') kapalı ve artık kullanılmayan search_market_k / search_games_k
-- fonksiyonlarını çağırıyordu; olduğu gibi açılırsa eski tablodan sonuç yazardı.
--
-- Bu dosya:
--  1. Önbellek kayıtlarını 2 saat yerine 24 saat saklar. Hesaplama 3 sn'yi aşarsa misafir 500 yerine son sonucu görür.
--     Taze sonuç süresi (5 dk) değişmez.
--  2. warm_home_showcase'i canlı arama yoluyla (search_market_s, search_games_s2) yeniden yazar.
--  3. Isıtmayı arama tablosu yenilendikten hemen sonra ve 4 dakikada bir çalıştırır.

create or replace function public.search_market(market text default 'all'::text, query_text text default ''::text, page_number integer default 0, page_size integer default 25, filter_options jsonb default '{}'::jsonb, sort_order text default 'default'::text, deals_only boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare ck text := 'm:'||md5(concat_ws('|',market,query_text,page_number,page_size,coalesce(filter_options,'{}'::jsonb)::text,sort_order,deals_only)); r jsonb; ts timestamptz;
begin
 -- Aynı istek (çoğunlukla sayfa açılışları) 5 dakika boyunca önbellekten döner. Hesaplama zaman aşımına uğrarsa eski sonuç verilir.
 select c.v, c.at into r, ts from search_cache c where c.k = ck;
 if found and ts > now() - interval '5 minutes' then return r; end if;
 begin
  r := public.search_market_s(market, query_text, page_number, page_size, filter_options, sort_order, deals_only);
 exception when query_canceled then
  if ts is not null then return r; end if;
  raise;
 end;
 insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
 if random() < 0.02 then delete from search_cache where at < now() - interval '24 hours'; end if;
 return r;
end $function$;

create or replace function public.search_games(query_text text default ''::text, page_number integer default 0, page_size integer default 25, filter_options jsonb default '{}'::jsonb, sort_order text default 'default'::text, deals_only boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare ck text := 'g:'||md5(concat_ws('|',query_text,page_number,page_size,coalesce(filter_options,'{}'::jsonb)::text,sort_order,deals_only)); r jsonb; ts timestamptz;
begin
 select c.v, c.at into r, ts from search_cache c where c.k = ck;
 if found and ts > now() - interval '5 minutes' then return r; end if;
 begin
  r := public.search_games_s2(query_text, page_number, page_size, filter_options, sort_order, deals_only);
 exception when query_canceled then
  if ts is not null then return r; end if;
  raise;
 end;
 insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
 if random() < 0.02 then delete from search_cache where at < now() - interval '24 hours'; end if;
 return r;
end $function$;

-- Ana sayfa vitrinleri ("Sana özel": PS, Steam, Xbox, Switch, Epic, GOG; puan ≥80, puana göre) ve Keşfet'in PS listesi.
-- Anahtar biçimi search_market / search_games ile birebir aynı olmalı.
create or replace function public.warm_home_showcase() returns integer
 language plpgsql security definer set search_path to 'public','extensions' as $function$
declare
 s record; r jsonb; ck text; n integer := 0;
begin
 for s in select * from (values
   ('g','',      '{"minScore":80}'::jsonb,  'score'),
   ('g','',      '{}'::jsonb,               'default'),
   ('m','steam', '{"minScore":80}'::jsonb,  'score'),
   ('m','xbox',  '{"minScore":80}'::jsonb,  'score'),
   ('m','switch','{"minScore":80}'::jsonb,  'score'),
   ('m','epic',  '{"minScore":80}'::jsonb,  'score'),
   ('m','gog',   '{"minScore":80}'::jsonb,  'score')) v(kind, market, opts, sort_order)
 loop
  begin
   if s.kind = 'm' then
    ck := 'm:'||md5(concat_ws('|', s.market, '', 0, 25, s.opts::text, s.sort_order, false));
    r := public.search_market_s(s.market, '', 0, 25, s.opts, s.sort_order, false);
   else
    ck := 'g:'||md5(concat_ws('|', '', 0, 25, s.opts::text, s.sort_order, false));
    r := public.search_games_s2('', 0, 25, s.opts, s.sort_order, false);
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

-- Arama tablosu yenilenince yeni tablo hemen ısıtılır (misafirler soğuk hesaplamayı ödemez).
select cron.alter_job(7, command := $c$set statement_timeout='180s'; select public.rebuild_search_keys(); select public.warm_home_showcase()$c$);
-- 4 dakikada bir ısıtma: kayıtlar 5 dakikalık taze sınırına ulaşmadan yenilenir.
select cron.alter_job(8, active := true);
select public.warm_home_showcase();

-- Geri alma:
--   select cron.alter_job(8, active := false);
--   select cron.alter_job(7, command := $c$set statement_timeout='120s'; select public.rebuild_search_keys()$c$);
--   search_market / search_games içinde '24 hours' yerine '2 hours' yazıp yeniden çalıştırın.
