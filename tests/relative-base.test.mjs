import test from 'node:test';import assert from 'node:assert/strict';
import {rewrite} from '../scripts/relative-base.mjs';
test('index.html: script ve stil yolları göreli olur',()=>{
 const html='<script type="module" crossorigin src="/oyun-radari-web/assets/index-A.js"></script><link rel="stylesheet" crossorigin href="/oyun-radari-web/assets/index-B.css"><link rel="preconnect" href="https://fonts.gstatic.com">';
 assert.equal(rewrite(html),'<script type="module" crossorigin src="./assets/index-A.js"></script><link rel="stylesheet" crossorigin href="./assets/index-B.css"><link rel="preconnect" href="https://fonts.gstatic.com">');
});
test('modulepreload yardımcısı parçanın kendi adresine göre çözer',()=>{
 const out=rewrite('var Pi=`modulepreload`,Fi=function(e){return`/oyun-radari-web/`+e},Ii={};');
 assert.equal(out,'var Pi=`modulepreload`,Fi=function(e){return new URL(`../`+e,import.meta.url).href},Ii={};');
 const Fi=new Function('e','return new URL(`../`+e,"https://oyunradari.com/assets/index-A.js").href');
 assert.equal(Fi('assets/Deals-x.js'),'https://oyunradari.com/assets/Deals-x.js');
});
test('/api uç noktası ve paylaşım görseli adresi alan adına bağlı kalmaz',()=>{
 assert.equal(rewrite('wo=typeof window<`u`&&window.location.hostname===`sfunder2.github.io`?`https://x`:``'),'wo=typeof window<`u`&&window.location.hostname!==`oyun-radari-tr.gokhangozcu.chatgpt.site`?`https://x`:``');
 const out=rewrite('r.fillText(`sfunder2.github.io/oyun-radari-web`,65,1540)');
 assert.equal(out,'r.fillText((location.host+location.pathname).replace(/\\/$/,``),65,1540)');
 const location={host:'oyunradari.com',pathname:'/'};
 assert.equal(new Function('location','r',out.replace('r.fillText(','return (').replace(',65,1540)',')'))(location),'oyunradari.com');
});
test('ikinci kez çalışınca değişiklik yapmaz',()=>{
 const once=rewrite('src="/oyun-radari-web/assets/a.js" function(e){return`/oyun-radari-web/`+e}');
 assert.equal(rewrite(once),once);
});
