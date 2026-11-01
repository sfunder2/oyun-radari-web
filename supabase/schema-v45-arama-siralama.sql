-- Şema v45: genel aramanın (başlıktaki arama ve Keşfet) sonuç sıralamasını ve eşleşmesini iyileştirir.
--
-- Sorunlar (1 Kasım 2026, canlı veri):
--  * Sonuçlar eşleşme türünden sonra yalnız ada göre (alfabetik) sıralanıyordu: "witcher" aramasında ilk sırada GWENT ve
--    Reigns, The Witcher 3 yedinci; "cyberpunk"ta Cyberpunk SFX ve Cyberpunk Brothel, 2077'nin sürümleriyle karışık.
--  * DLC, kostüm, sezon bileti, film müziği ve demo ana oyunla aynı sırada: "resident evil 4"te ikinci sırada kostüm paketi.
--  * Kısaltmalar ve rakamlar: "gta" alakasız iki sonuç, "fifa" hiç sonuç vermiyor, "god of war 3" (God of War III) ve
--    "final fantasy 7" (VII) boş, "grand theft auto 5" GTA Online'ı ilk gösteriyor.
--  * Yazım hatası: "elden rnig" Keşfet'te boş sonuç.
--
-- Bu dosya:
--  1. public.radar_search_expand(q): kısaltmaları açar (gta, rdr2, cod, gow, tlou, botw, totk, fifa → fc, nfs, mgs, ff7, re4 ...).
--  2. public.radar_num_alt(w): rakam <-> Roma rakamı (1–20).
--  3. public.radar_search_kind(searchable): 0 oyun, 1 sürüm/paket, 2 DLC/kostüm/yükseltme, 3 film müziği/demo/araç.
--  4. public.search_market_r: search_market_d'nin (cihaz süzgeçli) aynısı; yalnız yazılı aramada eşleşme ve sıralama değişir.
--     Sıralama: sorgu bir kelimenin başında geçenler > diğer eşleşmeler; aynı grupta tam ad artısı + bilinirlik - tür cezası,
--     sonra eşleşmenin addaki yeri, yeni çıkanlar, kısa ad. Rakam ve Roma rakamı aynı sayılır (5 = V). 1–2 harfli kelimeler
--     kelime başında aranır ("fc" artık "ufc"yi bulmaz). Hiç sonuç yoksa ikinci tur çalışır: yazım hatası toleransı
--     (trigram) ve boşluksuz eşleşme ("eldenring" = "elden ring").
--     Arama kutusu boşken search_market_d'ye devreder (sonuç ve hız aynı). Fiyat/puan/süre sıralaması seçiliyken yalnız
--     eşleşme kuralları (kısaltma, rakam) yenidir, sıra eskisi gibidir.
--  5. search_market ve search_market_v2 sarmalayıcılarını search_market_r'ye bağlar (önbellek anahtarı önekleri r: ve r2:,
--     böylece eski önbellekteki sıralama hemen devre dışı kalır).
--
-- Hiçbir tablo ya da satır değişmez; search_market_s ve search_market_d olduğu gibi kalır.
-- Geri almak için: supabase/schema-v45-arama-siralama-geri-al.sql
-- Not: ileride search_market_s/_d'ye "yerinde" eklenen bir süzgeç (v35, v39 gibi) search_market_r'ye de eklenmelidir.

create or replace function public.radar_search_expand(q text) returns text
 language plpgsql immutable parallel safe set search_path = '' as $f$
declare
 s text := ' '||coalesce(q,'')||' ';
 rules constant text[] := array[
  '\mgta ?(v|iv|vi|iii|\d*)\M', 'grand theft auto \1',
  '\mrdr ?(\d*)\M', 'red dead redemption \1',
  '\mcod\M', 'call of duty',
  '\mgow ?(\d*)\M', 'god of war \1',
  '\mtlou ?(\d*)\M', 'the last of us \1',
  '\mbotw\M', 'breath of the wild',
  '\mtotk\M', 'tears of the kingdom',
  '\mfifa\M', 'fc',
  '\mpes\M', 'efootball',
  '\mnfs\M', 'need for speed',
  '\mmgs ?(\d*)\M', 'metal gear solid \1',
  '\mff ?(\d*)\M', 'final fantasy \1',
  '\mkh ?(\d*)\M', 'kingdom hearts \1',
  '\mhzd\M', 'horizon zero dawn',
  '\mfh ?(\d+)\M', 'forza horizon \1',
  '\mgt ?(\d+)\M', 'gran turismo \1',
  '\mre ?(\d+)\M', 'resident evil \1',
  '\mmk ?(\d+)\M', 'mortal kombat \1',
  '\mbf ?(\d+)\M', 'battlefield \1',
  '\mow ?(\d+)\M', 'overwatch \1',
  '\mcs ?(go|2)\M', 'counter strike'];
 i integer;
