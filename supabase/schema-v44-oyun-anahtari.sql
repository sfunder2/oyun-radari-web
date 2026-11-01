-- Şema v44: aynı oyunun platform ve sürüm kayıtlarını tek oyunda birleştirir.
-- Sorun: başlık anahtarı (title_key) yalnız "PS4/PS5" etiketini atıyordu. "Grand Theft Auto V (Xbox One & Xbox Series X|S)",
-- "Grand Theft Auto V Enhanced (PC)", "Grand Theft Auto Online (PlayStation®5)" gibi adlar ayrı anahtar alıyor, aramada ayrı oyun
-- olarak çıkıyor ve ayrıntıda diğer mağazalar görünmüyordu. Ayrıca aynı oyunun PS4 ve PS5 ürünleri "Tümü" aramasında iki ayrı sonuçtu.
--
-- Bu dosya:
--  1. public.radar_title_key(name): scripts/titles.mjs ile aynı kurallar (node scripts/title-key-sql.mjs üretir; test eşitliği denetler).
--  2. store_offers, ps_products ve upcoming_games'e anahtarı adından hesaplayan BEFORE tetikleyicisi. Eski sürüm bir toplayıcı
--     eski anahtarı yazsa bile satır doğru anahtarla kaydolur. Yönetici eşleştirmesi (radar_ops.keep_match) sonra çalışır ve üstün gelir.
--  3. Mevcut satırların anahtarlarını yeniler; her değişiklik public.title_key_rekey_log'a yazılır (geri alma bunu kullanır).
--  4. Zenginleştirme satırlarını (game_meta, game_scores, ...) eski anahtardan yeni anahtara taşır, yalnız yeni anahtarda satır yoksa
--     ve eski anahtarı artık hiçbir katalog satırı kullanmıyorsa. Hiçbir satır silinmez.
--  5. Arama tablosunda PlayStation ürünleri de başlık anahtarıyla gruplanır: aynı oyunun PS4/PS5 ürünleri "Tümü"nde tek sonuç olur
--     (en ucuzu gösterilir). Yalnız bir mağaza seçildiğinde her ürün ayrı kalır.
--
-- Ölçüm (1 Kasım 2026): 1.853 mağaza + 49 PlayStation ürününün anahtarı değişir, 450 oyun platformlar arası birleşir,
-- arama grup sayısı 39.304'ten 37.759'a iner; ayrıca 2.034 oyunun PS4/PS5 ürünleri tek sonuçta toplanır.
-- Geri almak için: supabase/schema-v44-oyun-anahtari-geri-al.sql

