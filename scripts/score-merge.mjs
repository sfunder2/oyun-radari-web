export function mergeScores(previous,next){
 if(!next)return previous||null;
 const out={...previous,...next};
 for(const [field,related]of [['metacritic',['metacritic_platform','metacritic_url','metacritic_checked_at']],['opencritic',['opencritic_reviews','opencritic_url','opencritic_checked_at']]]){
  if(!Number.isFinite(next[field])||next[field]<=0){out[field]=previous?.[field]??null;for(const name of related)out[name]=previous?.[name]??null;}
  else out[field+'_checked_at']=next.checked_at;
 }
 return out;
}
