-- Sprint 07: manual multi-platform game library foundation.
-- No Steam credentials, tokens or scraped account data are stored.
create table if not exists public.user_game_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('steam','playstation','xbox','switch','epic','gog','other')),
  game_id text not null check (length(game_id) between 1 and 120),
  game_title text not null check (length(game_title) between 1 and 240),
  play_status text not null default 'backlog' check (play_status in ('backlog','playing','completed','paused','dropped')),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, platform, game_id)
);
create index if not exists user_game_library_user_status_idx
  on public.user_game_library (user_id, play_status, updated_at desc);
alter table public.user_game_library enable row level security;
revoke all on public.user_game_library from anon;
grant select,insert,update,delete on public.user_game_library to authenticated;
drop policy if exists library_select_own on public.user_game_library;
create policy library_select_own on public.user_game_library
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists library_insert_own on public.user_game_library;
create policy library_insert_own on public.user_game_library
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists library_update_own on public.user_game_library;
create policy library_update_own on public.user_game_library
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists library_delete_own on public.user_game_library;
create policy library_delete_own on public.user_game_library
  for delete to authenticated using (user_id = (select auth.uid()));
-- Client supplies updated_at until a vetted update trigger is introduced.
