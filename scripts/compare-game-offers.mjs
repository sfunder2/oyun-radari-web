// Price-comparison core. Only compare offers with the SAME currency.
// No currency conversion or claim that regional offers are directly purchasable.
export function compareGameOffers(offers,{currency}={}){
 if(!Array.isArray(offers))throw new TypeError('Offers must be an array');
 const valid=offers.filter(o=>o&&typeof o.store==='string'&&o.store.trim()&&
   typeof o.currency==='string'&&/^[A-Z]{3}$/.test(o.currency)&&
   typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>=0);
 const selectedCurrency=currency??(valid.length?valid[0].currency:null);
 if(selectedCurrency!==null&&!/^[A-Z]{3}$/.test(selectedCurrency))throw new TypeError('Invalid currency');
 const comparable=valid.filter(o=>o.currency===selectedCurrency)
   .map(o=>({store:o.store,price:o.price,currency:o.currency,discountPercent:
     typeof o.discountPercent==='number'&&Number.isFinite(o.discountPercent)&&o.discountPercent>=0&&o.discountPercent<=100?o.discountPercent:null}))
   .sort((a,b)=>a.price-b.price||a.store.localeCompare(b.store,'tr'));
 return {currency:selectedCurrency,offers:comparable,best:comparable[0]??null,
   excluded:offers.length-comparable.length};
}
