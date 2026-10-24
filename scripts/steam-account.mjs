// Steam hesabı bağlama: OpenID 2.0 doğrulaması ve Steam Web API yanıtlarının sadeleştirilmesi.
// steam-account Edge Function'ı ve testler kullanır; yalnız Web Crypto ve fetch gerekir (Node 22 ve Deno).
export const STEAM_OPENID='https://steamcommunity.com/openid/login';
const API='https://api.steampowered.com';
const enc=new TextEncoder();
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const fromB64url=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function hmac(secret,text){const key=await crypto.subtle.importKey('raw',enc.encode('steam-link:'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(text))));}

// Steam'e gidip dönen istek hangi site kullanıcısına aitti: imzalı ve 10 dakikalık durum değeri
export async function signState({userId,returnTo,now=Date.now()},secret){const body=b64url(enc.encode(JSON.stringify({u:userId,r:returnTo,e:now+10*60000})));return body+'.'+await hmac(secret,body);}
export async function readState(state,secret,now=Date.now()){
 const [body,sig]=String(state||'').split('.');if(!body||!sig||sig!==await hmac(secret,body))return null;
 try{const s=JSON.parse(new TextDecoder().decode(fromB64url(body)));return s.e>now&&s.u&&s.r?{userId:s.u,returnTo:s.r}:null;}catch{return null;}
}

// Yalnız izinli site adreslerine geri dönülür; sayfa bölümü (?section=) korunur, # atılır
export function safeReturn(url,allowed){try{const u=new URL(url);return allowed.has(u.origin)?u.origin+u.pathname+u.search:null;}catch{return null;}}

export function loginUrl(returnTo){const realm=new URL(returnTo).origin;return STEAM_OPENID+'?'+new URLSearchParams({'openid.ns':'http://specs.openid.net/auth/2.0','openid.mode':'checkid_setup','openid.return_to':returnTo,'openid.realm':realm,'openid.identity':'http://specs.openid.net/auth/2.0/identifier_select','openid.claimed_id':'http://specs.openid.net/auth/2.0/identifier_select'});}

// Steam'in döndüğü openid.* alanlarını Steam'e geri sorarak doğrular; SteamID64 ya da null döner
export async function verifyOpenId(params,expectedReturn,f=fetch){
 const p=new URLSearchParams(params);
 const id=p.get('openid.claimed_id')?.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/)?.[1];
 if(!id||p.get('openid.mode')!=='id_res'||p.get('openid.op_endpoint')!==STEAM_OPENID||p.get('openid.return_to')!==expectedReturn||p.get('openid.identity')!==p.get('openid.claimed_id'))return null;
 const body=new URLSearchParams();for(const [k,v] of p)if(k.startsWith('openid.'))body.set(k,v);body.set('openid.mode','check_authentication');
 const r=await f(STEAM_OPENID,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(12000)});
 if(!r.ok)return null;return /^is_valid\s*:\s*true\s*$/m.test(await r.text())?id:null;
}

async function api(path,args,key,f){const r=await f(API+path+'?'+new URLSearchParams({key,...args}),{signal:AbortSignal.timeout(12000)});if(r.status===400||r.status===403)return null;if(!r.ok)throw Error('Steam HTTP '+r.status);return r.json();}
const icon=(appid,hash)=>hash?`https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${hash}.jpg`:null;

export function parseProfile(j){const p=j?.response?.players?.[0];return p?{steamid:String(p.steamid),name:String(p.personaname||'').slice(0,64),avatar:/^https:\/\//.test(p.avatarfull||'')?p.avatarfull:null,profileUrl:/^https:\/\/steamcommunity\.com\//.test(p.profileurl||'')?p.profileurl:null,public:p.communityvisibilitystate===3}:null;}
// Gizli profilde ya da "Oyun ayrıntıları" kapalıyken Steam boş response döner
export function parseOwned(j){const games=j?.response?.games;if(!Array.isArray(games))return null;return games.map(g=>({appid:Number(g.appid),name:String(g.name||'').slice(0,160),minutes:Number(g.playtime_forever)||0,minutes2w:Number(g.playtime_2weeks)||0,lastPlayed:g.rtime_last_played?new Date(g.rtime_last_played*1000).toISOString():null,icon:icon(g.appid,g.img_icon_url)})).filter(g=>g.appid&&g.name).sort((a,b)=>b.minutes-a.minutes);}
export function parseAchievements(j){const s=j?.playerstats;if(!s?.success||!Array.isArray(s.achievements))return null;const list=s.achievements.map(a=>({id:String(a.apiname),at:a.achieved&&a.unlocktime?new Date(a.unlocktime*1000).toISOString():null,done:!!a.achieved}));return{total:list.length,unlocked:list.filter(a=>a.done).length,list:list.filter(a=>a.done).map(({id,at})=>({id,at}))};}

export async function fetchLibrary(steamid,key,f=fetch){
 const [p,o]=await Promise.all([api('/ISteamUser/GetPlayerSummaries/v0002/',{steamids:steamid},key,f),api('/IPlayerService/GetOwnedGames/v0001/',{steamid,include_appinfo:'1',include_played_free_games:'1'},key,f)]);
 const profile=parseProfile(p),games=parseOwned(o);
 return{profile,visible:!!games,games:games||[],totalMinutes:(games||[]).reduce((n,g)=>n+g.minutes,0)};
}
// Başarımı olmayan ya da gizli oyunlarda null döner
export async function fetchAchievements(steamid,appid,key,f=fetch){return parseAchievements(await api('/ISteamUserStats/GetPlayerAchievements/v0001/',{steamid,appid:String(appid)},key,f));}
