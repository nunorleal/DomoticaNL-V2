/* Local display references only. Native Shelly readings remain the source of timer state. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaApplianceTimerStore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
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
 return {create};
});
