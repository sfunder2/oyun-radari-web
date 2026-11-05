const devices = [
  ['ps5', /(?:ps\s*5|playstation\s*5)/g],
  ['ps4', /(?:ps\s*4|playstation\s*4)/g],
  ['xbox_series', /xbox\s+series(?:\s+[xs])?/g],
  ['xbox_one', /xbox\s+one/g],
  ['switch', /(?:nintendo\s+)?switch/g],
  ['pc', /pc/g],
];
const markets = [
  ['steam', /steam/g], ['playstation', /(?:playstation|ps\s+store|psn)/g],
  ['xbox', /xbox/g], ['epic', /(?:epic\s+games|epic)/g], ['gog', /gog/g],
];
const genres = [
  ['Aksiyon', /aksiyon/g], ['Macera', /macera/g], ['RPG', /rpg/g],
  ['Strateji', /strateji/g], ['Simülasyon', /simulasyon/g], ['Spor', /spor/g],
  ['Yarış', /yaris/g], ['Bağımsız', /(?:bagimsiz|indie)/g],
  ['Rahat', /(?:rahat|cozy)/g], ['MMO', /mmo/g],
];
const turkish = {ç:'c', ğ:'g', ı:'i', İ:'i', ö:'o', ş:'s', ü:'u', Ç:'c', Ğ:'g', Ö:'o', Ş:'s', Ü:'u'};
const fold = text => text.replace(/[çğıİöşüÇĞÖŞÜ]/g, char => turkish[char]).toLowerCase();

export function parseSmartSearch(input) {
  const query = input.trim();
  const intent = {query};
  const title = query.split('');
  let pending = fold(query).replace(/"[^"]*"|“[^”]*”/g, match => ' '.repeat(match.length));

  function take(pattern, accept) {
    const bounded = new RegExp("(?<![\\p{L}\\p{N}])(?:" + pattern.source + ")(?![\\p{L}\\p{N}])", 'gu');
    for (const match of pending.matchAll(bounded)) {
      if (!accept(match)) continue;
      const start = match.index;
      const length = match[0].length;
      title.fill(' ', start, start + length);
      pending = pending.slice(0, start) + ' '.repeat(length) + pending.slice(start + length);
    }
  }
  function set(key, value) {
    if (intent[key] !== undefined && intent[key] !== value) return false;
    intent[key] = value;
    return true;
  }

  take(/(?:en\s+fazla|maksimum|butce(?:m)?\s*[:=]?)\s*(\d{1,3}(?:[. ]\d{3})+|\d+)(?:,(\d{1,2}))?\s*(?:tl|try|₺)/, budget);
  take(/(\d{1,3}(?:[. ]\d{3})+|\d+)(?:,(\d{1,2}))?\s*(?:tl|try|₺)(?:['’]?(?:nin|nun|nın|nün))?\s*(?:altinda|altina|alti|ve\s+alti|gecmesin)/, budget);
  function budget(match) {
    const value = Number(match[1].replace(/[. ]/g, '') + (match[2] ? '.' + match[2] : ''));
    return value > 0 && value <= 1000000 && set('maxPrice', String(value));
  }

  take(/(\d{1,3})\s*\+\s*puan|(\d{1,3})\s*puan\s+ve\s+uzeri/, match => {
    const score = Number(match[1] ?? match[2]);
    return score > 0 && score <= 100 && set('minScore', score);
  });
  for (const [id, pattern] of devices) {
    take(new RegExp(pattern.source + "(?:['’](?:de|da|te|ta|icin))?"), () => set('platform', id));
  }
  for (const [id, pattern] of markets) {
    take(new RegExp(pattern.source + "(?:['’](?:de|da|te|ta|icin))?"), () => set('market', id));
  }
  take(/(?:bolunmus|bolmeli)\s+ekran|split[ -]?screen/, () => set('gmode', 'split'));
  take(/(?:iki|2)\s+kisilik|co[ -]?op|kooperatif|birlikte\s+oynanabilen/, () => intent.gmode === 'split' || set('gmode', 'coop'));
  take(/turkce(?:\s+dil\s+destegi(?:\s+olan)?)?(?!\s+dublaj)/, () => set('turkish', true));
  take(/indirimde(?:\s+mi|\s+olan)?|indirimli/, () => set('deals', true));
  function isGenreRequest(match) {
    const rest = pending.slice(0, match.index) + pending.slice(match.index + match[0].length);
    return /^(?:\s|[?!.,]|oyun(?:lari?)?|oner(?:ir misin)?)*$/.test(rest);
  }
  for (const [name, pattern] of genres) take(pattern, match => isGenreRequest(match) && set('genre', name));
  take(/korku|horror/, match => isGenreRequest(match) && set('tag', 'Horror'));

  if (Object.keys(intent).length === 1) {
    return {query: query.replace(/^(?:"([^"]+)"|“([^”]+)”)$/, (_, straight, curly) => straight ?? curly)};
  }
  intent.query = title.join('').replace(/["“”]/g, '').replace(/\s+/g, ' ').trim()
    .replace(/(?:^|\s)(?:oyun(?:lar[iı]?)?|öner(?:ir misin)?|var m[ıi])\s*[?!.]*$/iu, '').trim()
    .replace(/^[·,;:]+|[·,;:?!]+$/g, '').trim();
  if (!intent.market && intent.platform === 'switch') intent.market = 'switch';
  intent.smart = true;
  return intent;
}
