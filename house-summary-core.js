/* Pure aggregation of confirmed readings. Demo and historical values never count as current. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaHouseSummaryCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function aggregate(windows=[],lights=[],health=[]){const actual=rows=>rows.filter(r=>r.configured),counts=rows=>({active:rows.filter(r=>r.value===true).length,unknown:rows.filter(r=>r.value!==true&&r.value!==false).length,total:rows.length});const devices=[...new Map(health.map(r=>[r.id,r])).values()];return {windows:counts(actual(windows)),lights:counts(actual(lights)),devices:{total:devices.length,unavailable:devices.filter(r=>['offline','error','unavailable'].includes(r.status)).length,waiting:devices.filter(r=>['stale','pending'].includes(r.status)).length},problems:devices.filter(r=>r.status!=='ready')}}
 function condition(reading,valid,now=Date.now(),maxAge=45000,failedAt=null){
  if(Number.isFinite(failedAt))return now>=failedAt&&now-failedAt<=45000?'error':'stale';
  if(!reading||!Number.isFinite(reading.fetchedAt))return 'pending';
  if(now<reading.fetchedAt||now-reading.fetchedAt>maxAge)return 'stale';
  if(reading.error)return 'error';
  if(reading.missing)return 'unavailable';
  if(reading.online===false||reading.online===0)return 'offline';
  return valid&&!reading.errors?.length?'ready':'unavailable';
 }
 function devices(rows){
  const grouped=new Map(),rank={ready:0,pending:1,stale:2,unavailable:3,error:4,offline:5};
  for(const row of rows){const id=row.deviceId.toLowerCase(),old=grouped.get(id);if(!old)grouped.set(id,{id,status:row.status,names:[row.name],kind:row.kind,key:row.key,room:row.room});else{if(!old.names.includes(row.name))old.names.push(row.name);if(rank[row.status]>rank[old.status]){old.status=row.status;old.kind=row.kind;old.key=row.key;old.room=row.room}}}
  return [...grouped.values()].map(r=>({...r,name:r.names.join(' · ')}));
 }
 return {aggregate,condition,devices};
});
