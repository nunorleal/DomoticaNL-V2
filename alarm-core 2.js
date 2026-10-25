/* Two distinct Shelly roles: only arm is an actuator; trigger is read-only. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaAlarmCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const ROLES=['arm','trigger'];
 function config(v,{deviceId,used=new Set()}){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!ROLES.includes(k)))throw Error('Configuração do alarme inválida.');const result={};for(const role of ROLES){const b=v[role];if(b===undefined)continue;if(!b||typeof b!=='object'||!Number.isInteger(b.channel)||b.channel<0||b.channel>15||typeof b.activeWhenOn!=='boolean')throw Error('Associação do alarme inválida.');const id=deviceId(b.deviceId),pair=id+':'+b.channel;if(role==='arm'){if(used.has(pair))throw Error('A saída de armação do alarme já está associada a outro equipamento.');used.add(pair)}result[role]={deviceId:id,channel:b.channel,activeWhenOn:b.activeWhenOn}}
  if(result.arm&&result.trigger&&result.arm.deviceId===result.trigger.deviceId&&result.arm.channel===result.trigger.channel)throw Error('Armação e disparo têm de usar saídas distintas.');return result;
 }
 function fresh(d,now=Date.now()){return !!(d?.online&&!d.error&&!d.missing&&d.hasOutput&&!d.errors?.length&&typeof d.on==='boolean'&&Number.isFinite(d.fetchedAt)&&now>=d.fetchedAt&&now-d.fetchedAt<=45000)}
 function value(b,d,now){return b&&fresh(d,now)?d.on===b.activeWhenOn:null}
 function state(alarm={},r={},now=Date.now()){const armed=value(alarm.arm,r.arm,now),triggered=value(alarm.trigger,r.trigger,now);return {configured:ROLES.some(k=>!!alarm[k]),armConfigured:!!alarm.arm,triggerConfigured:!!alarm.trigger,armed,triggered,visual:triggered===true?'sounding':armed===null?'unknown':alarm.trigger&&triggered===null?'partial':armed?'armed':'disarmed',canControl:!!alarm.arm&&fresh(r.arm,now)}}
 function command(alarm,armed){const b=alarm?.arm;if(!b||typeof armed!=='boolean')throw Error('Comando de armação inválido.');return {id:b.deviceId,channel:b.channel,type:'switch',on:armed?b.activeWhenOn:!b.activeWhenOn}}
 return {ROLES,config,fresh,state,command};
});
