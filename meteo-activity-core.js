/* Read-only activity display. No network, commands or shutdown timers. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaMeteoActivityCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const IDS=['heater','dehumidifier','washer','dishwasher','tv','ev','playstation','soundbar','vodafone','unifi','monitor','apollo','terramaster','blackdrive','boiler','hob','oven'],DEFAULTS=IDS.slice(0,4),NAMES={heater:'Termoventilador',dehumidifier:'Desumidificador',washer:'Máquina da roupa',dishwasher:'Máquina da loiça',tv:'Televisão',ev:'Carro a carregar',playstation:'PlayStation 5',soundbar:'Soundbar Polk',vodafone:'Router Vodafone',unifi:'UniFi Dream Router',monitor:'Monitor Dell',apollo:'Placa de Som Apollo Twin',terramaster:'Servidor TerraMaster',blackdrive:'Disco Rígido Backup 2TB',boiler:'Caldeira Bosch',hob:'Placa de indução',oven:'Forno / micro-ondas'},GRACE=300000,FRESH=45000;
 function create({storage=null,key,now=Date.now}={}){
  let records={};try{const saved=JSON.parse(storage?.getItem(key)||'{}');for(const id of IDS){const r=saved?.[id];if(r&&typeof r.identity==='string'&&r.identity.length<300&&[r.start,r.lastAt,r.positiveAt].every(Number.isFinite)&&r.start<=r.lastAt&&r.lastAt<=now()&&now()-r.lastAt<=GRACE+FRESH&&(r.lowAt===null||Number.isFinite(r.lowAt)))records[id]=r}}catch{}
  let serialized=JSON.stringify(records);
  function update(samples){const time=now(),rows=[];
   for(const sample of samples){const {id}=sample;if(!IDS.includes(id))continue;
    if(!sample.configured||!sample.identity){delete records[id];continue}
    if(id==='boiler')sample.active=Number.isFinite(sample.powerWatts)&&sample.powerWatts>=0?sample.powerWatts>30:null;
    const manual=id==='heater'||id==='dehumidifier';
    if(manual){
     if(sample.on===true&&(sample.timerActive===true||sample.timerEstimated===true)&&Number.isFinite(sample.remaining)&&sample.remaining>0){delete records[id];rows.push({id,name:NAMES[id],kind:'timer',remaining:Math.ceil(sample.remaining),estimated:sample.timerEstimated===true});continue}
     if(sample.on===false){delete records[id];continue}
     sample.active=sample.on===true&&Number.isFinite(sample.powerWatts)&&sample.powerWatts>=0?sample.powerWatts>0:null;
    }
    const current=typeof sample.active==='boolean'&&Number.isFinite(sample.fetchedAt)&&time>=sample.fetchedAt&&time-sample.fetchedAt<=FRESH;
    let r=records[id];if(r&&(r.identity!==sample.identity||time<r.start||time-r.lastAt>GRACE+FRESH)){delete records[id];r=null}
    if(!current)continue;if(sample.stopped===true){delete records[id];continue}
    if(sample.active){if(!r)r=records[id]={identity:sample.identity,start:sample.fetchedAt,lastAt:sample.fetchedAt,positiveAt:sample.fetchedAt,lowAt:null};r.lastAt=sample.fetchedAt;r.positiveAt=sample.fetchedAt;r.lowAt=null}
    else if(id!=='washer'&&id!=='dishwasher'){delete records[id];continue}
    else if(r){r.lastAt=sample.fetchedAt;if(r.lowAt===null)r.lowAt=sample.fetchedAt;if(time-r.lowAt>=GRACE){delete records[id];continue}}
    if(r)rows.push({id,name:NAMES[id],kind:manual?'manual':id==='ev'?'charging':id==='tv'?'tv':['washer','dishwasher'].includes(id)?'machine':'device',elapsed:Math.max(0,Math.floor((time-r.start)/1000)),paused:!sample.active,powerWatts:Number.isFinite(sample.powerWatts)?sample.powerWatts:null});
   }
   const next=JSON.stringify(records);if(next!==serialized){serialized=next;try{storage?.setItem(key,next)}catch{}}
   return rows;
  }
  return {update};
 }
 const SHARED_FRESH=270000, SHARED_MAX_AGE=900000;
 const KINDS=['timer','manual','machine','charging','tv','device'];
 function encodeShared(rows,time=Date.now()){
  return rows.map(row=>{
   const {id,kind}=row;
   if(kind==='timer')return {id,kind,endsAt:time+row.remaining*1000,estimated:row.estimated===true};
   return {id,kind,startedAt:time-row.elapsed*1000,paused:row.paused===true,powerWatts:row.powerWatts};
  });
 }
 function readShared(rows,updatedAt,expiresAt,time=Date.now()){
  if(!Array.isArray(rows)||rows.length>IDS.length||!Number.isFinite(updatedAt))return null;
  if(time-updatedAt>=SHARED_MAX_AGE)return null;
  const stale=time-updatedAt>=SHARED_FRESH||!(expiresAt>time);
  const observedAt=stale?Math.min(time,updatedAt):time;
  const devices=new Map();
  for(const row of rows){
   if(!IDS.includes(row?.id)||!KINDS.includes(row.kind)||devices.has(row.id))continue;
   const {id,kind}=row, name=NAMES[id];
   if(kind==='timer'){
    if(!['heater','dehumidifier'].includes(id)||!Number.isSafeInteger(row.endsAt)||row.endsAt<=time)continue;
    devices.set(id,{id,name,kind,remaining:Math.ceil((row.endsAt-time)/1000),estimated:row.estimated===true,stale});
   }else if(Number.isSafeInteger(row.startedAt)&&row.startedAt>0&&row.startedAt<=time){
    devices.set(id,{id,name,kind,elapsed:Math.max(0,Math.floor((observedAt-row.startedAt)/1000)),
     paused:row.paused===true,powerWatts:Number.isFinite(row.powerWatts)?row.powerWatts:null,stale});
   }
  }
  return Array.from(devices.values());
 }
 return {IDS,DEFAULTS,NAMES,GRACE,create,encodeShared,readShared};
});
