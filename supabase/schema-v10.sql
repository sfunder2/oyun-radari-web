-- Supabase v10: PS fiyat batch'i her 5 dakikada. SQL Editor'de bir kez çalıştırın.
-- 1) Kilit süresi cron aralığından kısa olmalı. Bir tur yaklaşık 1 dakika sürer; 7 dakikalık kilit,
--    çöken bir turdan sonra bir sonraki 5 dakikalık turu da atlatırdı.
create or replace function public.claim_ps_batch(lease_token uuid)
returns boolean language sql security invoker set search_path=public as $$
 with claimed as (
  insert into collector_leases(name,token,expires_at) values ('ps',lease_token,now()+interval '4 minutes')
  on conflict(name) do update set token=excluded.token,expires_at=excluded.expires_at
  where collector_leases.expires_at<now() returning name
 ) select exists(select 1 from claimed);
$$;

-- 2) Mevcut zamanlanmış işleri gör (refresh-ps-prices çağıranı bulun)
select jobid, jobname, schedule, active, left(command, 140) as command from cron.job order by jobid;

-- 3) PS batch işini 5 dakikaya al
select cron.alter_job(
  job_id   => (select jobid from cron.job where command ilike '%refresh-ps-prices%' order by jobid limit 1),
  schedule => '*/5 * * * *'
);

-- 4) Kontrol: schedule sütunu */5 * * * * olmalı
select jobid, jobname, schedule, active from cron.job where command ilike '%refresh-ps-prices%';