create or replace function public.radar_title_key(name text) returns text
 language sql immutable parallel safe set search_path = '' as $f$
 select regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(replace(lower(regexp_replace(normalize(btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(name,''), '[™®©]', '', 'g'), '[(\[]\s*(?:(?:for\s+)?(?:(?:ps\s?[45](?:\s?pro)?|playstation\s?[45]|xbox\s+series\s+(?:x\s*[|/]\s*s|s\s*[|/]\s*x|x|s)|xbox\s+series|xbox\s+one(?:\s+x)?|xbox\s+xsx|xbox|windows(?:\s+(?:10|11|pc))?|win|pc|nintendo\s+switch(?:\s*2)?)|switch)(?:\s*(?:&|/|\+|,|\||\yve\y|\yand\y|\yund\y|\yile\y)\s*(?:(?:ps\s?[45](?:\s?pro)?|playstation\s?[45]|xbox\s+series\s+(?:x\s*[|/]\s*s|s\s*[|/]\s*x|x|s)|xbox\s+series|xbox\s+one(?:\s+x)?|xbox\s+xsx|xbox|windows(?:\s+(?:10|11|pc))?|win|pc|nintendo\s+switch(?:\s*2)?)|switch))*(?:\s+(?:edition|version|surumu|sürümü|only))?|game\s+preview|oyun\s+(?:o|ö)n\s+[iİ]zleme|early\s+access)\s*[)\]]', ' ', 'gi'), '\s*(?:[-–—:]\s*|\s+(?=for\s))(?:for\s+)?(?:ps\s?[45](?:\s?pro)?|playstation\s?[45]|xbox\s+series\s+(?:x\s*[|/]\s*s|s\s*[|/]\s*x|x|s)|xbox\s+series|xbox\s+one(?:\s+x)?|xbox\s+xsx|xbox|windows(?:\s+(?:10|11|pc))?|win|pc|nintendo\s+switch(?:\s*2)?)(?:\s*(?:&|/|\+|,|\||\yve\y|\yand\y|\yund\y|\yile\y)\s*(?:ps\s?[45](?:\s?pro)?|playstation\s?[45]|xbox\s+series\s+(?:x\s*[|/]\s*s|s\s*[|/]\s*x|x|s)|xbox\s+series|xbox\s+one(?:\s+x)?|xbox\s+xsx|xbox|windows(?:\s+(?:10|11|pc))?|win|pc|nintendo\s+switch(?:\s*2)?))*(?:\s+(?:edition|version|surumu|sürümü|only))?\s*$', '', 'i'), '\s+(?:for\s+)?(?:ps\s?[45]|playstation\s?[45]|xbox\s+series\s+(?:x\s*[|/]\s*s|s\s*[|/]\s*x|x|s)|xbox\s+one)(?:\s*(?:&|/|\+|,|\||\yve\y|\yand\y|\yund\y|\yile\y)\s*(?:ps\s?[45]|playstation\s?[45]|xbox\s+series\s+(?:x\s*[|/]\s*s|s\s*[|/]\s*x|x|s)|xbox\s+one))*(?:\s+(?:edition|version|surumu|sürümü|only))?\s*$', '', 'i'), '\s*(?:[-–—:]\s*|\s+(?=for\s))(?:for\s+)?(?:ps\s?[45](?:\s?pro)?|playstation\s?[45]|xbox\s+series\s+(?:x\s*[|/]\s*s|s\s*[|/]\s*x|x|s)|xbox\s+series|xbox\s+one(?:\s+x)?|xbox\s+xsx|xbox|windows(?:\s+(?:10|11|pc))?|win|pc|nintendo\s+switch(?:\s*2)?)(?:\s*(?:&|/|\+|,|\||\yve\y|\yand\y|\yund\y|\yile\y)\s*(?:ps\s?[45](?:\s?pro)?|playstation\s?[45]|xbox\s+series\s+(?:x\s*[|/]\s*s|s\s*[|/]\s*x|x|s)|xbox\s+series|xbox\s+one(?:\s+x)?|xbox\s+xsx|xbox|windows(?:\s+(?:10|11|pc))?|win|pc|nintendo\s+switch(?:\s*2)?))*(?:\s+(?:edition|version|surumu|sürümü|only))?\s*$', '', 'i'), '\(?\s*PS\s?[45]\s*(?:ve|and|und|&|/|\+|,)?\s*(?:PS\s?[45])?\s*\)?', ' ', 'gi'), '\s+', ' ', 'gi'), '[\s\-–—:]+$', '', 'i')), NFKD), '[\u0300-\u036f]', '', 'g')), 'ı', 'i'), '[^a-z0-9]+', ' ', 'gi'), '\y(?:standard|standart|edition|surum|digital|dijital)\y', ' ', 'gi'), '\s+', ' ', 'gi'), '^\s+|\s+$', '', 'gi'), '^(.+\S) enhanced$', '\1', 'i')
$f$;

create or replace function public.radar_set_title_key() returns trigger
 language plpgsql set search_path = '' as $f$
begin
 if new.name is not null then new.title_key := public.radar_title_key(new.name); end if;
 return new;
end $f$;
-- "a_0_" öneki: tetikleyiciler ada göre sıralı çalışır; yönetici eşleştirmesi (a_admin_keep_match) bundan sonra gelir.
drop trigger if exists a_0_title_key on public.store_offers;
create trigger a_0_title_key before insert or update of name, title_key on public.store_offers
 for each row execute function public.radar_set_title_key();
drop trigger if exists a_0_title_key on public.ps_products;
create trigger a_0_title_key before insert or update of name, title_key on public.ps_products
 for each row execute function public.radar_set_title_key();
