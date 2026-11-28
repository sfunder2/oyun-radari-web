do $$ begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'store_offers') then
    alter publication supabase_realtime drop table store_offers;
  end if;
end $$;
alter table store_offers replica identity default;
