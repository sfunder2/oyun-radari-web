import {compareGameOffers} from './compare-game-offers.mjs';

// Integration-ready presentation data for a catalog price card.
// Caller supplies actual offers and an explicit currency when mixed; no network or fabricated prices.
export function priceCardModel(offers,{currency,locale='tr-TR'}={}){
 const comparison=compareGameOffers(offers,{currency});
 const format=amount=>new Intl.NumberFormat(locale,{style:'currency',currency:comparison.currency}).format(amount);
 if(comparison.requiresCurrencySelection)return {
  state:'choose-currency',currencies:comparison.availableCurrencies,offers:[],best:null,savings:null
 };
 if(!comparison.best)return {
  state:'unavailable',currencies:comparison.availableCurrencies,offers:[],best:null,savings:null
 };
 const cardOffers=comparison.offers.map(o=>({
  store:o.store,priceText:format(o.price),
  discountText:o.discountPercent===null?null:'%'+o.discountPercent.toLocaleString(locale)+' indirim'
 }));
 return {
  state:'ready',currency:comparison.currency,
  offers:cardOffers,best:{store:comparison.best.store,priceText:format(comparison.best.price)},
  savings:comparison.savings===null?null:{
   amountText:format(comparison.savings),
   percentText:comparison.savingsPercent===null?null:'%'+comparison.savingsPercent.toLocaleString(locale)
  }
 };
}
