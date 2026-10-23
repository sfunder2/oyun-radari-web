const ALLOWED=new Set(['https://sfunder2.github.io','https://oyun-radari-tr.gokhangozcu.chatgpt.site','http://terminal.local:4173']);
const cache=new Map<string,{at:number,data:unknown}>();
async function json(url:string,init:RequestInit={}){const r=await fetch(url,{...init,signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Kaynak HTTP '+r.status);return r.json();}
const env=(name:string)=>Deno.env.get(name)||'';
async function services(action:string,p:URLSearchParams){
 if(action==='status')return {rates:true,weather:true,epic:true,spotify:!!(env('SPOTIFY_CLIENT_ID')&&env('SPOTIFY_CLIENT_SECRET')),twitch:!!(env('TWITCH_CLIENT_ID')&&env('TWITCH_CLIENT_SECRET')),youtube:!!env('YOUTUBE_API_KEY')};
 if(action==='rates'){
  const r=await fetch('https://www.tcmb.gov.tr/kurlar/today.xml',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('TCMB yanıt vermedi');const xml=await r.text();
  const rate=(code:string)=>{const block=xml.match(new RegExp('<Currency[^>]*CurrencyCode="'+code+'"[\\s\\S]*?</Currency>'))?.[0];const n=Number(block?.match(/<ForexSelling>([^<]+)</)?.[1]);if(!Number.isFinite(n)||n<=0)throw Error('Kur doğrulanamadı');return n;};
  return{usdTry:rate('USD'),eurTry:rate('EUR'),date:xml.match(/Tarih="([^"]+)"/)?.[1],source:'TCMB döviz satış',checkedAt:new Date().toISOString()};
 }
 if(action==='weather'){
  const city=(p.get('city')||'').trim().slice(0,60);if(city.length<2)throw Error('Bir şehir yaz.');const geo=await json('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:city,count:'1',language:'tr',format:'json'}));const place=geo.results?.[0];if(!place)throw Error('Şehir bulunamadı');
  const w=await json('https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:String(place.latitude),longitude:String(place.longitude),current:'temperature_2m,precipitation,weather_code',timezone:'auto'}));return{city:place.name,country:place.country,temperature:w.current?.temperature_2m,rainy:Number(w.current?.precipitation)>0,weatherCode:w.current?.weather_code,checkedAt:w.current?.time,source:'Open-Meteo'};
 }
 if(action==='epic'){
  const d=await json('https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=tr&country=TR&allowCountries=TR');const now=Date.now();const games=[];
  for(const g of d.data?.Catalog?.searchStore?.elements||[]){const offers=g.promotions?.promotionalOffers?.flatMap((x:any)=>x.promotionalOffers||[])||[];const active=offers.find((x:any)=>Date.parse(x.startDate)<=now&&Date.parse(x.endDate)>now);if(!active||g.price?.totalPrice?.discountPrice!==0||!(g.price?.totalPrice?.originalPrice>0))continue;const slug=g.catalogNs?.mappings?.[0]?.pageSlug||g.productSlug;if(!/^[a-zA-Z0-9/_-]+$/.test(slug||''))continue;games.push({id:g.id,name:g.title,image:g.keyImages?.find((x:any)=>/OfferImageWide|DieselStoreFrontWide|Thumbnail/.test(x.type))?.url,end:active.endDate,url:'https://store.epicgames.com/tr/p/'+slug});}
  return {games,source:'Epic Games TR',checkedAt:new Date().toISOString()};
 }
 if(action==='spotify'){
  if(!env('SPOTIFY_CLIENT_ID')||!env('SPOTIFY_CLIENT_SECRET'))return {unavailable:true,message:'Spotify bağlantısı henüz yapılandırılmadı.'};
  const q=(p.get('q')||'').trim().slice(0,100);const t=await json('https://accounts.spotify.com/api/token',{method:'POST',headers:{Authorization:'Basic '+btoa(env('SPOTIFY_CLIENT_ID')+':'+env('SPOTIFY_CLIENT_SECRET')),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  const d=await json('https://api.spotify.com/v1/search?'+new URLSearchParams({q:q+' soundtrack',type:'track',limit:'3'}),{headers:{Authorization:'Bearer '+t.access_token}});
  return {tracks:(d.tracks?.items||[]).map((x:any)=>({id:x.id,name:x.name,artist:x.artists?.map((a:any)=>a.name).join(', '),url:x.external_urls?.spotify,preview:x.preview_url||null,image:x.album?.images?.[0]?.url})),source:'Spotify'};
 }
 if(action==='trending'){
  if(!env('TWITCH_CLIENT_ID')||!env('TWITCH_CLIENT_SECRET'))return {unavailable:true,message:'Twitch bağlantısı henüz yapılandırılmadı.',games:[]};
  const t=await json('https://id.twitch.tv/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env('TWITCH_CLIENT_ID'),client_secret:env('TWITCH_CLIENT_SECRET'),grant_type:'client_credentials'})});
  const d=await json('https://api.twitch.tv/helix/games/top?first=12',{headers:{'Client-Id':env('TWITCH_CLIENT_ID'),Authorization:'Bearer '+t.access_token}});
  return {games:(d.data||[]).map((g:any)=>({id:g.id,name:g.name,image:g.box_art_url?.replace('{width}','285').replace('{height}','380'),url:'https://www.twitch.tv/directory/category/'+encodeURIComponent(g.name.toLowerCase().replace(/ /g,'-'))})),label:'Twitch: şu an en çok izlenen kategoriler',checkedAt:new Date().toISOString()};
 }
 if(action==='youtube'){
  if(!env('YOUTUBE_API_KEY'))return{unavailable:true,message:'YouTube bağlantısı henüz yapılandırılmadı.',videos:[]};const q=(p.get('q')||'video games').slice(0,100),d=await json('https://www.googleapis.com/youtube/v3/search?'+new URLSearchParams({part:'snippet',type:'video',q,order:'viewCount',publishedAfter:new Date(Date.now()-48*3600e3).toISOString(),maxResults:'8',key:env('YOUTUBE_API_KEY')}));return{videos:(d.items||[]).map((v:any)=>({id:v.id.videoId,name:v.snippet.title,image:v.snippet.thumbnails?.medium?.url,url:'https://www.youtube.com/watch?v='+v.id.videoId})),label:'YouTube: son 48 saatte yayımlanan videolar',checkedAt:new Date().toISOString()};
 }
 throw Error('Bilinmeyen servis');
}
Deno.serve(async(req:Request)=>{const origin=req.headers.get('origin')||'';const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':ALLOWED.has(origin)?origin:'https://sfunder2.github.io','Access-Control-Allow-Headers':'authorization,content-type','Vary':'Origin'};if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='GET')return Response.json({error:'Yalnız GET desteklenir'},{status:405,headers});try{const u=new URL(req.url),action=u.searchParams.get('action')||'status',key=action+':'+(u.searchParams.get('city')||'')+':'+(u.searchParams.get('q')||''),old=cache.get(key);if(old&&Date.now()-old.at<10*60000)return Response.json(old.data,{headers});const data=await services(action,u.searchParams);if(cache.size>200)cache.clear();cache.set(key,{at:Date.now(),data});return Response.json(data,{headers});}catch(e){return Response.json({error:'Kaynak şu anda yanıt vermiyor. Biraz sonra tekrar dene.'},{status:503,headers});}});
