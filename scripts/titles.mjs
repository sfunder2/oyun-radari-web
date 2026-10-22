import {norm} from './ps-store.mjs';
// Aynı oyunu mağazalar arasında eşleştiren anahtar: platform etiketleri ve "Standard/Edition/Sürüm" gibi sözcükler atılır.
// Deluxe/Ultimate gibi farklı ürünler ayrı kalır; yalnız birebir eşleşen başlıklar birleşir.
export function cleanTitle(name){
 return String(name||'').replace(/[™®©]/g,'').replace(/\(?\s*PS\s?[45]\s*(?:ve|and|und|&|\/|\+|,)?\s*(?:PS\s?[45])?\s*\)?/gi,' ').replace(/\s+/g,' ').trim();
}
export function titleKey(name){
 return norm(cleanTitle(name)).replace(/[^a-z0-9]+/g,' ').replace(/\b(standard|standart|edition|surum|digital|dijital)\b/g,' ').replace(/\s+/g,' ').trim();
}
