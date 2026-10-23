-- Entire verification is rolled back; no test user or public content is retained.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();post uuid;blocked boolean:=false;
begin
 insert into auth.users(id,email) values(a,'rls-a-'||a||'@example.invalid'),(b,'rls-b-'||b||'@example.invalid');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 set local role authenticated;
 insert into public.radar_profiles(user_id,handle) values(a,'Policy Test');
 begin insert into public.radar_profiles(user_id,handle) values(b,'Not allowed');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Cross-user insert was permitted';end if;
 insert into public.radar_posts(user_id,game_id,game_name,kind,body) values(a,'rls-test','Policy Test','review','Transaction-only test') returning id into post;
 blocked:=false;
 begin update public.radar_posts set user_id=b where id=post;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Ownership reassignment was permitted';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.radar_follows where user_id=a) then raise exception 'Private follow records leaked';end if;
 update public.radar_posts set body='forbidden' where id=post;
 if exists(select 1 from public.radar_posts where id=post and body='forbidden') then raise exception 'Cross-user update was permitted';end if;
 set local role anon;
 blocked:=false;
 begin insert into public.radar_posts(user_id,game_id,game_name,kind,body) values(a,'bad','bad','review','not allowed');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous write was permitted';end if;
 reset role;
end $$;
rollback;
