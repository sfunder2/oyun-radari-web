# Manual Library UI (Sprint 07 increment)

`scripts/library-panel.mjs` exports `mountLibraryPanel(root,client)`.
It builds an accessible, framework-independent manual library panel with
game entry, title/platform filtering, play-status changes, removal, and CSV export.

**Integration is NOT enabled by this PR:** production's current `index.html`
loads a compiled frontend bundle and no frontend source was available to
wire this component into its authenticated account screen.

The host application must first obtain a valid Supabase login session
and create a **user-JWT** library client (not a service-role client):

```js
import {userLibraryApi} from './scripts/library-api.mjs';
import {libraryClient} from './scripts/library.mjs';
import {mountLibraryPanel} from './scripts/library-panel.mjs';
const api=userLibraryApi({
 url:SUPABASE_URL,
 anonKey:PUBLIC_ANON_KEY,
 getAccessToken:async()=> (await supabase.auth.getSession()).data.session?.access_token
});
const client=libraryClient(api,(await supabase.auth.getUser()).data.user.id);
mountLibraryPanel(document.querySelector('#my-library'),client);
```

The example requires host-supplied Supabase objects and values and is not
a deployable entrypoint. Verify RLS and Node CI in staging, and test screen readers,
login expiry and mobile layout before enabling navigation.
