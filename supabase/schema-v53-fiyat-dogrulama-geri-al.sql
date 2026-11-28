-- schema-v53-fiyat-dogrulama.sql geri alma: oylar silinir.
drop function if exists public.price_check_vote(text, text, text, text);
drop function if exists public.price_check_get(text, text, text);
drop function if exists public.price_check_summary(text, text, text);
drop table if exists public.price_checks;
