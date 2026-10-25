// Authenticated manual library access. Pass a PostgREST adapter with the user's JWT,
// never a service-role key. Database RLS remains the authority.
export const LIBRARY_PLATFORMS=new Set(['steam','playstation','xbox','switch','epic','gog','other']);
export const PLAY_STATUSES=new Set(['backlog','playing','completed','paused','dropped']);
const validId=s=>typeof s==='string'&&s.length>=1&&s.length<=120;
export function normalizeLibraryGame(input){
 if(!LIBRARY_PLATFORMS.has(input?.platform)||!validId(input?.game_id))
  throw new TypeError('Invalid game platform or id');
 const game_title=String(input?.game_title??'').trim();
 if(!game_title||game_title.length>240)throw new TypeError('Invalid game title');
 const play_status=input.play_status??'backlog';
 if(!PLAY_STATUSES.has(play_status))throw new TypeError('Invalid play status');
 return{platform:input.platform,game_id:input.game_id,game_title,play_status};
}
export function libraryClient(api,userId){
 if(!api||!validId(userId))throw new TypeError('Authenticated library client required');
 const query=(platform,gameId)=>'user_game_library?user_id=eq.'+encodeURIComponent(userId)+
   '&platform=eq.'+encodeURIComponent(platform)+'&game_id=eq.'+encodeURIComponent(gameId);
 const checkKey=(platform,gameId)=>{
  if(!LIBRARY_PLATFORMS.has(platform)||!validId(gameId))throw new TypeError('Invalid game key');
 };
 return {
  list:async()=>api.select('user_game_library?select=platform,game_id,game_title,play_status,added_at,updated_at&user_id=eq.'+
   encodeURIComponent(userId)+'&order=updated_at.desc&limit=200'),
  add:async input=>{
   const item=normalizeLibraryGame(input);
   await api.upsert('user_game_library',[{user_id:userId,...item,updated_at:new Date().toISOString()}],'user_id,platform,game_id');
   return item;
  },
  setStatus:async(platform,gameId,status)=>{
   checkKey(platform,gameId);
   if(!PLAY_STATUSES.has(status))throw new TypeError('Invalid play status');
   await api.patch(query(platform,gameId),{play_status:status,updated_at:new Date().toISOString()});
  },
  remove:async(platform,gameId)=>{
   checkKey(platform,gameId);
   await api.del(query(platform,gameId));
  }
 };
}
