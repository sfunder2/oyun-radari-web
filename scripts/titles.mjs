import {norm} from './ps-store.mjs';
// Aynı oyunu mağazalar arasında eşleştiren anahtar: platform etiketleri ve "Standard/Edition/Sürüm" gibi sözcükler atılır.
// Deluxe/Ultimate gibi farklı ürünler ayrı kalır; yalnız birebir eşleşen başlıklar birleşir.
// Aynı kurallar scripts/title-key-sql.mjs ile Postgres'e (radar_title_key) taşınır; desenler bu yüzden düz metin olarak tutulur.

// Tek bir platform adı: PS4/PS5, PlayStation 4/5, Xbox One/Series X|S, Windows, PC, Nintendo Switch.
// "PlayStation Plus" ya da "PlayStation VR" gibi ürünler eşleşmez (rakam zorunlu).
const PLAT=String.raw`(?:ps\s?[45](?:\s?pro)?|playstation\s?[45]|xbox\s+series\s+(?:x\s*[|/]\s*s|s\s*[|/]\s*x|x|s)|xbox\s+series|xbox\s+one(?:\s+x)?|xbox\s+xsx|xbox|windows(?:\s+(?:10|11|pc))?|win|pc|nintendo\s+switch(?:\s*2)?)`;
const CONSOLE=String.raw`(?:ps\s?[45]|playstation\s?[45]|xbox\s+series\s+(?:x\s*[|/]\s*s|s\s*[|/]\s*x|x|s)|xbox\s+one)`;
const JOIN=String.raw`\s*(?:&|/|\+|,|\||\bve\b|\band\b|\bund\b|\bile\b)\s*`;
const TAIL=String.raw`(?:\s+(?:edition|version|surumu|sürümü|only))?`;
const phrase=p=>String.raw`(?:for\s+)?${p}(?:${JOIN}${p})*${TAIL}`;

// Sırayla uygulanan kurallar [desen, yerine, bayrak]. Hepsi büyük/küçük harf duyarsızdır.
export const CLEAN_RULES=[
 // "(Xbox One & Xbox Series X|S)", "(Windows)", "(PC)", "(PlayStation 5)", "(Switch)", "(Game Preview)"
 [String.raw`[(\[]\s*(?:${phrase(String.raw`(?:${PLAT}|switch)`)}|game\s+preview|oyun\s+(?:o|ö)n\s+[iİ]zleme|early\s+access)\s*[)\]]`,' ','g'],
 // " - Windows Edition", ": Xbox One Edition", " for Windows 10", " – PS4 & PS5" (yalnız sonda)
 [String.raw`\s*(?:[-–—:]\s*|\s+(?=for\s))${phrase(PLAT)}\s*$`,'',''],
 // Ayraçsız sondaki konsol adı: "Oyun Xbox One" (PC/Windows/Switch gibi genel sözcükler hariç)
 [String.raw`\s+${phrase(CONSOLE)}\s*$`,'',''],
 // "Oyun - Windows: Xbox Edition" gibi iki katlı ekler için bir tur daha
 [String.raw`\s*(?:[-–—:]\s*|\s+(?=for\s))${phrase(PLAT)}\s*$`,'',''],
 // Eski kural: adın herhangi bir yerindeki "PS4 ve PS5", "(PS5)"
 [String.raw`\(?\s*PS\s?[45]\s*(?:ve|and|und|&|/|\+|,)?\s*(?:PS\s?[45])?\s*\)?`,' ','g'],
 [String.raw`\s+`,' ','g'],
 [String.raw`[\s\-–—:]+$`,'',''],
];
// norm() sonrası anahtar kuralları.
export const KEY_RULES=[
 [String.raw`[^a-z0-9]+`,' ','g'],
 [String.raw`\b(?:standard|standart|edition|surum|digital|dijital)\b`,' ','g'],
 [String.raw`\s+`,' ','g'],
 [String.raw`^\s+|\s+$`,'','g'],
 // "Enhanced" / "Enhanced Edition" aynı oyunun güncel sürümüdür (GTA V Enhanced, Baldur's Gate: Enhanced Edition).
 [String.raw`^(.+\S) enhanced$`,'$1',''],
];
const compile=rules=>rules.map(([p,r,f])=>[new RegExp(p,f+'i'),r]);
const CLEAN=compile(CLEAN_RULES),KEY=compile(KEY_RULES);

export function cleanTitle(name){
 let s=String(name||'').replace(/[™®©]/g,'');
 for(const [re,r] of CLEAN)s=s.replace(re,r);
 return s.trim();
}
export function titleKey(name){
 let s=norm(cleanTitle(name));
 for(const [re,r] of KEY)s=s.replace(re,r);
 return s;
}
