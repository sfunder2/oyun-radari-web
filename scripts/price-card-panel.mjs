import {priceCardModel} from './price-card-model.mjs';

// Host catalog passes real offers from its existing data feed; never fetches or invents prices.
export function renderPriceCard(root,offers,options={}){
 if(!root||typeof root.replaceChildren!=='function'||!root.ownerDocument?.createElement)
  throw new TypeError('A DOM mount element is required');
 const model=priceCardModel(offers,options);
 const doc=root.ownerDocument;
 const el=(tag,text)=>{const node=doc.createElement(tag);node.textContent=text;return node;};
 const section=el('section','');
 section.setAttribute('aria-label','Mağaza fiyat karşılaştırması');
 if(model.state!=='ready'){
  const info=el('p',model.message);
  info.setAttribute('role','status');
  section.append(info);
  if(model.state==='choose-currency'){
   const list=el('p','Para birimleri: '+model.currencies.join(', '));
   section.append(list);
   const select=el('select','');
   select.setAttribute('aria-label','Karşılaştırma para birimi');
   const placeholder=el('option','Para birimi seçin');placeholder.value='';select.append(placeholder);
   for(const code of model.currencies){const option=el('option',code);option.value=code;select.append(option);}
   select.addEventListener('change',()=>{
    if(model.currencies.includes(select.value))renderPriceCard(root,offers,{...options,currency:select.value});
   });
   section.append(select);
  }
 }else{
  const heading=el('h3','En uygun fiyat: '+model.best.store+' — '+model.best.priceText);
  section.append(heading);
  const list=el('ul','');
  for(const offer of model.offers){
   const row=el('li',offer.store+': '+offer.priceText+(offer.discountText?' ('+offer.discountText+')':''));
   list.append(row);
  }
  section.append(list);
  if(model.savings)section.append(el('p','Mağazalar arası fiyat farkı: '+model.savings.amountText));
 }
 root.replaceChildren(section);
 return model;
}
