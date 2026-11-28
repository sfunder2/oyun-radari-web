-- Şema v53: "Bu fiyat doğru mu?" topluluk doğrulaması (oyun ayrıntısı, Alım rehberi).
-- Mağaza + oyun başına doğru/yanlış sayıları ve oy verenin kendi oyu. Girişsiz çalışır; oy veren schema-v50 ile aynı
-- tarayıcı anahtarıyla (radar-party-voter) tanınır ve sunucu yalnız bu anahtarın SHA-256 özetini saklar.
-- Gizlilik: tablo istemcilere tamamen kapalıdır (RLS açık, politika yok, yetki yok); okuma/yazma yalnız price_check_get / price_check_vote.
-- Kötüye kullanım: oy veren başına en çok 300 farklı (oyun, mağaza) oyu; aynı oy yeniden verilirse güncellenir, null ise silinir.
-- Disk: satır başına ~120 bayt. Diğer tablolara dokunmaz. Geri alma: schema-v53-fiyat-dogrulama-geri-al.sql
set statement_timeout = '30s';

create table if not exists public.price_checks (
 title_key text not null check (title_key ~ '^[a-z0-9 ]{1,160}$'),
 store text not null check (store ~ '^[a-z0-9]{2,24}$'),
 voter_hash text not null check (voter_hash ~ '^[0-9a-f]{64}$'),
 correct boolean not null,
 updated_at timestamptz not null default now(),
 primary key (title_key, store, voter_hash)
);
create index if not exists price_checks_voter on public.price_checks (voter_hash);
alter table public.price_checks enable row level security;
revoke all on public.price_checks from public, anon, authenticated;
grant all on public.price_checks to service_role;

create or replace function public.price_check_summary(p_key text, p_store text, p_voter text) returns jsonb
language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
  'ok', count(*) filter (where correct),
  'wrong', count(*) filter (where not correct),
  'mine', case when p_voter ~ '^[0-9a-f]{32}$' then
     (select case when v.correct then 'ok' else 'wrong' end from public.price_checks v
      where v.title_key = p_key and v.store = p_store and v.voter_hash = encode(sha256(convert_to(p_voter, 'UTF8')), 'hex')) end)
 from public.price_checks where title_key = p_key and store = p_store
$$;

create or replace function public.price_check_get(p_key text, p_store text, p_voter text default '') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 if p_key is null or p_key !~ '^[a-z0-9 ]{1,160}$' or p_store is null or p_store !~ '^[a-z0-9]{2,24}$' then raise exception 'invalid_key' using errcode = '22023'; end if;
 return public.price_check_summary(p_key, p_store, p_voter);
end $$;

-- p_vote: 'ok' | 'wrong' | null (oyu geri al)
create or replace function public.price_check_vote(p_key text, p_store text, p_voter text, p_vote text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare h text;
begin
 if p_key is null or p_key !~ '^[a-z0-9 ]{1,160}$' or p_store is null or p_store !~ '^[a-z0-9]{2,24}$' then raise exception 'invalid_key' using errcode = '22023'; end if;
 if p_voter is null or p_voter !~ '^[0-9a-f]{32}$' then raise exception 'invalid_voter' using errcode = '22023'; end if;
 if p_vote is not null and p_vote not in ('ok', 'wrong') then raise exception 'invalid_vote' using errcode = '22023'; end if;
 h := encode(sha256(convert_to(p_voter, 'UTF8')), 'hex');
 if p_vote is null then
  delete from public.price_checks where title_key = p_key and store = p_store and voter_hash = h;
 else
  if not exists (select 1 from public.price_checks where title_key = p_key and store = p_store and voter_hash = h)
     and (select count(*) from public.price_checks where voter_hash = h) >= 300 then
   raise exception 'too_many_votes' using errcode = 'P0001';
  end if;
  insert into public.price_checks (title_key, store, voter_hash, correct) values (p_key, p_store, h, p_vote = 'ok')
  on conflict (title_key, store, voter_hash) do update set correct = excluded.correct, updated_at = now();
 end if;
 return public.price_check_summary(p_key, p_store, p_voter);
end $$;

revoke all on function public.price_check_summary(text, text, text) from public, anon, authenticated;
revoke all on function public.price_check_get(text, text, text) from public;
revoke all on function public.price_check_vote(text, text, text, text) from public;
grant execute on function public.price_check_get(text, text, text) to anon, authenticated;
grant execute on function public.price_check_vote(text, text, text, text) to anon, authenticated;
