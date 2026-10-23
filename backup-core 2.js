/* Portable local configuration backup. Weather cache is regenerated. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaBackup=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const IDS=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
 const BLINDS=IDS.slice(0,4),MAX_BYTES=8*1024*1024;
 const allowed=k=>/^casa-nl-[a-z0-9-]+$/.test(k)&&k!=='casa-nl-weather-v1';
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function fail(){throw new Error('Ficheiro de cópia de segurança inválido ou incompatível.')}
 function safe(v,depth=0){if(depth>30)fail();if(v===null||typeof v==='boolean'||typeof v==='string')return;if(typeof v==='number'){if(!Number.isFinite(v))fail();return}if(Array.isArray(v)){v.forEach(x=>safe(x,depth+1));return}if(!object(v))fail();for(const [k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))fail();safe(x,depth+1)}}
 function validateStorage(data){
  if(!object(data)||Object.keys(data).length>100)fail();safe(data);
  for(const k of Object.keys(data))if(!allowed(k))fail();
  const states=data['casa-nl-realistic-v2'];
  if(!Array.isArray(states)||states.length!==IDS.length||new Set(states.map(r=>r?.id)).size!==IDS.length)fail();
  for(const r of states){if(!object(r)||!IDS.includes(r.id)||typeof r.light!=='boolean')fail();if(BLINDS.includes(r.id)&&(!Number.isFinite(r.blind)||r.blind<0||r.blind>100))fail()}
  data['casa-nl-realistic-v2']=states.map(r=>({id:r.id,light:r.light,...(BLINDS.includes(r.id)?{blind:r.blind}:{})}));
  const layout=data['casa-nl-room-layout-v1'];if(!object(layout)||Object.keys(layout).length!==IDS.length)fail();
  for(const [id,r]of Object.entries(layout)){if(!IDS.includes(id)||!object(r)||!(r.name===null||(typeof r.name==='string'&&r.name.trim()&&r.name.length<=40))||!Number.isFinite(r.lx)||!Number.isFinite(r.ly)||r.lx<0||r.lx>100||r.ly<0||r.ly>100)fail()}
  if(Object.hasOwn(data,'casa-nl-kitchen-ids-associated-v1')&&typeof data['casa-nl-kitchen-ids-associated-v1']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-dehumidifier-added-v1')&&typeof data['casa-nl-dehumidifier-added-v1']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-dehumidifier-layout-v1')){try{const core=typeof module==='object'&&module.exports?require('./dehumidifier-core.js'):globalThis.CasaDehumidifierCore;data['casa-nl-dehumidifier-layout-v1']=core.layout(data['casa-nl-dehumidifier-layout-v1'])}catch{fail()}}
  if(Object.hasOwn(data,'casa-nl-heater-added-v1')&&typeof data['casa-nl-heater-added-v1']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-heater-layout-v1')){try{const core=typeof module==='object'&&module.exports?require('./heater-core.js'):globalThis.CasaHeaterCore;data['casa-nl-heater-layout-v1']=core.layout(data['casa-nl-heater-layout-v1'])}catch{fail()}}
  if(Object.hasOwn(data,'casa-nl-show-console-icons')&&typeof data['casa-nl-show-console-icons']!=='boolean')fail();
  if(typeof data['casa-nl-show-banners']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-balcony-sensor-added-v1')&&typeof data['casa-nl-balcony-sensor-added-v1']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-door-ids-restored-v1')&&typeof data['casa-nl-door-ids-restored-v1']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-lights-restored-v1')&&typeof data['casa-nl-lights-restored-v1']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-window-ids-associated-v1')&&typeof data['casa-nl-window-ids-associated-v1']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-gui-ids-associated-v1')&&typeof data['casa-nl-gui-ids-associated-v1']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-cellar-temperature-added-v1')&&typeof data['casa-nl-cellar-temperature-added-v1']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-consumption-history-v1')){try{const core=typeof module==='object'&&module.exports?require('./consumption-core.js'):globalThis.CasaConsumptionCore;data['casa-nl-consumption-history-v1']=core.validate(data['casa-nl-consumption-history-v1'])}catch{fail()}}
  if(Object.hasOwn(data,'casa-nl-show-sensor-readings')&&typeof data['casa-nl-show-sensor-readings']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-show-energy-banner')&&typeof data['casa-nl-show-energy-banner']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-show-blind-banners')&&typeof data['casa-nl-show-blind-banners']!=='boolean')fail();
  if(Object.hasOwn(data,'casa-nl-basement-layout-v1')){try{const core=typeof module==='object'&&module.exports?require('./basement-layout-core.js'):globalThis.CasaBasementLayoutCore;data['casa-nl-basement-layout-v1']=core.layout(data['casa-nl-basement-layout-v1'])}catch{fail()}}
  if(Object.hasOwn(data,'casa-nl-shelly-cloud-v1')){try{const core=typeof module==='object'&&module.exports?require('./shelly-core.js'):globalThis.ShellyCore;data['casa-nl-shelly-cloud-v1']=core.config(data['casa-nl-shelly-cloud-v1'])}catch{fail()}}
  if(Object.hasOwn(data,'casa-nl-meteo-v1')){try{const core=typeof module==='object'&&module.exports?require('./meteo-core.js'):globalThis.CasaMeteoCore;data['casa-nl-meteo-v1']=core.preferences(data['casa-nl-meteo-v1'])}catch{fail()}}
  if(Object.hasOwn(data,'casa-nl-screensaver-v1')){try{const core=typeof module==='object'&&module.exports?require('./meteo-core.js'):globalThis.CasaMeteoCore;data['casa-nl-screensaver-v1']=core.screensaver(data['casa-nl-screensaver-v1'])}catch{fail()}}
  const env=data['casa-nl-environment-v1'];if(!object(env)||!['auto','day','night'].includes(env.mode))fail();
  const c=env.city;if(c!==null&&(!object(c)||typeof c.name!=='string'||!c.name.trim()||c.name.length>150||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180))fail();
  return data;
 }
 function create(storage,appVersion){const data={};for(let i=0;i<storage.length;i++){const k=storage.key(i);if(allowed(k)){try{data[k]=JSON.parse(storage.getItem(k))}catch{throw new Error('Não foi possível ler os dados guardados: '+k)}}}validateStorage(data);return {application:'Casa NL',schemaVersion:1,appVersion,exportedAt:new Date().toISOString(),data}}
 function parse(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw new Error('O ficheiro deve ter no máximo 8 MB.');let value;try{value=JSON.parse(text)}catch{fail()}if(!object(value)||value.application!=='Casa NL'||value.schemaVersion!==1)fail();validateStorage(value.data);return value}
 const CLOUD='casa-nl-shelly-cloud-v1',GROUPS=['bindings','lightBindings','sensorBindings','windowBindings','mediaBindings','officeBindings','kitchenBindings','alarm'],SINGLES=['door','cellarDoor','fan','heater','dehumidifier','homeEnergy'];
 function associationCount(c){if(!c)return 0;return GROUPS.reduce((n,k)=>n+Object.keys(c[k]||{}).length,0)+SINGLES.filter(k=>c[k]?.deviceId).length+['meter','totalMeter','relay'].filter(k=>c.ev?.[k]).length}
 function describe(backup){const c=backup.data[CLOUD];if(!c)return 'Sem configuração Shelly';const count=k=>Object.keys(c[k]||{}).length;return `${count('bindings')} estores · ${count('lightBindings')} luzes · ${count('sensorBindings')} sensores · ${count('windowBindings')} janelas · ${[c.door,c.cellarDoor].filter(Boolean).length} portas · ${count('mediaBindings')} sala · ${count('officeBindings')} secretária · ${count('kitchenBindings')} cozinha · ${['meter','totalMeter','relay'].filter(k=>c.ev?.[k]).length} carregamento · ${count('alarm')} alarme · ${c.fan?1:0} ventoinha · ${c.heater?1:0} termoventilador · ${c.dehumidifier?1:0} desumidificador · ${c.homeEnergy||c.ev?.meter||c.ev?.relay?1:0} contador`}
 function prepareImport(storage,backup,preserve=true){const out=JSON.parse(JSON.stringify(backup));validateStorage(out.data);if(!preserve)return {backup:out,preserved:0};let current;try{current=JSON.parse(storage.getItem(CLOUD)||'null')}catch{throw Error('A configuração Shelly atual não pode ser lida. Exporte-a antes de importar.')}if(!current)return {backup:out,preserved:0};
  const core=typeof module==='object'&&module.exports?require('./shelly-core.js'):globalThis.ShellyCore;current=core.config(current);const incoming=out.data[CLOUD];if(incoming&&incoming.server!==current.server)return {backup:out,preserved:0,differentAccount:true};
  const next=incoming?{...incoming}:current,before=associationCount(incoming);
  if(incoming){for(const k of GROUPS)if(current[k]!==undefined)next[k]={...current[k],...incoming[k]};for(const k of SINGLES)if(!Object.hasOwn(incoming,k)&&Object.hasOwn(current,k))next[k]=current[k];if(current.ev){next.ev={...current.ev,...incoming.ev};for(const k of ['meter','totalMeter','relay'])if(current.ev[k]&&!incoming.ev?.[k])next.ev[k]=current.ev[k]}}
  try{out.data[CLOUD]=core.config(next)}catch{throw Error('As associações atuais e o ficheiro têm conflitos de ID/canal. Reveja os equipamentos ou desative a preservação para substituir pela cópia.')}
  validateStorage(out.data);return {backup:out,preserved:Math.max(0,associationCount(out.data[CLOUD])-before)};
 }
 function restore(storage,backup){const data=validateStorage(backup.data),previous=new Map();for(let i=0;i<storage.length;i++){const k=storage.key(i);if(allowed(k))previous.set(k,storage.getItem(k))}try{for(const k of previous.keys())storage.removeItem(k);for(const [k,v]of Object.entries(data))storage.setItem(k,JSON.stringify(v))}catch(e){try{for(const k of Object.keys(data))storage.removeItem(k);for(const [k,v]of previous)storage.setItem(k,v)}catch{}throw new Error('Não foi possível guardar a importação neste navegador. Verifique o espaço disponível.')}}
 return {create,parse,restore,prepareImport,describe,associationCount,MAX_BYTES};
});
