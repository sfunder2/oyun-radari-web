// Browser-safe PostgREST adapter for the private manual library.
// Supply a PUBLIC anon key and a fresh signed-in user's access token via getAccessToken.
// Never pass the Supabase service-role key to browser code.
export function userLibraryApi({url,anonKey,getAccessToken,fetchImpl=fetch}){
 const base=new URL(url);
 if(base.protocol!=='https:'&&base.hostname!=='localhost')throw new TypeError('HTTPS required');
 if(typeof anonKey!=='string'||!anonKey||typeof getAccessToken!=='function')throw new TypeError('Session required');
 const root=base.origin+base.pathname.replace(/\/$/,'')+'/rest/v1/';
 const allowedPath=/^user_game_library(?:\?|$)/;
 async function request(method,path,body){
  if(!allowedPath.test(path))throw new TypeError('Unsupported table');
  const token=await getAccessToken();
  if(typeof token!=='string'||!token)throw new Error('Sign in required');
  const headers={apikey:anonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'};
  if(method==='POST')headers.Prefer='resolution=merge-duplicates,return=minimal';
  if(method==='PATCH'||method==='DELETE')headers.Prefer='return=minimal';
  const response=await fetchImpl(root+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok)throw new Error('Library request failed: HTTP '+response.status);
  if(method!=='GET')return null;
  return response.json();
 }
 return{
  select:path=>request('GET',path),
  upsert:async(table,rows,conflict)=>{
   if(table!=='user_game_library'||conflict!=='user_id,platform,game_id')throw new TypeError('Unsupported upsert');
   return request('POST',table+'?on_conflict=user_id,platform,game_id',rows);
  },
  patch:(path,body)=>request('PATCH',path,body),
  del:path=>request('DELETE',path)
 };
}
