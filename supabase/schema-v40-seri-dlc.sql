-- Şema v40: oyun ayrıntısında "Serideki diğer oyunlar" ve "DLC ve genişlemeler" (kaynak: IGDB, Twitch anahtarlarıyla).
-- Gerekli: schema-v35-oyun-suresi.sql (game_ttb). Toplayıcı IGDB oyun kimliğini oradan alır, oyunları yeniden eşleştirmez.
-- Canlı fonksiyonlara ve başka tablolara dokunulmaz; yalnız yeni bir tablo eklenir.
--
-- game_family: başlık anahtarı başına tek satır.
--   series_name : IGDB seri (collection) adı; yoksa marka (franchise) adı.
--   series      : serideki oyunlar, çıkış tarihine göre (en çok 40). Öğe: {id, n: ad, y: yıl, t: IGDB oyun türü, k: başlık anahtarı, c: kapak}
--   dlcs        : DLC, genişleme ve bağımsız genişlemeler, yeniden eskiye (en çok 60). Öğe biçimi series ile aynı.
--   dlc_total   : IGDB'deki toplam ek içerik sayısı (60'tan fazlaysa arayüz "ve N tane daha" der).
--   parent      : oyun kendisi bir DLC/genişlemeyse ana oyunu ({id, n, y, k, c}); değilse boş.
--   Satırı yalnız toplayıcı (service role) yazar; herkes okuyabilir. Toplayıcı her oyunu 30 günde bir yeniler.
--   Disk: seri ya da DLC'si olan oyunlarda satır başına ~0,5–3 KB; ~35 bin oyun için kabaca 15–30 MB.
-- Geri almak için: supabase/schema-v40-seri-dlc-geri-al.sql

create table if not exists public.game_family (
 title_key text primary key,
 igdb_id integer not null,
 series_name text,
 series jsonb not null default '[]'::jsonb check (jsonb_typeof(series) = 'array'),
 dlcs jsonb not null default '[]'::jsonb check (jsonb_typeof(dlcs) = 'array'),
 dlc_total integer not null default 0 check (dlc_total >= 0),
 parent jsonb check (parent is null or jsonb_typeof(parent) = 'object'),
 checked_at timestamptz not null default now()
);
alter table public.game_family enable row level security;
drop policy if exists game_family_read on public.game_family;
create policy game_family_read on public.game_family for select to anon, authenticated using (true);
revoke all on public.game_family from public, anon, authenticated;
grant select on public.game_family to anon, authenticated;
grant all on public.game_family to service_role;
create index if not exists game_family_checked on public.game_family (checked_at);
