/* Observed Wi-Fi presence intervals, never inferred across missing observations. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaPresenceHistoryCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const DAY=86400000,MAX_GAP=180000,MAX_DAYS=400;
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'});
 const day=at=>{const p=Object.fromEntries(fmt.formatToParts(at).map(p=>[p.type,p.value]));return p.year+'-'+p.month+'-'+p.day};
 const cutoff=at=>new Date(Date.parse(day(at)+'T12:00:00Z')-(MAX_DAYS-1)*DAY).toISOString().slice(0,10);
 const key=r=>r.person+':'+r.date;
 const state=value=>['home','away','unknown'].includes(value);
 // One minute per two-bit slot: 0 unconfirmed, 1 home, 2 away. Two slots per hex character.
 const boundsCache=new Map();
 function bounds(date){
  if(boundsCache.has(date))return boundsCache.get(date);
  const noon=Date.parse(date+'T12:00:00Z');
  function boundary(after){let lo=noon-DAY,hi=noon+DAY;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(after?day(mid)<=date:day(mid)<date)lo=mid;else hi=mid}return hi}
  const result={start:boundary(false),end:boundary(true)};
  if(boundsCache.size>=450)boundsCache.delete(boundsCache.keys().next().value);boundsCache.set(date,result);return result;
 }
 function mark(row,from,to,metric){
  const {start,end}=bounds(row.date),slots=(end-start)/60000;
  const chars=(row.timeline||'0'.repeat(slots/2)).split(''),value=metric==='homeMs'?1:metric==='awayMs'?2:0;
  const first=Math.max(0,Math.round((from-start)/60000)),last=Math.min(slots,Math.round((to-start)/60000));
  for(let i=first;i<last;i++){const at=Math.floor(i/2),shift=(i%2)*2;chars[at]=((parseInt(chars[at],16)&~(3<<shift))|(value<<shift)).toString(16)}
  row.timeline=chars.join('');
 }
 function intervals(row,date){
  const {start,end}=bounds(date),segments=[],slots=(end-start)/60000;
  for(let i=0;i<slots;i++){
   const v=row?.timeline?(parseInt(row.timeline[Math.floor(i/2)],16)>>((i%2)*2))&3:0,state=['unknown','home','away'][v],from=start+i*60000,to=from+60000,last=segments[segments.length-1];
   if(last?.state===state)last.to=to;else segments.push({state,from,to});
  }
  return {start,end,segments};
 }
 // Joint time is the intersection of the three minute timelines, never the minimum of daily totals.
 function together(rows,date){
  const {start,end}=bounds(date),people=[0,1,2].map(id=>rows.find(r=>r.person===id&&r.date===date)),chars=[],counts=[0,0,0];
  for(let i=0;i<(end-start)/60000;i++){
   const values=people.map(r=>r?.timeline?(parseInt(r.timeline[Math.floor(i/2)],16)>>((i%2)*2))&3:0);
   const value=values.every(v=>v===1)?1:values.some(v=>v===2)?2:0;counts[value]++;
   const at=Math.floor(i/2);chars[at]=((chars[at]||0)|(value<<((i%2)*2)));
  }
  return {date,homeMs:counts[1]*60000,awayMs:counts[2]*60000,unknownMs:counts[0]*60000,timeline:chars.map(v=>v.toString(16)).join('')};
 }
 function fingerprint(value){let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16).padStart(8,'0')}
 function validateRow(r){
  if(!r||!Number.isInteger(r.person)||r.person<0||r.person>2||typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date)throw Error('Dia de presença inválido.');
  for(const field of ['homeMs','awayMs','unknownMs','from','to','lastAt'])if(!Number.isSafeInteger(r[field])||r[field]<0)throw Error('Intervalo de presença inválido.');
  if(r.from>r.to||r.to>r.lastAt||day(r.from)!==r.date||(r.to>r.from&&day(r.to-1)!==r.date)||r.homeMs+r.awayMs+r.unknownMs>r.to-r.from||r.homeMs+r.awayMs+r.unknownMs>26*3600000)throw Error('Duração de presença inválida.');
  const o=r.observation;
  if(o!==null&&(!o||o.at!==r.lastAt||day(o.at)!==r.date||!state(o.state)||!/^[0-9a-f]{8}$/.test(o.identity)))throw Error('Observação de presença inválida.');
  if(o&&o.homeSince!==undefined&&o.homeSince!==null&&(!Number.isSafeInteger(o.homeSince)||o.homeSince<0||o.homeSince>o.at||o.state!=='home'))throw Error('Início da permanência inválido.');
  if(r.timeline!==undefined&&(typeof r.timeline!=='string'||r.timeline.length!==(bounds(r.date).end-bounds(r.date).start)/120000||!/^[01245689a]+$/.test(r.timeline)))throw Error('Detalhe horário de presença inválido.');
  return {...(r.timeline!==undefined?{timeline:r.timeline}:{}),person:r.person,date:r.date,homeMs:r.homeMs,awayMs:r.awayMs,unknownMs:r.unknownMs,from:r.from,to:r.to,lastAt:r.lastAt,observation:o?{at:o.at,state:o.state,identity:o.identity,homeSince:o.state==='home'?(o.homeSince??o.at):null}:null};
 }
 function validate(v){
  if(!v||v.version!==1||!Array.isArray(v.rows)||v.rows.length>MAX_DAYS*3)throw Error('Histórico de presenças inválido.');
  const rows=v.rows.map(validateRow);if(new Set(rows.map(key)).size!==rows.length)throw Error('Dias de presença repetidos.');return {version:1,rows};
 }
 function split(start,end){
  const spans=[];while(start<end){let cut=end;if(day(start)!==day(end-1)){let lo=start,hi=end;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(day(mid)===day(start))lo=mid;else hi=mid}cut=hi}spans.push([day(start),start,cut]);start=cut}return spans;
 }
 function create(value={version:1,rows:[]},now=Date.now){
  const rows=new Map(validate(value).rows.map(r=>[key(r),r])),last=[];
  function prune(){const first=cutoff(now());for(const [id,r]of rows)if(r.date<first||r.lastAt>now()+30000)rows.delete(id)}
  function baseline(){last.length=0;for(const r of rows.values())if(r.observation&&(!last[r.person]||last[r.person].at<r.observation.at))last[r.person]=r.observation}
  function merge(values){for(const value of values){const r=validateRow(value),old=rows.get(key(r));if(!old||r.lastAt>old.lastAt)rows.set(key(r),r)}prune();baseline()}
  function observe(people,at){
   if(!Number.isSafeInteger(at)||at>now()||now()-at>MAX_GAP||!Array.isArray(people)||people.length!==3)return [];
   if(people.some(p=>!state(p.state)||!/^[0-9a-f]{8}$/.test(p.identity)))return [];
   const changed=new Map();
   people.forEach((p,person)=>{
    const old=last[person];if(old&&at<=old.at)return;
    if(old&&old.identity===p.identity&&at-old.at<=MAX_GAP){
     const metric=old.state===p.state&&p.state!=='unknown'?(p.state==='home'?'homeMs':'awayMs'):'unknownMs';
     for(const [date,from,to]of split(old.at,at)){
      const id=key({person,date}),before=rows.get(id),r=before?{...before}:{person,date,homeMs:0,awayMs:0,unknownMs:0,from,to,lastAt:at,observation:null};
      mark(r,from,to,metric);r[metric]+=to-from;r.from=Math.min(r.from,from);r.to=Math.max(r.to,to);r.lastAt=at;r.observation=null;rows.set(id,r);changed.set(id,r);
     }
    }
    const date=day(at),id=key({person,date}),before=rows.get(id),r=before?{...before}:{person,date,homeMs:0,awayMs:0,unknownMs:0,from:at,to:at,lastAt:at,observation:null};
    r.to=Math.max(r.to,at);r.lastAt=at;r.observation={at,state:p.state,identity:p.identity,homeSince:p.state==='home'?(old?.state==='home'&&old.identity===p.identity&&at-old.at<=MAX_GAP?(old.homeSince??old.at):at):null};rows.set(id,r);changed.set(id,r);last[person]=r.observation;
   });prune();return [...changed.values()];
  }
  function current(person,at=now()){
   const o=last[person];if(!o||at<o.at||at-o.at>MAX_GAP)return {state:'unknown',homeSince:null,elapsed:null};
   const homeSince=o.state==='home'?(o.homeSince??o.at):null;
   return {state:o.state,homeSince,elapsed:homeSince===null?null:at-homeSince};
  }
  prune();baseline();
  return {observe,merge,current,rows:()=>{prune();return [...rows.values()]},snapshot:()=>{prune();return {version:1,rows:[...rows.values()]}}};
 }
 return {DAY,MAX_GAP,MAX_DAYS,bounds,intervals,together,day,cutoff,key,fingerprint,validateRow,validate,create};
});
