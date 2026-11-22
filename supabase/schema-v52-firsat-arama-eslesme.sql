-- Şema v52: Fırsatlar sayfasındaki aramanın, normal aramayla aynı eşleşme kurallarını kullanması.
-- Sorun: "Son başlayan indirimler" sıralaması catalog_recent_deals'ten geçiyor ve yalnız "her sözcük adın içinde geçsin" kuralını
-- uyguluyordu. Normal arama (search_market_r, v45) ise 2 harfli sözcükleri, rakam/Roma rakamı eşdeğerini (2 = ii),
-- boşluksuz yazımı (spiderman), kesme işaretini (marvels) ve yazım hatasını da buluyor. Bu yüzden normal aramada indirimde görünen
-- oyun Fırsatlar'da çıkmıyordu.
-- Çözüm: eşleşme ortak bir yardımcı fonksiyona (radar_text_match) alınır; catalog_recent_deals strict eşleşmede sonuç yoksa
-- aynı yazım hatası toleranslı ikinci turu çalıştırır. Hiçbir tablo/satır değişmez.
-- ÖNCE YEDEK: asıl fonksiyon tanımı public.function_backups tablosuna yazılır. Geri almak için: schema-v52-firsat-arama-eslesme-geri-al.sql
create table if not exists public.function_backups (name text, saved_at timestamptz default now(), def text);
alter table public.function_backups enable row level security;
insert into public.function_backups(name, def)
select 'catalog_recent_deals@v52', pg_get_functiondef('public.catalog_recent_deals'::regproc)
where to_regproc('public.catalog_recent_deals') is not null
  and not exists (select 1 from public.function_backups where name = 'catalog_recent_deals@v52');

create or replace function public.radar_text_match(searchable text, q text, fuzzy boolean default false)
returns boolean language plpgsql immutable set search_path to 'public','extensions' as $f$
declare w text; alt text; qc text := replace(q, ' ', ''); tris text[];
begin
 if coalesce(q,'') = '' then return true; end if;
 if fuzzy then
  tris := array(select distinct t from unnest(string_to_array(q,' ')) x, lateral (select substr(' '||x||' ', i, 3) t from generate_series(1, length(x)) i) s where length(t) = 3);
  return (exists (select 1 from unnest(tris) t where strpos(' '||searchable||' ', t) > 0) and public.word_similarity(q, searchable) >= 0.5)
      or (length(qc) >= 5 and strpos(translate(searchable, ' :-–—''’.&!,', ''), qc) > 0);
 end if;
 foreach w in array string_to_array(q, ' ') loop
  continue when w = '';
  alt := public.radar_num_alt(w);
  if alt is not null then
   if searchable !~ ('\m(' || w || '|' || alt || ')\M') then return false; end if;
  elsif length(w) <= 2 then
   if searchable !~ ('\m' || w) then return false; end if;
  elsif strpos(searchable, w) = 0 then return false;
  end if;
 end loop;
 return true;
end $f$;

do $do$
declare def text; nd text;
begin
 def := pg_get_functiondef('public.catalog_recent_deals'::regproc);
 nd := replace(def, ' answer jsonb;', ' answer jsonb;
 fz boolean:=coalesce(opts->>''_fuzzy'','''')=''1'';');
 nd := replace(nd, 'and (q='''' or not exists(select 1 from unnest(string_to_array(q,'' '')) w where w<>'''' and strpos(k.searchable,w)=0))',
                   'and public.radar_text_match(k.searchable,q,fz)');
 nd := replace(nd, ' return answer;
end $function$', ' if not fz and length(q)>=4 and (answer->>''total'')::int=0 then
  return public.catalog_recent_deals(market,query_text,page_number,page_size,opts||''{"_fuzzy":"1"}'');
 end if;
 return answer;
end $function$');
 if nd = def or position('radar_text_match' in nd) = 0 or position('_fuzzy":"1"' in nd) = 0 or position(' fz boolean' in nd) = 0 then
  raise exception 'catalog_recent_deals beklenen biçimde değil; v52 uygulanmadı (yedek function_backups içinde)';
 end if;
 execute nd;
end$do$;

-- 2) "Tüm marketler" + yalnız indirimliler: aynı oyunun PlayStation kaydı varsa diğer mağaza satırları (in_all=false) listeye
-- kendi başına girmiyor, yalnız PS kaydının "offers" alanına katlanıyordu. PS'te indirim yokken Xbox'ta indirim varsa,
-- süzgeç PS satırına bakıp oyunu eliyordu (ör. The Blood of Dawnwalker, Kasım 2026). Artık indirimli PS karşılığı yoksa
-- indirimli diğer mağaza satırı kendisi listelenir. PS de indirimdeyse davranış aynı kalır (tek satır, teklifler içinde).
insert into public.function_backups(name, def)
select 'search_market_r@v52', pg_get_functiondef('public.search_market_r'::regproc)
where not exists (select 1 from public.function_backups where name = 'search_market_r@v52');
do $do$
declare def text; nd text;
begin
 def := pg_get_functiondef('public.search_market_r'::regproc);
 nd := replace(def, 'where ((m = ''all'' and (b.in_all or dev <> '''')) or b.platform = m)',
   'where ((m = ''all'' and (b.in_all or dev <> '''' or (deals_only and b.discount_percent > 0 and b.original_price > b.price
          and not exists (select 1 from search_keys ps where ps.platform = ''playstation'' and ps.title_key = b.title_key
                          and ps.discount_percent > 0 and ps.original_price > ps.price)))) or b.platform = m)');
 if nd = def then raise exception 'search_market_r beklenen biçimde değil; v52 (2) uygulanmadı'; end if;
 execute nd;
end$do$;

-- Önbellek (son indirimler 1 dk, metin araması 5 dk) eski sonuçları kendiliğinden bırakır; beklemek istemezseniz: delete from public.search_cache;
