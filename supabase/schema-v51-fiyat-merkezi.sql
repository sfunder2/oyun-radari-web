-- Fırsat merkezi: haftalık e-posta özeti ve telefona bildirim (ntfy) tercihleri.
-- Satırı yalnız sahibi okur/yazar. E-posta adresini istemci seçemez: tetikleyici adresi auth.users'tan alır,
-- böylece kimse başkasının adresine özet yollatamaz. Gönderimi scripts/weekly-digest.mjs service_role ile yapar.
create table if not exists public.radar_digest(
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null default '',
 lang text not null default 'tr' check(lang in('tr','en')),
 weekly boolean not null default false,
 ntfy_topic text check(ntfy_topic is null or ntfy_topic ~ '^oyunradari-[a-f0-9]{24}$'),
 last_digest_at timestamptz,
 pushed jsonb not null default '[]' check(jsonb_typeof(pushed)='array' and jsonb_array_length(pushed)<=400),
 updated_at timestamptz not null default now()
);
create or replace function public.radar_digest_guard() returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
 new.email:=coalesce((select u.email from auth.users u where u.id=new.user_id),'');
 new.updated_at:=now();
 if current_setting('role') in('authenticated','anon') then
  -- (current_setting('role') PostgREST'te SET ROLE ile gelen rolü verir; service_role ve doğrudan bağlantılar bu dala girmez.)
  -- Kullanıcı yalnız tercihlerini değiştirir; gönderim kayıtlarını yalnız sunucu yazar.
  if tg_op='INSERT' then new.last_digest_at:=null;new.pushed:='[]'; else new.last_digest_at:=old.last_digest_at;new.pushed:=old.pushed; end if;
 end if;
 return new;
end $$;
drop trigger if exists radar_digest_guard on public.radar_digest;
create trigger radar_digest_guard before insert or update on public.radar_digest for each row execute function public.radar_digest_guard();
alter table public.radar_digest enable row level security;
grant select,insert,update,delete on public.radar_digest to authenticated;
grant all on public.radar_digest to service_role;
create policy digest_own_select on public.radar_digest for select to authenticated using((select auth.uid())=user_id);
create policy digest_own_insert on public.radar_digest for insert to authenticated with check((select auth.uid())=user_id);
create policy digest_own_update on public.radar_digest for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy digest_own_delete on public.radar_digest for delete to authenticated using((select auth.uid())=user_id);
