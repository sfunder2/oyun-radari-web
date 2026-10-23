-- Supabase v13: hesaba bağlı kişisel veri senkronu (favoriler, oyuncu alanı, günlük).
-- Satırı yalnız sahibi okuyup yazabilir; anonim anahtar ve diğer kullanıcılar erişemez.
-- SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak güvenlidir.
create table if not exists public.radar_user_data(
 user_id uuid primary key references auth.users(id) on delete cascade,
 favorites jsonb not null default '[]' check(jsonb_typeof(favorites)='array' and jsonb_array_length(favorites)<=2000),
 experience jsonb not null default '{}' check(jsonb_typeof(experience)='object'),
 updated_at timestamptz not null default now(),
 check(pg_column_size(favorites)+pg_column_size(experience)<4000000)
);
create or replace function public.radar_user_data_touch() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at:=clock_timestamp();return new;end $$;
drop trigger if exists radar_user_data_touch on public.radar_user_data;
create trigger radar_user_data_touch before insert or update on public.radar_user_data for each row execute function public.radar_user_data_touch();
alter table public.radar_user_data enable row level security;
revoke all on public.radar_user_data from anon;
grant select,insert,update,delete on public.radar_user_data to authenticated;
drop policy if exists radar_user_data_select on public.radar_user_data;
drop policy if exists radar_user_data_insert on public.radar_user_data;
drop policy if exists radar_user_data_update on public.radar_user_data;
drop policy if exists radar_user_data_delete on public.radar_user_data;
create policy radar_user_data_select on public.radar_user_data for select to authenticated using((select auth.uid())=user_id);
create policy radar_user_data_insert on public.radar_user_data for insert to authenticated with check((select auth.uid())=user_id);
create policy radar_user_data_update on public.radar_user_data for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy radar_user_data_delete on public.radar_user_data for delete to authenticated using((select auth.uid())=user_id);
