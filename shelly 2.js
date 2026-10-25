/* Shelly Cloud status and user-initiated cover control. Secrets never appear in DOM messages or console. */
(function(){
 'use strict';
 const CORE=window.ShellyCore,KEY='casa-nl-shelly-cloud-v1',SESSION='casa-nl-shelly-session-v1',$=id=>document.getElementById(id);
 let config={schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{},lightBindings:{}},key='',busy=false,generation=0,lastFetched=0;
 let refreshing=false,readEpoch=0,readTask=null,nextRefreshAt=0,urgentReads=0,activeReadPriority=false;const deferredReads=new Set(),checkedDevices=new Map();
 const lastRelay=r=>r?.hasOutput&&typeof r.on==='boolean'&&Number.isFinite(r.fetchedAt)?{on:r.on,fetchedAt:r.fetchedAt}:null;
 const blockingRead=()=>busy&&!refreshing||Date.now()<(transport.stats(config.server).retryAt||0);
 const confirmations=window.CasaConfirmationCore.create(),targetRevisions=new Map();
 function setCoverTarget(id,target){targets.set(id,target);targetRevisions.set(id,sequences.get(id))}
 function pendingEntries(){return [
  ...[...targets].map(([id,target])=>({key:'cover:'+id,kind:'cover',revision:targetRevisions.get(id),id:binding(id)?.deviceId,target,before:reading(id)?.position})),
  ...[...lightTargets].map(([id,target])=>({key:'light:'+id,id:lightBinding(id)?.deviceId,target})),
  ...[...mediaTargets].map(([id,target])=>({key:'media:'+id,id:mediaBinding(id)?.deviceId,target})),
  ...[['ev',evTarget,config.ev?.relay],['alarm',alarmTarget,config.alarm?.arm],['fan',fanTarget,config.fan],['heater',heaterTarget,config.heater],['dehumidifier',dehumidifierTarget,config.dehumidifier]].filter(([,target,b])=>target!==null&&b).map(([key,target,b])=>({key,id:b.deviceId,target}))
 ].filter(e=>e.id)}
 function pendingIds(){return [...new Set(pendingEntries().map(e=>e.id))]}
 function confirmationCurrent(key,d){return window.CasaConfirmationCore.current(confirmations.get(key),d)}
 function settleCovers(){for(const [id]of targets)if(window.CasaConfirmationCore.coverConfirmed(confirmations.get('cover:'+id),reading(id))){targets.delete(id);feedback('Comando do estore confirmado pelo estado reportado. A posição continua a acompanhar as leituras.')}}
 function expireConfirmations(){
  const message='Comando sem confirmação no prazo de verificação. A app mantém o último estado recebido e continuará a atualizá-lo automaticamente.';
  for(const ticket of confirmations.expired()){
   const [kind,id]=ticket.key.split(':');
   if(kind==='cover'){targets.delete(id);feedback(message,true)}
   else if(kind==='light'){lightTargets.delete(id);lightMessages.set(id,message)}
   else if(kind==='media'){mediaTargets.delete(id);mediaMessages.set(id,message)}
   else if(kind==='ev'){evTarget=null;evMessage=message}
   else if(kind==='alarm'){alarmTarget=null;alarmMessage=message}
   else if(kind==='fan'){fanTarget=null;fanMessage=message}
   else if(kind==='heater'){heaterTarget=null;heaterMessage=message}
   else if(kind==='dehumidifier'){dehumidifierTarget=null;dehumidifierMessage=message}
  }
  confirmations.sync(pendingEntries());
 }


 const MC=window.CasaMediaCore,mediaReadings={},mediaTargets=new Map(),mediaMessages=new Map();
 const resultOpen=new Map();
 let activity={totalRequests:0,doneRequests:0,totalDevices:0,doneDevices:0,running:false,error:false};
 const activityChanged=()=>window.dispatchEvent(new Event('shellyactivitychange'));
 let fanReading=null,fanTarget=null,fanMessage='',fanMigrationAllowed=true;
 let heaterReading=null,heaterTarget=null,heaterMessage='';
 let dehumidifierReading=null,dehumidifierTarget=null,dehumidifierMessage='';
 const AL=window.CasaAlarmCore;let alarmReadings={},alarmTarget=null,alarmMessage='';
 const EV=window.CasaEVCore;let evReadings={},evMessage='',evTarget=null;
 let energyReading=null;
 let doorReading=null,cellarDoorReading=null;const windowReadings={};
 const sensorReadings=new Map();
 const sensorBinding=id=>config.sensorBindings?.[id]||null;
 const sensorReading=id=>sensorReadings.get(id)||null;
 const lightReadings=new Map(),lightTargets=new Map(),lightMessages=new Map();let lightGroupBusy=false;
 const readings=new Map(),targets=new Map(),sequences=new Map();let commandCount=0,groupBusy=false,stopping=false,pollTimer,lastMessage='',lastError=false;
 try{const saved=localStorage.getItem(KEY);if(saved)config=CORE.config(JSON.parse(saved));const session=JSON.parse(sessionStorage.getItem(SESSION)||'null');key=config.authKey||(session?.server===config.server?session.key:'')||''}catch{fanMigrationAllowed=false}
 if(fanMigrationAllowed&&config.fan===undefined){try{const next=CORE.config({...config,fan:{deviceId:'8819dc',channel:0}});localStorage.setItem(KEY,JSON.stringify(next));config=next}catch{fanMessage='Associe a ventoinha nas definições: ID 8819dc, canal 0.'}}
 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-cellar-temperature-added-v1')){if(!Object.hasOwn(config.sensorBindings||{},'cellar')){const next=CORE.config({...config,sensorBindings:{...config.sensorBindings,cellar:{deviceId:'7dc19d',temperatureChannel:0,humidityChannel:0,type:'door-window2'}}});localStorage.setItem(KEY,JSON.stringify(next));config=next}localStorage.setItem('casa-nl-cellar-temperature-added-v1','true')}}catch{}
 if(fanMigrationAllowed&&(config.mediaBindings===undefined||config.officeBindings===undefined)){try{const next=CORE.config({...config,...(config.mediaBindings===undefined?{mediaBindings:{tv:{deviceId:'437c82',channel:0},soundbar:{deviceId:'4359bb',channel:0},playstation:{deviceId:'435aa1',channel:0},vodafone:{deviceId:'e465b8b9c64c',channel:0},unifi:{deviceId:'e465b84553bc',channel:0}}}:{}),...(config.officeBindings===undefined?{officeBindings:{monitor:{deviceId:'441db8',channel:0},apollo:{deviceId:'e43ad8',channel:0},terramaster:{deviceId:'e9df12',channel:0},blackdrive:{deviceId:'bb8ac4',channel:0}}}:{})});localStorage.setItem(KEY,JSON.stringify(next));config=next}catch(error){for(const id of MC.IDS)mediaMessages.set(id,error.message)}}

 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-gui-ids-associated-v1')){const next=CORE.config({...config,officeBindings:MC.associateOffice(config.officeBindings)});localStorage.setItem(KEY,JSON.stringify(next));config=next;localStorage.setItem('casa-nl-gui-ids-associated-v1','true')}}catch{for(const id of MC.OFFICE_IDS)mediaMessages.set(id,'Confirme a associação dos IDs da secretária nas definições.')}

 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-window-ids-associated-v1')){const next=CORE.config({...config,windowBindings:CasaWindowsCore.defaults(config.windowBindings)});localStorage.setItem(KEY,JSON.stringify(next));config=next;localStorage.setItem('casa-nl-window-ids-associated-v1','true')}}catch{}

 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-lights-restored-v1')){const next=CORE.config({...config,lightBindings:CORE.suppliedLightBindings(config.lightBindings)});localStorage.setItem(KEY,JSON.stringify(next));config=next;localStorage.setItem('casa-nl-lights-restored-v1','true')}}catch{for(const id of CORE.LIGHT_ROOM_IDS)lightMessages.set(id,'Confirme os IDs dos três candeeiros nas definições.')}

 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-door-ids-restored-v1')){const next=CORE.config({...config,...CasaDoorCore.suppliedBindings(config)});localStorage.setItem(KEY,JSON.stringify(next));config=next;localStorage.setItem('casa-nl-door-ids-restored-v1','true')}}catch{lastMessage='Confirme os IDs dos sensores das duas portas nas definições.';lastError=true}

 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-balcony-sensor-added-v1')){const next=CORE.config({...config,sensorBindings:CORE.balconySensorBindings(config.sensorBindings)});localStorage.setItem(KEY,JSON.stringify(next));config=next;localStorage.setItem('casa-nl-balcony-sensor-added-v1','true')}}catch{}

 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-heater-added-v1')){if(config.heater===undefined){const next=CORE.config({...config,heater:{deviceId:'ea9d29',channel:0}});localStorage.setItem(KEY,JSON.stringify(next));config=next}localStorage.setItem('casa-nl-heater-added-v1','true')}}catch{heaterMessage='Confirme o ID ea9d29 e o canal nas definições.'}
 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-dehumidifier-added-v1')){if(config.dehumidifier===undefined){const next=CORE.config({...config,dehumidifier:{deviceId:'88d798',channel:0}});localStorage.setItem(KEY,JSON.stringify(next));config=next}localStorage.setItem('casa-nl-dehumidifier-added-v1','true')}}catch{dehumidifierMessage='Confirme o ID 88d798 e o canal nas definições.'}

 try{if(fanMigrationAllowed&&!localStorage.getItem('casa-nl-kitchen-ids-associated-v1')){const next=CORE.config({...config,kitchenBindings:MC.associateKitchen(config.kitchenBindings)});localStorage.setItem(KEY,JSON.stringify(next));config=next;localStorage.setItem('casa-nl-kitchen-ids-associated-v1','true')}}catch{for(const id of MC.KITCHEN_IDS)mediaMessages.set(id,'Confirme os IDs dos equipamentos da cozinha nas definições.')}
 let savedConfigText=null;try{savedConfigText=localStorage.getItem(KEY)}catch{}

 const binding=id=>config.bindings[id]||null;
 const lightBinding=id=>config.lightBindings?.[id]||null;
 const lightReading=id=>lightReadings.get(id)||null;
 const reading=id=>readings.get(id)||null;
 const stateName=s=>({open:'Aberto',closed:'Fechado',opening:'A abrir',closing:'A fechar',stop:'Parado',stopped:'Parado',close:'A fechar',calibrating:'A calibrar'})[s]||s||'Não disponível';
 function caption(id){const d=reading(id);if(!d)return 'Shelly Cloud · por consultar';if(d.error)return Number.isFinite(d.position)?'Última leitura · '+Math.round(d.position)+'% · atualização pendente':'Shelly Cloud · consulta indisponível';if(d.missing)return 'ID não encontrado nesta conta · verifique o ID e o servidor';if(!d.online)return 'Shelly Cloud · offline (dados guardados)';if(!d.hasCover)return 'Canal de estore não encontrado';return `${stateName(d.state)}${d.position===null?' · posição desconhecida':''} · Cloud${Date.now()-(d.fetchedAt||0)>120000?' · dados desatualizados':''}`}
 function feedback(text,error=false){lastMessage=text;lastError=error;$('shelly-feedback').textContent=text;$('shelly-feedback').classList.toggle('error',error);const p=document.querySelector('.shelly-room-feedback');if(p){p.textContent=text;p.classList.toggle('error',error)}}
 function fill(){window.CasaWindows.fill(config.windowBindings);window.CasaMediaForm.fill(config.mediaBindings,config.officeBindings,config.kitchenBindings);
  window.CasaAlarmForm.fill(config.alarm);window.CasaFanForm.fill(config.fan);window.CasaHeaterForm.fill(config.heater);window.CasaDehumidifierForm.fill(config.dehumidifier);
  window.CasaEnergyForm.fill(config.homeEnergy);
  window.CasaDoor.fill(config.door);window.CasaDoor.fill(config.cellarDoor,'cellar-door');
  window.CasaEVForm.fill(config.ev);
  $('shelly-server').value=config.server;$('shelly-key').value=key;$('shelly-remember').checked=config.rememberKey;
  $('shelly-mappings').innerHTML=CORE.ROOM_IDS.map(id=>{const r=rooms.find(r=>r.id===id),b=binding(id);return `<fieldset class="shelly-mapping"><legend>${escapeHTML(r.name)}</legend><label for="shelly-id-${id}">Device ID</label><input id="shelly-id-${id}" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}"><label for="shelly-channel-${id}">Canal</label><input id="shelly-channel-${id}" type="number" min="0" max="15" step="1" value="${b?.channel??0}"></fieldset>`}).join('');
  const lampNames={master:'Abajur com flores',bedroom2:'Candeeiro preto',living:'Candeeiro de pé cromado'};
  $('shelly-light-mappings').innerHTML=CORE.LIGHT_ROOM_IDS.map(id=>{const r=rooms.find(r=>r.id===id),b=lightBinding(id);return `<fieldset class="shelly-mapping shelly-light-mapping"><legend>${escapeHTML(r.name)}</legend><p class="settings-explanation">${lampNames[id]}</p><label for="shelly-light-id-${id}">Device ID do candeeiro</label><input id="shelly-light-id-${id}" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}"><div class="shelly-light-options"><div><label for="shelly-light-channel-${id}">Canal da luz</label><input id="shelly-light-channel-${id}" type="number" min="0" max="15" step="1" value="${b?.channel??0}"></div><div><label for="shelly-light-type-${id}">Tipo preferido</label><select id="shelly-light-type-${id}"><option value="switch"${b?.type!=='light'?' selected':''}>switch · Relé / tomada</option><option value="light"${b?.type==='light'?' selected':''}>light · Luz / dimmer</option></select></div></div><p class="settings-explanation light-mapping-state">${b?'Associação guardada':'Sem associação'}</p></fieldset>`}).join('');

  $('shelly-sensor-mappings').innerHTML=CORE.SENSOR_ROOM_IDS.map(id=>{const r=id==='cellar'?{name:'Cave'}:rooms.find(r=>r.id===id),b=sensorBinding(id);return `<fieldset class="shelly-mapping"><legend>${escapeHTML(r.name)}</legend><label for="shelly-sensor-id-${id}">Device ID do sensor</label><input id="shelly-sensor-id-${id}" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}">${id==='cellar'?`<label for="shelly-sensor-type-cellar">Tipo de sensor</label><select id="shelly-sensor-type-cellar"><option value="door-window2"${b?.type==='door-window2'?' selected':''}>Shelly Door Window 2 · temperatura</option><option value="environment"${b?.type!=='door-window2'?' selected':''}>Sensor de temperatura e humidade</option></select>`:''}<details class="shelly-help"><summary>Componentes do sensor (avançado)</summary><p class="settings-explanation">Nos H&amp;T habituais ambos são 0. Altere apenas se o dispositivo usar outros IDs de componente.</p><div class="shelly-light-options"><div><label for="shelly-sensor-temperature-${id}">Temperatura</label><input id="shelly-sensor-temperature-${id}" type="number" min="0" max="255" step="1" value="${b?.temperatureChannel??0}"></div><div><label for="shelly-sensor-humidity-${id}">Humidade</label><input id="shelly-sensor-humidity-${id}" type="number" min="0" max="255" step="1" value="${b?.humidityChannel??0}"></div></div></details><p class="settings-explanation light-mapping-state">${b?'Sensor associado':'Sem associação'}</p></fieldset>`}).join('');

  window.CasaAssociationWarnings?.sync();
 }
 function dirty(){if(window.CasaWindows.dirty(config.windowBindings))return true;if(window.CasaMediaForm.dirty(config.mediaBindings,config.officeBindings,config.kitchenBindings))return true;if($('shelly-sensor-type-cellar').value!==(sensorBinding('cellar')?.type||'environment'))return true;if(window.CasaFanForm.dirty(config.fan))return true;if(window.CasaHeaterForm.dirty(config.heater))return true;if(window.CasaDehumidifierForm.dirty(config.dehumidifier))return true;if(window.CasaAlarmForm.dirty(config.alarm))return true;if(window.CasaEnergyForm.dirty(config.homeEnergy))return true;if(window.CasaDoor.dirty(config.door)||window.CasaDoor.dirty(config.cellarDoor,'cellar-door'))return true;if(window.CasaEVForm.dirty(config.ev))return true;if($('shelly-server').value.trim()!==config.server||$('shelly-key').value.trim()!==key||$('shelly-remember').checked!==config.rememberKey)return true;return CORE.SENSOR_ROOM_IDS.some(id=>$('shelly-sensor-id-'+id).value.trim().toLowerCase()!==(sensorBinding(id)?.deviceId||'')||Number($('shelly-sensor-temperature-'+id).value)!==(sensorBinding(id)?.temperatureChannel??0)||Number($('shelly-sensor-humidity-'+id).value)!==(sensorBinding(id)?.humidityChannel??0))||CORE.LIGHT_ROOM_IDS.some(id=>$('shelly-light-id-'+id).value.trim().toLowerCase()!==(lightBinding(id)?.deviceId||'')||Number($('shelly-light-channel-'+id).value)!==(lightBinding(id)?.channel??0)||$('shelly-light-type-'+id).value!==(lightBinding(id)?.type||'switch'))||CORE.ROOM_IDS.some(id=>$('shelly-id-'+id).value.trim().toLowerCase()!==(binding(id)?.deviceId||'')||Number($('shelly-channel-'+id).value)!==(binding(id)?.channel??0))}
 function reapply(){for(const id of CORE.ROOM_IDS){const r=rooms.find(r=>r.id===id);if(!binding(id))continue;stopMotion(id);const d=reading(id);r.blind=Number.isFinite(d?.position)?d.position:0}for(const id of CORE.LIGHT_ROOM_IDS){if(!lightBinding(id))continue;const r=rooms.find(r=>r.id===id),d=lightReading(id);r.light=typeof d?.on==='boolean'?d.on:false}}
 function lightCaption(id){
  const d=lightReading(id);
  if(!d)return 'Candeeiro Shelly Cloud · por consultar';
  if(d.missing)return 'Candeeiro: ID não encontrado nesta conta';
  if(d.error)return 'Candeeiro: consulta indisponível · estado por confirmar';
  if(!d.online)return 'Candeeiro offline · último estado conhecido';
  if(!d.hasOutput){const b=lightBinding(id);return `Saída ${b.type}:${b.channel} não encontrada · ${d.availableOutputs?.length?'disponíveis: '+d.availableOutputs.join(', '):'o dispositivo não reportou saídas de luz/relé; confirme o Device ID'}`}
  if(typeof d.on!=='boolean')return 'Candeeiro: estado desconhecido';
  if(d.errors?.length)return 'Candeeiro: erro reportado pelo Shelly';
  return `Candeeiro ${d.on?'ligado':'desligado'} · Cloud${d.detected?' · '+d.resolvedType+':'+lightBinding(id).channel+' detetada':''}${Date.now()-d.fetchedAt>120000?' · dados desatualizados':''}`;
 }
 function lightValue(id){const d=lightReading(id);return d?.online&&!d.error&&typeof d.on==='boolean'?(d.on?'Ligada':'Desligada'):'Por confirmar'}
 function decorateLight(r){
  if(!lightBinding(r.id))return;
  const host=$('detail-card'),control=$('light-toggle'),section=host.querySelector('.light-control');
  control.disabled=blockingRead()||commandCount>0||lightGroupBusy||groupBusy||dirty()||!key||!config.server||lightTargets.has(r.id)||!CORE.canLightControl(lightReading(r.id));
  control.setAttribute('aria-label',`Iluminação real de ${r.name}`);
  const caption=host.querySelector('.room-light-caption');caption.textContent=lightCaption(r.id).split(' · ')[0];
  const p=document.createElement('p');p.className='shelly-light-feedback';p.setAttribute('role','status');p.textContent=lightMessages.get(r.id)||'';section.append(p);
  const b=document.createElement('button');b.className='secondary-action';b.textContent='Atualizar dados do candeeiro';b.disabled=busy||commandCount>0||lightGroupBusy;b.addEventListener('click',()=>refreshEquipment(detailView==='light'?'light':'room',r.id));section.append(b);
  const note=host.querySelector('.selected-device-note');note.textContent='Candeeiro real Shelly Cloud.';
 }
 async function commandLight(id,on){
  if(!lightBinding(id)||lightTargets.has(id)||blockingRead()||commandCount||groupBusy||lightGroupBusy)return;
  if(dirty()||!key||!config.server||!CORE.canLightControl(lightReading(id))){lightMessages.set(id,'Atualize os dados e confirme o tipo de saída, canal e ligação Cloud.');render();return}
  const version=generation,payload=CORE.resolvedLightCommand(lightBinding(id),lightReading(id),on);commandCount++;lightMessages.set(id,'A enviar o comando ao candeeiro…');summary();render();
  try{
   const result=await api('light',payload);if(version!==generation)return;if(!result.accepted)throw Error('O Cloud não confirmou o comando.');
   lightTargets.set(id,on);lightMessages.set(id,'Comando aceite. A aguardar o estado reportado pelo candeeiro.');
  }catch(error){if(version===generation){lightMessages.set(id,error.message);notify('Não foi possível confirmar o comando do candeeiro.')}}
  finally{commandCount--;if(version===generation){summary();render();settleLights();render();schedulePoll()}}
 }
 function settleLights(){for(const [id,on]of lightTargets){const d=lightReading(id);if(confirmationCurrent('light:'+id,d)&&d.on===on){lightTargets.delete(id);lightMessages.set(id,'')}}}
 function lightGroupFeedback(text,error=false){const p=$('all-light-status');p.textContent=text;p.hidden=mode!=='lights';p.classList.toggle('error',error)}
 async function commandAllLights(on,demoCount=0){
  if(blockingRead()||commandCount||groupBusy||lightGroupBusy)return;
  const version=generation,report=[];let accepted=0,failed=0;lightGroupBusy=true;summary();
  try{
   if(dirty()||!key||!config.server)throw Error('Guarde as credenciais antes de controlar os candeeiros.');
   lightGroupFeedback('A verificar os candeeiros Cloud…');
   if(Object.keys(config.lightBindings||{}).some(id=>!CORE.canLightControl(lightReading(id))||Date.now()-lightReading(id).fetchedAt>30000))await refresh({quiet:true});
   if(version!==generation)return;
   commandCount++;summary();render();
   try{for(const [id,b]of Object.entries(config.lightBindings||{})){
    const name=rooms.find(r=>r.id===id).name;
    if(!CORE.canLightControl(lightReading(id))){failed++;report.push(name+': '+lightCaption(id));continue}
    try{const result=await api('light',CORE.resolvedLightCommand(b,lightReading(id),on));if(version!==generation)return;if(!result.accepted)throw Error('Sem confirmação');accepted++;lightTargets.set(id,on);lightMessages.set(id,'Comando aceite. A aguardar o estado reportado.');report.push(name+': comando aceite')}
    catch(error){if(version!==generation)return;failed++;lightMessages.set(id,error.message);report.push(name+': '+error.message)}
   }}finally{commandCount--}
   
   lightGroupFeedback([`${on?'Ligar':'Apagar'}: ${accepted} ${accepted===1?'candeeiro':'candeeiros'} Cloud com comando aceite.`,...report,demoCount?`${demoCount} ${demoCount===1?'luz':'luzes'} sem associação em simulação.`:''].filter(Boolean).join('\n'),failed>0);
  }catch(error){if(version===generation)lightGroupFeedback(error.message,true)}
  finally{lightGroupBusy=false;summary();if(version===generation){settleLights();render();schedulePoll()}}
 }
 function sensorCaption(id){
  const d=sensorReading(id);if(!d)return 'Sensor Shelly Cloud · por consultar';
  if(d.missing)return 'Sensor não encontrado · confirme o Device ID';
  if(d.error)return 'Consulta indisponível · últimas leituras recebidas';
  if(!d.online)return 'Offline ou em repouso · última leitura disponível na Cloud';
  if(!d.hasSensor)return 'Temperatura e humidade não encontradas · confirme os componentes';
  if(d.temperature===null&&d.humidity===null)return 'Sensor sem leituras válidas';
  return 'Leituras reportadas pela Shelly Cloud';
 }
 function sensorMarkup(id){
  const d=sensorReading(id),value=(v,unit)=>Number.isFinite(v)?v.toLocaleString('pt-PT',{maximumFractionDigits:1})+unit:'—';
  return `<div class="sensor-metrics"><div><span>Temperatura</span><strong data-sensor-temperature>${value(d?.temperature,' °C')}</strong></div>${id==='cellar'&&sensorBinding(id)?.type==='door-window2'?'':`<div><span>Humidade</span><strong data-sensor-humidity>${value(d?.humidity,' %')}</strong></div>`}</div><p class="sensor-caption">${escapeHTML(sensorCaption(id))}</p>${d?.battery!==null&&d?.battery!==undefined?`<p class="sensor-caption">Bateria: ${value(d.battery,' %')}</p>`:''}${d?.fetchedAt?`<small class="sensor-caption">Consultado na Cloud: ${new Date(d.fetchedAt).toLocaleString('pt-PT')}. A hora da medição pode ser anterior.</small>`:''}`;
 }
 function resultCard(id,type,body,label){
  const key=type+'-'+id,name=label||(id==='cellar'?'Cave':rooms.find(r=>r.id===id).name);
  return `<details class="shelly-result shelly-equipment-group" data-shelly-result="${key}"${resultOpen.get(key)?' open':''}><summary><span>${escapeHTML(name)}<small>${type==='cover'?'Estore':type==='light'?'Candeeiro':type==='ev'?'Contador e interruptor':type==='door'?'Contacto da porta':type==='window'?'Contacto da janela':type==='energy'?'Potência e energia':type==='alarm'?'Armação e disparo':type==='dehumidifier'?'Desumidificador':type==='heater'?'Termoventilador':type==='fan'?'Ventoinha':type==='media'?'Alimentação elétrica':'Temperatura e humidade'}</small></span></summary><div class="shelly-result-content">${body}</div></details>`;
 }
 function sensorCard(id){return sensorBinding(id)?resultCard(id,'sensor',sensorMarkup(id)):''}
 function decorateSensor(r){
  if(!sensorBinding(r.id))return;
  const host=$('detail-card'),section=document.createElement('section');section.className='detail-divider sensor-room-info';section.setAttribute('aria-label','Temperatura e humidade de '+r.name);section.innerHTML='<h3>Temperatura e humidade</h3>'+sensorMarkup(r.id);
  const b=document.createElement('button');b.className='secondary-action';b.textContent='Atualizar sensor';b.disabled=busy||commandCount>0||lightGroupBusy;b.addEventListener('click',()=>refreshEquipment('room',r.id));section.append(b);host.querySelector('.light-control').before(section);const note=host.querySelector('.selected-device-note');if(note)note.textContent='Sensor real Shelly Cloud. Os equipamentos sem associação continuam em simulação.';
 }
 function metric(value,unit=''){return Number.isFinite(value)?`${value.toLocaleString('pt-PT',{maximumFractionDigits:2})}${unit}`:'Não disponível'}
 function card(id){const r=rooms.find(r=>r.id===id),d=reading(id),b=binding(id);if(!b)return '';const rows=d?[
  ['Ligação',d.missing?'ID não encontrado':d.online?'Online':'Offline'],['Modelo',[d.model,d.generation].filter(Boolean).join(' · ')||'Não disponível'],['Posição',metric(d.position,'%')],['Movimento',stateName(d.state)],['Calibrado',typeof d.calibrated!=='boolean'?'Não disponível':d.calibrated?'Sim':'Não'],['Potência',metric(d.power,' W')],['Energia acumulada',metric(d.energy,' Wh')],['Tensão',metric(d.voltage,' V')],['Corrente',metric(d.current,' A')],['Temperatura interna',metric(d.temperature,' °C')],['Erros',d.errors?.join(', ')||'Nenhum reportado']]:[];
  return resultCard(id,'cover',`<p>${escapeHTML(b.deviceId)} · canal ${b.channel}</p><p>${escapeHTML(caption(id))}</p>${rows.length?`<dl>${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl>`:''}${d?.fetchedAt?`<small>Consultado às ${new Date(d.fetchedAt).toLocaleTimeString('pt-PT')}</small>`:''}`);
 }
 function summary(){activityChanged();window.dispatchEvent(new Event('mediachange'));window.dispatchEvent(new Event('sensorchange'));window.dispatchEvent(new Event('dehumidifierchange'));window.dispatchEvent(new Event('heaterchange'));window.dispatchEvent(new Event('fanchange')); window.dispatchEvent(new Event('alarmchange'));window.dispatchEvent(new Event('energychange'));window.dispatchEvent(new Event('doorchange'));window.dispatchEvent(new Event('evchange'));document.querySelectorAll('#shelly-data [data-shelly-result]').forEach(el=>resultOpen.set(el.dataset.shellyResult,el.open));const n=Object.keys(config.bindings).length,l=Object.keys(config.lightBindings||{}).length,s=Object.keys(config.sensorBindings||{}).length,evCount=EV.ROLES.filter(k=>config.ev?.[k]).length;$('shelly-summary').textContent=[l?`${l} ${l===1?'luz':'luzes'}`:'',n?`${n} estore${n===1?'':'s'}`:'',s?`${s} sensor${s===1?'':'es'}`:'',evCount?'carregamento':'',config.fan?'ventoinha':'',config.heater?'termoventilador':'',config.dehumidifier?'desumidificador':'',Object.keys(config.mediaBindings||{}).length?'multimédia':'',Object.keys(config.officeBindings||{}).length?'secretária do Gui':'',Object.keys(config.kitchenBindings||{}).length?'cozinha':'',config.door?'porta de entrada':'',config.cellarDoor?'porta da cave':'',Object.keys(config.windowBindings||{}).length?Object.keys(config.windowBindings).length+' janelas':'',window.CasaEnergyCore.binding(config)?'contador geral':'',AL.ROLES.some(k=>config.alarm?.[k])?'alarme':''].filter(Boolean).join(' · ')||'Por configurar';$('shelly-data').innerHTML=CORE.ROOM_IDS.map(card).join('')+CORE.LIGHT_ROOM_IDS.filter(id=>lightBinding(id)).map(id=>resultCard(id,'light',`<p>${escapeHTML(lightCaption(id))}</p><p>${escapeHTML(lightReading(id)?.model||'')}</p>`)).join('')+CORE.SENSOR_ROOM_IDS.map(sensorCard).join('')+CasaWindowsCore.IDS.filter(id=>config.windowBindings?.[id]).map(id=>resultCard(id,'window','<p>'+escapeHTML(CasaWindows.caption(windowSnapshot(id)))+'</p>','Janela · '+CasaWindows.names[id])).join('')+evCard()+doorCard()+doorCard('cellar')+energyCard()+alarmCard()+fanCard()+heaterCard()+dehumidifierCard()+[...MC.IDS,...MC.OFFICE_IDS,...MC.KITCHEN_IDS].filter(id=>mediaBinding(id)).map(id=>resultCard(id,'media','<p>'+escapeHTML(mediaSnapshot(id).label)+'</p>',MC.NAMES[id])).join('');$('shelly-refresh').disabled=busy||commandCount>0||!CORE.deviceIds(config).length||!config.server||!key;for(const id of ['all-open','all-close'])$(id).disabled=blockingRead()||commandCount>0||groupBusy||lightGroupBusy}
 function controlReady(id,position){return (position==='stop'||!dirty())&&!!key&&!!config.server&&CORE.canControl(reading(id),position)&&(!(blockingRead()||commandCount||groupBusy)||position==='stop')&&!(position==='stop'&&stopping)}
 function decorateRoom(r,view='room'){
  if(view==='light'){decorateLight(r);return}if(view!=='blind'){window.CasaDoor.decorateRoom(r);window.CasaWindows.decorateRoom(r);window.CasaMedia?.decorateRoom(r);decorateSensor(r);decorateLight(r);return}if(!binding(r.id))return;const host=$('detail-card'),range=host.querySelector('#blind-range');if(range)range.disabled=!controlReady(r.id,50);
  host.querySelectorAll('[data-command]').forEach(b=>b.disabled=!controlReady(r.id,b.dataset.command==='pause'?'stop':b.dataset.command));
  const note=host.querySelector('.selected-device-note');if(note)note.textContent='Estore real Shelly Cloud.';
  const section=document.createElement('div');section.className='shelly-room-info';const p=document.createElement('p');p.textContent=caption(r.id);
  const status=document.createElement('p');status.className='shelly-room-feedback'+(lastError?' error':'');status.setAttribute('role','status');status.textContent=lastMessage;
  if(reading(r.id)?.calibrated!==true){const hint=document.createElement('p');hint.textContent='A percentagem requer calibração confirmada pelo Shelly. Abrir, parar e fechar podem continuar disponíveis.';section.append(hint)}
  const b=document.createElement('button');b.className='secondary-action';b.textContent='Atualizar dados do estore';b.disabled=busy||commandCount>0;b.addEventListener('click',()=>refreshEquipment('blind',r.id));section.append(p,status,b);host.append(section)
 }
 let transportStorage=null;try{transportStorage=localStorage}catch{}
 const transport=window.ShellyTransport.create({storage:transportStorage,onChange:activityChanged});
 function commandFresh(path,payload){
  if(path==='covers')return payload.devices.every(p=>commandFresh('cover',{...p,position:payload.position}));
  if(path==='cover'){const id=Object.keys(config.bindings).find(id=>config.bindings[id].deviceId===payload.id&&config.bindings[id].channel===payload.channel);return !!id&&CORE.canControl(reading(id),payload.position)}
  const light=Object.keys(config.lightBindings||{}).find(id=>lightBinding(id).deviceId===payload.id&&lightBinding(id).channel===payload.channel);
  if(light)return CORE.canLightControl(lightReading(light));
  const media=[...MC.IDS,...MC.OFFICE_IDS,...MC.KITCHEN_IDS].find(id=>mediaBinding(id)?.deviceId===payload.id&&mediaBinding(id).channel===payload.channel);
  if(media)return MC.state(mediaBinding(media),mediaReadings[media]).canControl;
  for(const [b,d]of [[config.fan,fanReading],[config.heater,heaterReading],[config.dehumidifier,dehumidifierReading],[config.alarm?.arm,alarmReadings.arm],[config.ev?.relay,evReadings.relay]])if(b?.deviceId===payload.id&&b.channel===payload.channel)return AL.fresh(d);
  return false;
 }
 function api(path,payload,guard=()=>true){
  const version=generation;if(path!=='status'){readEpoch++;transport.cancelStatus?.()}
  return transport.request({server:config.server,authKey:key},path,payload,()=>version===generation&&guard()&&(path==='status'||((payload.position==='stop'||!dirty())&&commandFresh(path,payload))));
 }
 function schedulePoll(){
  clearTimeout(pollTimer);confirmations.sync(pendingEntries());expireConfirmations();
  const delay=confirmations.delay();if(delay===null){summary();return}
  const version=generation;pollTimer=setTimeout(async()=>{
   if(version!==generation)return;expireConfirmations();
   if(commandCount||groupBusy||lightGroupBusy||blockingRead()||dirty()){schedulePoll();return}
   const due=confirmations.due();if(!due.length){schedulePoll();return}
   confirmations.attempted(due.map(e=>e.key));
   await refresh({quiet:true,ids:[...new Set(due.map(e=>e.id))],force:true,priority:true});
   if(version!==generation)return;confirmations.finished(due.filter(e=>confirmations.get(e.key)===e).map(e=>e.key));
   if(due.some(e=>confirmations.get(e.key)!==e)){schedulePoll();return}
   settleCovers();settleLights();settleEV();settleAlarm();settleFan();settleHeater();settleDehumidifier();settleMedia();
   confirmations.sync(pendingEntries());expireConfirmations();summary();render();schedulePoll();
  },delay);
 }
 async function command(id,position){
  if(!binding(id))return;
  try{
   const payload=CORE.command(binding(id),position);if(!controlReady(id,position)){feedback('Atualize os dados. Confirme que o estore está online e, para percentagens, calibrado.',true);notify('Atualize os dados do estore antes de enviar o comando.');render();return}
   const version=generation,sequence=(sequences.get(id)||0)+1;sequences.set(id,sequence);commandCount++;if(position==='stop')stopping=true;feedback('A enviar o comando ao Shelly…');render();
   try{
    const result=await api('cover',payload);if(version!==generation||sequences.get(id)!==sequence)return;if(result.accepted!==true)throw Error('O comando não foi confirmado pelo servidor.');
    setCoverTarget(id,position==='open'?100:position==='close'?0:position);
    feedback('Comando aceite pelo Cloud. A aguardar a posição reportada pelo estore.');notify('Comando enviado ao Shelly.');
   }catch(error){if(version!==generation)return;feedback(error.name==='AbortError'?'Comando sem confirmação. Atualize os dados para verificar a posição.':error.message,true);notify('Não foi possível confirmar o comando.');}
   finally{commandCount--;if(position==='stop')stopping=false;summary();render();schedulePoll()}
  }catch(error){feedback(error.message,true)}
 }
 function groupFeedback(text,error=false){$('all-status').textContent=text;$('all-status').hidden=mode!=='blinds';$('all-status').classList.toggle('error',error)}
 async function commandAll(position,demoCount=0){
  if(groupBusy||blockingRead()||commandCount)return;
  const version=generation,skipped=[],eligible={},tickets=new Map();let submitted=false;groupBusy=true;summary();
  try{
   if(!['open','close'].includes(position))throw Error('Comando conjunto inválido.');
   if(dirty()||!key||!config.server)throw Error('Guarde as credenciais antes de controlar os estores.');
   groupFeedback('A verificar os estores associados ao Cloud…');
   if(Object.keys(config.bindings).some(id=>!reading(id)?.fetchedAt||Date.now()-reading(id).fetchedAt>30000||reading(id).error))await refresh({quiet:true});
   if(version!==generation)return;
   for(const [id,b]of Object.entries(config.bindings)){const d=reading(id);if(CORE.canControl(d,position))eligible[id]=b;else skipped.push(rooms.find(r=>r.id===id).name+': '+(!d?.online?'offline ou por consultar':d.errors?.length?'erro no dispositivo':'dados indisponíveis'))}
   if(!Object.keys(eligible).length)throw Error('Nenhum estore Cloud disponível. '+skipped.join('; '));
   const payload=CORE.groupCommand(eligible,position);
   for(const id of Object.keys(eligible)){const seq=(sequences.get(id)||0)+1;sequences.set(id,seq);tickets.set(id,seq)}
   commandCount++;submitted=true;summary();render();groupFeedback('A enviar '+(position==='open'?'Abrir todos':'Fechar todos')+' para a Shelly Cloud…');
   const result=await api('covers',payload);if(version!==generation)return;
   if(!Array.isArray(result.accepted)||!result.failed||typeof result.failed!=='object')throw Error('O servidor não confirmou o resultado de cada estore.');
   const statuses=[],failed=[...skipped];let count=0;
   const reasons={DEVICE_OFFLINE:'offline',DEVICE_NOT_FOUND:'ID não encontrado',DEVICE_INVALID_CHANNEL:'canal inválido',DEVICE_INVALID_MODE:'modo inválido',DEVICE_UNSUPPORTED_COMMAND:'comando não suportado',DEVICE_FAILED_COMMAND:'comando recusado'};
   for(const [id,b]of Object.entries(eligible)){const k=b.deviceId+'_'+b.channel,name=rooms.find(r=>r.id===id).name;
    if(result.accepted.includes(k)){count++;statuses.push(name+': aceite');if(sequences.get(id)===tickets.get(id))setCoverTarget(id,position==='open'?100:0)}
    else failed.push(name+': '+(reasons[result.failed[k]]||'sem confirmação'));
   }
   
   const report=[`${position==='open'?'Abrir todos':'Fechar todos'}: ${count} ${count===1?'estore':'estores'} Cloud com comando aceite.`,...statuses,failed.length?'Não enviados/recusados: '+failed.join('; '):'',demoCount?`${demoCount} ${demoCount===1?'estore':'estores'} sem associação em demonstração.`:''].filter(Boolean).join('\n');
   groupFeedback(report,failed.length>0);notify(count?'Comando conjunto enviado ao Shelly.':'Nenhum estore confirmou o comando.');
  }catch(error){if(version===generation){groupFeedback(error.name==='AbortError'?'Comando conjunto sem confirmação. Atualize os dados antes de tentar novamente.':error.message,true);notify('Verifique o resultado nos controlos gerais.')}}
  finally{if(submitted)commandCount--;groupBusy=false;summary();render();schedulePoll()}
 }
 async function refresh({quiet=false,ids=null,force=false,priority=false}={}){
  const version=generation,queuedAt=Date.now(),waited=!!readTask;
  if(priority){urgentReads++;if(readTask&&!activeReadPriority){readEpoch++;transport.cancelStatus?.()}}
  try{
   while(readTask)await readTask;
   if(version!==generation||commandCount||(!priority&&urgentReads))return;
   if(blockingRead()){if(ids)for(const id of ids.filter(Boolean))deferredReads.add(id);return}
   const wanted=ids===null?CORE.deviceIds(config):[...new Set(ids.filter(Boolean))];
   const chosen=wanted.filter(id=>!(waited&&(checkedDevices.get(id)||0)>=queuedAt)&&(force||ids===null||Date.now()-(checkedDevices.get(id)||0)>10000));
   if(!chosen.length)return;
   activeReadPriority=priority;const task=refreshDevices({quiet,ids:chosen});readTask=task;
   try{return await task}finally{if(readTask===task)readTask=null}
  }finally{if(priority)urgentReads--}
 }
 const consumptionReadings=new Map();
 function consumptionBindings(){const all=[];const add=(role,id,b)=>{if(b)all.push({role,id,b:{...b,...(role==='cover'||role==='light'?{kind:role}:{})}})};for(const [id,b]of Object.entries(config.bindings||{}))add('cover',id,b);for(const [id,b]of Object.entries(config.lightBindings||{}))add('light',id,b);for(const [id,b]of Object.entries({...config.mediaBindings,...config.officeBindings,...config.kitchenBindings}))add('media',id,b);for(const role of ['fan','heater','dehumidifier'])add(role,'',config[role]);for(const id of AL.ROLES)add('alarm',id,config.alarm?.[id]);add('energy','',{...window.CasaEnergyCore.binding(config),component:'emeter'});for(const id of ['meter','totalMeter'])add('ev',id,config.ev?.[id]);return all.filter(x=>x.b.deviceId)}
 function consumptionSnapshot(role,id=''){const item=consumptionBindings().find(x=>x.role===role&&x.id===id);if(!item)return {configured:false,reading:null,key:null};const key=CasaConsumptionCore.identity(config.server,item.b),r=consumptionReadings.get(key);return {configured:true,key,reading:r?{...r}:null,fresh:EV.fresh(r)}}
 function updateConsumptionReadings(result,requested){const seen=new Set();for(const {b}of consumptionBindings()){if(!requested.has(b.deviceId.toLowerCase()))continue;const key=CasaConsumptionCore.identity(config.server,b);if(seen.has(key))continue;seen.add(key);const device=result.devices.find(d=>d.id?.toLowerCase()===b.deviceId.toLowerCase()),r={...CasaConsumptionCore.normalize(device,b),fetchedAt:lastFetched};consumptionReadings.set(key,r)}}
 function applyReadings(result,batchIds){
   lastFetched=Date.now();const requested=new Set(batchIds.map(id=>id.toLowerCase())),has=b=>!!b&&requested.has(b.deviceId.toLowerCase());for(const id of batchIds)checkedDevices.set(id,lastFetched);for(const [id,b]of Object.entries(config.bindings)){if(!has(b))continue;const device=result.devices.find(d=>typeof d.id==='string'&&d.id.toLowerCase()===b.deviceId),d=CORE.status(device,b.channel);readings.set(id,d?{...d,fetchedAt:lastFetched}:{missing:true,online:false,hasCover:false,position:null,state:null,calibrated:null,errors:[],fetchedAt:lastFetched})}
   for(const [id,b]of Object.entries(config.lightBindings||{})){if(!has(b))continue;const device=result.devices.find(d=>typeof d.id==='string'&&d.id.toLowerCase()===b.deviceId),d=CORE.lightStatus(device,b);lightReadings.set(id,d?{...d,fetchedAt:lastFetched}:{missing:true,online:false,hasOutput:false,on:null,fetchedAt:lastFetched})}
   for(const [id,b]of Object.entries(config.sensorBindings||{})){if(!has(b))continue;const device=result.devices.find(d=>typeof d.id==='string'&&d.id.toLowerCase()===b.deviceId),d=CORE.sensorStatus(device,b);sensorReadings.set(id,d?{...d,fetchedAt:lastFetched}:{missing:true,online:false,temperature:null,humidity:null,battery:null,fetchedAt:lastFetched})}
   for(const [id,b]of Object.entries({...config.mediaBindings,...config.officeBindings,...config.kitchenBindings})){if(!has(b))continue;const device=result.devices.find(d=>d.id?.toLowerCase()===b.deviceId);mediaReadings[id]={...EV.relayStatus(device,b),meter:EV.meterStatus(device,{...b,component:'auto'}),missing:!device,fetchedAt:lastFetched}}
   if(has(config.fan)){const b=config.fan,device=result.devices.find(d=>d.id?.toLowerCase()===b.deviceId);fanReading={...EV.relayStatus(device,b),missing:!device,fetchedAt:lastFetched}}
   if(has(config.heater)){const b=config.heater,device=result.devices.find(d=>d.id?.toLowerCase()===b.deviceId);heaterReading={...EV.relayStatus(device,b),missing:!device,fetchedAt:lastFetched}}
   if(has(config.dehumidifier)){const b=config.dehumidifier,device=result.devices.find(d=>d.id?.toLowerCase()===b.deviceId);dehumidifierReading={...EV.relayStatus(device,b),missing:!device,fetchedAt:lastFetched}}
   for(const role of AL.ROLES){const b=config.alarm?.[role];if(has(b)){const device=result.devices.find(d=>d.id.toLowerCase()===b.deviceId);alarmReadings[role]={...EV.relayStatus(device,b),missing:!device,fetchedAt:lastFetched}}}
   for(const role of EV.ROLES){const b=config.ev?.[role];if(!has(b))continue;const device=result.devices.find(d=>d.id.toLowerCase()===b.deviceId);evReadings[role]={...(role==='relay'?EV.relayStatus(device,b):EV.meterStatus(device,b)),fetchedAt:lastFetched}}
   for(const [id,b]of Object.entries(config.windowBindings||{})){if(!has(b))continue;const device=result.devices.find(d=>d.id?.toLowerCase()===b.deviceId.toLowerCase());windowReadings[id]={...window.CasaDoorCore.status(device,b),fetchedAt:lastFetched}}
   if(has(config.cellarDoor)){const b=config.cellarDoor,device=result.devices.find(d=>d.id.toLowerCase()===b.deviceId.toLowerCase());cellarDoorReading={...window.CasaDoorCore.status(device,b),fetchedAt:lastFetched}}
   if(has(config.door)){const b=config.door,device=result.devices.find(d=>d.id.toLowerCase()===b.deviceId.toLowerCase());doorReading={...window.CasaDoorCore.status(device,b),fetchedAt:lastFetched}}
   {const b=window.CasaEnergyCore.binding(config);if(has(b)){const device=result.devices.find(d=>d.id.toLowerCase()===b.deviceId);energyReading={...window.CasaEnergyCore.status(device,b),fetchedAt:lastFetched}}}
   updateConsumptionReadings(result,requested);reapply();settleCovers();settleLights();settleEV();settleAlarm();settleFan();settleHeater();settleDehumidifier();settleMedia(); }
 async function refreshDevices({quiet=false,ids}={}){
  if(dirty()){feedback('Guarde a configuração antes de consultar os dados.',true);return}
  if(!ids.length||!key||!config.server){feedback('Guarde o servidor, a chave e pelo menos um ID.',true);return}
  if(alarmTarget===null&&alarmMessage.includes('Armação confirmada'))alarmMessage='';
  if(evTarget===null&&evMessage.includes('estado confirmado'))evMessage='';
  const unresolved=new Set(ids.map(id=>id.toLowerCase())),has=b=>!!b&&unresolved.has(b.deviceId.toLowerCase()),batches=[];for(let i=0;i<ids.length;i+=10)batches.push(ids.slice(i,i+10));
  activity={totalRequests:batches.length,doneRequests:0,totalDevices:ids.length,doneDevices:0,running:true,error:false};
  busy=true;refreshing=true;const version=generation,epoch=readEpoch;summary();if(!quiet)feedback('A consultar os dispositivos na Shelly Cloud…');
  try{
   for(const batch of batches){if(version!==generation||epoch!==readEpoch)return;const chunk=await api('status',{ids:batch},()=>epoch===readEpoch);if(version!==generation||epoch!==readEpoch)return;if(!Array.isArray(chunk.devices))throw Error('Resposta inesperada do Cloud.');applyReadings(chunk,batch);for(const id of batch)unresolved.delete(id.toLowerCase());activity.doneRequests++;activity.doneDevices+=batch.length;activityChanged()}if(version!==generation)return;
   activity.error=false;if(!quiet||lastError)feedback('Dados atualizados com os estados reportados pelo Shelly.');
  }catch(e){if(version!==generation||epoch!==readEpoch)return;if(ids.length<CORE.deviceIds(config).length&&transport.stats(config.server).lastFailure==='limit')for(const id of ids)deferredReads.add(id);activity.error=true;for(const {b}of consumptionBindings())if(has(b)){const key=CasaConsumptionCore.identity(config.server,b),r=consumptionReadings.get(key);if(r)consumptionReadings.set(key,{...r,error:true})}for(const id of Object.keys(config.windowBindings||{}))if(has(config.windowBindings[id]))windowReadings[id]={...windowReadings[id],error:true};for(const id of Object.keys({...config.mediaBindings,...config.officeBindings,...config.kitchenBindings}))if(has(mediaBinding(id)))mediaReadings[id]={...mediaReadings[id],error:true};if(has(config.fan))fanReading={...fanReading,error:true};if(has(config.heater))heaterReading={...heaterReading,error:true};if(has(config.dehumidifier))dehumidifierReading={...dehumidifierReading,error:true};for(const id of Object.keys(config.bindings)){if(!has(config.bindings[id]))continue;const old=reading(id);readings.set(id,old?{...old,error:true}:{online:false,hasCover:false,position:null,errors:[],error:true})}for(const id of Object.keys(config.lightBindings||{})){if(!has(config.lightBindings[id]))continue;const old=lightReading(id);lightReadings.set(id,{...old,error:true})}for(const id of Object.keys(config.sensorBindings||{}))if(has(config.sensorBindings[id]))sensorReadings.set(id,{...sensorReading(id),error:true});for(const role of EV.ROLES)if(has(config.ev?.[role]))evReadings[role]={...evReadings[role],error:true};if(has(window.CasaEnergyCore.binding(config)))energyReading={...energyReading,error:true};if(has(config.door))doorReading={...doorReading,error:true};if(has(config.cellarDoor))cellarDoorReading={...cellarDoorReading,error:true};for(const role of AL.ROLES)if(has(config.alarm?.[role]))alarmReadings[role]={...alarmReadings[role],error:true};feedback(e.name==='AbortError'?'A consulta demorou demasiado. Tente novamente.':e.message||'Consulta indisponível.',true)}
  finally{activeReadPriority=false;if(version===generation)activity.running=false;busy=false;refreshing=false;if(ids.length===CORE.deviceIds(config).length)nextRefreshAt=transport.stats(config.server).lastFailure==='limit'?Math.max(Date.now()+1000,transport.stats(config.server).retryAt||0):Date.now()+(epoch===readEpoch?30000:2000);summary();if(document.querySelector('#room-dialog :active')){drawPlan();drawList();updateSummary()}else render();if(version!==generation&&key&&config.server&&CORE.deviceIds(config).length)refresh({quiet:true})}
 }
 $('open-shelly').addEventListener('click',()=>{fill();summary();showPopup('shelly-dialog')});
 $('shelly-refresh').addEventListener('click',refresh);
 $('shelly-form').addEventListener('invalid',e=>{let group=e.target.closest('details');while(group){group.open=true;group=group.parentElement.closest('details')}},true);
 $('shelly-form').addEventListener('submit',e=>{
  e.preventDefault();
  try{
   if(localStorage.getItem(KEY)!==savedConfigText)throw Error('A configuração foi alterada noutra janela. Recarregue a app antes de guardar para não perder associações.');
   const bindings={};for(const id of CORE.ROOM_IDS){const input=$('shelly-id-'+id).value.trim();if(input)bindings[id]={deviceId:CORE.deviceId(input),channel:Number($('shelly-channel-'+id).value)}}
   const lightBindings={};for(const id of CORE.LIGHT_ROOM_IDS){const input=$('shelly-light-id-'+id).value.trim();if(input)lightBindings[id]={deviceId:CORE.deviceId(input),channel:Number($('shelly-light-channel-'+id).value),type:$('shelly-light-type-'+id).value}}
   const sensorBindings={};for(const id of CORE.SENSOR_ROOM_IDS){const input=$('shelly-sensor-id-'+id).value.trim();if(input)sensorBindings[id]={deviceId:CORE.deviceId(input),temperatureChannel:Number($('shelly-sensor-temperature-'+id).value),humidityChannel:Number($('shelly-sensor-humidity-'+id).value),...(id==='cellar'?{type:$('shelly-sensor-type-cellar').value}:{})}}
   const newKey=$('shelly-key').value.trim(),rememberKey=$('shelly-remember').checked;
   const windowBindings=window.CasaWindows.read(config.windowBindings),ev=window.CasaEVForm.read(config.ev),door=window.CasaDoor.read(config.door),cellarDoor=window.CasaDoor.read(config.cellarDoor,'cellar-door'),homeEnergy=window.CasaEnergyForm.read(config.homeEnergy),alarm=window.CasaAlarmForm.read(config.alarm),fan=window.CasaFanForm.read(),heater=window.CasaHeaterForm.read(),dehumidifier=window.CasaDehumidifierForm.read(),mediaBindings=window.CasaMediaForm.read(config.mediaBindings),officeBindings=window.CasaMediaForm.readOffice(config.officeBindings),kitchenBindings=window.CasaMediaForm.readKitchen(config.kitchenBindings);
   const next=CORE.config({...(windowBindings!==undefined?{windowBindings}:{}),schemaVersion:1,server:$('shelly-server').value.trim(),authKey:newKey,rememberKey,bindings,lightBindings,sensorBindings,...(ev!==undefined?{ev}:{}),...(door!==undefined?{door}:{}),...(homeEnergy!==undefined?{homeEnergy}:{}),...(cellarDoor!==undefined?{cellarDoor}:{}),...(alarm!==undefined?{alarm}:{}),...(mediaBindings!==undefined?{mediaBindings}:{}),...(officeBindings!==undefined?{officeBindings}:{}),...(kitchenBindings!==undefined?{kitchenBindings}:{}),fan,heater,dehumidifier});
   if(CORE.deviceIds(next).length&&(!next.server||!newKey))throw Error('Indique o servidor e a chave para associar os equipamentos.');
   const before=localStorage.getItem(KEY),beforeSession=sessionStorage.getItem(SESSION);
   try{localStorage.setItem(KEY,JSON.stringify(next));if(rememberKey)sessionStorage.removeItem(SESSION);else sessionStorage.setItem(SESSION,JSON.stringify({server:next.server,key:newKey}))}catch(error){if(before===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,before);if(beforeSession===null)sessionStorage.removeItem(SESSION);else sessionStorage.setItem(SESSION,beforeSession);throw Error('Não foi possível guardar a configuração neste navegador.')}
   savedConfigText=JSON.stringify(next);consumptionReadings.clear();generation++;readEpoch++;nextRefreshAt=0;deferredReads.clear();checkedDevices.clear();activity={totalRequests:0,doneRequests:0,totalDevices:0,doneDevices:0,running:false,error:false};lastFetched=0;for(const id of CasaWindowsCore.IDS)delete windowReadings[id];for(const id of [...MC.IDS,...MC.OFFICE_IDS,...MC.KITCHEN_IDS])delete mediaReadings[id];mediaTargets.clear();mediaMessages.clear();fanReading=null;fanTarget=null;fanMessage="";heaterReading=null;heaterTarget=null;heaterMessage="";dehumidifierReading=null;dehumidifierTarget=null;dehumidifierMessage="";alarmReadings={};alarmTarget=null;alarmMessage='';energyReading=null;doorReading=null;cellarDoorReading=null;evReadings={};evTarget=null;evMessage='';clearTimeout(pollTimer);targetRevisions.clear();targets.clear();lightTargets.clear();lightMessages.clear();confirmations.clear();config=next;key=newKey;readings.clear();lightReadings.clear();sensorReadings.clear();reapply();fill();summary();render();feedback('Configuração guardada. Consulte os dados para ativar os controlos reais dos equipamentos associados.');if(key&&config.server)refresh({quiet:true});
  }catch(error){feedback(error.message,true)}
 });
 function ensureFresh(id){const l=lightReading(id),s=sensorReading(id);if((lightBinding(id)&&(!l?.fetchedAt||Date.now()-l.fetchedAt>30000||l.error))||(sensorBinding(id)&&(!s?.fetchedAt||Date.now()-s.fetchedAt>60000||s.error)))refresh({quiet:true,ids:[lightBinding(id)?.deviceId,sensorBinding(id)?.deviceId]})}
 function ensureBlindFresh(id){const d=reading(id);if(binding(id)&&(!d?.fetchedAt||Date.now()-d.fetchedAt>30000||d.error))return refresh({quiet:true,ids:[binding(id).deviceId]})}
 function refreshEquipment(role,id){
  const entries=role==='light'?[lightBinding(id)]:role==='blind'?[binding(id)]:role==='room'?[lightBinding(id),sensorBinding(id),config.windowBindings?.[id]]:role==='media'?[mediaBinding(id)]:role==='ev'?EV.ROLES.map(k=>config.ev?.[k]):role==='alarm'?AL.ROLES.map(k=>config.alarm?.[k]):role==='energy'?[window.CasaEnergyCore.binding(config)]:[config[role]];
  return refresh({quiet:true,ids:entries.filter(Boolean).map(b=>b.deviceId),force:true,priority:true});
 }
 function energySnapshot(){return {...window.CasaEnergyCore.state(config,energyReading),reading:energyReading?structuredClone(energyReading):null,busy:blockingRead()||commandCount>0||groupBusy||lightGroupBusy}}
 function energyCard(){const d=energySnapshot();if(!d.configured)return '';return resultCard('house','energy',`<p>Canal ${d.channel} · contratado ${metric(d.contractKVA,' kVA')}</p><dl><div><dt>Potência ativa</dt><dd>${Number.isFinite(d.powerKW)?d.powerKW.toLocaleString('pt-PT',{minimumFractionDigits:3,maximumFractionDigits:3})+' kW':'Não disponível'}</dd></div><div><dt>Potência aparente</dt><dd>${metric(d.apparentKVA,' kVA')}</dd></div><div><dt>Utilização</dt><dd>${metric(d.percent,'%')}</dd></div></dl>`,'Contador geral da casa')}
 function energyEnsureFresh(){if(window.CasaEnergyCore.binding(config)&&(!energyReading?.fetchedAt||Date.now()-energyReading.fetchedAt>10000||energyReading.error))refresh({quiet:true,ids:[window.CasaEnergyCore.binding(config)?.deviceId]})}
 async function inspectDoorSensor(doorId='entrance'){
  if(!['entrance','cellar'].includes(doorId))throw Error('Porta inválida.');
  const binding=doorId==='cellar'?config.cellarDoor:config.door;
  if(!binding||binding.source!=='blu')throw Error('Associe primeiro o sensor BLU da porta e guarde.');
  if(busy||commandCount||groupBusy||lightGroupBusy)throw Error('Aguarde que a comunicação em curso termine.');
  if(dirty())throw Error('Guarde primeiro as alterações da configuração.');
  if(!key||!config.server)throw Error('Confirme a conta Shelly Cloud.');
  const version=generation,id=binding.deviceId;busy=true;summary();
  try{const result=await api('status',{ids:[id]});if(version!==generation)throw Error('A configuração mudou. Volte a verificar.');return window.CasaDoorCore.inspectSensor(result.devices.find(d=>d.id.toLowerCase()===id.toLowerCase()))}
  finally{busy=false;summary()}
 }
 async function inspectDoorGateway(rawId){
  const id=CORE.deviceId(rawId);if(busy||commandCount||groupBusy||lightGroupBusy)throw Error('Aguarde que a comunicação em curso termine.');
  if(dirty())throw Error('Guarde primeiro as alterações da configuração.');
  if(!key||!config.server)throw Error('Guarde o servidor e a chave Shelly Cloud antes de verificar o gateway.');
  const version=generation;busy=true;summary();
  try{const result=await api('status',{ids:[id]});if(version!==generation)throw Error('A configuração mudou. Volte a verificar.');const device=result.devices.find(d=>d.id.toLowerCase()===id);return window.CasaDoorCore.inspectGateway(device)}
  finally{busy=false;summary()}
 }
 function windowSnapshot(id){return CasaWindowsCore.snapshot(config.windowBindings?.[id],windowReadings[id])}
 function windowEnsureFresh(id){const d=windowReadings[id];if(config.windowBindings?.[id]&&(!d?.fetchedAt||Date.now()-d.fetchedAt>10000||d.error))return refresh({quiet:true,ids:[config.windowBindings[id].deviceId]})}
 function doorSnapshot(id='entrance'){const b=id==='cellar'?config.cellarDoor:config.door,d=id==='cellar'?cellarDoorReading:doorReading;return {configured:!!b,open:window.CasaDoorCore.state(d),reading:d?structuredClone(d):null}}
 function doorCard(id='entrance'){if(!(id==='cellar'?config.cellarDoor:config.door))return '';const d=doorSnapshot(id);return resultCard(id,'door','<p id="'+(id==='cellar'?'cellar-door-reading':'door-reading')+'">'+escapeHTML(window.CasaDoor.caption(d))+'</p>',id==='cellar'?'Porta da cave':'Porta de entrada')}
 function doorEnsureFresh(id='entrance'){const d=id==='cellar'?cellarDoorReading:doorReading,b=id==='cellar'?config.cellarDoor:config.door;if(b&&(!d?.fetchedAt||Date.now()-d.fetchedAt>10000||d.error))return refresh({quiet:true,ids:[b.deviceId]})}
 function evSnapshot(){
  const state=EV.state(config.ev,evReadings),working=blockingRead()||commandCount>0||groupBusy||lightGroupBusy;
  return {...state,busy:working,pending:evTarget!==null,canControl:state.canControl&&!working&&evTarget===null&&!dirty()&&!!key&&!!config.server,message:evMessage,thresholdWatts:config.ev?.thresholdWatts??50,roles:EV.ROLES.filter(k=>config.ev?.[k]),readings:structuredClone(evReadings)};
 }
 function evCard(){if(!EV.ROLES.some(k=>config.ev?.[k]))return '';const d=evSnapshot();return resultCard('ev','ev',`<p>Carregamento do carro · ${d.charging===true?'a carregar':d.charging===false?'sem carregamento':'consumo por confirmar'}</p><dl><div><dt>Potência</dt><dd>${metric(d.powerKW,' kW')}</dd></div><div><dt>Total acumulado</dt><dd>${metric(d.energyKWh,' kWh')}${d.energyStale?' · última leitura':''}</dd></div></dl>`,'Carregamento do carro')}
 function evEnsureFresh(){if(EV.ROLES.some(role=>config.ev?.[role]&&(!EV.fresh(evReadings[role])||Date.now()-evReadings[role].fetchedAt>10000)))return refresh({quiet:true,ids:EV.ROLES.map(role=>config.ev?.[role]?.deviceId)})}
 function settleEV(){if(evTarget!==null&&confirmationCurrent('ev',evReadings.relay)&&EV.canControl(evReadings.relay)&&evReadings.relay.on===evTarget){evMessage=evTarget?'Ponto ligado · estado confirmado pelo Shelly.':'Ponto desligado · estado confirmado pelo Shelly.';evTarget=null}}
 async function commandEV(on){
  if(typeof on!=='boolean'||evTarget!==null||blockingRead()||commandCount||groupBusy||lightGroupBusy)return;
  if(!config.ev?.relay||dirty()||!key||!config.server||!EV.canControl(evReadings.relay)){evMessage='Atualize os dados e confirme a associação do interruptor.';summary();return}
  const version=generation,b=config.ev.relay;commandCount++;evMessage='A enviar o comando ao ponto de carregamento…';summary();render();
  try{const result=await api('light',{id:b.deviceId,channel:b.channel,type:'switch',on});if(version!==generation)return;if(result.accepted!==true)throw Error('O Cloud não confirmou o comando.');evTarget=on;evMessage='Comando aceite. A aguardar o estado do interruptor.'}
  catch(error){if(version===generation)evMessage=error.message}
  finally{commandCount--;if(version===generation){summary();render();settleEV();summary();schedulePoll()}}
 }
 function mediaBinding(id){return MC.IDS.includes(id)?config.mediaBindings?.[id]:MC.OFFICE_IDS.includes(id)?config.officeBindings?.[id]:MC.KITCHEN_IDS.includes(id)?config.kitchenBindings?.[id]:null}
 function mediaSnapshot(id){const d=MC.state(mediaBinding(id),mediaReadings[id],Date.now(),MC.activityThreshold(id)),working=blockingRead()||commandCount>0||groupBusy||lightGroupBusy;return {...d,label:d.stale&&d.lastReading?'Última leitura · '+(d.lastReading.on?'com energia':'sem energia'):d.label,busy:working,pending:mediaTargets.has(id),canControl:d.canControl&&!working&&!mediaTargets.has(id)&&!dirty()&&!!key&&!!config.server,message:mediaMessages.get(id)||'',reading:mediaReadings[id]?{...mediaReadings[id]}:null}}
 function mediaEnsureFresh(ids=MC.IDS){if(ids.some(id=>mediaBinding(id)&&(!MC.state(mediaBinding(id),mediaReadings[id]).canControl||Date.now()-mediaReadings[id].fetchedAt>10000)))return refresh({quiet:true,ids:ids.map(id=>mediaBinding(id)?.deviceId)})}
 function settleMedia(){for(const [id,target]of mediaTargets)if(confirmationCurrent('media:'+id,mediaReadings[id])&&MC.state(mediaBinding(id),mediaReadings[id]).on===target){mediaTargets.delete(id);mediaMessages.set(id,'Alimentação '+(target?'ligada':'desligada')+' · estado confirmado pelo Shelly.')}}
 function commandMedia(id,on){if(MC.IDS.includes(id))return commandMediaDevice(id,on,false)}
 function commandOffice(id,on){if(MC.OFFICE_IDS.includes(id))return commandMediaDevice(id,on,true)}
 function commandKitchen(id,on){if(MC.KITCHEN_IDS.includes(id))return commandMediaDevice(id,on,'kitchen')}
 function kitchenEnsureFresh(id){return mediaEnsureFresh(id?[id]:MC.KITCHEN_IDS)}
 function officeEnsureFresh(){return mediaEnsureFresh(MC.OFFICE_IDS)}
 async function commandMediaDevice(id,on,office){
  if(!(office==='kitchen'?MC.KITCHEN_IDS:office?MC.OFFICE_IDS:MC.IDS).includes(id)||typeof on!=='boolean'||blockingRead()||commandCount||groupBusy||lightGroupBusy||mediaTargets.has(id))return;
  if(!mediaSnapshot(id).canControl){mediaMessages.set(id,'Atualize o estado e confirme a associação.');summary();return}
  const version=generation,payload=office==='kitchen'?MC.kitchenCommand(config.kitchenBindings,id,on):office?MC.officeCommand(config.officeBindings,id,on):MC.command(config.mediaBindings,id,on);commandCount++;mediaMessages.set(id,'A enviar pedido ao Shelly…');summary();
  try{const result=await api('light',payload);if(version!==generation)return;if(result.accepted!==true)throw Error('O Cloud não confirmou o comando.');mediaTargets.set(id,on);mediaMessages.set(id,'Pedido aceite. A aguardar confirmação do Shelly.')}
  catch(error){if(version===generation)mediaMessages.set(id,error.message)}
  finally{commandCount--;if(version===generation){summary();settleMedia();summary();schedulePoll()}}
 }
 function fanSnapshot(){const valid=AL.fresh(fanReading),working=blockingRead()||commandCount>0||groupBusy||lightGroupBusy;return {lastReading:lastRelay(fanReading),configured:!!config.fan,on:valid?fanReading.on:null,reading:fanReading?{...fanReading}:null,busy:working,pending:fanTarget!==null,canControl:!!config.fan&&valid&&!working&&fanTarget===null&&!dirty()&&!!key&&!!config.server,message:fanMessage}}
 function fanCard(){const d=fanSnapshot();return d.configured?resultCard('cellar','fan',`<p>${d.on===true?'Ligada':d.on===false?'Desligada':'Por confirmar'}</p>`,'Ventoinha da cave'):''}
 function fanEnsureFresh(){if(config.fan&&(!AL.fresh(fanReading)||Date.now()-fanReading.fetchedAt>10000))return refresh({quiet:true,ids:[config.fan.deviceId]})}
 function settleFan(){if(fanTarget!==null&&confirmationCurrent('fan',fanReading)&&AL.fresh(fanReading)&&fanReading.on===fanTarget){fanMessage='Estado confirmado pelo Shelly: '+(fanTarget?'ligada.':'desligada.');fanTarget=null}}
 async function commandFan(on){
  if(typeof on!=='boolean'||blockingRead()||commandCount||groupBusy||lightGroupBusy||fanTarget!==null)return;
  if(!fanSnapshot().canControl){fanMessage='Atualize o estado e confirme a associação da ventoinha.';summary();return}
  const version=generation,payload={id:config.fan.deviceId,channel:config.fan.channel,type:'switch',on};commandCount++;fanMessage=on?'A ligar a ventoinha…':'A desligar a ventoinha…';summary();
  try{const result=await api('light',payload);if(version!==generation)return;if(result.accepted!==true)throw Error('O Cloud não confirmou o comando.');fanTarget=on;fanMessage='Comando aceite. A aguardar confirmação do Shelly.'}
  catch(error){if(version===generation)fanMessage=error.message}
  finally{commandCount--;if(version===generation){summary();settleFan();settleHeater();settleDehumidifier();settleMedia();summary();schedulePoll()}}
 }
 function heaterSnapshot(){const valid=AL.fresh(heaterReading),working=blockingRead()||commandCount>0||groupBusy||lightGroupBusy;return {lastReading:lastRelay(heaterReading),configured:!!config.heater,on:valid?heaterReading.on:null,reading:heaterReading?{...heaterReading}:null,busy:working,pending:heaterTarget!==null,canControl:!!config.heater&&valid&&!working&&heaterTarget===null&&!dirty()&&!!key&&!!config.server,message:heaterMessage}}
 function heaterCard(){const d=heaterSnapshot();return d.configured?resultCard('heater','heater',`<p>${d.on===true?'Ligado':d.on===false?'Desligado':'Por confirmar'}</p>`,'Termoventilador'):''}
 function heaterEnsureFresh(){if(config.heater&&(!AL.fresh(heaterReading)||Date.now()-heaterReading.fetchedAt>10000))return refresh({quiet:true,ids:[config.heater.deviceId]})}
 function settleHeater(){if(heaterTarget!==null&&confirmationCurrent('heater',heaterReading)&&AL.fresh(heaterReading)&&heaterReading.on===heaterTarget){heaterMessage='Estado confirmado pelo Shelly: '+(heaterTarget?'ligado.':'desligado.');heaterTarget=null}}
 async function commandHeater(on){
  if(typeof on!=='boolean'||blockingRead()||commandCount||groupBusy||lightGroupBusy||heaterTarget!==null)return;
  if(!heaterSnapshot().canControl){heaterMessage='Atualize o estado e confirme a associação do termoventilador.';summary();return}
  const version=generation,payload={id:config.heater.deviceId,channel:config.heater.channel,type:'switch',on};commandCount++;heaterMessage=on?'A ligar o termoventilador…':'A desligar o termoventilador…';summary();
  try{const result=await api('light',payload);if(version!==generation)return;if(result.accepted!==true)throw Error('O Cloud não confirmou o comando.');heaterTarget=on;heaterMessage='Comando aceite. A aguardar confirmação do Shelly.'}
  catch(error){if(version===generation)heaterMessage=error.message}
  finally{commandCount--;if(version===generation){summary();settleHeater();settleDehumidifier();settleMedia();summary();schedulePoll()}}
 }
 function dehumidifierSnapshot(){const valid=AL.fresh(dehumidifierReading),working=blockingRead()||commandCount>0||groupBusy||lightGroupBusy;return {lastReading:lastRelay(dehumidifierReading),configured:!!config.dehumidifier,on:valid?dehumidifierReading.on:null,reading:dehumidifierReading?{...dehumidifierReading}:null,busy:working,pending:dehumidifierTarget!==null,canControl:!!config.dehumidifier&&valid&&!working&&dehumidifierTarget===null&&!dirty()&&!!key&&!!config.server,message:dehumidifierMessage}}
 function dehumidifierCard(){const d=dehumidifierSnapshot();return d.configured?resultCard('dehumidifier','dehumidifier',`<p>${d.on===true?'Ligado':d.on===false?'Desligado':'Por confirmar'}</p>`,'Desumidificador'):''}
 function dehumidifierEnsureFresh(){if(config.dehumidifier&&(!AL.fresh(dehumidifierReading)||Date.now()-dehumidifierReading.fetchedAt>10000))return refresh({quiet:true,ids:[config.dehumidifier.deviceId]})}
 function settleDehumidifier(){if(dehumidifierTarget!==null&&confirmationCurrent('dehumidifier',dehumidifierReading)&&AL.fresh(dehumidifierReading)&&dehumidifierReading.on===dehumidifierTarget){dehumidifierMessage='Estado confirmado pelo Shelly: '+(dehumidifierTarget?'ligado.':'desligado.');dehumidifierTarget=null}}
 async function commandDehumidifier(on){
  if(typeof on!=='boolean'||blockingRead()||commandCount||groupBusy||lightGroupBusy||dehumidifierTarget!==null)return;
  if(!dehumidifierSnapshot().canControl){dehumidifierMessage='Atualize o estado e confirme a associação do desumidificador.';summary();return}
  const version=generation,payload={id:config.dehumidifier.deviceId,channel:config.dehumidifier.channel,type:'switch',on};commandCount++;dehumidifierMessage=on?'A ligar o desumidificador…':'A desligar o desumidificador…';summary();
  try{const result=await api('light',payload);if(version!==generation)return;if(result.accepted!==true)throw Error('O Cloud não confirmou o comando.');dehumidifierTarget=on;dehumidifierMessage='Comando aceite. A aguardar confirmação do Shelly.'}
  catch(error){if(version===generation)dehumidifierMessage=error.message}
  finally{commandCount--;if(version===generation){summary();settleDehumidifier();settleMedia();summary();schedulePoll()}}
 }
 function alarmSnapshot(){const d=AL.state(config.alarm,alarmReadings),working=blockingRead()||commandCount>0||groupBusy||lightGroupBusy;return {...d,busy:working,pending:alarmTarget!==null,canControl:d.canControl&&!working&&alarmTarget===null&&!dirty()&&!!key&&!!config.server,message:alarmMessage,readings:structuredClone(alarmReadings)}}
 function alarmCard(){const d=alarmSnapshot();if(!d.configured)return '';return resultCard('cellar','alarm',`<dl><div><dt>Armação</dt><dd>${d.armed===true?'Armado':d.armed===false?'Desarmado':'Por confirmar'}</dd></div><div><dt>Disparo</dt><dd>${d.triggered===true?'A tocar':d.triggered===false?'Sem disparo':'Por confirmar'}</dd></div></dl>`,'Alarme da cave')}
 function alarmEnsureFresh(){if(AL.ROLES.some(role=>config.alarm?.[role]&&(!AL.fresh(alarmReadings[role])||Date.now()-alarmReadings[role].fetchedAt>10000)))return refresh({quiet:true,ids:AL.ROLES.map(role=>config.alarm?.[role]?.deviceId)})}
 function settleAlarm(){if(alarmTarget!==null&&confirmationCurrent('alarm',alarmReadings.arm)&&AL.state(config.alarm,alarmReadings).armed===alarmTarget){alarmMessage='Armação confirmada pelo Shelly: '+(alarmTarget?'armado.':'desarmado.');alarmTarget=null}}
 async function commandAlarm(armed){
  if(typeof armed!=='boolean'||blockingRead()||commandCount||groupBusy||lightGroupBusy||alarmTarget!==null)return;
  if(!alarmSnapshot().canControl){alarmMessage='Atualize o estado e confirme a associação do Shelly de armação.';summary();return}
  const version=generation,payload=AL.command(config.alarm,armed);commandCount++;alarmMessage=armed?'A enviar pedido de armação…':'A enviar pedido para desarmar…';summary();
  try{const result=await api('light',payload);if(version!==generation)return;if(result.accepted!==true)throw Error('O Cloud não confirmou o comando.');alarmTarget=armed;alarmMessage='Comando aceite. A aguardar o estado do Shelly de armação.'}
  catch(error){if(version===generation)alarmMessage=error.message}
  finally{commandCount--;if(version===generation){summary();settleAlarm();settleFan();settleHeater();settleDehumidifier();settleMedia();summary();schedulePoll()}}
 }
 function lampSnapshot(id){const d=lightReading(id),configured=!!lightBinding(id),working=blockingRead()||commandCount>0||lightGroupBusy||groupBusy;
  return {configured,state:d?.online&&!d.error&&typeof d.on==='boolean'?{on:d.on,checkedAt:d.fetchedAt}:null,busy:working,ready:configured&&!working&&!lightTargets.has(id)&&!dirty()&&!!key&&!!config.server&&CORE.canLightControl(d),error:!configured?'':(!CORE.canLightControl(d)?lightCaption(id):(/não|erro|falh|indispon|demor|atualize/i.test(lightMessages.get(id)||'')?lightMessages.get(id):''))};
 }
 function activitySnapshot(){
  const count=CORE.deviceIds(config).length,now=Date.now(),bad=new Set();
  const add=(b,r,valid)=>{if(b&&(!r?.online||r.error||r.missing||r.errors?.length||!valid))bad.add(b.deviceId)};
  for(const [id,b]of Object.entries(config.bindings))add(b,reading(id),CORE.canControl(reading(id),'open',now));
  for(const [id,b]of Object.entries(config.lightBindings||{}))add(b,lightReading(id),CORE.canLightControl(lightReading(id),now));
  for(const [id,b]of Object.entries(config.sensorBindings||{})){const r=sensorReading(id);add(b,r,r?.hasSensor&&Number.isFinite(r.fetchedAt)&&now>=r.fetchedAt&&now-r.fetchedAt<=120000&&(Number.isFinite(r.temperature)||Number.isFinite(r.humidity)))}
  for(const [b,r]of [[config.fan,fanReading],[config.heater,heaterReading],[config.dehumidifier,dehumidifierReading]])add(b,r,AL.fresh(r,now));
  for(const role of AL.ROLES)add(config.alarm?.[role],alarmReadings[role],AL.fresh(alarmReadings[role],now));
  for(const [id,b]of Object.entries({...config.mediaBindings,...config.officeBindings,...config.kitchenBindings}))add(b,mediaReadings[id],MC.state(b,mediaReadings[id],now).canControl);
  for(const role of EV.ROLES){const r=evReadings[role];add(config.ev?.[role],r,role==='relay'?EV.canControl(r,now):EV.fresh(r,now)&&r?.hasMeter&&(Number.isFinite(r.power)||Number.isFinite(r.energyKWh)))}
  for(const [id,b]of Object.entries(config.windowBindings||{}))add(b,windowReadings[id],typeof CasaDoorCore.state(windowReadings[id],now)==='boolean');
  add(config.door,doorReading,typeof CasaDoorCore.state(doorReading,now)==='boolean');add(config.cellarDoor,cellarDoorReading,typeof CasaDoorCore.state(cellarDoorReading,now)==='boolean');
  add(CasaEnergyCore.binding(config),energyReading,Number.isFinite(CasaEnergyCore.state(config,energyReading,now).powerKW));
  const confirming=targets.size+lightTargets.size+mediaTargets.size+[evTarget,alarmTarget,fanTarget,heaterTarget,dehumidifierTarget].filter(v=>v!==null).length;
  return CasaCloudActivityCore.state({configured:!!key&&!!config.server&&count>0,dirty:dirty(),count,activity:{...activity},session:transport.stats(config.server),sending:commandCount>0||groupBusy||lightGroupBusy,confirming,busy:blockingRead(),background:refreshing,lastFetched,unavailable:Math.min(count,bad.size)},now);
 }
 function connectionSnapshot(){const waitSeconds=Math.max(0,Math.ceil(((transport.stats(config.server).retryAt||0)-Date.now())/1000));return {paused:waitSeconds>0,waitSeconds,recovering:deferredReads.size>0}}
 window.CasaShelly={consumptionSnapshot,connectionSnapshot,commandKitchen,kitchenEnsureFresh,refreshEquipment,activitySnapshot,dehumidifierSnapshot,dehumidifierEnsureFresh,commandDehumidifier,heaterSnapshot,heaterEnsureFresh,commandHeater,hasUnsavedChanges:dirty,windowSnapshot,windowEnsureFresh,commandOffice,officeEnsureFresh,mediaSnapshot,mediaEnsureFresh,commandMedia,inspectDoorSensor,inspectDoorGateway,sensorMarkup,sensorCaption,fanSnapshot,fanEnsureFresh,commandFan,alarmSnapshot,alarmEnsureFresh,commandAlarm,energySnapshot,energyEnsureFresh,doorSnapshot,doorEnsureFresh,evSnapshot,commandEV,evEnsureFresh,lampSnapshot,isBusy:()=>busy||commandCount>0||lightGroupBusy||groupBusy||alarmTarget!==null||fanTarget!==null||heaterTarget!==null||dehumidifierTarget!==null||mediaTargets.size>0,sensorBinding,sensorReading,lightBinding,lightReading,lightCaption,lightValue,commandLight,commandAllLights,binding,reading,roomCaption:caption,decorateRoom,reapply,refresh,command,commandAll,ensureFresh,ensureBlindFresh};
 fill();summary();reapply();render();
 if(key&&config.server&&CORE.deviceIds(config).length)refresh({quiet:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){nextRefreshAt=0;schedulePoll()}});
 window.addEventListener('online',()=>{nextRefreshAt=0;schedulePoll()});
 function automaticRefresh(){
  if(document.visibilityState!=='visible'||!key||!config.server||busy||commandCount||lightGroupBusy||groupBusy||dirty())return;
  const retryAt=transport.stats(config.server).retryAt||0;if(Date.now()<retryAt)return;
  if(deferredReads.size){const ids=[...deferredReads].filter(id=>CORE.deviceIds(config).includes(id));deferredReads.clear();refresh({quiet:true,ids,force:true,priority:true});return}
  if(Date.now()>=nextRefreshAt&&CORE.deviceIds(config).length)refresh({quiet:true});
 }
 setInterval(automaticRefresh,1000);
})();
