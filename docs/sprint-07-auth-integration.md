# Sprint 07 authenticated host-app integration

The production Oyun Radarı front end is currently a compiled bundle. This
module is a **host-app integration entrypoint**, not an automatically activated
feature. An existing Supabase Auth client must supply the signed-in session.

Example for the actual frontend source:
```js
import {mountAuthenticatedLibrary} from './scripts/library-session.mjs';
const mounted=await mountAuthenticatedLibrary(
 document.querySelector('#library-root'),
 {supabase:existingSupabaseClient,url:SUPABASE_URL,publishableKey:SUPABASE_PUBLISHABLE_KEY}
);
// Call mounted.destroy() when navigating away / disposing of the screen.
```

It calls `getUser()` to establish the identity, refreshes access tokens through
`getSession()` before requests, checks the session identity matches the
initial user, and unmounts on sign-out or switching accounts.

Important: existing React/Vue/etc. frontend source must explicitly mount
this component. There is no token or service-role credential hardcoded here.
Run browser-level session expiry and account-switch smoke tests in staging.