begin
 for i in 1 .. array_length(rules, 1) by 2 loop
  s := regexp_replace(s, rules[i], rules[i+1], 'g');
 end loop;
 return btrim(regexp_replace(s, '\s+', ' ', 'g'));
end $f$;

-- Rakam <-> Roma rakamı (1–20). Diğer kelimeler için null.
create or replace function public.radar_num_alt(w text) returns text
 language sql immutable parallel safe set search_path = '' as $f$
 select case when w ~ '^\d{1,2}$' and w::int between 1 and 20
             then (array['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx'])[w::int]
             else (select n::text from unnest(array['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx']) with ordinality r(v, n) where r.v = w) end
$f$;

-- search_path ayarı yok: tablo kullanmayan tek ifadeli SQL fonksiyonu, böylece sorgunun içine gömülür (satır başına çağrı maliyeti olmaz).
create or replace function public.radar_search_kind(s text) returns integer
 language sql immutable parallel safe as $f$
 select case
  when s ~ '\m(soundtrack|ost|original sound|artbook|art book|wallpapers?|avatars?|demo|demosu|trial|deneme|benchmark|redkit|sdk|mod tools|dedicated server|launcher|playtest)\M' then 3
  when s ~ '\m(dlc|season pass|expansion pass|sezon bileti|genisleme|add ?ons?|eklenti|eklentisi|eklentileri|upgrade|yukseltme|yukseltmesi|costumes?|kostum|kostumu|kostumleri|skins?|outfits?|coins|points|currency|shark|kart paketi|booster|packs?|paketi|silahi|weapons?|character pass|v bucks|cash card|tokens?|credits|bonus)\M' then 2
  when s ~ '\m(bundle|collection|koleksiyon|koleksiyonu|deluxe|ultimate|premium|gold|complete|definitive|goty|game of the year|edition|surum|surumu|trilogy|anthology|birlikte)\M' or s like '% + %' then 1
  else 0 end
$f$;

