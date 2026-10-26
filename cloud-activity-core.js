/* Read-only progress, not permission to actuate an individual device. No identifiers or secrets. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaCloudActivityCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function readingCondition(reading,valid,now=Date.now(),maxAge=45000){
  if(reading&&(reading.error||reading.missing||reading.online===false||reading.online===0||reading.errors?.length))return 'unavailable';
  if(!reading||!Number.isFinite(reading.fetchedAt))return 'pending';
  if(now<reading.fetchedAt||now-reading.fetchedAt>maxAge)return 'stale';
  return valid?'ready':'unavailable';
 }
 function state(v,now=Date.now()){
  const a=v.activity,s=v.session;let phase='ready',label='Pronta',tone='ready';
  if(!v.configured){phase='unconfigured';label='Por configurar';tone='muted'}
  else if(v.dirty){phase='dirty';label='Guardar alterações';tone='warning'}
  else if(v.sending){phase='sending';label='A enviar comando';tone='working'}
  else if(now<(s.retryAt||0)){phase='cooldown';label='Pausa Shelly · '+Math.ceil((s.retryAt-now)/1000)+' s';tone='warning'}
  else if(v.confirming){phase='confirming';label='A confirmar '+v.confirming;tone='working'}
  else if(v.background&&v.lastFetched&&now-v.lastFetched<=45000&&!v.unavailable&&!v.staleDevices&&!v.pendingDevices&&!v.focused&&!a.error){phase='background';label='Disponível · a atualizar';tone='ready'}
  else if(a.running){phase='loading';label='A atualizar '+a.doneDevices+'/'+a.totalDevices;tone='working'}
  else if(v.busy||s.queued||s.active){phase='queued';label='Em comunicação';tone='working'}
  else if(a.error){phase='error';label=s.lastFailure==='limit'?'Limite de pedidos':'Consulta incompleta';tone='error'}
  else if(v.focused){phase='focused';label='Prioridade ao dispositivo'+(v.focusProblems?' · por atualizar':'');tone=v.focusProblems?'warning':'ready'}
  else if(!v.lastFetched||!a.totalRequests){phase='pending';label='Por consultar';tone='muted'}
  else if(v.pendingDevices){phase='pending';label=v.pendingDevices+' por consultar';tone='muted'}
  else if(v.staleDevices){phase='stale';label=v.staleDevices+' com dados antigos';tone='warning'}
  else if(now-v.lastFetched>45000||now<v.lastFetched){phase='stale';label='Dados desatualizados';tone='warning'}
  else if(v.unavailable){phase='unavailable';label=v.unavailable+' '+(v.unavailable===1?'indisponível':'indisponíveis');tone='warning'}
  return {phase,label,tone,ready:phase==='ready'||phase==='background',availableDevices:Math.max(0,v.count-v.unavailable-(v.staleDevices||0)-(v.pendingDevices||0)),configuredDevices:v.count,doneDevices:a.doneDevices,totalDevices:a.totalDevices||v.count,doneRequests:a.doneRequests,totalRequests:a.totalRequests,unavailable:v.unavailable,staleDevices:v.staleDevices||0,pendingDevices:v.pendingDevices||0,pausedDevices:v.pausedDevices||0,focused:!!v.focused,confirming:v.confirming,lastFetched:v.lastFetched,session:{...s}};
 }
 function progress(d){
  const total=d.configuredDevices||0,complete=total>0&&d.ready&&d.availableDevices===total;
  const ratio=complete?1:d.phase==='loading'?(d.totalDevices?d.doneDevices/d.totalDevices:0):(total?d.availableDevices/total:0);
  return {percent:Math.round(Math.max(0,Math.min(1,ratio))*100),complete,tone:complete?'ready':d.tone==='ready'?'working':d.tone};
 }
 return {state,readingCondition,progress};
});
