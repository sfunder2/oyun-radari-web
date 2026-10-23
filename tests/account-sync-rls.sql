-- Entire verification is rolled back; no test user or data is retained.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();blocked boolean:=false;
begin
 insert into auth.users(id,email) values(a,'sync-a-'||a||'@example.invalid'),(b,'sync-b-'||b||'@example.invalid');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 set local role authenticated;
 insert into public.radar_user_data(user_id,favorites,experience) values(a,'[]','{"xp":5}');
 begin insert into public.radar_user_data(user_id) values(b);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Cross-user insert was permitted';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.radar_user_data where user_id=a) then raise exception 'Private sync data leaked';end if;
 update public.radar_user_data set experience='{}' where user_id=a;
 set local role anon;
 blocked:=false;
 begin perform 1 from public.radar_user_data;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous read was permitted';end if;
 reset role;
 if (select experience->>'xp' from public.radar_user_data where user_id=a)<>'5' then raise exception 'Cross-user update was permitted';end if;
end $$;
rollback;
