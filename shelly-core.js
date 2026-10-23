/* Cloud configuration and Gen1/Gen2+ status normalization, shared with tests. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ShellyCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const ROOM_IDS=['master','bedroom2','living','kitchen'],LIGHT_ROOM_IDS=['master','bedroom2','living'],SENSOR_ROOM_IDS=['living','master','cellar','balcony'];
 const SUPPLIED_LIGHT_IDS={master:'98cdac1df7e9',bedroom2:'98cdac1f18fa',living:'98cdac2d2eb6'};
 function balconySensorBindings(previous={}){const old=previous.balcony,same=old?.deviceId==='10521c0752cc';return {...previous,balcony:same?{...old}:{deviceId:'10521c0752cc',temperatureChannel:0,humidityChannel:0}}}
 function suppliedLightBindings(previous={}){return Object.fromEntries(Object.entries(SUPPLIED_LIGHT_IDS).map(([id,deviceId])=>{const old=previous[id],same=old&&String(old.deviceId).toLowerCase()===deviceId;return [id,{deviceId,channel:same?old.channel:0,type:same?old.type:'switch'}]}))}
 function server(value){let u;try{u=new URL(value.includes('://')?value:'https://'+value)}catch{throw Error('Indique o servidor Shelly Cloud da sua conta.')}if(u.protocol!=='https:'||!/^shelly-[a-z0-9-]+\.shelly\.cloud$/i.test(u.hostname)||u.port||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Use apenas o endereço HTTPS do servidor Shelly Cloud, sem caminhos ou parâmetros.');return u.origin}
 function deviceId(value){const id=String(value).trim().toLowerCase().replace(/:/g,'');if(!/^[a-f0-9]{6,32}$/.test(id))throw Error('O ID deve ser o Device ID hexadecimal do Shelly (não o nome nem o endereço IP).');return id}
 // BLU Cloud IDs are distinct from hexadecimal actuator IDs. Preserve XB on reads.
 function statusDeviceId(value){const raw=String(value).trim();if(/^XB[0-9]{1,15}$/i.test(raw)&&BigInt(raw.slice(2))<=281474976710655n)return 'XB'+raw.slice(2);return deviceId(value)}
 function config(value){if(!value||typeof value!=='object'||Array.isArray(value)||value.schemaVersion!==1)throw Error('Configuração Shelly incompatível.');const host=value.server?server(value.server):'';if(typeof value.authKey!=='string'||value.authKey.length>4096||typeof value.rememberKey!=='boolean'||!value.bindings||typeof value.bindings!=='object'||Array.isArray(value.bindings))throw Error('Configuração Shelly inválida.');const bindings={},used=new Set();for(const [room,b]of Object.entries(value.bindings)){if(!ROOM_IDS.includes(room)||!b||!Number.isInteger(b.channel)||b.channel<0||b.channel>15)throw Error('Associação de estore inválida.');const id=deviceId(b.deviceId),key=id+':'+b.channel;if(used.has(key))throw Error('O mesmo Shelly e canal não pode estar associado a dois estores.');used.add(key);bindings[room]={deviceId:id,channel:b.channel}}const lightBindings={};
  if(value.lightBindings!==undefined){
   if(!value.lightBindings||typeof value.lightBindings!=='object'||Array.isArray(value.lightBindings))throw Error('Associações de candeeiros inválidas.');
   for(const [room,b]of Object.entries(value.lightBindings)){
    if(!LIGHT_ROOM_IDS.includes(room)||!b||!Number.isInteger(b.channel)||b.channel<0||b.channel>15||!['switch','light'].includes(b.type))throw Error('Associação de candeeiro inválida.');
    const id=deviceId(b.deviceId),key=id+':'+b.channel;
    if(used.has(key))throw Error('O mesmo Shelly e canal não pode estar associado a dois equipamentos.');
    used.add(key);lightBindings[room]={deviceId:id,channel:b.channel,type:b.type};
   }
  }
  const sensorBindings={},sensorPairs=new Set();
  if(value.sensorBindings!==undefined){
   if(!value.sensorBindings||typeof value.sensorBindings!=='object'||Array.isArray(value.sensorBindings))throw Error('Associações de sensores inválidas.');
   for(const [room,b]of Object.entries(value.sensorBindings)){
    if(!SENSOR_ROOM_IDS.includes(room)||!b||typeof b!=='object')throw Error('Associação de sensor inválida.');
    const temperatureChannel=b.temperatureChannel===undefined?0:b.temperatureChannel,humidityChannel=b.humidityChannel===undefined?0:b.humidityChannel;
    if(![temperatureChannel,humidityChannel].every(n=>Number.isInteger(n)&&n>=0&&n<=255))throw Error('Componente de sensor inválido.');
    const id=deviceId(b.deviceId),pair=id+':'+temperatureChannel+':'+humidityChannel;
    if(sensorPairs.has(pair))throw Error('O mesmo sensor não pode estar associado a duas divisões.');
    if(b.type!==undefined&&!['environment','door-window2'].includes(b.type))throw Error('Tipo de sensor inválido.');
    sensorPairs.add(pair);sensorBindings[room]={deviceId:id,temperatureChannel,humidityChannel,...(b.type!==undefined?{type:b.type}:{})};
   }
  }
  const homeEnergy=value.homeEnergy===undefined?undefined:(typeof module==='object'&&module.exports?require('./energy-core.js'):globalThis.CasaEnergyCore).config(value.homeEnergy,deviceId);
  const door=value.door==null?undefined:(typeof module==='object'&&module.exports?require('./door-core.js'):globalThis.CasaDoorCore).config(value.door,statusDeviceId);
  const cellarDoor=value.cellarDoor==null?undefined:(typeof module==='object'&&module.exports?require('./door-core.js'):globalThis.CasaDoorCore).config(value.cellarDoor,statusDeviceId);
  if(door&&cellarDoor&&door.deviceId===cellarDoor.deviceId&&door.source===cellarDoor.source&&door.component===cellarDoor.component)throw Error('O mesmo contacto não pode estar associado às duas portas.');
  const windowBindings=value.windowBindings===undefined?undefined:(typeof module==='object'&&module.exports?require('./windows-core.js'):globalThis.CasaWindowsCore).config(value.windowBindings,statusDeviceId,[door,cellarDoor]);
  const ev=value.ev===undefined?undefined:(typeof module==='object'&&module.exports?require('./ev-core.js'):globalThis.CasaEVCore).config(value.ev,{deviceId,used});
  const alarm=value.alarm===undefined?undefined:(typeof module==='object'&&module.exports?require('./alarm-core.js'):globalThis.CasaAlarmCore).config(value.alarm,{deviceId,used});
  let fan=value.fan;if(fan!==undefined&&fan!==null){const a=(typeof module==='object'&&module.exports?require('./alarm-core.js'):globalThis.CasaAlarmCore).config({arm:{...fan,activeWhenOn:true}},{deviceId,used}).arm;fan={deviceId:a.deviceId,channel:a.channel}}
  let heater=value.heater;if(heater!==undefined&&heater!==null){const a=(typeof module==='object'&&module.exports?require('./alarm-core.js'):globalThis.CasaAlarmCore).config({arm:{...heater,activeWhenOn:true}},{deviceId,used}).arm;heater={deviceId:a.deviceId,channel:a.channel}}
  let dehumidifier=value.dehumidifier;if(dehumidifier!==undefined&&dehumidifier!==null){const a=(typeof module==='object'&&module.exports?require('./alarm-core.js'):globalThis.CasaAlarmCore).config({arm:{...dehumidifier,activeWhenOn:true}},{deviceId,used}).arm;dehumidifier={deviceId:a.deviceId,channel:a.channel}}
  const mediaBindings=value.mediaBindings===undefined?undefined:(typeof module==='object'&&module.exports?require('./media-core.js'):globalThis.CasaMediaCore).config(value.mediaBindings,{deviceId,used});
  const officeBindings=value.officeBindings===undefined?undefined:(typeof module==='object'&&module.exports?require('./media-core.js'):globalThis.CasaMediaCore).config(value.officeBindings,{deviceId,used,ids:(typeof module==='object'&&module.exports?require('./media-core.js'):globalThis.CasaMediaCore).OFFICE_IDS});
  const kitchenBindings=value.kitchenBindings===undefined?undefined:(typeof module==='object'&&module.exports?require('./media-core.js'):globalThis.CasaMediaCore).config(value.kitchenBindings,{deviceId,used,ids:(typeof module==='object'&&module.exports?require('./media-core.js'):globalThis.CasaMediaCore).KITCHEN_IDS});
  return {schemaVersion:1,server:host,authKey:value.rememberKey?value.authKey:'',rememberKey:value.rememberKey,bindings,...(value.lightBindings!==undefined?{lightBindings}:{}),...(value.sensorBindings!==undefined?{sensorBindings}:{}),...(ev!==undefined?{ev}:{}),...(door!==undefined?{door}:{}),...(homeEnergy!==undefined?{homeEnergy}:{}),...(cellarDoor!==undefined?{cellarDoor}:{}),...(alarm!==undefined?{alarm}:{}),...(fan!==undefined?{fan}:{}),...(heater!==undefined?{heater}:{}),...(dehumidifier!==undefined?{dehumidifier}:{}),...(mediaBindings!==undefined?{mediaBindings}:{}),...(officeBindings!==undefined?{officeBindings}:{}),...(windowBindings!==undefined?{windowBindings}:{}),...(kitchenBindings!==undefined?{kitchenBindings}:{})}
 }

 const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
 function status(device,channel){
  if(!device||typeof device!=='object')return null;const s=device.status||{},c=s['cover:'+channel]||s.rollers?.[channel],online=device.online===1||device.online===true,position=number(c?.current_pos),errors=Array.isArray(c?.errors)?c.errors.filter(x=>typeof x==='string').slice(0,20):[];
  if(c?.overtemperature)errors.push('overtemperature');if(c?.safety_switch)errors.push('safety_switch');if(c?.stop_reason&&c.stop_reason!=='normal')errors.push(String(c.stop_reason).slice(0,80));
  return {online,hasCover:!!c,model:String(device.code||device.type||'').slice(0,100),generation:String(device.gen||'').slice(0,20),position:position!==null&&position>=0&&position<=100?position:null,state:typeof c?.state==='string'?(s['cover:'+channel]?c.state:({open:'opening',close:'closing',stop:'stopped'}[c.state]||c.state)).slice(0,40):null,calibrated:typeof c?.pos_control==='boolean'?c.pos_control:typeof c?.positioning==='boolean'?c.positioning:null,power:number(c?.apower??c?.power),voltage:number(c?.voltage),current:number(c?.current),energy:number(c?.aenergy?.total),temperature:number(c?.temperature?.tC??s.tmp?.tC),errors};
 }
 function sensorStatus(device,binding){
  if(!device||typeof device!=='object')return null;
  const s=device.status||{},tc=binding.temperatureChannel??0,hc=binding.humidityChannel??0;
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:null;
  const t=object(s['temperature:'+tc])||(tc===0&&(object(s.hum)||binding.type==='door-window2'||device.code==='SHDW-2'||device.type==='SHDW-2')?object(s.tmp):null),h=object(s['humidity:'+hc])||(hc===0?object(s.hum):null);
  const valid=c=>!!c&&s.is_valid!==false&&!(typeof s.sensor_error==='number'&&s.sensor_error!==0)&&c.is_valid!==false&&!(Array.isArray(c.errors)&&c.errors.length);
  let temperature=valid(t)?number(t.tC):null;
  if(valid(t)&&!Object.hasOwn(t,'tC')){const v=number(t.value);if(v!==null&&['C','F'].includes(t.units))temperature=t.units==='F'?(v-32)*5/9:v}
  if(temperature!==null&&(temperature< -100||temperature>150))temperature=null;
  let humidity=valid(h)?number(Object.hasOwn(h,'rh')?h.rh:h.value):null;if(humidity!==null&&(humidity<0||humidity>100))humidity=null;
  const bp=number(s['devicepower:0']?.battery?.percent??s.bat?.value),battery=bp!==null&&bp>=0&&bp<=100?bp:null;
  return {online:device.online===1||device.online===true,hasSensor:!!t||!!h,temperature,humidity,battery,model:String(device.code||device.type||'').slice(0,100)};
 }
 function deviceIds(config){const energy=(typeof module==='object'&&module.exports?require('./energy-core.js'):globalThis.CasaEnergyCore).binding(config);return [...new Set([config.mediaBindings,config.officeBindings,config.kitchenBindings,config.windowBindings,config.fan?{fan:config.fan}:{},config.heater?{heater:config.heater}:{},config.dehumidifier?{dehumidifier:config.dehumidifier}:{},energy?{home:energy}:{},config.bindings,config.lightBindings,config.sensorBindings,config.alarm,config.door?{entrance:config.door}:{},config.cellarDoor?{cellar:config.cellarDoor}:{},config.ev?Object.fromEntries(['meter','totalMeter','relay'].filter(k=>config.ev[k]).map(k=>[k,config.ev[k]])):{}].flatMap(b=>Object.values(b||{}).map(v=>v.deviceId)))]}
 function deviceBatches(config){const ids=deviceIds(config),batches=[];for(let i=0;i<ids.length;i+=10)batches.push(ids.slice(i,i+10));return batches}
 function lightCommand(binding,on){
  if(!binding||!['switch','light'].includes(binding.type)||!Number.isInteger(binding.channel)||binding.channel<0||binding.channel>15||typeof on!=='boolean')throw Error('Comando de candeeiro inválido.');
  return {id:deviceId(binding.deviceId),channel:binding.channel,on,type:binding.type};
 }
 function lightStatus(device,binding){
  if(!device||typeof device!=='object')return null;
  const s=device.status||{},channel=binding.channel;
  const component=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:null;
  const outputs=[];
  for(const [type,collection]of [['switch','relays'],['light','lights']]){
   const channels=new Set();
   for(const key of Object.keys(s)){const m=key.match(new RegExp('^'+type+':(\\d+)$'));if(m&&component(s[key]))channels.add(Number(m[1]))}
   if(s[collection]&&typeof s[collection]==='object')for(const [key,value]of Object.entries(s[collection]))if(/^\d+$/.test(key)&&component(value))channels.add(Number(key));
   for(const ch of [...channels].sort((a,b)=>a-b))outputs.push({type,channel:ch,value:component(s[type+':'+ch])||component(s[collection]?.[ch])});
  }
  const candidates=outputs.filter(o=>o.channel===channel);
  // Resolve only the selected channel from actual status. Never guess a different channel or retry a command with another endpoint.
  const output=candidates.find(o=>o.type===binding.type)||(candidates.length===1?candidates[0]:null),c=output?.value;
  const on=typeof c?.output==='boolean'?c.output:typeof c?.ison==='boolean'?c.ison:null;
  return {online:device.online===1||device.online===true,hasOutput:!!output,on,resolvedType:output?.type||null,resolvedChannel:output?.channel??null,detected:!!output&&output.type!==binding.type,availableOutputs:outputs.map(o=>o.type+':'+o.channel).slice(0,32),power:number(c?.apower??c?.power),brightness:number(c?.brightness),errors:Array.isArray(c?.errors)?c.errors.filter(x=>typeof x==='string').slice(0,20):[],model:String(device.code||device.type||'').slice(0,100)};
 }
 function resolvedLightCommand(binding,reading,on){
  if(!reading?.hasOutput||!['switch','light'].includes(reading.resolvedType)||reading.resolvedChannel!==binding.channel)throw Error('Consulte a saída do candeeiro antes de enviar comandos.');
  return lightCommand({...binding,type:reading.resolvedType},on);
 }
 function canLightControl(d,now=Date.now()){return !!(d?.online&&d.hasOutput&&typeof d.on==='boolean'&&!d.error&&!d.missing&&!d.errors?.length&&Number.isFinite(d.fetchedAt)&&now-d.fetchedAt<=120000)}
 function command(binding,position){
  if(!binding||!Number.isInteger(binding.channel)||binding.channel<0||binding.channel>15)throw Error('Associação de estore inválida.');
  if(!(typeof position==='string'&&['open','close','stop'].includes(position))&&!(typeof position==='number'&&Number.isFinite(position)&&position>=0&&position<=100))throw Error('Comando ou percentagem inválidos.');
  return {id:deviceId(binding.deviceId),channel:binding.channel,position};
 }
 function canControl(d,position,now=Date.now()){
  if(!d||!d.hasCover||d.missing)return false;
  if(position==='stop')return true;
  if(!d.online||d.error||!Number.isFinite(d.fetchedAt)||now-d.fetchedAt>120000)return false;
  if(d.errors?.length||d.state==='calibrating')return false;
  return typeof position!=='number'||(d.calibrated===true&&Number.isFinite(d.position));
 }
 function groupCommand(bindings,position){
  if(!['open','close'].includes(position)||!bindings||typeof bindings!=='object')throw Error('Comando conjunto inválido.');
  const used=new Set(),devices=[];
  for(const [room,b]of Object.entries(bindings)){if(!ROOM_IDS.includes(room))throw Error('Divisão inválida.');const c=command(b,position),id=c.id+'_'+c.channel;if(used.has(id))throw Error('Estores repetidos.');used.add(id);devices.push({id:c.id,channel:c.channel})}
  if(!devices.length||devices.length>4)throw Error('Selecione entre 1 e 4 estores.');return {devices,position};
 }
 return {balconySensorBindings,SUPPLIED_LIGHT_IDS,suppliedLightBindings,ROOM_IDS,LIGHT_ROOM_IDS,SENSOR_ROOM_IDS,sensorStatus,deviceIds,deviceBatches,server,deviceId,statusDeviceId,config,status,lightCommand,lightStatus,resolvedLightCommand,canLightControl,command,canControl,groupCommand};
});
