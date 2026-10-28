import {createAdminRefreshHandler} from '../../../scripts/admin-refresh-handler.mjs';
// Auth validates the bearer token in the handler; is_radar_admin() authorizes every request.
Deno.serve(createAdminRefreshHandler({url:Deno.env.get('SUPABASE_URL')!,serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}));
