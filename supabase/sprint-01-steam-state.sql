-- Apply before deploying the updated steam-account Edge Function.
-- A verified OpenID callback is consumed once via an atomic insert.
create table if not exists public.steam_link_consumed_states (
  state_sha256 text primary key check (state_sha256 ~ '^[a-f0-9]{64}$'),
  used_at timestamptz not null default now()
);
revoke all on public.steam_link_consumed_states from public, anon, authenticated;
alter table public.steam_link_consumed_states enable row level security;
create or replace function public.consume_steam_link_state(p_hash text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare inserted integer;
begin
  if p_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  insert into public.steam_link_consumed_states(state_sha256)
  values (p_hash) on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end;
$$;
revoke all on function public.consume_steam_link_state(text) from public, anon, authenticated;
grant execute on function public.consume_steam_link_state(text) to service_role;
-- Run periodically, e.g. daily, after the 10-minute state expiration window:
-- delete from public.steam_link_consumed_states where used_at < now() - interval '1 day';
