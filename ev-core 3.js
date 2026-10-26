/* EV metering and relay rules. Reads never imply an output state. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaEVCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const TYPES=['auto','emeter','meter','switch','pm1','em1','em'],ROLES=['meter','totalMeter','relay'];
 const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
 function config(value,{deviceId,used=new Set()}={}){
  if(!object(value)||Object.keys(value).some(k=>!['thresholdWatts',...ROLES].includes(k)))throw Error('Configuração do carregamento inválida.');
  const thresholdWatts=value.thresholdWatts===undefined?50:value.thresholdWatts;
  if(!Number.isFinite(thresholdWatts)||thresholdWatts<1||thresholdWatts>1000)throw Error('O limiar de carregamento deve estar entre 1 e 1000 W.');
  const result={thresholdWatts};
  for(const role of ROLES){const b=value[role];if(b===undefined)continue;if(!object(b)||!Number.isInteger(b.channel)||b.channel<0||b.channel>(role==='relay'?15:255))throw Error('Canal do carregamento inválido.');
   const id=deviceId(b.deviceId);if(role==='relay'){const pair=id+':'+b.channel;if(used.has(pair))throw Error('A saída do carregador já está associada a outro equipamento.');used.add(pair);result.relay={deviceId:id,channel:b.channel}}
   else{const component=b.component||'auto';if(!TYPES.includes(component))throw Error('Tipo de medidor inválido.');result[role]={deviceId:id,channel:b.channel,component}}
  }return result;
 }
 const errors=c=>Array.isArray(c?.errors)?c.errors.filter(e=>typeof e==='string').slice(0,20):[];
 function meterStatus(device,b){
  if(!object(device))return {missing:true,online:false,power:null,energyKWh:null,hasMeter:false,errors:[]};
  const s=object(device.status)?device.status:{},ch=b.channel,candidates=[];
  for(const type of TYPES.filter(t=>t!=='auto')){const c=type==='emeter'?s.emeters?.[ch]:type==='meter'?s.meters?.[ch]:s[type+':'+ch];if(object(c))candidates.push({type,c})}
  const match=b.component==='auto'?(candidates.length===1?candidates[0]:null):candidates.find(c=>c.type===b.component);
  const c=match?.c,type=match?.type,errs=errors(c);if(c?.overpower===true)errs.push('overpower');
  const valid=!!c&&s.is_valid!==false&&c.is_valid!==false&&!errs.length;
  let power=null,energy=null;
  if(valid){
   if(type==='em1'){power=number(c.act_power);const data=s['em1data:'+ch];energy=errors(data).length?null:number(data?.total_act_energy)}
   else if(type==='em'){power=number(c.total_act_power);const data=s['emdata:'+ch];energy=errors(data).length?null:number(data?.total_act)}
   else if(['switch','pm1'].includes(type)){power=number(c.apower);energy=number(c.aenergy?.total)}
   else{power=number(c.power);energy=number(c.total)}
  }
  if(energy!==null&&energy<0)energy=null;
  return {online:device.online===true||device.online===1,hasMeter:!!c,power,energyKWh:energy===null?null:energy/(type==='meter'?60000:1000),component:type||null,available:candidates.map(c=>c.type+':'+ch),errors:errs,model:String(device.code||device.type||'').slice(0,100)};
 }
 function relayStatus(device,b){
  if(!object(device))return {missing:true,online:false,hasOutput:false,on:null,errors:[]};
  const s=device.status||{},c=s['switch:'+b.channel]||s.relays?.[b.channel],errs=errors(c);
  for(const flag of ['overtemperature','overpower','overvoltage'])if(c?.[flag]===true||s[flag]===true)errs.push(flag);
  return {online:device.online===true||device.online===1,hasOutput:object(c),on:typeof c?.output==='boolean'?c.output:typeof c?.ison==='boolean'?c.ison:null,errors:errs,model:String(device.code||device.type||'').slice(0,100)};
 }
 function fresh(d,now=Date.now()){return !!(d?.online&&!d.error&&!d.missing&&!d.errors?.length&&Number.isFinite(d.fetchedAt)&&now>=d.fetchedAt&&now-d.fetchedAt<=45000)}
 function canControl(d,now=Date.now()){return fresh(d,now)&&d.hasOutput&&typeof d.on==='boolean'}
 function state(ev={},readings={},now=Date.now()){
  const m=readings.meter,r=readings.relay,total=ev.totalMeter?readings.totalMeter:m;
  const power=ev.meter&&fresh(m,now)&&m.hasMeter?m.power:null;
  const feed=ev.relay&&canControl(r,now)?r.on:null;
  const charging=typeof power==='number'?power>(ev.thresholdWatts??50):null;
  const energy=typeof total?.energyKWh==='number'?total.energyKWh:null;
  const lastReading=ev.meter&&m?.hasMeter&&Number.isFinite(m.power)&&Number.isFinite(m.fetchedAt)?{powerKW:m.power/1000,fetchedAt:m.fetchedAt}:null;
  return {lastReading,configured:ROLES.some(k=>!!ev[k]),powerKW:typeof power==='number'?power/1000:null,energyKWh:energy,energyStale:energy!==null&&!fresh(total,now),feed,charging,inconsistent:charging===true&&feed===false,canControl:!!ev.relay&&canControl(r,now)};
 }
 return {TYPES,ROLES,config,meterStatus,relayStatus,fresh,canControl,state};
});
