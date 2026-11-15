import test from 'node:test';
import assert from 'node:assert/strict';
import { fixReleases } from '../assets/igdb-20261101.js';

test('IGDB lookups run in parallel batches and still return every row', async () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({ titleKey: 'game ' + i, name: 'g' + i, releaseDate: '2027-01-01' }));
  let running = 0, peak = 0, calls = 0;
  const fake = async (url) => {
    calls++; running++; peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    running--;
    const keys = decodeURIComponent(url.split('title_key=in.(')[1].slice(0, -1)).split(',').map((k) => k.replace(/"/g, ''));
    return new Response(JSON.stringify(keys.map((k) => ({ title_key: k, release_date: '2027-02-02', release_precision: 'day', platform_dates: {}, trailer_youtube: null, trailer_name: null }))), { status: 200 });
  };
  const out = await fixReleases(items, fake);
  assert.equal(calls, 10);
  assert.ok(peak > 1 && peak <= 6, 'peak concurrency ' + peak);
  assert.equal(out.length, 1000);
});
