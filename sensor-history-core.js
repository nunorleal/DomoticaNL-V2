(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.CasaSensorHistoryCore=factory();
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const HOUR=3600000,DAY=86400000;
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'});
 function day(time){const p=Object.fromEntries(formatter.formatToParts(time).map(p=>[p.type,p.value]));return p.year+'-'+p.month+'-'+p.day}
 function metric(value,min,max){return Number.isFinite(value)&&value>=min&&value<=max?value:null}
 function validMetric(value,min,max){
  if(value===null)return null;
  if(!value||!Number.isSafeInteger(value.count)||value.count<1||value.count>1000000||
    ![value.sum,value.min,value.max].every(Number.isFinite)||value.min<min||value.max>max||value.min>value.max||
    value.sum/value.count<value.min-0.00001||value.sum/value.count>value.max+0.00001)throw Error('Valores do histórico ambiental inválidos.');
  return {sum:value.sum,count:value.count,min:value.min,max:value.max};
 }
 function validateRow(row){
  if(!row||typeof row.sensor!=='string'||!row.sensor||row.sensor.length>400||
    typeof row.name!=='string'||row.name.length>120||!['hour','day'].includes(row.period)||
    !/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date+'T12:00:00Z'))||new Date(row.date+'T12:00:00Z').toISOString().slice(0,10)!==row.date||
    !Number.isSafeInteger(row.time)||row.time<0||!Number.isSafeInteger(row.lastAt)||row.lastAt<row.time-(row.period==='day'?HOUR:0)||
    !Number.isFinite(row.updatedAt)||row.updatedAt<0)throw Error('Registo ambiental inválido.');
  if(row.period==='hour'&&row.time%HOUR!==0)throw Error('Hora ambiental inválida.');
  return {sensor:row.sensor,name:row.name,period:row.period,date:row.date,time:row.time,lastAt:row.lastAt,updatedAt:row.updatedAt,
    temperature:validMetric(row.temperature,-100,150),humidity:validMetric(row.humidity,0,100)};
 }
 const key=row=>JSON.stringify([row.sensor,row.period,row.time]);
 function validate(value){
  if(!value||value.version!==1||!Array.isArray(value.rows)||value.rows.length>50000)throw Error('Histórico ambiental inválido.');
  const rows=value.rows.map(validateRow);
  if(new Set(rows.map(key)).size!==rows.length)throw Error('O histórico ambiental contém registos repetidos.');
  return {version:1,rows};
 }
 function retained(row,now){
  return row.lastAt<=now+30000&&(row.period==='hour'?row.time>=now-30*DAY:row.date>=day(now-399*DAY));
 }
 function create(value={version:1,rows:[]},now=Date.now){
  const records=new Map(validate(value).rows.filter(r=>retained(r,now())).map(r=>[key(r),r]));
  function prune(){for(const [id,row]of records)if(!retained(row,now()))records.delete(id)}
  function record(sensor,name,reading){
   const time=now(),at=reading?.fetchedAt;
   if(!sensor||!reading?.online||reading.error||reading.missing||reading.retained||reading.errors?.length||
      !Number.isSafeInteger(at)||at>time||time-at>120000)return [];
   const temperature=metric(reading.temperature,-100,150),humidity=metric(reading.humidity,0,100);
   if(temperature===null&&humidity===null)return [];
   const date=day(at),changed=[];
   for(const period of ['hour','day']){
    const bucket=period==='hour'?Math.floor(at/HOUR)*HOUR:Date.parse(date+'T00:00:00Z');
    const id=key({sensor,period,time:bucket}),old=records.get(id);
    if(old&&at<=old.lastAt)continue;
    const add=(previous,value)=>{
     if(value===null)return previous||null;
     return {sum:(previous?.sum||0)+value,count:(previous?.count||0)+1,
       min:Math.min(previous?.min??value,value),max:Math.max(previous?.max??value,value)};
    };
    const row={sensor,name,period,date,time:bucket,lastAt:at,updatedAt:time,
      temperature:add(old?.temperature,temperature),humidity:add(old?.humidity,humidity)};
    records.set(id,row);changed.push(row);
   }
   prune();
   return changed;
  }
  function merge(rows){
   for(const value of rows){
    const row=validateRow(value),id=key(row),old=records.get(id);
    if(retained(row,now())&&(!old||row.lastAt>old.lastAt||row.lastAt===old.lastAt&&row.updatedAt>old.updatedAt))records.set(id,row);
   }
   prune();
  }
  return {record,merge,snapshot:()=>{prune();return {version:1,rows:[...records.values()]}},rows:()=>{prune();return [...records.values()]}};
 }
 function combine(rows,field){
  const metrics=rows.map(r=>r[field]).filter(Boolean),count=metrics.reduce((n,m)=>n+m.count,0);
  return count?{average:metrics.reduce((n,m)=>n+m.sum,0)/count,
   min:Math.min(...metrics.map(m=>m.min)),max:Math.max(...metrics.map(m=>m.max)),count}:null;
 }
 return {HOUR,DAY,day,key,validate,validateRow,create,combine};
});
