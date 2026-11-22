-- Şema v50 geri alma: "Bu fiyata değer mi?" oylarını ve işlevlerini kaldırır. Site oylamayı sessizce gizler.
drop function if exists public.worth_vote(text, text, text);
drop function if exists public.worth_get(text, text);
drop function if exists public.worth_summary(text, text);
drop table if exists public.worth_votes;
