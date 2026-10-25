import {PLAY_STATUSES,LIBRARY_PLATFORMS} from './library.mjs';
import {exportLibraryCsv} from './library-export.mjs';

export const LIBRARY_STATUS_LABELS={backlog:'Oynanacak',playing:'Oynanıyor',completed:'Tamamlandı',paused:'Duraklatıldı',dropped:'Bırakıldı'};
export function filterLibrary(rows,{text='',status='all'}={}){
 const q=String(text).trim().toLocaleLowerCase('tr');
 if(status!=='all'&&!PLAY_STATUSES.has(status))throw new TypeError('Invalid filter');
 return rows.filter(row=>(status==='all'||row.play_status===status)&&
  (!q||String(row.game_title).toLocaleLowerCase('tr').includes(q)||String(row.platform).toLocaleLowerCase('tr').includes(q)));
}
export function downloadLibraryCsv(rows,doc=document){
 const content=exportLibraryCsv(rows);
 const blob=new Blob(['\ufeff'+content],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const a=doc.createElement('a');a.href=url;a.download='oyun-kutuphanem.csv';
 doc.body.append(a);try{a.click();}finally{a.remove();URL.revokeObjectURL(url);}
}
// Mount only after the host app has an authenticated session and has constructed
// libraryClient(userLibraryApi(...), session.user.id). No secrets or token storage here.
export function mountLibraryPanel(root,client,{doc=root?.ownerDocument}={}){
 if(!root||!doc||typeof client?.list!=='function')throw new TypeError('Library root and client required');
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const panel=el('section');panel.setAttribute('aria-label','Oyun kütüphanem');
 const heading=el('h2','Oyun kütüphanem');const feedback=el('p');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const form=el('form');const platform=el('select');platform.setAttribute('aria-label','Oyun platformu');
 for(const value of LIBRARY_PLATFORMS){const o=el('option',value);o.value=value;platform.append(o);}
 const id=el('input');id.required=true;id.maxLength=120;id.placeholder='Oyun kimliği';id.setAttribute('aria-label','Oyun kimliği');
 const title=el('input');title.required=true;title.maxLength=240;title.placeholder='Oyun adı';title.setAttribute('aria-label','Oyun adı');
 const add=el('button','Oyun ekle');add.type='submit';form.append(platform,id,title,add);
 const search=el('input');search.placeholder='Kütüphanede ara';search.setAttribute('aria-label','Kütüphanede ara');
 const filter=el('select');filter.setAttribute('aria-label','Oynama durumuna göre filtrele');
 for(const [value,label] of [['all','Tümü'],...Object.entries(LIBRARY_STATUS_LABELS)]){const o=el('option',label);o.value=value;filter.append(o);}
 const exportBtn=el('button','CSV dışa aktar');exportBtn.type='button';const list=el('ul');
 const more=el('button','Daha fazla oyun yükle');more.type='button';more.hidden=true;
 const PAGE_SIZE=100;let rows=[];let busy=false;let hasMore=false;
 const run=async fn=>{if(busy)return;busy=true;feedback.textContent='İşleniyor…';try{await fn();feedback.textContent='İşlem tamamlandı.';}catch(e){feedback.textContent='İşlem tamamlanamadı. Oturumunuzu ve bağlantınızı kontrol edin.';}finally{busy=false;}};
 const draw=()=>{
  list.replaceChildren();
  more.hidden=!hasMore;
  const visible=filterLibrary(rows,{text:search.value,status:filter.value});
  if(!visible.length){list.append(el('li','Gösterilecek oyun yok.'));return;}
  for(const game of visible){
   const li=el('li');li.append(el('span',game.game_title+' ('+game.platform+') '));
   const state=el('select');state.setAttribute('aria-label',game.game_title+' oynama durumu');
   for(const [value,label] of Object.entries(LIBRARY_STATUS_LABELS)){const option=el('option',label);option.value=value;state.append(option);}state.value=game.play_status;
   state.addEventListener('change',()=>{
    const previous=game.play_status;
    void run(async()=>{
     try{await client.setStatus(game.platform,game.game_id,state.value);game.play_status=state.value;draw();}
     catch(error){state.value=previous;throw error;}
    });
   });
   const remove=el('button','Sil');remove.type='button';remove.setAttribute('aria-label',game.game_title+' oyununu sil');
   remove.addEventListener('click',()=>{
    if(typeof doc.defaultView?.confirm==='function'&&!doc.defaultView.confirm(game.game_title+' silinsin mi?'))return;
    void run(async()=>{
     await client.remove(game.platform,game.game_id);
     rows=rows.filter(row=>row.platform!==game.platform||row.game_id!==game.game_id);draw();
    });
   });
   li.append(state,remove);list.append(li);
  }
 };
 const fetchPage=async(offset)=>{
  if(typeof client.listPage!=='function'){
   if(offset)return [];
   return client.list();
  }
  return client.listPage({offset,limit:PAGE_SIZE});
 };
 const reload=()=>run(async()=>{
  const page=await fetchPage(0);
  rows=page;hasMore=typeof client.listPage==='function'&&page.length===PAGE_SIZE;draw();
 });
 more.addEventListener('click',()=>void run(async()=>{
  const page=await fetchPage(rows.length);
  const keys=new Set(rows.map(x=>x.platform+':'+x.game_id));
  rows.push(...page.filter(x=>!keys.has(x.platform+':'+x.game_id)));
  hasMore=page.length===PAGE_SIZE;draw();
 }));
 const reloadAfterAdd=async()=>{const page=await fetchPage(0);rows=page;hasMore=typeof client.listPage==='function'&&page.length===PAGE_SIZE;};
 form.addEventListener('submit',event=>{event.preventDefault();void run(async()=>{await client.add({platform:platform.value,game_id:id.value,game_title:title.value});await reloadAfterAdd();form.reset();draw();});});
 search.addEventListener('input',draw);filter.addEventListener('change',draw);
 exportBtn.addEventListener('click',()=>downloadLibraryCsv(rows,doc));
 panel.append(heading,feedback,form,search,filter,exportBtn,list,more);root.replaceChildren(panel);void reload();
 return{reload,destroy:()=>{panel.remove();}};
}
