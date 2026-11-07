-- Şema v48: veritabanı yükünü azaltıp siteyi hızlandırır. Hiçbir satır silinmez, hiçbir tablo değişmez.
-- Geri almak için: supabase/schema-v48-veritabani-hiz-geri-al.sql
--
-- Ölçüm (7 Kasım 2026, canlı proje, pg_stat_statements + cron.job_run_details, son 24 saat):
--  * Arama fonksiyonları tek başına hızlı (metin araması 60-250 ms), ama kullanıcı tarafında ortalama 6-7 sn,
--    çoğu 20 sn'de zaman aşımı. Sebep sorgular değil, veritabanının arka plan işleriyle dolu olması:
--    cron işleri günde ~33.000 sn çalışıyor, 10 işin 5'i "job startup timeout" ile düşüyor.
--  * En büyük tüketici yönetici paneli özeti (oyun-radari-admin-snapshots): 5 dakikada bir, ort. 36 sn,
--    günde ~10.500 sn. Bu özeti yalnızca admin paneli okuyor.
--  * Vitrin ısıtma (warm_home_showcase) 7 sayfadan 5'ini (Steam/Xbox/Switch/Epic/GOG) 'm:' anahtarıyla yazıyor,
--    search_market ise 'r:' anahtarıyla ve sitenin gönderdiği usdTry kuru ile okuyor: bu 5 sayfa hiç isabet etmiyor.
--    Boş aramalı mağaza vitrini (ör. Steam, puan 80+) her seferinde 3-4 sn yeniden hesaplanıyor.
--  * search_keys'te 21 bin ölü satır var, son otomatik vacuum 2 gün önce.
--
-- Yapılanlar:
--  1) Admin özeti 5 yerine 15 dakikada bir yenilenir (panel en fazla 15 dk eski veri gösterir).
--  2) search_market önbellek anahtarı, sonucu değiştirmediği durumlarda usdTry'ı yok sayar
--     (tek mağaza seçiliyken, fiyat süzgeci/fiyat sıralaması yokken). Boş aramalı vitrin 12 dk önbellekte kalır
--     (search_keys zaten 30 dk'da bir yenileniyor); metin aramaları eskisi gibi 5 dk.
--  3) warm_home_showcase mağaza vitrinlerini search_market'in okuduğu anahtarla ve aynı fonksiyonla (search_market_r) ısıtır.
--  4) search_keys (platform, best_score) indeksi: "puan 80+" vitrinleri tüm mağaza satırlarını taramaz.
--     radar_lists(user_id) indeksi: Supabase danışmanının işaretlediği indekssiz yabancı anahtar.
--  5) search_keys ve store_offers için daha sık otomatik vacuum/analyze.

-- 1) Admin özeti: 15 dakikada bir.
select cron.alter_job(jobid, schedule := '2-59/15 * * * *')
from cron.job where jobname = 'oyun-radari-admin-snapshots';

-- 2) Önbellek anahtarı.
create or replace function public.search_market_cache_key(market text, query_text text, page_number integer, page_size integer,
                                                          filter_options jsonb, sort_order text, deals_only boolean)
returns text language sql immutable set search_path = '' as $$
 -- usdTry yalnızca fiyatı TL'ye çevirmek için kullanılır: fiyat süzgeci, fiyat sıralaması ve "Tümü"nde en ucuz mağaza seçimi.
 -- Bunların hiçbiri yoksa sonuç kurdan bağımsızdır; anahtardan çıkarılınca vitrin ısıtması ve farklı kurla gelen ziyaretçiler aynı kaydı paylaşır.
 select 'r:' || md5(concat_ws('|', market, query_text, page_number, page_size,
   (case when lower(coalesce(nullif(market, ''), 'all')) <> 'all'
              and nullif(coalesce(filter_options, '{}'::jsonb)->>'maxPrice', '') is null
              and coalesce(sort_order, '') not in ('priceAsc', 'priceDesc')
         then coalesce(filter_options, '{}'::jsonb) - 'usdTry'
         else coalesce(filter_options, '{}'::jsonb) end)::text,
   sort_order, deals_only))
$$;
revoke all on function public.search_market_cache_key(text,text,integer,integer,jsonb,text,boolean) from public, anon, authenticated;

create or replace function public.search_market(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare ck text := public.search_market_cache_key(market,query_text,page_number,page_size,filter_options,sort_order,deals_only); r jsonb; ts timestamptz;
 ttl interval := case when sort_order = 'recentDiscount' then interval '1 minute'
                      when trim(coalesce(query_text,'')) = '' then interval '12 minutes'
                      else interval '5 minutes' end;
begin
 -- Aynı istek önbellekten döner (metin araması 5 dk, boş aramalı vitrin 12 dk, son indirimler 1 dk).
 -- Hesaplama zaman aşımına uğrarsa eski sonuç verilir.
 -- v45: cihaz süzgeci olmadan da search_market_r. v48: anahtar search_market_cache_key ile (gereksizse usdTry'sız).
 select c.v, c.at into r, ts from search_cache c where c.k = ck;
 if found and ts > now() - ttl then return r; end if;
 begin
  if sort_order = 'recentDiscount' then r := public.catalog_recent_deals(market,query_text,page_number,page_size,filter_options); else r := public.search_market_r(market, query_text, page_number, page_size, coalesce(filter_options,'{}'::jsonb) - 'device', sort_order, deals_only); end if;
 exception when query_canceled then
  if ts is not null then return r; end if;
  raise;
 end;
 insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
 if random() < 0.02 then delete from search_cache where at < now() - interval '24 hours'; end if;
 return r;
end;
$function$;

-- 3) Vitrin ısıtma: search_market'in okuduğu anahtar ve fonksiyon.
create or replace function public.warm_home_showcase()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
    -- v48: önceden 'm:' anahtarına search_market_s yazılıyordu; search_market bu anahtarı hiç okumadığı için ısıtma boşa gidiyordu.
    ck := public.search_market_cache_key(s.market, '', 0, 25, s.opts, s.sort_order, false);
    r := public.search_market_r(s.market, '', 0, 25, s.opts, s.sort_order, false);
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
 delete from search_cache where k like 'm:%'; -- v48 öncesinden kalan, okunmayan kayıtlar
 return n;
end $function$;

-- 4) İndeksler (tablolar küçük; oluşturma birkaç saniye sürer).
create index if not exists search_keys_platform_score on public.search_keys (platform, best_score desc nulls last);
create index if not exists radar_lists_user_id on public.radar_lists (user_id);

-- 5) Tam yenilenen tablolarda ölü satırlar birikmesin.
alter table public.search_keys  set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);
alter table public.store_offers set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);

-- Vitrinleri yeni anahtarlarla hemen ısıt.
set statement_timeout = '120s';
select public.warm_home_showcase();

-- İsteğe bağlı, ayrı çalıştırın (VACUUM bir işlem bloğu içinde çalışamaz):
--   vacuum (analyze) public.search_keys;
