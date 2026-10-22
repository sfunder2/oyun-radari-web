// Kapak görselinden baskın vurgu rengi (CORS nedeniyle tarayıcıda okunamadığı için Actions'ta hesaplanır).
import jpeg from 'jpeg-js';
const hex=n=>Math.round(Math.max(0,Math.min(255,n))).toString(16).padStart(2,'0');
export function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;
 if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;}return[h,s,l];}
export function hslToHex(h,s,l){const f=n=>{const k=(n+h/30)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1))};return'#'+hex(f(0)*255)+hex(f(8)*255)+hex(f(4)*255);}
// RGBA piksel dizisi -> '#rrggbb' | null (renksiz/çok koyu görsellerde null)
export function dominantColor(data){
 const bins=Array.from({length:12},()=>({w:0,r:0,g:0,b:0}));let total=0;
 for(let i=0;i<data.length;i+=4){
  const [h,s,l]=rgbToHsl(data[i],data[i+1],data[i+2]);total++;
  if(l<.12||l>.92||s<.2)continue;                        // siyah, beyaz ve gri tonlar vurgu olmaz
  const w=s*(1-Math.abs(l-.5)*1.4),b=bins[Math.floor(h/30)%12];
  b.w+=w;b.r+=data[i]*w;b.g+=data[i+1]*w;b.b+=data[i+2]*w;
 }
 const top=bins.reduce((a,b)=>b.w>a.w?b:a,bins[0]);
 if(!total||top.w/total<.02)return null;
 const [h,s]=rgbToHsl(top.r/top.w,top.g/top.w,top.b/top.w);
 return hslToHex(h,Math.max(.62,Math.min(.9,s)),.62);    // koyu arka planda okunur, canlı bir ton
}
export function colorFromJpeg(buf){const {data}=jpeg.decode(buf,{useTArray:true,maxMemoryUsageInMB:64});return dominantColor(data);}
export async function fetchAccent(imageUrl,f=fetch){
 const base=String(imageUrl||'').replace(/\?.*$/,'');if(!/^https:\/\/image\.api\.playstation\.com\//.test(base))return null;
 const r=await f(base+'?w=64',{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error('Görsel HTTP '+r.status);
 return colorFromJpeg(Buffer.from(await r.arrayBuffer()));
}
