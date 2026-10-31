-- Ortak liste (schema-v34) doğrulaması. Her şey geri alınır; test kullanıcısı ya da liste kalmaz.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();id text;r jsonb;blocked boolean;
 v1 text:=md5('voter-1');v2 text:=md5('voter-2');
begin
 insert into auth.users(id,email) values(a,'party-a-'||a||'@example.invalid'),(b,'party-b-'||b||'@example.invalid');

 -- Girişsiz liste kurulamaz.
 set local role anon;
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 blocked:=false;
 begin perform public.party_create('x');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous create was permitted';end if;
 blocked:=false;
 begin perform 1 from public.party_lists;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous table read was permitted';end if;

 -- Sahip kurar; geçersiz ve yinelenen oyunlar ayıklanır, bağlantı yalnız https olabilir.
 set local role authenticated;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 blocked:=false;
 begin perform 1 from public.party_lists;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Authenticated table read was permitted';end if;
 id:=public.party_create('  Cuma akşamı  ','[{"id":"steam:1","name":"Hades","url":"https://store.steampowered.com/app/1145360/","image":"javascript:alert(1)"},{"id":"steam:1","name":"Hades kopya"},{"name":"adsız"},{"id":"ps:2","name":"It Takes Two","url":"http://bad.example"}]');
 if id !~ '^[0-9a-f]{32}$' then raise exception 'Bad id %',id;end if;
 r:=public.party_get(id,v1);
 if r->>'title'<>'Cuma akşamı' then raise exception 'Title not trimmed: %',r->>'title';end if;
 if jsonb_array_length(r->'games')<>2 then raise exception 'Games not cleaned: %',r->'games';end if;
 if r->'games'->0->>'name'<>'Hades' or r->'games'->0 ? 'image' then raise exception 'Unsafe image kept or order lost: %',r->'games';end if;
 if r->'games'->1 ? 'url' then raise exception 'Non-https url kept';end if;
 if not (r->>'owner')::boolean then raise exception 'Owner flag missing';end if;
 if r::text like '%'||a::text||'%' then raise exception 'Owner id leaked';end if;

 -- Bağlantıyı alan arkadaş girişsiz oy verir ve oyun ekler.
 set local role anon;
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 r:=public.party_update(id,'add',v2,'Ayşe','{"id":"xbox:3","name":"Sea of Thieves"}');
 if jsonb_array_length(r->'games')<>3 or r->'games'->2->>'by'<>'Ayşe' then raise exception 'Friend add failed: %',r->'games';end if;
 if (r->>'owner')::boolean then raise exception 'Anon seen as owner';end if;
 r:=public.party_update(id,'vote',v2,'Ayşe',null,'xbox:3');
 if r->>'mine'<>'xbox:3' then raise exception 'Vote not recorded';end if;
 r:=public.party_update(id,'vote',v1,null,null,'steam:1');
 r:=public.party_update(id,'vote',v1,null,null,'xbox:3');
 if jsonb_array_length(r->'votes')<>2 then raise exception 'Revote duplicated: %',r->'votes';end if;
 if r::text like '%'||encode(sha256(convert_to(v1,'UTF8')),'hex')||'%' or r::text like '%'||v1||'%' then raise exception 'Voter key leaked';end if;
 blocked:=false;
 begin perform public.party_update(id,'vote',v1,null,null,'nope');exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Vote for missing game accepted';end if;
 blocked:=false;
 begin perform public.party_update(id,'rename',v1,null,null,null,'ele geçir');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anon rename accepted';end if;
 blocked:=false;
 begin perform public.party_update(id,'delete');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anon delete accepted';end if;

 -- Oyun çıkarılınca o oyuna verilen oylar da gider.
 r:=public.party_update(id,'remove',null,null,null,'xbox:3');
 if jsonb_array_length(r->'votes')<>0 or jsonb_array_length(r->'games')<>2 then raise exception 'Remove left votes: %',r;end if;

 -- Bilinmeyen kimlik boş döner.
 if public.party_get(md5('yok'),null) is not null then raise exception 'Unknown id returned data';end if;

 -- Başka hesap sahip sayılmaz; sahip silebilir.
 set local role authenticated;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 if (public.party_get(id)->>'owner')::boolean then raise exception 'Other user seen as owner';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 r:=public.party_update(id,'rename',null,null,null,null,'Cumartesi');
 if r->>'title'<>'Cumartesi' then raise exception 'Owner rename failed';end if;
 if public.party_update(id,'delete') is not null then raise exception 'Delete returned data';end if;
 if public.party_get(id) is not null then raise exception 'Owner delete failed';end if;
 reset role;
end $$;
rollback;
