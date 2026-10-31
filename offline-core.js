/* Reported offline only. No inference from watts, stale values, errors or missing devices. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaOfflineCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function roleKey(kind,key){return ['fan','heater','dehumidifier'].includes(kind)?kind:String(key??'')}
 function pick(rows,kind,key){return rows.filter(r=>r.configured!==false&&r.kind===kind&&(key===undefined||roleKey(kind,r.key)===roleKey(kind,key)))}
 function state(rows=[]){
  const actual=rows.filter(r=>r.configured!==false),offline=actual.filter(r=>r.status==='offline'),all=new Set(actual.map(r=>String(r.deviceId||r.kind+':'+roleKey(r.kind,r.key)).toLowerCase())),ids=new Set(offline.map(r=>String(r.deviceId||r.kind+':'+roleKey(r.kind,r.key)).toLowerCase()));
  const names=[...new Set(offline.map(r=>String(r.name||'Dispositivo')))];
  const grouped=all.size>1,count=ids.size,unknown=actual.some(r=>['pending','stale','error','unavailable'].includes(r.status));
  return {offline:count>0,count,total:all.size,grouped,partial:count>0&&(count<all.size||unknown),text:count?(grouped?count+' Offline':'Offline'):'',names,title:count?'Offline reportado pela Shelly Cloud · '+names.join(' · '):''};
 }
 return {roleKey,pick,state};
});
