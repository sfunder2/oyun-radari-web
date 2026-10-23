-- Community data is opt-in; private journals remain on the device.
create table if not exists public.radar_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 handle text not null check(char_length(handle) between 2 and 30),avatar text not null default 'scout',created_at timestamptz not null default now()
);
create table if not exists public.radar_posts(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 game_id text not null check(char_length(game_id) between 1 and 160),game_name text not null check(char_length(game_name) between 1 and 180),
 kind text not null check(kind in('review','memory','activity')),body text not null check(char_length(body) between 1 and 6000),
 rating integer check(rating between 1 and 10),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.radar_votes(
 user_id uuid not null references auth.users(id) on delete cascade,subject_type text not null check(subject_type in('post','versus','roadmap','hype')),
 subject_id text not null check(char_length(subject_id) between 1 and 160),value integer not null,
 created_at timestamptz not null default now(),
 primary key(user_id,subject_type,subject_id),
 check((subject_type='post' and value in(-1,1)) or(subject_type='versus' and value in(1,2)) or(subject_type='roadmap' and value=1) or(subject_type='hype' and value between 1 and 5))
);
create table if not exists public.radar_tags(
 user_id uuid not null references auth.users(id) on delete cascade,game_id text not null check(char_length(game_id) between 1 and 160),
 tag text not null check(char_length(tag) between 2 and 40),kind text not null default 'theme' check(kind in('theme','emotion','style')),
 created_at timestamptz not null default now(),primary key(user_id,game_id,tag)
);
create table if not exists public.radar_follows(
 user_id uuid not null references auth.users(id) on delete cascade,follow_id uuid not null references public.radar_profiles(user_id) on delete cascade,
 primary key(user_id,follow_id),check(user_id<>follow_id)
);
create table if not exists public.radar_lists(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,title text not null check(char_length(title) between 1 and 80),
 items jsonb not null default '[]' check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=10),created_at timestamptz not null default now()
);
create index if not exists radar_posts_game_time on public.radar_posts(game_id,created_at desc);
create index if not exists radar_posts_user_time on public.radar_posts(user_id,created_at desc);
create index if not exists radar_votes_subject on public.radar_votes(subject_type,subject_id);
create index if not exists radar_tags_game on public.radar_tags(game_id);
create index if not exists radar_follows_reverse on public.radar_follows(follow_id);
alter table public.radar_profiles enable row level security;
alter table public.radar_posts enable row level security;
alter table public.radar_votes enable row level security;
alter table public.radar_tags enable row level security;
alter table public.radar_follows enable row level security;
alter table public.radar_lists enable row level security;
grant select on public.radar_profiles,public.radar_posts,public.radar_votes,public.radar_tags,public.radar_lists to anon,authenticated;
grant select,insert,update,delete on public.radar_profiles,public.radar_posts,public.radar_votes,public.radar_tags,public.radar_follows,public.radar_lists to authenticated;
grant all on public.radar_profiles,public.radar_posts,public.radar_votes,public.radar_tags,public.radar_follows,public.radar_lists to service_role;
create policy profiles_read on public.radar_profiles for select using(true);
create policy profiles_insert on public.radar_profiles for insert to authenticated with check((select auth.uid())=user_id);
create policy profiles_update on public.radar_profiles for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy profiles_delete on public.radar_profiles for delete to authenticated using((select auth.uid())=user_id);
create policy posts_read on public.radar_posts for select using(true);
create policy posts_insert on public.radar_posts for insert to authenticated with check((select auth.uid())=user_id);
create policy posts_update on public.radar_posts for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy posts_delete on public.radar_posts for delete to authenticated using((select auth.uid())=user_id);
create policy votes_read on public.radar_votes for select using(true);
create policy votes_insert on public.radar_votes for insert to authenticated with check((select auth.uid())=user_id);
create policy votes_update on public.radar_votes for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy votes_delete on public.radar_votes for delete to authenticated using((select auth.uid())=user_id);
create policy tags_read on public.radar_tags for select using(true);
create policy tags_insert on public.radar_tags for insert to authenticated with check((select auth.uid())=user_id);
create policy tags_update on public.radar_tags for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy tags_delete on public.radar_tags for delete to authenticated using((select auth.uid())=user_id);
create policy follows_own_read on public.radar_follows for select to authenticated using((select auth.uid())=user_id);
create policy follows_own_insert on public.radar_follows for insert to authenticated with check((select auth.uid())=user_id);
create policy follows_own_delete on public.radar_follows for delete to authenticated using((select auth.uid())=user_id);
create policy lists_read on public.radar_lists for select using(true);
create policy lists_insert on public.radar_lists for insert to authenticated with check((select auth.uid())=user_id);
create policy lists_update on public.radar_lists for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy lists_delete on public.radar_lists for delete to authenticated using((select auth.uid())=user_id);

alter table public.game_meta add column if not exists summary text;
alter table public.game_meta add column if not exists description text;
alter table public.game_meta add column if not exists screenshots jsonb not null default '[]';
alter table public.game_meta add column if not exists categories text[] not null default '{}';
alter table public.game_meta add column if not exists tags text[] not null default '{}';

create unique index if not exists radar_favorite_shares on public.radar_posts(user_id,game_id) where kind='activity' and body='favorite';
