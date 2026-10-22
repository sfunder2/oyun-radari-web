-- Supabase şeması (hazırlık). SQL Editor'de bir kez çalıştırın.
-- Tek gerçek: ürünler ve fiyat geçmişi burada tutulur; yazma yalnızca service_role anahtarıyla (GitHub Actions) yapılır.
create extension if not exists pg_trgm;

create table if not exists ps_products (
  id               text primary key,                 -- PS Store ürün kimliği (EP...-...)
  name             text not null,
  name_search      text not null,                    -- küçük harf, aksansız arama metni
  image            text,
  edition          text,
  price            numeric(12,2) not null,
  original_price   numeric(12,2),
  discount_percent integer not null default 0,
  discount_ends_at timestamptz,
  currency         text not null default 'TRY',
  url              text not null,
  checked_at       timestamptz not null,
  first_seen       timestamptz not null default now(),
  lowest_ever      numeric(12,2),
  lowest_30d       numeric(12,2),
  history_days     integer not null default 0,
  historical_low   boolean not null default false,
  low_30d          boolean not null default false,
  price_rise       jsonb
);
create index if not exists ps_products_name_trgm on ps_products using gin (name_search gin_trgm_ops);
create index if not exists ps_products_discount  on ps_products (discount_percent desc) where discount_percent > 0;
create index if not exists ps_products_checked   on ps_products (checked_at desc);

create table if not exists ps_price_history (
  product_id text not null references ps_products(id) on delete cascade,
  day        date not null,
  price      numeric(12,2) not null,
  base_price numeric(12,2) not null,
  primary key (product_id, day)
);

create table if not exists ps_state (          -- sayfa imleçleri ve son batch özeti
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Herkes okuyabilir, kimse anon anahtarla yazamaz.
alter table ps_products      enable row level security;
alter table ps_price_history enable row level security;
alter table ps_state         enable row level security;
create policy "herkese okuma" on ps_products      for select using (true);
create policy "herkese okuma" on ps_price_history for select using (true);
create policy "herkese okuma" on ps_state         for select using (true);
