import {userLibraryApi} from './library-api.mjs';
import {libraryClient} from './library.mjs';
import {mountLibraryPanel} from './library-panel.mjs';

export function shouldCloseLibrarySession(event,session,userId){
 return event==='SIGNED_OUT'||Boolean(session?.user?.id&&session.user.id!==userId);
}

// Integration entrypoint for an existing authenticated Supabase JS application.
// A server-verified getUser() identity is required; never infer user_id from URL parameters.
export async function mountAuthenticatedLibrary(root,{supabase,url,publishableKey}={}){
 if(!root||typeof supabase?.auth?.getUser!=='function'||typeof supabase?.auth?.getSession!=='function')
  throw new TypeError('Authenticated Supabase client and root required');
 const {data:userData,error:userError}=await supabase.auth.getUser();
 const user=userData?.user;
 if(userError||!user?.id)throw new Error('Sign in required');
 const id=user.id;
 let active=true;
 const getAccessToken=async()=>{
  if(!active)throw new Error('Library session closed');
  const {data,error}=await supabase.auth.getSession();
  if(!active||error||data?.session?.user?.id!==id)throw new Error('Session changed: sign in again');
  const token=data.session.access_token;
  if(!token)throw new Error('Sign in required');
  return token;
 };
 const api=userLibraryApi({url,anonKey:publishableKey,getAccessToken});
 const client=libraryClient(api,id);
 let panel;
 try{panel=mountLibraryPanel(root,client);}
 catch(error){active=false;throw error;}
 let subscription;
 const close=()=>{
  if(!active)return;
  active=false;
  subscription?.subscription?.unsubscribe?.();
  panel.destroy();root.replaceChildren();
 };
 const result=supabase.auth.onAuthStateChange?.((event,session)=>{
  if(!active)return;
  if(shouldCloseLibrarySession(event,session,id)){
   close();
  }
 });
 subscription=result?.data;
 if(!active)subscription?.subscription?.unsubscribe?.();
 return{
  destroy(){close();},
  reload:()=>active?panel.reload():Promise.reject(new Error('Library session closed'))
 };
}
