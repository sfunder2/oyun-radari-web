-- KVKK / gizlilik: veri dışa aktarma, hesap silme ve gizlilik dostu olay sayacı.
-- Geri almak için: schema-v60-kvkk-gizlilik-geri-al.sql

-- 1) Kullanıcının kendi verisi (yalnız çağıran oturum). Gizli alan yok: Steam bağlantısında yalnız herkese açık kimlik ve ad.
create or replace function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());
begin
 if uid is null then raise exception 'not authenticated' using errcode='28000'; end if;
 return jsonb_build_object(
  'exportedAt',now(),
  'user',(select jsonb_build_object('id',u.id,'email',u.email,'createdAt',u.created_at) from auth.users u where u.id=uid),
  'userData',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.radar_user_data t where t.user_id=uid),
  'profile',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.radar_profiles t where t.user_id=uid),
  'posts',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.radar_posts t where t.user_id=uid),
  'lists',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.radar_lists t where t.user_id=uid),
  'votes',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.radar_votes t where t.user_id=uid),
  'tags',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.radar_tags t where t.user_id=uid),
  'follows',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.radar_follows t where t.user_id=uid),
  'digest',(select coalesce(jsonb_agg(to_jsonb(t)-'ntfy_topic'),'[]'::jsonb) from public.radar_digest t where t.user_id=uid),
  'linkedAccounts',(select coalesce(jsonb_agg(jsonb_build_object('platform',t.platform,'displayName',t.display_name,'linkedAt',t.linked_at)),'[]'::jsonb) from public.linked_accounts t where t.user_id=uid),
  'partyLists',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.party_lists t where t.owner_id=uid)
 );
end $$;
revoke all on function public.export_my_data() from public,anon;
grant execute on function public.export_my_data() to authenticated;

-- 2) Hesabı ve bağlı tüm satırları siler (hepsi auth.users'a on delete cascade bağlı). Geri alınamaz.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());
begin
 if uid is null then raise exception 'not authenticated' using errcode='28000'; end if;
 delete from public.party_lists where owner_id=uid;
 delete from auth.users where id=uid;
end $$;
revoke all on function public.delete_my_account() from public,anon;
grant execute on function public.delete_my_account() to authenticated;

-- 3) Gizlilik dostu olay sayacı: kimlik, çerez, IP, arama metni yok. Yalnız collect-event işlevi (service role) yazar.
create table if not exists public.radar_events(
 day date not null default (now() at time zone 'Europe/Istanbul')::date,
 name text not null check(name ~ '^[a-z0-9_]{1,40}$'),
 route text not null default '' check(char_length(route)<=60),
 lang text not null default 'tr' check(lang in('tr','en')),
 ui text not null default 'klasik' check(ui in('klasik','sade')),
 device text not null default 'unknown' check(device in('mobile','desktop','unknown')),
 props jsonb not null default '{}'::jsonb check(pg_column_size(props)<=512),
 n integer not null default 1,
 primary key(day,name,route,lang,ui,device,props)
);
alter table public.radar_events enable row level security;
revoke all on public.radar_events from public,anon,authenticated;

create or replace function public.record_radar_event(p_name text,p_route text,p_lang text,p_ui text,p_device text,p_props jsonb) returns void
language sql security definer set search_path='' as $$
 insert into public.radar_events(name,route,lang,ui,device,props)
 values(p_name,left(coalesce(p_route,''),60),coalesce(nullif(p_lang,''),'tr'),coalesce(nullif(p_ui,''),'klasik'),coalesce(nullif(p_device,''),'unknown'),coalesce(p_props,'{}'::jsonb))
 on conflict(day,name,route,lang,ui,device,props) do update set n=public.radar_events.n+1;
$$;
revoke all on function public.record_radar_event(text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_radar_event(text,text,text,text,text,jsonb) to service_role;
