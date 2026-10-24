-- Entire verification is rolled back; no test user or data is retained.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();blocked boolean:=false;
begin
 insert into auth.users(id,email) values(a,'link-a-'||a||'@example.invalid'),(b,'link-b-'||b||'@example.invalid');
 insert into public.linked_accounts(user_id,platform,external_id) values(a,'steam','76561197960287930');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 set local role authenticated;
 if not exists(select 1 from public.linked_accounts where user_id=a) then raise exception 'Owner cannot read own link';end if;
 begin insert into public.linked_accounts(user_id,platform,external_id) values(a,'steam','76561197960287931');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Client insert was permitted';end if;
 blocked:=false;
 begin update public.linked_accounts set external_id='76561197960287931' where user_id=a;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Client update was permitted';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.linked_accounts where user_id=a) then raise exception 'Link leaked to another user';end if;
 delete from public.linked_accounts where user_id=a;
 set local role anon;
 blocked:=false;
 begin perform 1 from public.linked_accounts;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous read was permitted';end if;
 reset role;
 if not exists(select 1 from public.linked_accounts where user_id=a) then raise exception 'Cross-user delete was permitted';end if;
end $$;
rollback;
