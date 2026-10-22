-- Supabase şeması v7: sinematik hero görseli ve oyuna özel vurgu rengi. SQL Editor'de bir kez çalıştırın (önce v3-v6).
alter table ps_products add column if not exists hero_url     text;
alter table ps_products add column if not exists accent_color text;

drop view if exists library;
create view library with (security_invoker = true) as
select p.*,
       coalesce((select jsonb_agg(to_jsonb(o) - 'title_key') from store_offers o where o.title_key = p.title_key), '[]'::jsonb) as offers,
       (select to_jsonb(s) - 'title_key' from game_scores s where s.title_key = p.title_key) as scores,
       gs.metacritic as mc_score,
       gs.opencritic as oc_score,
       greatest(gs.metacritic, gs.opencritic) as best_score,
       gm.genres, gm.release_date, gm.developers, gm.publishers,
       gm.turkish, gm.turkish_audio, gm.age, gm.age_notes,
       gm.steam_appid, gm.requirements, gm.dlc_count, gm.news
from ps_products p
left join game_scores gs on gs.title_key = p.title_key
left join game_meta   gm on gm.title_key = p.title_key;
grant select on library to anon, authenticated;
