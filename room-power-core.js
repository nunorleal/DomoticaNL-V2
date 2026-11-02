/* Current measured room loads only. No transport, inferred watts or historical totals. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaRoomPowerCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function aggregate(rooms,entries){
  const grouped=new Map(rooms.map(r=>[r.id,new Map()]));
  for(const e of entries){const room=grouped.get(e.room);if(!room||!e.key)continue;const valid=e.current===true&&typeof e.watts==='number'&&Number.isFinite(e.watts)&&e.watts>=0,old=room.get(e.key);if(!old)room.set(e.key,{watts:valid?e.watts:null});else if(!valid||old.watts===null||Math.abs(old.watts-e.watts)>1e-8)old.watts=null;}
  return rooms.map(r=>{const rows=[...grouped.get(r.id).values()],known=rows.filter(e=>e.watts!==null);return {...r,watts:known.length?known.reduce((n,e)=>n+e.watts,0):null,known:known.length,total:rows.length,partial:known.length>0&&known.length<rows.length};});
 }
 function consumers(entries,room,retained=[]){const rows=new Map(),keep=new Set(retained);for(const e of entries){if(e.room!==room||!e.key)continue;const valid=e.current===true&&typeof e.watts==='number'&&Number.isFinite(e.watts)&&e.watts>=0,old=rows.get(e.key);if(!old)rows.set(e.key,{...e,current:valid,watts:valid?e.watts:null});else if(!valid||!old.current||old.watts!==e.watts){old.current=false;old.watts=null}}return [...rows.values()].filter(e=>keep.has(e.key)||e.current&&e.watts>0)}
 function reading(device,b,kind='auto'){
  const s=device?.status||{},i=b.channel,object=v=>v&&typeof v==='object'&&!Array.isArray(v);let candidates=[];
  const add=(family,c)=>{if(object(c))candidates.push({family,c})};
  if(kind==='cover'){add('cover',s['cover:'+i]);if(!candidates.length)add('meter',s.meters?.[i]);}
  else if(kind==='light'){add('light',s['light:'+i]||s.lights?.[i]);if(!candidates.length)add('meter',s.meters?.[i]);}
  else{add('switch',s['switch:'+i]);add('pm1',s['pm1:'+i]);add('meter',s.meters?.[i]);if(kind!=='relay')add('emeter',s.emeters?.[i]);}
  const item=candidates.length===1?candidates[0]:null,c=item?.c,raw=c&&(Object.hasOwn(c,'apower')?c.apower:c.power),errors=[...(Array.isArray(s.errors)?s.errors:[]),...(Array.isArray(c?.errors)?c.errors:[])];
  const valid=!!item&&!device?.error&&s.is_valid!==false&&c.is_valid!==false&&!errors.length&&!s.overpower&&!s.overtemperature&&!s.overvoltage&&!c.overpower&&!c.overtemperature&&!c.overvoltage&&typeof raw==='number'&&Number.isFinite(raw)&&raw>=0;
  return {online:device?.online===true||device?.online===1,valid,powerWatts:valid?raw:null,component:item?.family||kind};
 }
 function current(r,now=Date.now()){return !!(r?.online&&r.valid&&!r.error&&Number.isFinite(r.fetchedAt)&&now>=r.fetchedAt&&now-r.fetchedAt<=45000)}
 return {aggregate,reading,current,consumers};
});
