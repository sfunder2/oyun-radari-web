import test from 'node:test';import assert from 'node:assert/strict';
import {signState,readState,safeReturn,loginUrl,verifyOpenId,parseOwned,parseProfile,parseAchievements,fetchLibrary,fetchAchievements,STEAM_OPENID} from '../scripts/steam-account.mjs';
const ID='76561197960287930',RET='https://x.supabase.co/functions/v1/steam-account?action=callback&state=s.t';
const steamReply=(over={})=>new URLSearchParams({'openid.ns':'http://specs.openid.net/auth/2.0','openid.mode':'id_res','openid.op_endpoint':STEAM_OPENID,'openid.claimed_id':'https://steamcommunity.com/openid/id/'+ID,'openid.identity':'https://steamcommunity.com/openid/id/'+ID,'openid.return_to':RET,'openid.response_nonce':'2026-10-24T07:00:00Zabc','openid.assoc_handle':'1234567890','openid.signed':'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle','openid.sig':'sig=',action:'callback',state:'s.t',...over});
test('state is signed, expires and rejects tampering',async()=>{
 const s=await signState({userId:'u1',returnTo:'https://sfunder2.github.io/oyun-radari/',now:1000},'k');
 assert.deepEqual(await readState(s,'k',2000),{userId:'u1',returnTo:'https://sfunder2.github.io/oyun-radari/'});
 assert.equal(await readState(s,'other',2000),null);assert.equal(await readState(s,'k',1000+11*60000),null);
 const [body,sig]=s.split('.'),forged=Buffer.from(JSON.stringify({u:'u2',r:'https://sfunder2.github.io/',e:9e15})).toString('base64url');
 assert.equal(await readState(forged+'.'+sig,'k',2000),null);assert.equal(await readState(body,'k',2000),null);assert.equal(await readState(null,'k'),null);
});
test('return address must be an allowed origin and drops query and hash',()=>{
 const allowed=new Set(['https://sfunder2.github.io']);
 assert.equal(safeReturn('https://sfunder2.github.io/oyun-radari/?a=1#x',allowed),'https://sfunder2.github.io/oyun-radari/');
 assert.equal(safeReturn('https://evil.example/',allowed),null);assert.equal(safeReturn('javascript:alert(1)',allowed),null);assert.equal(safeReturn(undefined,allowed),null);
});
test('login url asks Steam for identifier select with our return address',()=>{
 const u=new URL(loginUrl(RET));assert.equal(u.origin+u.pathname,STEAM_OPENID);assert.equal(u.searchParams.get('openid.return_to'),RET);assert.equal(u.searchParams.get('openid.realm'),'https://x.supabase.co');assert.equal(u.searchParams.get('openid.mode'),'checkid_setup');
});
test('OpenID reply is confirmed with Steam before trusting the SteamID',async()=>{
 let sent;const ok=async(url,init)=>{sent={url,body:new URLSearchParams(init.body)};return new Response('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n');};
 assert.equal(await verifyOpenId(steamReply(),RET,ok),ID);
 assert.equal(sent.url,STEAM_OPENID);assert.equal(sent.body.get('openid.mode'),'check_authentication');assert.equal(sent.body.get('openid.sig'),'sig=');assert.equal(sent.body.has('state'),false);
 const no=async()=>new Response('ns:http://specs.openid.net/auth/2.0\nis_valid:false\n');assert.equal(await verifyOpenId(steamReply(),RET,no),null);
 const never=async()=>{throw Error('should not call Steam')};
 assert.equal(await verifyOpenId(steamReply({'openid.return_to':'https://evil.example/'}),RET,never),null);
 assert.equal(await verifyOpenId(steamReply({'openid.claimed_id':'https://evil.example/openid/id/'+ID}),RET,never),null);
 assert.equal(await verifyOpenId(steamReply({'openid.op_endpoint':'https://evil.example/openid/login'}),RET,never),null);
 assert.equal(await verifyOpenId(steamReply({'openid.mode':'cancel'}),RET,never),null);
});
test('owned games are sorted by playtime; private library is null',()=>{
 const g=parseOwned({response:{game_count:2,games:[{appid:620,name:'Portal 2',playtime_forever:90,img_icon_url:'abc',rtime_last_played:1700000000},{appid:1145360,name:'Hades',playtime_forever:2520,playtime_2weeks:60}]}});
 assert.deepEqual(g.map(x=>[x.appid,x.minutes,x.minutes2w]),[[1145360,2520,60],[620,90,0]]);
 assert.equal(g[1].icon,'https://media.steampowered.com/steamcommunity/public/images/apps/620/abc.jpg');assert.equal(g[1].lastPlayed,'2023-11-14T22:13:20.000Z');assert.equal(g[0].lastPlayed,null);
 assert.equal(parseOwned({response:{}}),null);assert.equal(parseOwned(null),null);
});
test('profile keeps only https links and the visibility flag',()=>{
 const p=parseProfile({response:{players:[{steamid:ID,personaname:'Gabe',avatarfull:'https://avatars.steamstatic.com/a.jpg',profileurl:'https://steamcommunity.com/id/gabe/',communityvisibilitystate:3}]}});
 assert.deepEqual(p,{steamid:ID,name:'Gabe',avatar:'https://avatars.steamstatic.com/a.jpg',profileUrl:'https://steamcommunity.com/id/gabe/',public:true});
 assert.equal(parseProfile({response:{players:[{steamid:ID,avatarfull:'http://x',communityvisibilitystate:1}]}}).avatar,null);assert.equal(parseProfile({response:{players:[]}}),null);
});
test('player achievements count unlocked ones and keep unlock times',()=>{
 const a=parseAchievements({playerstats:{success:true,achievements:[{apiname:'A',achieved:1,unlocktime:1700000000},{apiname:'B',achieved:0,unlocktime:0},{apiname:'C',achieved:1,unlocktime:0}]}});
 assert.deepEqual(a,{total:3,unlocked:2,list:[{id:'A',at:'2023-11-14T22:13:20.000Z'},{id:'C',at:null}]});
 assert.equal(parseAchievements({playerstats:{success:false,error:'Requested app has no stats'}}),null);
});
test('library and achievements call Steam with the key and handle 400/403 as empty',async()=>{
 const urls=[];const f=async url=>{url=String(url);urls.push(url);
  if(url.includes('GetPlayerSummaries'))return new Response(JSON.stringify({response:{players:[{steamid:ID,personaname:'G',communityvisibilitystate:3}]}}));
  if(url.includes('GetOwnedGames'))return new Response(JSON.stringify({response:{}}));
  return new Response('{}',{status:400});};
 const lib=await fetchLibrary(ID,'KEY',f);assert.equal(lib.visible,false);assert.deepEqual(lib.games,[]);assert.equal(lib.profile.name,'G');
 assert.ok(urls.every(u=>u.startsWith('https://api.steampowered.com/')&&new URL(u).searchParams.get('key')==='KEY'));
 assert.equal(await fetchAchievements(ID,620,'KEY',f),null);
 await assert.rejects(fetchLibrary(ID,'KEY',async()=>new Response('x',{status:500})),/Steam HTTP 500/);
});