drop trigger if exists a_0_title_key on public.upcoming_games;
create trigger a_0_title_key before insert or update of name, title_key on public.upcoming_games
 for each row execute function public.radar_set_title_key();

create table if not exists public.title_key_rekey_log (
 src text not null,
 id text not null,
 old_key text,
 new_key text not null,
 at timestamptz not null default now()
);
alter table public.title_key_rekey_log enable row level security;
revoke all on public.title_key_rekey_log from public, anon, authenticated;

begin;
set local statement_timeout = '300s';
create temp table _rk on commit drop as
 select 'store_offers'::text src, o.platform||':'||o.store_id id, o.title_key old_key, public.radar_title_key(o.name) new_key
   from public.store_offers o
  where o.name is not null
    and not exists (select 1 from radar_ops.match_overrides m where m.platform = o.platform and m.store_id = o.store_id)
 union all
 select 'ps_products', p.id, p.title_key, public.radar_title_key(p.name)
   from public.ps_products p
  where p.name is not null
    and not exists (select 1 from radar_ops.match_overrides m where m.platform = 'playstation' and m.store_id = p.id)
 union all
 select 'upcoming_games', u.id::text, u.title_key, public.radar_title_key(u.name)
   from public.upcoming_games u where u.name is not null;
delete from _rk where old_key is not distinct from new_key;
insert into public.title_key_rekey_log (src, id, old_key, new_key) select src, id, old_key, new_key from _rk;

update public.store_offers o set title_key = r.new_key from _rk r
 where r.src = 'store_offers' and o.platform = split_part(r.id, ':', 1) and o.store_id = substr(r.id, strpos(r.id, ':') + 1);
update public.ps_products p set title_key = r.new_key from _rk r where r.src = 'ps_products' and p.id = r.id;
update public.upcoming_games u set title_key = r.new_key from _rk r where r.src = 'upcoming_games' and u.id::text = r.id;

do $d$
declare t text; n integer;
begin
 foreach t in array array['game_meta','game_scores','game_ttb','game_igdb_score','game_igdb_info','game_modes','game_similar','game_family'] loop
  if to_regclass('public.'||t) is null then continue; end if;
  execute format($q$
   with pairs as (
    select distinct on (r.new_key) r.old_key, r.new_key from _rk r
     where coalesce(r.old_key,'') <> '' and r.new_key <> ''
       and exists (select 1 from public.%1$I x where x.title_key = r.old_key)
       and not exists (select 1 from public.%1$I x where x.title_key = r.new_key)
       and not exists (select 1 from public.store_offers o where o.title_key = r.old_key)
       and not exists (select 1 from public.ps_products p where p.title_key = r.old_key)
       and not exists (select 1 from public.upcoming_games u where u.title_key = r.old_key)
     order by r.new_key, r.old_key)
   update public.%1$I x set title_key = pairs.new_key from pairs where x.title_key = pairs.old_key$q$, t);
  get diagnostics n = row_count;
  raise notice '%: % satır yeni anahtara taşındı', t, n;
 end loop;
end $d$;

-- PlayStation ürünlerinin arama grubu: ürün kimliği yerine başlık anahtarı (boşsa ürün kimliği).
do $d$
declare f text; def text; patched text;
begin
 foreach f in array array['public.rebuild_search_keys()','public.refresh_search_keys()'] loop
  def := pg_get_functiondef(f::regprocedure);
  patched := replace(def, $s$select p.id, 'playstation', p.id, true, p.id, p.title_key,$s$,
                          $s$select p.id, 'playstation', p.id, true, coalesce(nullif(p.title_key,''), p.id), p.title_key,$s$);
  if patched = def and position($s$coalesce(nullif(p.title_key,''), p.id)$s$ in def) = 0 then
   raise exception '% beklenen biçimde değil; arama grubu güncellenemedi', f;
  end if;
  if patched <> def then execute patched; end if;
 end loop;
end $d$;
commit;

-- Arama tablosunu yeni anahtarlarla tazele ve eski sonuçları önbellekten at.
set statement_timeout = '180s';
select public.refresh_search_keys();
delete from public.search_cache;
