// The entry bundle keeps one filename and is cache-busted with ?v=. Lazy chunks import it
// through the import map; if the map and the <script src> carry different ?v= values the
// browser loads the bundle twice and the app mounts twice. Keep them identical.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('import map and entry script load the same bundle URL', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const map = JSON.parse(html.match(/<script type="importmap">([^<]*)<\/script>/)[1]).imports;
  const src = html.match(/<script type="module"[^>]*src="([^"]+)"/)[1];
  const base = src.split('?')[0];
  assert.ok(map[base], 'import map must cover the entry bundle');
  assert.equal(map[base], src);
});
