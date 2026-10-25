-- Şema v29: Steam, Xbox, Switch, Epic ve GOG için fiyat geçmişi (PlayStation'daki ps_price_history'nin karşılığı).
-- Toplayıcı kodu değişmez: store_offers'a yeni ürün eklenince ya da fiyatı değişince veritabanı o güne bir nokta yazar.
-- Nokta biçimi ps_price_history ile aynıdır: price (günün son fiyatı), base_price (indirimsiz), low_price (günün en düşüğü).
-- Tetikleyiciler deyim başına bir kez çalışır; v25'teki skip_unchanged_write'ın atladığı satırlar zaten gelmez.
-- 365 günden eski noktalar her gece silinir (pg_cron: oyun-radari-offer-history-prune).
-- Disk: satır başına ~180 bayt; başlangıç ~45 bin nokta (~8 MB), sonra yalnız fiyat değişince satır eklenir.
create table if not exists public.offer_price_history (
 platform text not null,
 store_id text not null,
 day date not null,
 price numeric(12,2),
 base_price numeric(12,2),
 low_price numeric(12,2),
 primary key (platform,store_id,day)
);
alter table public.offer_price_history enable row level security;
drop policy if exists "herkese okuma" on public.offer_price_history;
create policy "herkese okuma" on public.offer_price_history for select using (true);
revoke insert,update,delete,truncate on public.offer_price_history from anon,authenticated;
grant select on public.offer_price_history to anon,authenticated;
grant all on public.offer_price_history to service_role;

create or replace function public.record_offer_history() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  insert into offer_price_history(platform,store_id,day,price,base_price,low_price)
  select n.platform,n.store_id,current_date,n.price,greatest(n.price,coalesce(n.original_price,n.price)),n.price
  from new_rows n where n.price is not null
  on conflict (platform,store_id,day) do update set price=excluded.price,base_price=excluded.base_price,
   low_price=least(offer_price_history.low_price,excluded.price);
 else
  insert into offer_price_history(platform,store_id,day,price,base_price,low_price)
  select n.platform,n.store_id,current_date,n.price,greatest(n.price,coalesce(n.original_price,n.price)),n.price
  from new_rows n join old_rows o on o.platform=n.platform and o.store_id=n.store_id
  where n.price is not null and (n.price is distinct from o.price or n.original_price is distinct from o.original_price)
  on conflict (platform,store_id,day) do update set price=excluded.price,base_price=excluded.base_price,
   low_price=least(offer_price_history.low_price,excluded.price);
 end if;
 return null;
end;
$$;
revoke all on function public.record_offer_history() from public,anon,authenticated;

drop trigger if exists record_offer_history_ins on public.store_offers;
create trigger record_offer_history_ins after insert on public.store_offers
 referencing new table as new_rows
 for each statement execute function public.record_offer_history();
drop trigger if exists record_offer_history_upd on public.store_offers;
create trigger record_offer_history_upd after update on public.store_offers
 referencing old table as old_rows new table as new_rows
 for each statement execute function public.record_offer_history();

-- Başlangıç noktası: bugünkü fiyat.
insert into public.offer_price_history(platform,store_id,day,price,base_price,low_price)
select platform,store_id,current_date,price,greatest(price,coalesce(original_price,price)),price
from public.store_offers where price is not null
on conflict (platform,store_id,day) do nothing;

-- 365 günden eski noktaları her gece 03:20 UTC'de sil.
select cron.schedule('oyun-radari-offer-history-prune','20 3 * * *',
 $$delete from public.offer_price_history where day < current_date - 365$$);

-- Geri alma:
--   select cron.unschedule('oyun-radari-offer-history-prune');
--   drop trigger if exists record_offer_history_ins on public.store_offers;
--   drop trigger if exists record_offer_history_upd on public.store_offers;
--   drop function if exists public.record_offer_history();
--   drop table if exists public.offer_price_history;
