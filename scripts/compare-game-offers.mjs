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
 if(selectedCurrency!==null&&(typeof selectedCurrency!=='string'||!/^[A-Z]{3}$/.test(selectedCurrency)))throw new TypeError('Invalid currency');
 const comparable=valid.filter(o=>selectedCurrency!==null&&o.currency===selectedCurrency)
   .map(o=>({store:o.store,price:o.price,currency:o.currency,originalPrice:
     o.originalPriceVerified===true&&typeof o.originalPrice==='number'&&Number.isFinite(o.originalPrice)&&o.originalPrice>o.price?o.originalPrice:null}))
   .sort((a,b)=>a.price-b.price||a.store.localeCompare(b.store,'tr'));
 // Multiple feed rows for one store must not inflate store-to-store savings.
 const seen=new Set();
 const unique=comparable.filter(o=>{const key=o.store.trim().toLocaleLowerCase('tr');if(seen.has(key))return false;seen.add(key);return true;});
 // A discount badge is trustworthy only with a valid reference price.
 const annotated=unique.map(o=>({...o,discountPercent:o.originalPrice!==null?
   Math.round((1-o.price/o.originalPrice)*10000)/100:null}));
 const best=annotated[0]??null;
 const highest=annotated.length>1?annotated[annotated.length-1].price:null;
 const savings=best!==null&&highest!==null?Math.max(0,highest-best.price):null;
 const savingsPercent=savings!==null&&highest>0?Math.round(savings/highest*10000)/100:null;
 return {currency:selectedCurrency,requiresCurrencySelection:currencies.length>1&&currency==null,availableCurrencies:currencies.sort(),offers:annotated,best,
   savings,savingsPercent,excluded:offers.length-comparable.length};
}
