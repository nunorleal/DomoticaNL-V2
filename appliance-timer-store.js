/* Local display references only. Native Shelly readings remain the source of timer state. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaApplianceTimerStore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const PRESET_KEY='casa-nl-appliance-timer-presets-v1';
 function presetList(value){if(!Array.isArray(value)||value.length!==3||new Set(value).size!==3||value.some(n=>!Number.isInteger(n)||n<1||n>1440))throw Error('Tempos predefinidos inválidos.');return [...value].sort((a,b)=>a-b)}
 function presetSettings(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['heater-dialog','dehumidifier-dialog'].includes(k)))throw Error('Preferências de temporizador inválidas.');return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,presetList(v)]))}
 function learnPreset(values,minutes){const out=presetList(values);if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('Escolha entre 1 e 1440 minutos.');if(out.includes(minutes))return out;let index=0;for(let i=1;i<out.length;i++)if(Math.abs(out[i]-minutes)<=Math.abs(out[index]-minutes))index=i;out[index]=minutes;return out.sort((a,b)=>a-b)}
 function presets({storage,key=PRESET_KEY,role}){const load=()=>{try{return presetSettings(JSON.parse(storage?.getItem(key)||'{}'))}catch{return {}}};return {get:()=>load()[role]||[5,10,15],remember(minutes){const data=load();data[role]=learnPreset(data[role]||[5,10,15],minutes);try{storage?.setItem(key,JSON.stringify(data))}catch{}return data[role]}}}
 function create({storage=null,key,now=Date.now,context}){
  const memory=new Map(),roles=new Set(['heater','dehumidifier']);
  const load=()=>{try{const data=JSON.parse(storage?.getItem(key)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch{return {}}};
  const write=data=>{try{storage?.setItem(key,JSON.stringify(data))}catch{}};
  function scope(role){const c=context(role),b=c.binding;if(!roles.has(role)||!c.server||!b?.deviceId||!Number.isInteger(b.channel))return null;return {signature:JSON.stringify([c.server,b.deviceId,b.channel]),generation:c.generation}}
  function valid(s){return s&&Number.isFinite(s.acceptedAt)&&Number.isFinite(s.until)&&s.acceptedAt<=now()&&s.until>now()&&s.until>s.acceptedAt&&s.until-s.acceptedAt<=86400000}
  return {
   get(role){const c=scope(role);if(!c)return undefined;const cached=memory.get(role);if(cached?.signature===c.signature&&cached.generation===c.generation)return cached;memory.delete(role);const saved=load()[role];if(saved?.signature!==c.signature||!valid(saved))return undefined;const restored={generation:c.generation,signature:c.signature,until:saved.until,acceptedAt:saved.acceptedAt,awaiting:false,restored:true};memory.set(role,restored);return restored},
   set(role,selection){const c=scope(role);if(!c)return this;const value={...selection,...c};memory.set(role,value);const data=load();data[role]={signature:c.signature,until:value.until,acceptedAt:value.acceptedAt};write(data);return this},
   delete(role){const removed=memory.delete(role),data=load();delete data[role];write(data);return removed}
  };
 }
 return {create,PRESET_KEY,presetList,presetSettings,learnPreset,presets};
});
