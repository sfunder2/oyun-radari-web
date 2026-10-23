create or replace function public.search_games(
 query_text text default '', page_number integer default 0, page_size integer default 25,
 filter_options jsonb default '{}'::jsonb, sort_order text default 'default', deals_only boolean default false
) returns jsonb language plpgsql stable security invoker set search_path=public,extensions as $$
declare
 q text:=left(trim(regexp_replace(lower(coalesce(query_text,'')),'[^a-z0-9 ]',' ','g')),120);
 opts jsonb:=coalesce(filter_options,'{}'::jsonb);
 result jsonb;
begin
 q:=trim(regexp_replace(q,'\s+',' ','g'));
 with base as (
  select l.*,p.store_status,p.hero_url,p.accent_color,gm.tags,gm.categories,
   (select count(*) from public.radar_posts rp where rp.game_id=l.id and rp.kind='review') as discussion_count,
   regexp_replace(p.name_search,'[^a-z0-9 ]','','g') as searchable
  from public.library l join public.ps_products p using(id) left join public.game_meta gm on gm.title_key=l.title_key
  where (coalesce(opts->>'tag','')='' or exists(select 1 from unnest(coalesce(gm.tags,'{}')||coalesce(gm.categories,'{}')) t where lower(t)=lower(opts->>'tag')))
   and (not (opts?'ids') or l.id in(select jsonb_array_elements_text(opts->'ids')))
   and (sort_order<>'gems' or l.best_score>=80 and (l.scores->>'opencritic_reviews')::integer between 1 and 30)
   and (not deals_only or l.discount_percent>0 and l.price<l.original_price)
   and (coalesce(opts->>'platform','')='' or l.edition ilike '%'||(opts->>'platform')||'%')
   and (coalesce(nullif(opts->>'minScore','')::numeric,0)<=0 or l.best_score>=(opts->>'minScore')::numeric)
   and (nullif(opts->>'maxPrice','') is null or l.price<=(opts->>'maxPrice')::numeric)
   and (coalesce(opts->>'genre','')='' or l.genres @> array[opts->>'genre'])
   and (coalesce(opts->>'developer','')='' or l.developers @> array[opts->>'developer'])
   and (coalesce(opts->>'year','')='' or extract(year from l.release_date)=(opts->>'year')::integer)
   and (coalesce(opts->>'turkish','false')<>'true' or l.turkish is true)
 ), matched as (
  select b.*,case when q='' then 0 when b.title_key=q or b.searchable=q then 0
   when b.searchable like q||'%' then 1 when b.searchable like '%'||q||'%' then 2 when b.searchable like split_part(q,' ',1)||'%' then 3 else 4 end as relevance,
   case when q='' then true else not exists(select 1 from unnest(string_to_array(q,' ')) word where strpos(b.searchable,word)=0) end as token_match,
   public.word_similarity(q,b.searchable) as similarity_score
  from base b
 ), eligible as (
  select * from matched m where m.token_match or (length(q)>=4 and m.similarity_score>=0.56 and not exists(select 1 from matched where token_match))
 ), sorted as (
  select *,row_number() over(order by
   case when q<>'' and sort_order='default' then relevance end asc nulls last,
   case when q<>'' and sort_order='default' then similarity_score end desc nulls last,
   case when q<>'' and sort_order='default' then case when name_search~'\m(deluxe|ultimate|premium|bundle)\M' then 1 else 0 end end asc nulls last,
   case when sort_order='discussed' then discussion_count end desc nulls last,
   case when sort_order in('score','gems') then best_score end desc nulls last,
   case when sort_order='discount' or (sort_order='default' and q='' and deals_only) then discount_percent end desc nulls last,
   case when sort_order='priceAsc' then price end asc nulls last,
   case when sort_order='priceDesc' then price end desc nulls last,
   case when sort_order='default' and q='' and not deals_only then first_seen end desc nulls last,
   name asc,id asc) as result_number from eligible
 ), paged as (
  select * from sorted where result_number>greatest(0,least(page_number,10000))*greatest(1,least(page_size,50))
   and result_number<=(greatest(0,least(page_number,10000))+1)*greatest(1,least(page_size,50))
 ) select jsonb_build_object(
  'items',coalesce((select jsonb_agg(to_jsonb(p)-'searchable'-'relevance'-'token_match'-'similarity_score'-'result_number' order by result_number) from paged p),'[]'::jsonb),
  'total',(select count(*) from eligible),
  'fuzzy',q<>'' and not exists(select 1 from matched where token_match) and exists(select 1 from eligible),
  'query',q
 ) into result;
 return result;
end;
$$;
revoke all on function public.search_games(text,integer,integer,jsonb,text,boolean) from public;
grant execute on function public.search_games(text,integer,integer,jsonb,text,boolean) to anon,authenticated,service_role;
