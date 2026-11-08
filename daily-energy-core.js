/* Observed counter differences, Europe/Lisbon days. No network or power integration. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./energy-cost-core.js'));else root.CasaDailyEnergyCore=factory(root.CasaEnergyCostCore)})(typeof window==='undefined'?globalThis:window,function(Cost){
 'use strict';const MAX_DAYS=400,MAX_ENTRIES=128,GAP=300000;
 const dates=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'});
 function day(at){const p=Object.fromEntries(dates.formatToParts(new Date(at)).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day}
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 function identity(server,b){return b?.deviceId?JSON.stringify([server,b.deviceId.toLowerCase(),b.kind||b.component||'auto',b.channel]):null}
 function validate(v){
  if(!object(v)||v.schemaVersion!==1||Object.keys(v).some(k=>!['schemaVersion','entries'].includes(k))||!object(v.entries)||Object.keys(v.entries).length>MAX_ENTRIES)throw Error('Histórico diário inválido.');
  const out={schemaVersion:1,entries:{}};
  let slotCount=0;
  for(const [key,e]of Object.entries(v.entries)){
   let p;try{p=JSON.parse(key)}catch{throw Error('Identidade de consumo inválida.')}
   if(!Array.isArray(p)||p.length!==4||typeof p[0]!=='string'||!/^https:\/\/shelly-[a-z0-9-]+\.shelly\.cloud$/.test(p[0])||typeof p[1]!=='string'||! /^[a-f0-9]{6,32}$/.test(p[1])||!['auto','emeter','meter','switch','light','cover','relay','pm1','em1','em'].includes(p[2])||!Number.isInteger(p[3])||p[3]<0||p[3]>255)throw Error('Identidade de consumo inválida.');
   if(!object(e)||Object.keys(e).some(k=>!['last','days'].includes(k))||!Array.isArray(e.last)||e.last.length!==2||!e.last.every(finite)||!object(e.days)||Object.keys(e.days).length>MAX_DAYS)throw Error('Registo diário inválido.');
   const days={};for(const [d,r]of Object.entries(e.days)){if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!object(r)||Object.keys(r).some(k=>!['kWh','from','to','observed','partial','slots','split'].includes(k))||![r.kWh,r.from,r.to].every(finite)||r.from>r.to||day(r.from)!==d||day(r.to)!==d||typeof r.observed!=='boolean'||typeof r.partial!=='boolean')throw Error('Dia de consumo inválido.');const {slots,split,...base}=r;
    if(slots!==undefined){
     if(!object(slots)||Object.keys(slots).length>50||!r.observed)throw Error('Períodos horários inválidos.');
     let allocated=0;
     for(const [slot,kWh] of Object.entries(slots)){
      const at=Number(slot)*Cost.SLOT;
      if(!/^\d{1,9}$/.test(slot)||!finite(kWh)||day(at)!==d||at>=r.to||at+Cost.SLOT<=r.from)throw Error('Período horário inválido.');
      allocated+=kWh;
     }
     slotCount+=Object.keys(slots).length;
     if(slotCount>Cost.MAX_SLOTS||allocated>r.kWh+Math.max(1e-9,r.kWh*1e-9))throw Error('Consumo horário inválido.');
     base.slots={...slots};
    }
    if(split!==undefined){
     if(typeof split!=='boolean'||!slots)throw Error('Qualidade de medição inválida.');
     base.split=split;
    }
    days[d]=base;
   }
   out.entries[key]={last:[...e.last],days};
  }return out;
 }
 function create(initial){let state;try{state=validate(initial)}catch{state={schemaVersion:1,entries:{}}}
  const slotsIn = r => Object.keys(r.slots || {}).length;
  let slotCount=Object.values(state.entries).reduce((sum,e)=>sum+Object.values(e.days).reduce((n,r)=>n+slotsIn(r),0),0);
  function pruneSlots(){
   if(slotCount<=Cost.MAX_SLOTS)return;
   const rows=Object.values(state.entries).flatMap(e=>Object.values(e.days)).filter(r=>r.slots).sort((a,b)=>a.to-b.to);
   for(const row of rows){
    slotCount-=slotsIn(row);
    delete row.slots;
    delete row.split;
    if(slotCount<=Cost.MAX_SLOTS*.95)break;
   }
  }
  function record(key,total,at){if(!key||!finite(total)||!finite(at))return false;let e=state.entries[key];if(e&&at<=e.last[0])return false;const d=day(at);
   if(!e){if(Object.keys(state.entries).length>=MAX_ENTRIES){const oldest=Object.keys(state.entries).sort((a,b)=>state.entries[a].last[0]-state.entries[b].last[0])[0];for(const row of Object.values(state.entries[oldest].days))slotCount-=slotsIn(row);delete state.entries[oldest]}e=state.entries[key]={last:[at,total],days:{}}}
   const prev=e.last,r=e.days[d]||(e.days[d]={kWh:0,from:at,to:at,observed:false,partial:true});
   if(at>prev[0]&&day(prev[0])===d){const delta=total-prev[1];if(delta>=0){r.kWh+=delta;r.observed=true;slotCount+=Cost.addSlots(r,prev[0],at,delta)}if(delta<0||at-prev[0]>GAP)r.partial=true}
   // Cross-midnight deltas cannot be assigned to either day without estimation.
   e.last=[at,total];r.to=at;const days=Object.keys(e.days).sort();for(const old of days.slice(0,-MAX_DAYS)){slotCount-=slotsIn(e.days[old]);delete e.days[old]}pruneSlots();return true;
  }
  function today(key,at=Date.now()){const r=state.entries[key]?.days[day(at)];return {kWh:r?.observed?r.kWh:null,partial:true,from:r?.from??null,to:r?.to??null,stale:!r||at-r.to>45000}}
  function history(key,start='',end='9999-12-31',timed=false){
   const days={};
   for(const [date,row] of Object.entries(state.entries[key]?.days||{})){
    if(date<start||date>end)continue;
    const {slots,split,...daily}=row;
    days[date]=timed&&slots?{...daily,slots:{...slots},split:Boolean(split)}:daily;
   }
   return {days};
  }
  return {record,today,history,snapshot:()=>JSON.parse(JSON.stringify(state))};
 }
 return {day,identity,validate,create,MAX_DAYS};
});
