-- Fırsat merkezi tercihleri: sahiplik, e-posta sabitleme ve gönderim kaydı koruması. Her şey geri alınır.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();blocked boolean:=false;em text;
begin
 insert into auth.users(id,email) values(a,'digest-a-'||a||'@example.invalid'),(b,'digest-b-'||b||'@example.invalid');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 set local role authenticated;
 insert into public.radar_digest(user_id,email,weekly,last_digest_at,pushed) values(a,'victim@example.com',true,now(),'["x"]');
 select email into em from public.radar_digest where user_id=a;
 if em<>'digest-a-'||a||'@example.invalid' then raise exception 'Client chose the email address: %',em;end if;
 if (select last_digest_at from public.radar_digest where user_id=a) is not null then raise exception 'Client wrote last_digest_at';end if;
 begin insert into public.radar_digest(user_id) values(b);exception when insufficient_privilege or check_violation then blocked:=true;end;
 if not blocked then raise exception 'Cross-user insert was permitted';end if;
 blocked:=false;
 begin update public.radar_digest set ntfy_topic='oyunradari-not-valid' where user_id=a;exception when check_violation then blocked:=true;end;
 if not blocked then raise exception 'Bad ntfy topic was accepted';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.radar_digest where user_id=a) then raise exception 'Digest preference leaked';end if;
 set local role anon;
 blocked:=false;
 begin perform 1 from public.radar_digest;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous read was permitted';end if;
 reset role;
end $$;
rollback;
