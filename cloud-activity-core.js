/* Read-only progress, not permission to actuate an individual device. No identifiers or secrets. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaCloudActivityCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function state(v,now=Date.now()){
  const a=v.activity,s=v.session;let phase='ready',label='Pronta',tone='ready';
  if(!v.configured){phase='unconfigured';label='Por configurar';tone='muted'}
  else if(v.dirty){phase='dirty';label='Guardar alterações';tone='warning'}
  else if(v.sending){phase='sending';label='A enviar comando';tone='working'}
  else if(now<(s.retryAt||0)){phase='cooldown';label='Pausa Shelly · '+Math.ceil((s.retryAt-now)/1000)+' s';tone='warning'}
  else if(v.confirming){phase='confirming';label='A confirmar '+v.confirming;tone='working'}
  else if(v.background&&v.lastFetched&&now-v.lastFetched<=45000&&!v.unavailable&&!a.error){phase='background';label='Disponível · a atualizar';tone='ready'}
  else if(a.running){phase='loading';label='A atualizar '+a.doneDevices+'/'+a.totalDevices;tone='working'}
  else if(v.busy||s.queued||s.active){phase='queued';label='Em comunicação';tone='working'}
  else if(a.error){phase='error';label=s.lastFailure==='limit'?'Limite de pedidos':'Consulta incompleta';tone='error'}
  else if(!v.lastFetched||!a.totalRequests){phase='pending';label='Por consultar';tone='muted'}
  else if(now-v.lastFetched>45000||now<v.lastFetched){phase='stale';label='Dados desatualizados';tone='warning'}
  else if(v.unavailable){phase='unavailable';label=v.unavailable+' '+(v.unavailable===1?'indisponível':'indisponíveis');tone='warning'}
  return {phase,label,tone,ready:phase==='ready'||phase==='background',availableDevices:Math.max(0,v.count-v.unavailable),configuredDevices:v.count,doneDevices:a.doneDevices,totalDevices:a.totalDevices||v.count,doneRequests:a.doneRequests,totalRequests:a.totalRequests,unavailable:v.unavailable,confirming:v.confirming,lastFetched:v.lastFetched,session:{...s}};
 }
 return {state};
});
