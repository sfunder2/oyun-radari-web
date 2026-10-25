-- Run after supabase/sprint-07-library.sql in a staging Supabase database.
-- Transaction rolls back created users and records, even on success.
begin;
do $$
declare
 a uuid := gen_random_uuid();
 b uuid := gen_random_uuid();
 n integer;
begin
 insert into auth.users(id,email) values
 (a,'game-lib-a-'||a||'@example.invalid'),
 (b,'game-lib-b-'||b||'@example.invalid');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.user_game_library(user_id,platform,game_id,game_title)
 values (a,'steam','620','Portal 2');
 select count(*) into n from public.user_game_library;
 if n<>1 then raise exception 'Owner cannot read the inserted game'; end if;
 update public.user_game_library set play_status='completed' where user_id=a and game_id='620';
 if not exists(select 1 from public.user_game_library where user_id=a and play_status='completed')
 then raise exception 'Owner cannot update their game'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.user_game_library where user_id=a)
 then raise exception 'Cross-user game read permitted'; end if;
 update public.user_game_library set play_status='dropped' where user_id=a;
 delete from public.user_game_library where user_id=a;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 if not exists(select 1 from public.user_game_library where user_id=a and play_status='completed')
 then raise exception 'Cross-user mutation permitted'; end if;
 execute 'set local role anon';
 begin
  perform 1 from public.user_game_library;
  raise exception 'Anonymous read permitted';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
