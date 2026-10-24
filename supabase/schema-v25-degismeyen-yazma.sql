-- v25: fiyatı değişmeyen ürünü yeniden yazma.
-- Neden: toplayıcılar her 5 dakikada bütün satırları yeniden yazıyordu (1,5 günde ps_products 17,8 bin satıra
-- 381 bin, store_offers 37,8 bin satıra 377 bin güncelleme). Her güncelleme yeni satır kopyası + WAL demek; disk ve
-- işlemci bunun altında eziliyordu. Toplayıcı kodu değişmez: tetikleyici, satırda checked_at dışında hiçbir şey
-- değişmediyse ve checked_at 6 saatten yeniyse güncellemeyi sessizce atlar (yeni satır kopyası ve WAL oluşmaz).
-- checked_at en geç 6 saatte bir yenilenmeye devam eder; sitedeki "24 saatten eski fiyat" kuralı etkilenmez.

create or replace function public.skip_unchanged_write() returns trigger
 language plpgsql set search_path to 'public' as $function$
begin
 if (to_jsonb(new) - 'checked_at') = (to_jsonb(old) - 'checked_at')
    and old.checked_at > now() - interval '6 hours' then
  return null;
 end if;
 return new;
end $function$;

drop trigger if exists skip_unchanged_write on public.ps_products;
create trigger skip_unchanged_write before update on public.ps_products
 for each row execute function public.skip_unchanged_write();
drop trigger if exists skip_unchanged_write on public.store_offers;
create trigger skip_unchanged_write before update on public.store_offers
 for each row execute function public.skip_unchanged_write();

-- Geri alma:
--   drop trigger if exists skip_unchanged_write on public.ps_products;
--   drop trigger if exists skip_unchanged_write on public.store_offers;
--   drop function if exists public.skip_unchanged_write();
