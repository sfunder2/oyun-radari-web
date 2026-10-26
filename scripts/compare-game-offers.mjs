// Price-comparison core. Only compare offers with the SAME currency.
// No currency conversion or claim that regional offers are directly purchasable.
export function compareGameOffers(offers,{currency}={}){
 if(!Array.isArray(offers))throw new TypeError('Offers must be an array');
 const valid=offers.filter(o=>o&&typeof o.store==='string'&&o.store.trim()&&
   typeof o.currency==='string'&&/^[A-Z]{3}$/.test(o.currency)&&
   typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>=0);
 // Never silently pick a currency when a response mixes currencies: feed order is not user preference.
 const currencies=[...new Set(valid.map(o=>o.currency))];
 const selectedCurrency=currency??(currencies.length===1?currencies[0]:null);
 if(selectedCurrency!==null&&!/^[A-Z]{3}$/.test(selectedCurrency))throw new TypeError('Invalid currency');
 const comparable=valid.filter(o=>selectedCurrency!==null&&o.currency===selectedCurrency)
   .map(o=>({store:o.store,price:o.price,currency:o.currency,discountPercent:
     typeof o.discountPercent==='number'&&Number.isFinite(o.discountPercent)&&o.discountPercent>=0&&o.discountPercent<=100?o.discountPercent:null}))
   .sort((a,b)=>a.price-b.price||a.store.localeCompare(b.store,'tr'));
 const best=comparable[0]??null;
 const highest=comparable.length>1?comparable[comparable.length-1].price:null;
 const savings=best!==null&&highest!==null?Math.max(0,highest-best.price):null;
 const savingsPercent=savings!==null&&highest>0?Math.round(savings/highest*10000)/100:null;
 return {currency:selectedCurrency,requiresCurrencySelection:currencies.length>1&&currency==null,availableCurrencies:currencies.sort(),offers:comparable,best,
   savings,savingsPercent,excluded:offers.length-comparable.length};
}
