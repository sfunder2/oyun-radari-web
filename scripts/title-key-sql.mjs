// titles.mjs kurallarından Postgres karşılığını (public.radar_title_key) üretir: node scripts/title-key-sql.mjs
// Toplanan satırların anahtarı JS ile, mevcut satırların toplu yeniden anahtarlanması bu fonksiyonla yapılır; ikisi aynı desenleri kullanır.
import {CLEAN_RULES,KEY_RULES} from './titles.mjs';
const lit=s=>"'"+s.replaceAll("'","''")+"'";
// JS -> Postgres ARE: \b kelime sınırı \y olur, $1 geri başvurusu \1 olur.
const pg=p=>p.replaceAll(String.raw`\b`,String.raw`\y`);
const apply=(expr,[p,r,f])=>`regexp_replace(${expr}, ${lit(pg(p))}, ${lit(r.replace(/\$(\d)/g,'\\$1'))}, ${lit(f+'i')})`;
export function titleKeySql(){
 let clean=`regexp_replace(coalesce(name,''), '[™®©]', '', 'g')`;
 for(const r of CLEAN_RULES)clean=apply(clean,r);
 // norm(): aksanlar atılır, küçük harfe çevrilir (Türkçe ı -> i), boşluklar sadeleşir.
 let key=`replace(lower(regexp_replace(normalize(btrim(${clean}), NFKD), '[\\u0300-\\u036f]', '', 'g')), 'ı', 'i')`;
 for(const r of KEY_RULES)key=apply(key,r);
 return `create or replace function public.radar_title_key(name text) returns text
 language sql immutable parallel safe set search_path = '' as $f$
 select ${key}
$f$;`;
}
if(import.meta.url===`file://${process.argv[1]}`)console.log(titleKeySql());
