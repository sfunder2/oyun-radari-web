// Site paketi Vite ile `/oyun-radari-web/` tabanına göre derleniyor. Yayından önce yolları göreli yapar,
// böylece aynı paket hem sfunder2.github.io/oyun-radari-web/ altında hem de özel domain'in kökünde çalışır.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const OLD='/oyun-radari-web/';
export const RULES=[
 // index.html: <script src="/oyun-radari-web/assets/…"> ve <link href="…">
 [/(src|href)="\/oyun-radari-web\//g,'$1="./'],
 // Vite modulepreload yardımcısı: bağımlılıklar "assets/X.js" adıyla gelir, parça da assets/ içinde durur.
 [/function\((\w+)\)\{return`\/oyun-radari-web\/`\+\1\}/g,'function($1){return new URL(`../`+$1,import.meta.url).href}'],
 // /api/* uç noktaları yalnız ChatGPT sitesinin kendisinde göreli; başka her adreste oraya gidilir.
 [/window\.location\.hostname===`sfunder2\.github\.io`/g,'window.location.hostname!==`oyun-radari-tr.gokhangozcu.chatgpt.site`'],
 // Paylaşım görselinin altındaki adres, sitenin açıldığı adres olsun.
 [/fillText\(`sfunder2\.github\.io\/oyun-radari-web`/g,'fillText((location.host+location.pathname).replace(/\\/$/,``)'],
];

export const rewrite=text=>RULES.reduce((t,[re,to])=>t.replace(re,to),text);

export async function rewriteSite(dir,say=console.log){
 const files=['index.html',...(await readdir(join(dir,'assets'))).filter(f=>/\.(js|css)$/.test(f)).map(f=>join('assets',f))];
 let changed=0;
 for(const f of files){
  const path=join(dir,f),before=await readFile(path,'utf8'),after=rewrite(before);
  if(after!==before){await writeFile(path,after);changed++;}
  if(f==='index.html'&&after.includes(OLD))throw new Error('index.html hâlâ '+OLD+' içeriyor');
 }
 say(`göreli yol: ${changed}/${files.length} dosya güncellendi`);
 return changed;
}

if(import.meta.url===`file://${process.argv[1]}`)await rewriteSite(process.argv[2]||'.');
