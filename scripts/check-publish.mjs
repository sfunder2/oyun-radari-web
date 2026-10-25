// GitHub Pages smoke check. Verifies public HTML and referenced bundle files.
// Does not claim Supabase migrations, Edge deployments or feature integration passed.
export function assetPaths(html,siteUrl){
 const paths=[...String(html).matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(m=>new URL(m[1],siteUrl).href);
 return [...new Set(paths)];
}
export async function checkPublishedSite({siteUrl='https://sfunder2.github.io/oyun-radari-web/',fetchImpl=fetch}={}){
 const result={siteUrl,htmlOk:false,assets:[],errors:[]};
 let html;
 try{
  const response=await fetchImpl(siteUrl,{redirect:'follow'});
  if(!response.ok)throw new Error('HTML HTTP '+response.status);
  html=await response.text();result.htmlOk=html.includes('<div id="root"');
  if(!result.htmlOk)result.errors.push('Expected app root absent');
 }catch(e){result.errors.push(String(e.message||e));return result;}
 for(const url of assetPaths(html,siteUrl)){
  try{
   const response=await fetchImpl(url,{redirect:'follow'});
   const ok=response.ok;
   result.assets.push({url,ok,status:response.status});
   if(!ok)result.errors.push('Asset HTTP '+response.status+': '+url);
  }catch(e){result.assets.push({url,ok:false,status:null});result.errors.push(String(e.message||e));}
 }
 if(!result.assets.length)result.errors.push('No JS or CSS assets found');
 return result;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const status=await checkPublishedSite();
 console.log(JSON.stringify(status,null,2));
 if(status.errors.length)process.exitCode=1;
}
