/* Observed counter differences, Europe/Lisbon days. No network or power integration. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaDailyEnergyCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const MAX_DAYS=400,MAX_ENTRIES=128,GAP=300000;
 const dates=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'});
 function day(at){const p=Object.fromEntries(dates.formatToParts(new Date(at)).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day}
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 function identity(server,b){return b?.deviceId?JSON.stringify([server,b.deviceId.toLowerCase(),b.kind||b.component||'auto',b.channel]):null}
 function validate(v){
  if(!object(v)||v.schemaVersion!==1||Object.keys(v).some(k=>!['schemaVersion','entries'].includes(k))||!object(v.entries)||Object.keys(v.entries).length>MAX_ENTRIES)throw Error('Histórico diário inválido.');
  const out={schemaVersion:1,entries:{}};
  for(const [key,e]of Object.entries(v.entries)){
   let p;try{p=JSON.parse(key)}catch{throw Error('Identidade de consumo inválida.')}
   if(!Array.isArray(p)||p.length!==4||typeof p[0]!=='string'||!/^https:\/\/shelly-[a-z0-9-]+\.shelly\.cloud$/.test(p[0])||typeof p[1]!=='string'||! /^[a-f0-9]{6,32}$/.test(p[1])||!['auto','emeter','meter','switch','light','cover','relay','pm1','em1','em'].includes(p[2])||!Number.isInteger(p[3])||p[3]<0||p[3]>255)throw Error('Identidade de consumo inválida.');
   if(!object(e)||Object.keys(e).some(k=>!['last','days'].includes(k))||!Array.isArray(e.last)||e.last.length!==2||!e.last.every(finite)||!object(e.days)||Object.keys(e.days).length>MAX_DAYS)throw Error('Registo diário inválido.');
   const days={};for(const [d,r]of Object.entries(e.days)){if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!object(r)||Object.keys(r).some(k=>!['kWh','from','to','observed','partial'].includes(k))||![r.kWh,r.from,r.to].every(finite)||r.from>r.to||day(r.from)!==d||day(r.to)!==d||typeof r.observed!=='boolean'||typeof r.partial!=='boolean')throw Error('Dia de consumo inválido.');days[d]={...r}}
   out.entries[key]={last:[...e.last],days};
  }return out;
 }
 function create(initial){let state;try{state=validate(initial)}catch{state={schemaVersion:1,entries:{}}}
  function record(key,total,at){if(!key||!finite(total)||!finite(at))return false;let e=state.entries[key];if(e&&at<=e.last[0])return false;const d=day(at);
   if(!e){if(Object.keys(state.entries).length>=MAX_ENTRIES){const oldest=Object.keys(state.entries).sort((a,b)=>state.entries[a].last[0]-state.entries[b].last[0])[0];delete state.entries[oldest]}e=state.entries[key]={last:[at,total],days:{}}}
   const prev=e.last,r=e.days[d]||(e.days[d]={kWh:0,from:at,to:at,observed:false,partial:true});
   if(at>prev[0]&&day(prev[0])===d){const delta=total-prev[1];if(delta>=0){r.kWh+=delta;r.observed=true}if(delta<0||at-prev[0]>GAP)r.partial=true}
   // Cross-midnight deltas cannot be assigned to either day without estimation.
   e.last=[at,total];r.to=at;const days=Object.keys(e.days).sort();for(const old of days.slice(0,-MAX_DAYS))delete e.days[old];return true;
  }
  function today(key,at=Date.now()){const r=state.entries[key]?.days[day(at)];return {kWh:r?.observed?r.kWh:null,partial:true,from:r?.from??null,to:r?.to??null,stale:!r||at-r.to>45000}}
  return {record,today,history:key=>({days:JSON.parse(JSON.stringify(state.entries[key]?.days||{}))}),snapshot:()=>JSON.parse(JSON.stringify(state))};
 }
 return {day,identity,validate,create,MAX_DAYS};
});
