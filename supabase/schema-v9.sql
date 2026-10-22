-- Enable these once, then deploy supabase/functions/refresh-ps-prices with JWT verification ON.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- The active job is oyun-radari-ps-prices: 7,22,37,52 * * * * (UTC).
-- Its authenticated HTTP command reads ps_batch_secret from Vault, never from this repository.
-- Configure the command in the Supabase dashboard using the project anon JWT and a
-- cryptographically random Vault secret. The function checks SHA-256 of x-batch-secret.
-- Never commit the Vault secret or service-role key.
