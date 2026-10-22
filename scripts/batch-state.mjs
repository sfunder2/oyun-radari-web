// Pure merge: records that were not successfully fetched retain their original timestamps.
export function mergeBatch(previous, records, {startedAt, errors=[], cursors={}, pages=[]}={}) {
 const items=new Map((previous.items||[]).map(i=>[i.id,i]));
 const seen=new Set();let added=0;
 for(const item of records){if(!item.id||!item.name||!Number.isFinite(item.price)||item.price<0)continue;if(!items.has(item.id))added++;items.set(item.id,item);seen.add(item.id);}
 return {...previous,updatedAt:seen.size?new Date().toISOString():previous.updatedAt,cursors,errors,items:[...items.values()],
  batch:{startedAt,finishedAt:new Date().toISOString(),status:errors.length?(seen.size?'partial':'failed'):'ok',refreshed:seen.size,added,total:items.size,pages,intervalMinutes:15}};
}
