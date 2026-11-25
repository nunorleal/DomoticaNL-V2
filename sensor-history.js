(function(){
 'use strict';
 const house=document.currentScript.dataset.house,t2=house==='t2',C=window.CasaSensorHistoryCore;
 const key=t2?'casa-nl-sensor-history-v1':'casa-leal-sensor-history-v1';
 let account=null,writer=()=>false,ledger=load(null),pending=new Map(),busy=false,again=false,lastSync=0,cursor='',lastCleanup='';
 let flushTimer,storageError='',syncError='',suspended=false;
 const received=new Map();
 function load(user){
  try{
   const saved=JSON.parse(localStorage.getItem(key)||'null');
   return C.create(saved&&(!saved.owner||saved.owner===user)?saved:undefined);
  }catch{return C.create()}
 }
 function persist(){
  if(suspended)return;
  clearTimeout(flushTimer);flushTimer=null;
  try{localStorage.setItem(key,JSON.stringify({...ledger.snapshot(),owner:account?.user||null}));storageError=''}
  catch{storageError='Sem espaço para guardar o histórico neste dispositivo.'}
 }
 function sources(){
  if(t2){
   const api=window.CasaShelly;
   let server='';try{server=JSON.parse(localStorage.getItem('casa-nl-shelly-cloud-v1')||'{}').server||''}catch{}
   return (api?.sensorEntries?.()||[]).flatMap(entry=>{
    const b=api.sensorBinding(entry.id);
    return b&&server?[{role:entry.id,name:entry.name,sensor:JSON.stringify([server,b.deviceId,b.temperatureChannel??0,b.humidityChannel??0,b.type||'environment']),reading:api.sensorReading(entry.id)}]:[];
   });
  }
  const config=window.CasaShellySetup?.activeSnapshot?.()||{};
  return [['meteo','meteoSensor','3','balcony-south'],['garage','garageSensor','-1','garage'],['living','livingSensor','3','living'],['master','masterSensor','3','master']].flatMap(([role,field,floor,room])=>{
   const b=config[field];
   return b&&config.server?[{role,name:window.CasaRoomNames?.get(floor,room)||room,
    sensor:JSON.stringify([config.server,b.deviceId,b.channel??0]),reading:window.CasaCloudRead?.temperatureSnapshot(role)?.reading}]:[];
  });
 }
 function changed(){window.dispatchEvent(new Event('sensorhistorychange'))}
 function capture(){
  if(busy||suspended||(account&&!writer()))return;
  let count=0;
  for(const source of sources()){
   const rows=ledger.record(source.sensor,source.name,source.reading);
   count+=rows.length;
   if(account&&writer())for(const row of rows)pending.set(C.key(row),row);
  }
  if(count){clearTimeout(flushTimer);flushTimer=setTimeout(persist,500);changed()}
 }
 async function sync(force=false){
  if(!account||suspended)return;
  if(busy){again=true;return}
  if(!force&&Date.now()-lastSync<60000)return;
  const active=account,start=new Date().toISOString();busy=true;
  try{
   let after='';
   while(true){
    let query=active.client.from('casa_sensor_history').select('id,value').eq('owner_id',active.user).eq('house',house)
     .lte('updated_at',start).order('id').limit(1000);
    if(cursor)query=query.gte('updated_at',cursor);
    if(after)query=query.gt('id',after);
    const {data,error}=await query;
    if(error)throw error;
    if(account!==active||suspended)return;
    ledger.merge(data.map(row=>row.value));
    for(const row of data)received.set(C.key(row.value),row.value.lastAt);
    if(data.length<1000)break;
    after=data[data.length-1].id;
   }
   cursor=start;
   // A pending bucket may predate a download from the same emitter.
   const downloaded=new Map(ledger.rows().map(row=>[C.key(row),row]));
   for(const [id,row]of pending){
    const current=downloaded.get(id);
    if(current&&current.lastAt>row.lastAt)pending.delete(id);
   }
   if(writer()){
    for(const row of ledger.rows())if(row.lastAt>(received.get(C.key(row))??-1))pending.set(C.key(row),row);
    while(pending.size){
     const batch=[...pending.values()].slice(0,100);
     const {error}=await active.client.rpc('casa_write_sensor_history',{p_house:house,p_rows:batch});
     if(error)throw error;
     if(account!==active||suspended)return;
     for(const row of batch){received.set(C.key(row),row.lastAt);if(pending.get(C.key(row))===row)pending.delete(C.key(row));}
    }
    const today=C.day(Date.now());
    if(today!==lastCleanup){
     for(const [period,retention]of [['hour',30],['day',400]]){
      const {error}=await active.client.from('casa_sensor_history').delete().eq('owner_id',active.user).eq('house',house)
       .eq('period',period).lt('bucket',Date.now()-retention*C.DAY);
      if(error)throw error;
     }
     lastCleanup=today;
    }
   }
   syncError='';lastSync=Date.now();persist();changed();
  }catch{if(account===active){syncError='Sincronização pendente. Nova tentativa automática.';lastSync=Date.now();changed()}}
  finally{busy=false;const retry=again||account!==active;again=false;if(retry)void sync(true);else capture()}
 }
 function connect(client,user,isWriter){
  writer=isWriter;
  if(account?.user===user&&account?.client===client)return;
  if(flushTimer)persist();
  account=user?{client,user}:null;ledger=load(user);pending.clear();received.clear();cursor='';lastSync=0;lastCleanup='';
  capture();changed();if(account)void sync(true);
 }
 function snapshot(){if(flushTimer)persist();return ledger.snapshot()}
 function suspend(){suspended=true;clearTimeout(flushTimer);flushTimer=null}
 function resume(){suspended=false;capture()}
 window.CasaSensorHistory={connect,sync,snapshot,sources,rows:()=>ledger.rows(),
  message:()=>storageError||syncError,suspend,resume,key};
 for(const event of ['sensorchange','energychange'])window.addEventListener(event,capture);
 window.addEventListener('online',()=>sync(true));
 window.addEventListener('pagehide',persist);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();else{capture();void sync()}});
 setInterval(()=>{if(!document.hidden){capture();void sync()}},15000);
 capture();
})();
