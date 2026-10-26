-- Run against an isolated staging database with sprint-07 schema installed.
-- Simulate JWT identity under authenticated DB role; all changes rolled back.
begin;
create temporary table tmp_library_rls_assertions(result jsonb);
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
 owner_count integer; other_count integer; preserved integer;
begin
 insert into auth.users(id,email) values
 (a,'library-test-a-'||a||'@example.invalid'),
 (b,'library-test-b-'||b||'@example.invalid');
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 insert into public.user_game_library(user_id,platform,game_id,game_title)
 values(a,'steam','620','Portal 2');
 select count(*) into owner_count from public.user_game_library where user_id=a;
 if owner_count<>1 then raise exception 'Owner read denied';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 select count(*) into other_count from public.user_game_library where user_id=a;
 if other_count<>0 then raise exception 'Cross-user read succeeded';end if;
 update public.user_game_library set play_status='completed' where user_id=a;
 delete from public.user_game_library where user_id=a;
 perform set_config('request.jwt.claim.sub',a::text,true);
 select count(*) into preserved from public.user_game_library
 where user_id=a and play_status='backlog';
 if preserved<>1 then raise exception 'Cross-user mutation succeeded';end if;
 execute 'reset role';
 insert into tmp_library_rls_assertions values(jsonb_build_object(
  'owner_read',owner_count,'cross_user_read',other_count,'record_preserved',preserved));
end $$;
select result from tmp_library_rls_assertions;
rollback;
