// Export only rows already returned for the signed-in user by the RLS-protected library API.
const FIELDS=['platform','game_id','game_title','play_status','added_at','updated_at'];
const safe=v=>String(v??'');
const csvCell=v=>{let s=safe(v);
 // Prevent spreadsheet formulas from executing when users open CSV in Excel.
 if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
};
export function exportLibraryJson(rows){
 if(!Array.isArray(rows))throw new TypeError('Rows must be an array');
 return JSON.stringify(rows.map(row=>Object.fromEntries(FIELDS.map(field=>[field,safe(row[field])]))),null,2);
}
export function exportLibraryCsv(rows){
 if(!Array.isArray(rows))throw new TypeError('Rows must be an array');
 return [FIELDS.join(','),...rows.map(row=>FIELDS.map(field=>csvCell(row[field])).join(','))].join('\r\n');
}
