-- Supabase v17 (takvim): çıkış takvimi dört mağazayı kapsar (Steam, PlayStation, Xbox, Switch).
-- SQL Editor'de bir kez çalıştırın (önce v15). Tekrar çalıştırmak güvenlidir.
-- Her mağaza satırı ayrı tutulur (id: Steam appid | ps:… | xbox:… | switch:…); takvim aynı oyunu title_key ile birleştirir.
alter table public.upcoming_games
 add column if not exists platform text not null default 'steam',
 add column if not exists title_key text;
create index if not exists upcoming_games_title_key on public.upcoming_games(title_key);
-- Toplayıcının takvim yenilemesini bir sonraki turda (5 dk içinde) hemen tetikler.
delete from public.ps_state where key='upcoming';
