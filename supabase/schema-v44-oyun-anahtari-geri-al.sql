-- schema-v44-oyun-anahtari.sql'i geri alır.
-- Tetikleyicileri kaldırır, PlayStation arama grubunu ürün kimliğine döndürür ve title_key_rekey_log'daki eski anahtarları geri yazar.
-- Zenginleştirme tablolarında yeni anahtara taşınan satırlar yerinde kalır (toplayıcılar eski anahtar için yeniden doldurur).
-- Not: scripts/titles.mjs de geri alınmazsa toplayıcılar yeni anahtarları yazmaya devam eder.

drop trigger if exists a_0_title_key on public.store_offers;
drop trigger if exists a_0_title_key on public.ps_products;
drop trigger if exists a_0_title_key on public.upcoming_games;
drop function if exists public.radar_set_title_key();

begin;
set local statement_timeout = '300s';
create temp table _back on commit drop as
 select distinct on (src, id) src, id, old_key from public.title_key_rekey_log order by src, id, at asc;
update public.store_offers o set title_key = b.old_key from _back b
 where b.src = 'store_offers' and o.platform = split_part(b.id, ':', 1) and o.store_id = substr(b.id, strpos(b.id, ':') + 1);
update public.ps_products p set title_key = b.old_key from _back b where b.src = 'ps_products' and p.id = b.id;
update public.upcoming_games u set title_key = b.old_key from _back b where b.src = 'upcoming_games' and u.id::text = b.id;

do $d$
declare f text; def text; patched text;
begin
 foreach f in array array['public.rebuild_search_keys()','public.refresh_search_keys()'] loop
  def := pg_get_functiondef(f::regprocedure);
  patched := replace(def, $s$select p.id, 'playstation', p.id, true, coalesce(nullif(p.title_key,''), p.id), p.title_key,$s$,
                          $s$select p.id, 'playstation', p.id, true, p.id, p.title_key,$s$);
  if patched <> def then execute patched; end if;
 end loop;
end $d$;
commit;

drop function if exists public.radar_title_key(text);
set statement_timeout = '180s';
select public.refresh_search_keys();
delete from public.search_cache;
-- Günlük tablosu bilerek bırakılır; gerekmiyorsa: drop table public.title_key_rekey_log;
