/* Read-only BLU window contacts; no actuator commands. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./door-core.js'));else root.CasaWindowsCore=factory(root.CasaDoorCore)})(typeof window==='undefined'?globalThis:window,function(D){
 'use strict';const IDS=['master','bedroom2','living','kitchen'],DEFAULT_IDS={master:'XB154411473786357',bedroom2:'XB106582486823095',living:'XB66172384108257',kitchen:'XB106582486821873'};
 function config(value,readId,doors=[]){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!IDS.includes(k)))throw Error('Associações das janelas inválidas.');const used=new Set(doors.filter(Boolean).map(b=>[b.deviceId.toLowerCase(),b.source,b.component].join(':'))),out={};for(const [id,b]of Object.entries(value)){const next=D.config(b,readId),pair=[next.deviceId.toLowerCase(),next.source,next.component].join(':');if(used.has(pair))throw Error('O mesmo contacto não pode estar associado a duas portas ou janelas.');used.add(pair);out[id]=next}return out}
 function defaults(existing={}){return {...Object.fromEntries(IDS.map(id=>[id,{deviceId:DEFAULT_IDS[id],source:'blu',component:0}])),...existing}}
 function snapshot(binding,reading,now=Date.now()){return {configured:!!binding,open:binding?D.state(reading,now):null,reading:reading?{...reading}:null}}
 return {IDS,DEFAULT_IDS,config,defaults,snapshot};
});
