-- Şema v50: "Bu fiyata değer mi?" topluluk oyu (oyun ayrıntısı).
-- Oyun başına evet/hayır sayıları ve oy verenin kendi oyu. Girişsiz çalışır; oy veren, ortak listeyle aynı
-- tarayıcı anahtarıyla (radar-party-voter) tanınır ve sunucu yalnız bu anahtarın SHA-256 özetini saklar.
-- Gizlilik: tablo istemcilere tamamen kapalıdır (RLS açık, politika yok, yetki yok). Okuma ve yazma yalnız
-- worth_get / worth_vote üzerinden yapılır; özet hiçbir yanıtta dönmez, kimlik listelenemez.
-- Kötüye kullanım: oy veren başına en çok 300 farklı oyun, oyun başına tek oy (aynı oy yeniden verilirse güncellenir, null ise silinir).
-- Disk: satır başına ~100 bayt.
-- Geri alma: schema-v50-fiyata-deger-mi-geri-al.sql
set statement_timeout = '30s';

create table if not exists public.worth_votes (
 title_key text not null check (title_key ~ '^[a-z0-9 ]{1,160}$'),
 voter_hash text not null check (voter_hash ~ '^[0-9a-f]{64}$'),
 vote boolean not null,
 updated_at timestamptz not null default now(),
 primary key (title_key, voter_hash)
);
create index if not exists worth_votes_voter on public.worth_votes (voter_hash);
alter table public.worth_votes enable row level security;
revoke all on public.worth_votes from public, anon, authenticated;
grant all on public.worth_votes to service_role;

create or replace function public.worth_summary(p_key text, p_voter text) returns jsonb
language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
  'yes', count(*) filter (where vote),
  'no', count(*) filter (where not vote),
  'mine', case when p_voter ~ '^[0-9a-f]{32}$' then
     (select case when v.vote then 'yes' else 'no' end from public.worth_votes v
      where v.title_key = p_key and v.voter_hash = encode(sha256(convert_to(p_voter, 'UTF8')), 'hex')) end)
 from public.worth_votes where title_key = p_key
$$;

create or replace function public.worth_get(p_key text, p_voter text default '') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 if p_key is null or p_key !~ '^[a-z0-9 ]{1,160}$' then raise exception 'invalid_key' using errcode = '22023'; end if;
 return public.worth_summary(p_key, p_voter);
end $$;

-- p_vote: 'yes' | 'no' | null (oyu geri al)
create or replace function public.worth_vote(p_key text, p_voter text, p_vote text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare h text;
begin
 if p_key is null or p_key !~ '^[a-z0-9 ]{1,160}$' then raise exception 'invalid_key' using errcode = '22023'; end if;
 if p_voter is null or p_voter !~ '^[0-9a-f]{32}$' then raise exception 'invalid_voter' using errcode = '22023'; end if;
 if p_vote is not null and p_vote not in ('yes', 'no') then raise exception 'invalid_vote' using errcode = '22023'; end if;
 h := encode(sha256(convert_to(p_voter, 'UTF8')), 'hex');
 if p_vote is null then
  delete from public.worth_votes where title_key = p_key and voter_hash = h;
 else
  if not exists (select 1 from public.worth_votes where title_key = p_key and voter_hash = h)
     and (select count(*) from public.worth_votes where voter_hash = h) >= 300 then
   raise exception 'too_many_votes' using errcode = 'P0001';
  end if;
  insert into public.worth_votes (title_key, voter_hash, vote) values (p_key, h, p_vote = 'yes')
  on conflict (title_key, voter_hash) do update set vote = excluded.vote, updated_at = now();
 end if;
 return public.worth_summary(p_key, p_voter);
end $$;

revoke all on function public.worth_summary(text, text) from public, anon, authenticated;
revoke all on function public.worth_get(text, text) from public;
revoke all on function public.worth_vote(text, text, text) from public;
grant execute on function public.worth_get(text, text) to anon, authenticated;
grant execute on function public.worth_vote(text, text, text) to anon, authenticated;
