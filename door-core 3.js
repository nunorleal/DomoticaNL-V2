/* Read-only entrance sensor. Unknown must never be reported as closed. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaDoorCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const SUPPLIED_DOOR_IDS={door:'XB66172384118439',cellarDoor:'XB106582486435511'};
 function suppliedBindings(previous={}){return Object.fromEntries(Object.entries(SUPPLIED_DOOR_IDS).map(([role,deviceId])=>{const old=previous[role],same=old?.source==='blu'&&String(old.deviceId).toUpperCase()===deviceId;return [role,{deviceId,source:'blu',component:same?old.component:0}]}))}

 function config(v,readId){if(!v||typeof v!=='object'||Array.isArray(v)||!['blu','bthome'].includes(v.source))throw Error('Associação da porta inválida.');const component=v.component??0;if(!Number.isInteger(component)||component<0||component>999)throw Error('Componente da porta inválido.');const raw=String(v.deviceId).trim();if(v.source==='bthome'&&/^XB/i.test(raw))throw Error('Em BTHome, indique o ID hexadecimal do gateway; o ID XB pertence ao sensor BLU.');return {deviceId:readId(raw),source:v.source,component}}
 function binary(v){return v===true||v===1?true:v===false||v===0?false:null}
 function status(device,b){
  const s=device?.status||{},online=device?.online===true||device?.online===1;
  let open=null,updatedAt=null,hasSensor=false;
  if(b.source==='bthome'){
   const c=s['bthomesensor:'+b.component];hasSensor=!!c;
   if(c&&c.is_valid!==false&&!c.errors?.length){open=binary(c.value);const ts=c.last_updated_ts??c.last_update_ts;if(typeof ts==='number'&&Number.isFinite(ts)&&ts>0)updatedAt=ts*1000}
  }else{
   const c=s['window:'+b.component];hasSensor=!!c||b.component===0&&Object.hasOwn(s,'window');
   if(c&&c.is_valid!==false&&!c.errors?.length){
    const hasOpen=Object.hasOwn(c,'open'),hasValue=Object.hasOwn(c,'value'),a=binary(c.open),v=binary(c.value);
    open=hasOpen?(hasValue&&(a===null||v===null||a!==v)?null:a):v;
   }
   else if(!c&&b.component===0)open=binary(s.window);
  }
  if(s.is_valid===false)open=null;
  return {online,missing:!device,hasSensor,open,updatedAt};
 }
 function state(r,now=Date.now()){return r?.online&&!r.error&&typeof r.open==='boolean'&&Number.isFinite(r.fetchedAt)&&now-r.fetchedAt>=0&&now-r.fetchedAt<=45000?r.open:null}
 function inspectGateway(device){
  if(!device)return {found:false,online:false,components:[]};
  const components=[];
  for(const [key,c]of Object.entries(device.status||{})){
   const m=/^bthomesensor:([0-9]{1,3})$/.exec(key);if(!m||!c||typeof c!=='object'||Array.isArray(c))continue;
   const value=typeof c.value==='boolean'||typeof c.value==='number'&&Number.isFinite(c.value)?c.value:null;
   const ts=c.last_updated_ts??c.last_update_ts;
   components.push({id:Number(m[1]),value,valid:c.is_valid!==false&&!c.errors?.length,updatedAt:typeof ts==='number'&&Number.isFinite(ts)&&ts>0?ts*1000:null});
  }
  return {found:true,online:device.online===true||device.online===1,components:components.sort((a,b)=>a.id-b.id)};
 }
 function inspectSensor(device){
  if(!device)return {found:false,online:false,fields:[],keys:[]};
  const s=device.status||{},keys=Object.keys(s).filter(k=>/^[a-zA-Z_][a-zA-Z0-9_:.-]{0,60}$/.test(k)).slice(0,60),fields=[];
  const allowed=/^(window|contact|sensor|state|value|open|is_open|is_valid|last_updated_ts|last_update_ts|ts|_updated|battery|bat|lux|illuminance|tilt|angle)(:[0-9]+)?$/;
  function walk(v,path,depth){if(depth>4||fields.length>=60)return;if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&/^(open|closed|true|false|0|1)$/i.test(v)){fields.push({path,value:v});return}if(v&&typeof v==='object'&&!Array.isArray(v))for(const [k,x]of Object.entries(v))if(allowed.test(k))walk(x,path?path+'.'+k:k,depth+1)}
  walk(s,'',0);return {found:true,online:device.online===true||device.online===1,keys,fields};
 }
 return {SUPPLIED_DOOR_IDS,suppliedBindings,config,status,state,inspectGateway,inspectSensor};
});
