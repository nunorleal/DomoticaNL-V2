/* Calendar-only aggregation of observed daily energy. No transport or estimates. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaEnergyHistoryCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const PERIODS=['day','week','month','year','billing'];
 function date(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Data inválida.');const d=new Date(s+'T12:00:00Z');if(!Number.isFinite(d.getTime())||iso(d)!==s)throw Error('Data inválida.');return d}
 const iso=d=>d.toISOString().slice(0,10),add=(s,n)=>{const d=date(s);d.setUTCDate(d.getUTCDate()+n);return iso(d)},label=(s,options)=>date(s).toLocaleDateString('pt-PT',{timeZone:'UTC',...options});
 function range(period,anchor){if(!PERIODS.includes(period))throw Error('Período inválido.');if(period==='billing'){
   const {start,end}=anchor||{};
   const first=date(start),last=date(end);
   if(first>last)throw Error('A data de fim deve ser igual ou posterior à data de início.');
   if(last-first>=400*86400000)throw Error('Escolha um intervalo de até 400 dias.');
   const options={day:'2-digit',month:'2-digit',year:'numeric'};
   return {start,end,label:label(start,options)+' — '+label(end,options)};
  }
  const d=date(anchor),y=d.getUTCFullYear(),m=d.getUTCMonth();let start=anchor,end=anchor;
  if(period==='week'){start=add(anchor,-(d.getUTCDay()+6)%7);end=add(start,6)}
  if(period==='month'){start=iso(new Date(Date.UTC(y,m,1,12)));end=iso(new Date(Date.UTC(y,m+1,0,12)))}
  if(period==='year'){start=y+'-01-01';end=y+'-12-31'}
  return {start,end,label:period==='year'?String(y):period==='month'?label(start,{month:'long',year:'numeric'}):period==='day'?label(start,{day:'numeric',month:'long',year:'numeric'}):label(start,{day:'2-digit',month:'2-digit',year:'numeric'})+' — '+label(end,{day:'2-digit',month:'2-digit',year:'numeric'})};
 }
 function shift(period,anchor,direction){const d=date(anchor);if(direction!==-1&&direction!==1)throw Error('Direção inválida.');if(period==='day')return add(anchor,direction);if(period==='week')return add(anchor,direction*7);if(period==='month'){d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+direction)}else if(period==='year'){d.setUTCDate(1);d.setUTCMonth(0);d.setUTCFullYear(d.getUTCFullYear()+direction)}else throw Error('Período inválido.');return iso(d)}
 function shiftBilling({start,end},months){
  function shiftDate(value){
   const d=date(value),dayOfMonth=d.getUTCDate();
   d.setUTCDate(1);
   d.setUTCMonth(d.getUTCMonth()+months+1,0);
   d.setUTCDate(Math.min(dayOfMonth,d.getUTCDate()));
   return iso(d);
  }
  return range('billing',{start:shiftDate(start),end:shiftDate(end)});
 }
 function series(entry,period,anchor,today){date(today);const r=range(period,anchor),days=entry?.days||{},keys=Object.keys(days).filter(d=>days[d].observed&&Number.isFinite(days[d].kWh)&&days[d].kWh>=0&&d<=today).sort(),buckets=[];
  const bucket=(start,end,name)=>{let expected=0,observed=0,total=0,partial=false,interrupted=false;for(let d=start;d<=end;d=add(d,1)){if(d>today)continue;expected++;const v=days[d];if(v?.observed&&Number.isFinite(v.kWh)&&v.kWh>=0){observed++;total+=v.kWh;partial=partial||v.partial===true;interrupted=interrupted||v.interrupted===true}else partial=true}return {id:start,start,end,label:name,value:observed?total:null,observedDays:observed,expectedDays:expected,interrupted,partial:partial||observed<expected,future:start>today}};
  if(period==='year'){const y=date(anchor).getUTCFullYear();for(let m=0;m<12;m++){const start=iso(new Date(Date.UTC(y,m,1,12))),end=iso(new Date(Date.UTC(y,m+1,0,12)));buckets.push(bucket(start,end,label(start,{month:'short'})))}}
  else for(let d=r.start;d<=r.end;d=add(d,1))buckets.push(bucket(d,d,period==='week'?label(d,{weekday:'short'}):label(d,{day:'2-digit',month:period==='day'||period==='billing'?'short':undefined})));
  const known=buckets.filter(b=>b.value!==null),observedDays=buckets.reduce((n,b)=>n+b.observedDays,0),expectedDays=buckets.reduce((n,b)=>n+b.expectedDays,0);
  return {...r,period,buckets,total:known.length?known.reduce((n,b)=>n+b.value,0):null,observedDays,expectedDays,partial:known.some(b=>b.partial)||observedDays<expectedDays,firstDay:keys[0]||null,lastDay:keys.at(-1)||null,availableTotal:keys.length?keys.reduce((n,d)=>n+days[d].kWh,0):null,availableDays:keys.length};
 }
 const SLOT=1800000;
 const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'});
 const localClock=new Intl.DateTimeFormat('pt-PT',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const localOffset=new Intl.DateTimeFormat('pt-PT',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'});
 function dayAt(at){const p=Object.fromEntries(localDate.formatToParts(at).map(p=>[p.type,p.value]));return p.year+'-'+p.month+'-'+p.day}
 function intraday(entry,anchor,now=Date.now()){
  date(anchor);const row=entry?.days?.[anchor],buckets=[],start=Date.parse(anchor+'T00:00:00Z')-7200000;
  for(let at=start;at<start+28*3600000;at+=SLOT){
   if(dayAt(at)!==anchor)continue;
   const id=String(at/SLOT),value=row?.observed&&at<now&&Object.hasOwn(row.slots||{},id)&&Number.isFinite(row.slots[id])&&row.slots[id]>=0?row.slots[id]:null;
   buckets.push({id:'slot-'+id,start:anchor,end:anchor,label:localClock.format(at),fullLabel:localOffset.format(at)+' — '+localOffset.format(at+SLOT),at,value,future:at>=now,interrupted:row?.interrupted===true,estimated:row?.split===true,intraday:true});
  }
  const labels=new Map();for(const b of buckets)labels.set(b.label,(labels.get(b.label)||0)+1);
  for(const b of buckets){const repeated=labels.get(b.label)>1||labels.get(localClock.format(b.at+SLOT))>1;b.fullLabel=repeated?b.fullLabel:b.label+' — '+localClock.format(b.at+SLOT);if(labels.get(b.label)>1)b.label=localOffset.format(b.at);}
  const known=buckets.filter(b=>b.value!==null),distributedTotal=known.reduce((n,b)=>n+b.value,0),total=row?.observed&&Number.isFinite(row.kWh)?row.kWh:null;
  const difference=total===null?null:Math.max(0,total-distributedTotal),unassigned=difference!==null&&difference<=Math.max(1e-9,(total||0)*1e-9)?0:difference;
  const peak=known.reduce((best,b)=>!best||b.value>best.value?b:best,null);
  return {buckets,distributedTotal,unassigned,peak:peak?.value>0?peak:null,observedSlots:known.length,estimated:row?.split===true};
 }
 return {PERIODS,range,shift,shiftBilling,series,intraday,add,label};
});