create or replace function public.search_market_r(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
 SET plan_cache_mode TO 'force_custom_plan'
 SET work_mem TO '16MB'
AS $function$
declare
 m text := lower(coalesce(nullif(market,''),'all'));
 q0 text := left(trim(regexp_replace(lower(coalesce(query_text,'')),'[^a-z0-9 ]',' ','g')),120);
 q text;
 opts jsonb := coalesce(filter_options,'{}'::jsonb);
 dev text := lower(coalesce(filter_options->>'device',''));
 fx numeric := coalesce(nullif(opts->>'usdTry','')::numeric, 40);
 pref_g text[] := public.taste_list(opts->'preferGenres', false);
 pref_t text[] := public.taste_list(opts->'preferTags', true);
 per integer := greatest(1, least(page_size, 50));
 pg integer := greatest(0, least(page_number, 10000));
 ranked_on boolean;
 plain text[] := '{}';   -- strpos ile aranan kelimeler
 pats text[] := '{}';    -- kelime sınırıyla aranan kısa kelimeler ve sayılar
 qvars text[];           -- tam/başlangıç eşleşmesi için sorgunun rakamlı ve Roma rakamlı biçimleri
 qc text;                -- boşluksuz sorgu ("spider man" = "spiderman")
 tris text[];
 fz boolean := false;
 pass integer;
 w text; alt text; qa text := ''; qr text := '';
 result jsonb;
begin
 q0 := trim(regexp_replace(q0,'\s+',' ','g'));
 -- Arama kutusu boşken (vitrin, fırsatlar, süzgeçli listeler) sonuç ve hız eskisiyle birebir aynı kalsın.
 if q0 = '' then
  return public.search_market_d(market, query_text, page_number, page_size, filter_options, sort_order, deals_only);
 end if;
 q := public.radar_search_expand(q0);
 if m not in ('all','steam','xbox','switch','epic','gog') then m := 'all'; end if;
 if dev not in ('','pc','ps5','ps4','xbox_series','xbox_one','switch') then dev := ''; end if;
 ranked_on := q <> '' and sort_order in ('default','foryou');
 if q <> '' then
  foreach w in array string_to_array(q, ' ') loop
   alt := public.radar_num_alt(w);
   if alt is not null then pats := pats || ('\m(' || w || '|' || alt || ')\M');
   elsif length(w) <= 2 then pats := pats || ('\m' || w);
   else plain := plain || w; end if;
   qa := qa || ' ' || case when alt is not null and w !~ '^\d+$' then alt else w end;
   qr := qr || ' ' || case when alt is not null and w ~ '^\d+$' then alt else w end;
  end loop;
  qvars := array(select distinct x from unnest(array[q, trim(qa), trim(qr)]) x);
  qc := replace(q, ' ', '');
 end if;

 for pass in 0 .. 1 loop
  if pass = 1 then
   -- İkinci tur yalnız yazılı aramada hiç sonuç yoksa: yazım hatası toleransı (trigram benzerliği).
   exit when q = '' or length(q) < 4 or coalesce((result->>'total')::int, 0) > 0;
   fz := true;
   tris := array(select distinct t from unnest(string_to_array(q,' ')) x, lateral (select substr(' '||x||' ', i, 3) t from generate_series(1, length(x)) i) s where length(t) = 3);
  end if;
  with filtered as (
   select b.*, b.price * case when b.usd then fx else 1 end as price_try from search_keys b
   where ((m = 'all' and (b.in_all or dev <> '')) or b.platform = m)
    and (dev = '' or b.platform = any(case
      when dev = 'pc' then array['steam','epic','gog']
      when dev in ('xbox_series','xbox_one') then array['xbox']
      when dev in ('ps4','ps5') then array['playstation']
      when dev = 'switch' then array['switch'] else array[]::text[] end))
    and (dev = '' or case
          when b.platform in ('steam','epic','gog') then dev = 'pc'
          when b.platform = 'switch' then dev = 'switch'
          when b.platform = 'playstation' then dev in ('ps4','ps5') and exists (select 1 from ps_products p where p.id = b.store_id and p.edition ilike '%'||dev||'%')
          when b.platform = 'xbox' then dev in ('xbox_series','xbox_one') and exists (select 1 from store_offers so where so.platform = 'xbox' and so.store_id = b.store_id and so.devices @> array[dev])
          else false end)
    and (q = '' or case when fz
          then (exists (select 1 from unnest(tris) t where strpos(' '||b.searchable||' ', t) > 0) and public.word_similarity(q, b.searchable) >= 0.5)
               or (length(qc) >= 5 and strpos(translate(b.searchable, ' :-–—''’.&!,', ''), qc) > 0)
          else not exists (select 1 from unnest(plain) x where strpos(b.searchable, x) = 0)
           and not exists (select 1 from unnest(pats) x where b.searchable !~ x) end)
    and (not deals_only or (b.discount_percent > 0 and b.original_price > b.price))
    and (coalesce(nullif(opts->>'minScore','')::numeric,0) <= 0 or b.best_score >= (opts->>'minScore')::numeric)
    and (nullif(opts->>'maxPrice','') is null or b.price * case when b.usd then fx else 1 end <= (opts->>'maxPrice')::numeric)
    and (coalesce(opts->>'genre','') = '' or b.genres @> array[opts->>'genre'])
    and (coalesce(opts->>'developer','') = '' or b.developers @> array[opts->>'developer'])
    and (coalesce(opts->>'year','') = '' or b.release_year = (opts->>'year')::integer)
    and (coalesce(opts->>'turkish','false') <> 'true' or b.turkish is true)
    and (coalesce(opts->>'tag','') = '' or exists (select 1 from unnest(b.taste_tags) t where lower(t) = lower(opts->>'tag')))
    and (jsonb_typeof(opts->'ids') is distinct from 'array' or b.id in (select jsonb_array_elements_text(opts->'ids'))) and public.ttb_ok(b.title_key, opts->>'ttb') and public.gmode_ok(b.title_key, opts->>'gmode', opts->>'gtheme')
  ), matched as (
   select f.id, f.platform, f.grp, f.name, f.title_key, f.searchable, f.release_year, f.price_try, f.best_score, f.discount_percent, f.first_seen,
    case when sort_order = 'userScore' then public.igdb_user_rank(f.title_key) end as score_m,
    case when sort_order in ('ttbAsc','ttbDesc') then public.ttb_min(f.title_key) end as ttb_m,
    case when sort_order = 'foryou' then public.taste_score_i(f.genres, f.taste_tags, f.best_score, f.discount_percent, pref_g, pref_t) end as taste_score
   from filtered f
  ), eligible as (
   -- Tümü: aynı oyun birden çok mağazada süzgeci geçiyorsa yalnız en ucuz teklif listelenir.
   select * from (select mt.*, row_number() over (partition by case when m = 'all' then mt.grp else mt.id end
                                                  order by mt.price_try asc nulls last, mt.id) as store_rank,
                         count(*) over (partition by case when m = 'all' then mt.grp else mt.id end) as n_stores
                  from matched mt) x
   where store_rank = 1
  ), ranked as (
   -- Bilinirlik: IGDB oy sayısı, OpenCritic eleştiri sayısı ve puan. Sürüm adları ("... ultimate", "... complete") ana oyunun
   -- bilinirliğini de alır, böylece Cyberpunk 2077 Ultimate, 2077'nin hemen arkasında kalır. Arama kutusu boşken bu birleşimler
   -- hiç çalışmaz (ranked_on sabit false, plan_cache_mode = force_custom_plan).
   select e.*,
    case when not ranked_on then 0
         when exists (select 1 from unnest(qvars) v where ' '||coalesce(nullif(e.title_key,''), e.searchable) like '% '||v||'%') then 1
         else 2 end as tier,
    case when ranked_on then
      -- Tam ad eşleşmesi (baştaki "the" sayılmaz) güçlü bir artı alır ama çok daha bilinen bir seri oyununu geçemez:
      -- "witcher" → The Witcher 3, "elden ring" → ELDEN RING, "resident evil 4" → Resident Evil 4.
      case when coalesce(nullif(e.title_key,''), e.searchable) = any(qvars)
             or regexp_replace(coalesce(nullif(e.title_key,''), e.searchable), '^the ', '') = any(qvars) then 8 else 0 end
      + greatest(ln(1 + coalesce(i1.user_votes, 0)) + ln(1 + coalesce(i1.critic_votes, 0)) + ln(1 + coalesce(s1.opencritic_reviews, 0)) + coalesce(greatest(s1.metacritic, s1.opencritic), 0) / 25.0,
                 ln(1 + coalesce(i2.user_votes, 0)) + ln(1 + coalesce(i2.critic_votes, 0)) + ln(1 + coalesce(s2.opencritic_reviews, 0)) + coalesce(greatest(s2.metacritic, s2.opencritic), 0) / 25.0)
      + 0.6 * least(e.n_stores, 6)
      - (array[0, 2, 6, 10])[public.radar_search_kind(coalesce(nullif(e.title_key,''), e.searchable)) + 1]
    end as rank_score,
    case when ranked_on and fz then public.word_similarity(q, e.searchable) end as sim,
    case when ranked_on then coalesce(nullif((select min(nullif(strpos(e.searchable, v), 0)) from unnest(qvars) v), 0), 999) end as match_pos
   from eligible e
   cross join lateral (select case when ranked_on then nullif(regexp_replace(e.title_key, '\s+(the\s+)?(complete|ultimate|deluxe|premium|gold|definitive|goty|game of the year|collector s|anniversary|remastered|remaster|enhanced|director s cut)(\s.*)?$', ''), e.title_key) end as base_key) bk
   left join game_igdb_score i1 on ranked_on and i1.title_key = e.title_key
   left join game_scores s1 on ranked_on and s1.title_key = e.title_key
   left join game_igdb_score i2 on ranked_on and i2.title_key = bk.base_key
   left join game_scores s2 on ranked_on and s2.title_key = bk.base_key
  ), sorted as (
   select r.id, row_number() over (order by
    case when ranked_on then tier end asc nulls last,
    case when ranked_on then sim end desc nulls last,
    case when sort_order = 'foryou' then taste_score end desc nulls last,
    case when ranked_on then round(rank_score::numeric, 1) end desc nulls last,
    case when ranked_on then match_pos end asc nulls last,
    case when ranked_on then release_year end desc nulls last,
    case when ranked_on then length(name) end asc nulls last,
    case when sort_order in ('score','gems') then best_score end desc nulls last,
    case when sort_order = 'discount' or (sort_order = 'default' and q = '' and deals_only) then discount_percent end desc nulls last,
    case when sort_order = 'priceAsc'  then price_try end asc  nulls last,
    case when sort_order = 'priceDesc' then price_try end desc nulls last, case when sort_order = 'userScore' then score_m end desc nulls last, case when sort_order = 'ttbAsc' then ttb_m end asc nulls last, case when sort_order = 'ttbDesc' then ttb_m end desc nulls last,
    case when sort_order = 'default' and q = '' and not deals_only then first_seen end desc nulls last,
    name asc, id asc) as result_number
   from ranked r
  ), paged as (
   select s.result_number, k.id, k.platform, k.store_id, k.title_key, k.genres from sorted s join search_keys k on k.id = s.id
   where s.result_number > pg * per and s.result_number <= (pg + 1) * per
  )
  select jsonb_build_object(
   'items', coalesce((select jsonb_agg(
      case when p.platform = 'playstation' then (select to_jsonb(l) || jsonb_build_object('tags', coalesce(lm.tags,'{}'), 'categories', coalesce(lm.categories,'{}'), 'platform', 'playstation') from library l left join game_meta lm on lm.title_key = l.title_key where l.id = p.id)
      else (select jsonb_build_object('id',p.id,'platform',p.platform,'store_id',o.store_id,'title_key',o.title_key,'name',o.name,'image',o.image,'price',o.price,
        'original_price',o.original_price,'discount_percent',o.discount_percent,'currency',o.currency,'url',o.url,'edition',o.edition,'checked_at',o.checked_at,
        'first_seen',o.first_seen,'mc_score',gs.metacritic,'oc_score',gs.opencritic,'opencritic_reviews',gs.opencritic_reviews,'best_score',greatest(gs.metacritic, gs.opencritic),
        'genres',p.genres,'tags',coalesce(gm.tags,'{}') || array(select x from unnest(o.tags) x where not x = any(coalesce(gm.tags,'{}'))),
        'release_date',gm.release_date,'developers',gm.developers,'turkish',gm.turkish,'turkish_audio',gm.turkish_audio,'age',gm.age,
        'offers',public.market_offers(o.title_key,o.platform))
       from store_offers o left join game_scores gs on gs.title_key = o.title_key left join game_meta gm on gm.title_key = o.title_key
       where o.platform = p.platform and o.store_id = p.store_id) end
      order by p.result_number) from paged p), '[]'::jsonb),
   'total', (select count(*) from eligible),
   'query', q0,
   'fuzzy', fz,
   'personalized', sort_order = 'foryou' and cardinality(pref_g) + cardinality(pref_t) > 0) into result;
 end loop;
 return result;
end;
$function$;

grant execute on function public.search_market_r(text,text,integer,integer,jsonb,text,boolean) to anon, authenticated;

create or replace function public.search_market(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare ck text := 'r:'||md5(concat_ws('|',market,query_text,page_number,page_size,coalesce(filter_options,'{}'::jsonb)::text,sort_order,deals_only)); r jsonb; ts timestamptz;
begin
 -- Aynı istek 5 dakika boyunca önbellekten döner. Hesaplama zaman aşımına uğrarsa eski sonuç verilir.
 -- v45: cihaz süzgeci olmadan da search_market_r (search_market_s ile aynı sonuç kümesi, yeni arama sıralaması).
 select c.v, c.at into r, ts from search_cache c where c.k = ck;
 if found and ts > now() - interval '5 minutes' then return r; end if;
 begin
  r := public.search_market_r(market, query_text, page_number, page_size, coalesce(filter_options,'{}'::jsonb) - 'device', sort_order, deals_only);
 exception when query_canceled then
  if ts is not null then return r; end if;
  raise;
 end;
 insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
 if random() < 0.02 then delete from search_cache where at < now() - interval '24 hours'; end if;
 return r;
end $function$;

create or replace function public.search_market_v2(market text DEFAULT 'all'::text, query_text text DEFAULT ''::text, page_number integer DEFAULT 0, page_size integer DEFAULT 25, filter_options jsonb DEFAULT '{}'::jsonb, sort_order text DEFAULT 'default'::text, deals_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare ck text := 'r2:'||md5(concat_ws('|',market,query_text,page_number,page_size,coalesce(filter_options,'{}'::jsonb)::text,sort_order,deals_only)); r jsonb; ts timestamptz;
begin
 -- search_market ile aynı önbellek: 5 dakika taze; hesaplama zaman aşımına uğrarsa son sonuç verilir.
 select c.v, c.at into r, ts from search_cache c where c.k = ck;
 if found and ts > now() - interval '5 minutes' then return r; end if;
 begin
  r := public.search_market_r(market, query_text, page_number, page_size, filter_options, sort_order, deals_only);
 exception when query_canceled then
  if ts is not null then return r; end if;
  raise;
 end;
 insert into search_cache as c values (ck, r, now()) on conflict (k) do update set v = excluded.v, at = excluded.at;
 if random() < 0.02 then delete from search_cache where at < now() - interval '24 hours'; end if;
 return r;
end $function$;
