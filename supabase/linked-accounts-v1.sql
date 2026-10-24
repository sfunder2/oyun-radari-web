-- Bağlı oyun hesapları (şimdilik yalnız Steam). Tek satır kullanıcı başına platform başına; oyun listesi burada tutulmaz.
-- Satırı yalnız steam-account Edge Function'ı (service role) yazar; böylece kullanıcı doğrulanmamış bir SteamID ekleyemez.
-- Kullanıcı kendi satırını okuyabilir ve silebilir. Hafif bir tablo: cron, tetikleyici ya da ağır indeks yok.
create table if not exists public.linked_accounts(
 user_id uuid not null references auth.users(id) on delete cascade,
 platform text not null check(platform in ('steam')),
 external_id text not null check(external_id ~ '^[0-9]{17}$'),
 display_name text,
 avatar_url text,
 linked_at timestamptz not null default now(),
 primary key(user_id,platform),
 unique(platform,external_id)
);
alter table public.linked_accounts enable row level security;
revoke all on public.linked_accounts from anon,authenticated;
grant select,delete on public.linked_accounts to authenticated;
drop policy if exists linked_accounts_own_read on public.linked_accounts;
create policy linked_accounts_own_read on public.linked_accounts for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists linked_accounts_own_delete on public.linked_accounts;
create policy linked_accounts_own_delete on public.linked_accounts for delete to authenticated using(user_id=(select auth.uid()));
