-- v26: yalnız paketle satılan oyunlar (ör. GTA San Andreas – The Definitive Edition yalnız "The Trilogy" paketinde satılır).
-- Neden: bu oyunların kendi adıyla Xbox, PlayStation ve Switch teklifi yok; mağazalar yalnız paketi satar. Epic de
-- tek başına satılmayan ürünün fiyatını 0 döndürür, site bunu "Ücretsiz" gösteriyordu. Puanlar da yalnız paket için var.
-- bundle_parts elle yönetilir: part_key oyunun, bundle_key paketin title_key değeridir (scripts/titles.mjs titleKey).
-- Listeye yalnız hiçbir mağazada tek başına satılmayan oyunlar eklenir; site bu oyunların 0 fiyatını "Yalnız paketle" gösterir.
-- SQL Editor'de bir kez çalıştırın. Canlı arama fonksiyonlarına dokunulmaz.

create table if not exists public.bundle_parts (
 part_key   text primary key,
 bundle_key text not null,
 note       text
);
alter table public.bundle_parts enable row level security;
drop policy if exists "herkese okuma" on public.bundle_parts;
create policy "herkese okuma" on public.bundle_parts for select using (true);
grant select on public.bundle_parts to anon, authenticated;

insert into public.bundle_parts (part_key, bundle_key, note) values
 ('grand theft auto iii the definitive',         'grand theft auto the trilogy the definitive', 'Yalnız The Trilogy paketinde satılır'),
 ('grand theft auto vice city the definitive',   'grand theft auto the trilogy the definitive', 'Yalnız The Trilogy paketinde satılır'),
 ('grand theft auto san andreas the definitive', 'grand theft auto the trilogy the definitive', 'Yalnız The Trilogy paketinde satılır')
on conflict (part_key) do update set bundle_key = excluded.bundle_key, note = excluded.note;

-- Oyun paket parçasıysa paketin adı, tüm mağazalardaki teklifleri (market_offers, PlayStation dahil) ve puanları; değilse null.
create or replace function public.title_bundle(tk text) returns jsonb
language sql stable security invoker set search_path = public as $$
 select jsonb_build_object(
  'key', b.bundle_key,
  'name', coalesce((select o.name from store_offers o where o.title_key = b.bundle_key order by o.platform limit 1),
                   (select p.name from ps_products p where p.title_key = b.bundle_key limit 1)),
  'offers', public.market_offers(b.bundle_key, ''),
  'scores', (select jsonb_build_object('metacritic', s.metacritic, 'metacritic_url', s.metacritic_url, 'opencritic', s.opencritic,
                                       'opencritic_reviews', s.opencritic_reviews, 'opencritic_url', s.opencritic_url)
             from game_scores s where s.title_key = b.bundle_key))
 from bundle_parts b where b.part_key = tk;
$$;
grant execute on function public.title_bundle(text) to anon, authenticated;
