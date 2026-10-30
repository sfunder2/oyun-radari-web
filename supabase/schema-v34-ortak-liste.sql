-- Şema v34: arkadaşla ortak oyun listesi ve "bu akşam hangisini oynayalım" oylaması.
-- Tek tablo, liste başına tek satır. Oyunlar ve oylar satırın içinde jsonb olarak tutulur (en çok 30 oyun, 20 oy veren),
-- bu yüzden bir liste açmak birincil anahtarla tek satır okumaktır; ek tablo, tetikleyici ya da birleştirme yoktur.
-- Gizlilik:
--  * Liste kimliği sunucuda gen_random_uuid() ile üretilir (122 bit rastgele, 32 onaltılık karakter); tahmin edilemez.
--  * Tablo istemcilere tamamen kapalıdır (RLS açık, politika yok, yetki yok). Listeler yalnız kimliği bilen
--    party_get / party_update üzerinden okunur ve değiştirilir; listeleme ya da arama yolu yoktur.
--  * Liste sahibinin hesabı (owner_id) hiçbir yanıtta dönmez; yanıtta yalnız "sen mi sahibisin" bilgisi vardır.
--  * Oy verenler tarayıcıda üretilen rastgele bir anahtarla tanınır; sunucu yalnız bu anahtarın SHA-256 özetini saklar ve
--    özeti de geri döndürmez. Görünen tek kişisel bilgi oy verenin kendi yazdığı takma addır (isteğe bağlı, 24 karakter).
-- Liste kurmak için giriş gerekir (hesap başına en çok 10 liste); bağlantıyı alan arkadaş girişsiz oy verebilir ve oyun ekleyebilir.
-- 60 gün dokunulmayan listeler her gece silinir (pg_cron: oyun-radari-party-prune).
-- Disk: satır başına en çok ~15 KB; tipik liste 1–3 KB.
create table if not exists public.party_lists (
 id text primary key check (id ~ '^[0-9a-f]{32}$'),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 60),
 games jsonb not null default '[]' check (jsonb_typeof(games)='array' and jsonb_array_length(games)<=30),
 votes jsonb not null default '{}' check (jsonb_typeof(votes)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists party_lists_owner on public.party_lists (owner_id);
create index if not exists party_lists_updated on public.party_lists (updated_at);
alter table public.party_lists enable row level security;
revoke all on public.party_lists from public,anon,authenticated;
grant all on public.party_lists to service_role;

-- İstemciden gelen tek oyunu temizler: yalnız bilinen alanlar, uzunluk sınırları, https bağlantılar.
create or replace function public.party_game(g jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select case when jsonb_typeof(g)='object'
   and char_length(coalesce(g->>'id',''))between 1 and 160
   and char_length(btrim(coalesce(g->>'name','')))between 1 and 180
 then jsonb_strip_nulls(jsonb_build_object(
   'id',g->>'id',
   'name',btrim(g->>'name'),
   'image',case when g->>'image' ~ '^https://[^\s"<>]+$' and char_length(g->>'image')<=500 then g->>'image' end,
   'url',case when g->>'url' ~ '^https://[^\s"<>]+$' and char_length(g->>'url')<=500 then g->>'url' end,
   'by',nullif(left(btrim(coalesce(g->>'by','')),24),'')))
 end $$;

create or replace function public.party_view(p public.party_lists,p_voter text) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object(
  'id',p.id,'title',p.title,'games',p.games,
  'votes',coalesce((select jsonb_agg(jsonb_build_object('g',v.value->>'g','n',v.value->>'n') order by v.value->>'t')
                    from jsonb_each(p.votes) v),'[]'::jsonb),
  'mine',case when p_voter ~ '^[0-9a-f]{32}$' then p.votes->encode(sha256(convert_to(p_voter,'UTF8')),'hex')->>'g' end,
  'owner',p.owner_id=auth.uid(),
  'updated_at',p.updated_at)
$$;

-- Yeni liste. İstenirse ilk oyunlar da verilir (ör. favorilerden seçilenler).
create or replace function public.party_create(p_title text,p_games jsonb default '[]') returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); new_id text:=replace(gen_random_uuid()::text,'-',''); list jsonb;
begin
 if uid is null then raise exception 'login_required' using errcode='42501'; end if;
 if (select count(*) from public.party_lists where owner_id=uid)>=10 then raise exception 'too_many_lists' using errcode='P0001'; end if;
 select coalesce(jsonb_agg(g order by n),'[]') into list from (
  select distinct on (g->>'id') g,n from (
   select public.party_game(e) g,n from jsonb_array_elements(case when jsonb_typeof(p_games)='array' then p_games else '[]' end) with ordinality x(e,n)
  ) a where g is not null order by g->>'id',n
 ) b where n<=200;
 if jsonb_array_length(list)>30 then list:=(select jsonb_agg(e) from (select e from jsonb_array_elements(list) e limit 30) c); end if;
 insert into public.party_lists(id,owner_id,title,games)
 values(new_id,uid,coalesce(nullif(left(btrim(coalesce(p_title,'')),60),''),'Ortak liste'),list);
 return new_id;
end $$;

create or replace function public.party_get(p_id text,p_voter text default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select public.party_view(p,p_voter) from public.party_lists p where p.id=p_id
$$;

-- Tüm değişiklikler tek uçtan: add, remove, vote, unvote, reset, rename (sahip), delete (sahip).
-- Satır kilitlenir; aynı anda oy veren iki arkadaş birbirinin oyunu ezmez. Yanıt güncel listedir (silmede null).
create or replace function public.party_update(p_id text,p_action text,p_voter text default null,p_name text default null,p_game jsonb default null,p_game_id text default null,p_title text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.party_lists; g jsonb; h text; nick text;
begin
 select * into p from public.party_lists where id=p_id for update;
 if not found then raise exception 'not_found' using errcode='P0002'; end if;
 if p_voter ~ '^[0-9a-f]{32}$' then h:=encode(sha256(convert_to(p_voter,'UTF8')),'hex'); end if;
 nick:=nullif(left(btrim(coalesce(p_name,'')),24),'');
 if p_action='add' then
  g:=public.party_game(p_game);
  if g is null then raise exception 'invalid_game' using errcode='22023'; end if;
  if nick is not null and not g?'by' then g:=g||jsonb_build_object('by',nick); end if;
  if not exists(select 1 from jsonb_array_elements(p.games) e where e->>'id'=g->>'id') then
   if jsonb_array_length(p.games)>=30 then raise exception 'list_full' using errcode='P0001'; end if;
   p.games:=p.games||jsonb_build_array(g);
  end if;
 elsif p_action='remove' then
  p.games:=coalesce((select jsonb_agg(e order by n) from jsonb_array_elements(p.games) with ordinality x(e,n) where e->>'id' is distinct from p_game_id),'[]');
  p.votes:=coalesce((select jsonb_object_agg(k,v) from jsonb_each(p.votes) x(k,v) where v->>'g' is distinct from p_game_id),'{}');
 elsif p_action='vote' then
  if h is null then raise exception 'invalid_voter' using errcode='22023'; end if;
  if not exists(select 1 from jsonb_array_elements(p.games) e where e->>'id'=p_game_id) then raise exception 'invalid_game' using errcode='22023'; end if;
  if not p.votes?h and (select count(*) from jsonb_object_keys(p.votes))>=20 then raise exception 'too_many_voters' using errcode='P0001'; end if;
  p.votes:=p.votes||jsonb_build_object(h,jsonb_strip_nulls(jsonb_build_object('g',p_game_id,'n',nick,'t',extract(epoch from now())::bigint)));
 elsif p_action='unvote' then
  if h is not null then p.votes:=p.votes-h; end if;
 elsif p_action='reset' then
  p.votes:='{}';
 elsif p_action='rename' then
  if p.owner_id is distinct from auth.uid() then raise exception 'owner_only' using errcode='42501'; end if;
  p.title:=coalesce(nullif(left(btrim(coalesce(p_title,'')),60),''),p.title);
 elsif p_action='delete' then
  if p.owner_id is distinct from auth.uid() then raise exception 'owner_only' using errcode='42501'; end if;
  delete from public.party_lists where id=p.id;
  return null;
 else
  raise exception 'unknown_action' using errcode='22023';
 end if;
 update public.party_lists set title=p.title,games=p.games,votes=p.votes,updated_at=now() where id=p.id returning * into p;
 return public.party_view(p,p_voter);
end $$;

revoke all on function public.party_game(jsonb) from public,anon,authenticated;
revoke all on function public.party_view(public.party_lists,text) from public,anon,authenticated;
revoke all on function public.party_create(text,jsonb) from public,anon;
revoke all on function public.party_get(text,text) from public;
revoke all on function public.party_update(text,text,text,text,jsonb,text,text) from public;
grant execute on function public.party_create(text,jsonb) to authenticated;
grant execute on function public.party_get(text,text) to anon,authenticated;
grant execute on function public.party_update(text,text,text,text,jsonb,text,text) to anon,authenticated;

-- 60 gün dokunulmayan listeleri her gece 03:40 UTC'de sil.
select cron.schedule('oyun-radari-party-prune','40 3 * * *',
 $$delete from public.party_lists where updated_at < now() - interval '60 days'$$);

-- Geri alma:
--   select cron.unschedule('oyun-radari-party-prune');
--   drop function if exists public.party_update(text,text,text,text,jsonb,text,text);
--   drop function if exists public.party_get(text,text);
--   drop function if exists public.party_create(text,jsonb);
--   drop function if exists public.party_view(public.party_lists,text);
--   drop function if exists public.party_game(jsonb);
--   drop table if exists public.party_lists;
