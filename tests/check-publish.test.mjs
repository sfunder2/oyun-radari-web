import test from 'node:test';
import assert from 'node:assert/strict';
import {assetPaths,checkPublishedSite} from '../scripts/check-publish.mjs';
test('published asset paths resolve to the correct site origin without duplicates',()=>{
 const html='<script src="/oyun-radari-web/assets/a.js"></script><link href="assets/b.css"><script src="/oyun-radari-web/assets/a.js"></script>';
 assert.deepEqual(assetPaths(html,'https://sfunder2.github.io/oyun-radari-web/'),[
 'https://sfunder2.github.io/oyun-radari-web/assets/a.js',
 'https://sfunder2.github.io/oyun-radari-web/assets/b.css'
 ]);
});
test('smoke check reports HTML and missing assets separately',async()=>{
 const fetchImpl=async url=>({ok:!url.endsWith('bad.css'),status:url.endsWith('bad.css')?404:200,text:async()=>'<div id="root"></div><script src="ok.js"></script><link href="bad.css">'});
 const r=await checkPublishedSite({siteUrl:'https://test.example/app/',fetchImpl});
 assert.equal(r.htmlOk,true);
 assert.equal(r.assets.length,2);
 assert.equal(r.errors.length,1);
 assert.equal(r.assets[1].status,404);
});

test('rejects unexpected JavaScript MIME type',async()=>{
 const site='https://example.github.io/oyun-radari-web/';
 const html='<div id="root"></div><script src="assets/app.js"></script><link href="assets/app.css" rel="stylesheet">';
 const fetchImpl=async url=>url===site?new Response(html):new Response('ok',{headers:{'content-type':String(url).endsWith('.js')?'text/html':'text/css'}});
 const result=await checkPublishedSite({siteUrl:site,fetchImpl});
 assert.ok(result.errors.some(x=>x.includes('Unexpected asset content type')));
});
