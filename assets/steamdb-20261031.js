// SteamDB navigation only. No requests, scraping, API keys, or imported price history.
const MAX_APP_ID=4294967295;
export function validSteamAppId(value){
 if(typeof value==='number')return Number.isSafeInteger(value)&&value>0&&value<=MAX_APP_ID?String(value):null;
 if(typeof value!=='string'||!/^\d{1,10}$/.test(value))return null;
 const n=Number(value);return n>0&&n<=MAX_APP_ID?String(n):null;
}
export function steamAppIdFor(item){
 if(!item||typeof item!=='object')return null;
 const explicit=validSteamAppId(item.steamAppid);
 if(item.platform!=='steam')return explicit;
 // Never guess by game name. Conflicting identifiers must not open a different game's page.
 const ids=[explicit,validSteamAppId(item.storeId),typeof item.id==='string'&&/^steam:\d+$/.test(item.id)?validSteamAppId(item.id.slice(6)):null].filter(Boolean);
 return ids.length&&ids.every(id=>id===ids[0])?ids[0]:null;
}
export function steamDBLinks(item){
 const id=steamAppIdFor(item);if(!id)return null;
 const app='https://steamdb.info/app/'+id+'/';
 return {appid:id,prices:app+'#pricehistory',charts:app+'charts/',patches:app+'patchnotes/'};
}
export function createSteamDBLinks(React){
 const h=React.createElement;
 return function SteamDBLinks({item}){
  const links=steamDBLinks(item);if(!links)return null;
  return h('section',{className:'steamdb-panel','aria-label':'SteamDB'},
   h('h3',null,"SteamDB'de incele"),
   h('div',{className:'steamdb-actions'},...[[links.prices,'Fiyat geçmişi'],[links.charts,'Oyuncu grafikleri'],[links.patches,'Güncellemeler']].map(([href,label])=>h('a',{key:href,href,target:'_blank',rel:'noopener noreferrer','aria-label':label+' · SteamDB (yeni sekme)'},label+' ↗'))),
   h('p',null,'SteamDB ayrı sekmede açılır. Buradaki fiyatlar Steam mağazasından alınır.'));
 };
}
