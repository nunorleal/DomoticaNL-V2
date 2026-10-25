/* Room banners expose one compact inventory; every power action reuses its guarded command. */
(function(){
 'use strict';const $=id=>document.getElementById(id),C=CasaRoomDevicesCore;const inventories=new WeakMap();
 const powerKinds=['light','media','office','kitchen','heater','dehumidifier','fan','alarm'];
 const isPower=e=>powerKinds.includes(e.kind)&&(e.kind!=='alarm'||e.id==='arm');
 const labels={light:'Iluminação',sensor:'Temperatura e humidade',cover:'Estore',window:'Janela',door:'Porta de entrada',heater:'Termoventilador',dehumidifier:'Desumidificador',fan:'Ventoinha'};
 const portable=()=>({heaterRoom:window.CasaHeater?.roomId(),dehumidifierRoom:window.CasaDehumidifier?.roomId()});
 const number=(v,unit)=>Number.isFinite(v)?v.toLocaleString('pt-PT',{maximumFractionDigits:1})+' '+unit:null;
 function snapshot(e,room){const api=CasaShelly;
  if(e.kind==='light'){if(!api.lightBinding(e.id))return {configured:false,on:room.light,canControl:true,simulation:true};const lamp=api.lampSnapshot(e.id);return {...CasaMediaCore.state(api.lightBinding(e.id),api.lightReading(e.id)),canControl:lamp.ready,busy:lamp.busy,pending:lamp.pending}}
  if(['media','office','kitchen'].includes(e.kind))return api.mediaSnapshot(e.id);
  if(e.kind==='fan')return api.fanSnapshot();if(e.kind==='alarm'){const d=api.alarmSnapshot();return {...d,configured:e.id==='arm'?d.armConfigured:d.triggerConfigured,on:e.id==='arm'?d.armed:d.triggered,canControl:e.id==='arm'&&d.canControl}}
  if(e.kind==='heater')return api.heaterSnapshot();if(e.kind==='dehumidifier')return api.dehumidifierSnapshot();
  if(e.kind==='cover')return {configured:!!api.binding(e.id),reading:api.reading(e.id)};
  if(e.kind==='sensor')return {configured:!!api.sensorBinding(e.id),reading:api.sensorReading(e.id)};
  if(e.kind==='window')return api.windowSnapshot(e.id);if(e.kind==='door')return api.doorSnapshot(e.id);return {};
 }
 function caption(e,d,room){
  if(e.kind==='alarm')return !d.configured?'Por associar':e.id==='arm'?(d.pending?'A confirmar…':d.on===true?'Armado':d.on===false?'Desarmado':'Por confirmar'):(d.on===true?'A tocar':d.on===false?'Sem disparo':'Por confirmar');
  if(isPower(e)){
   if(!d.configured&&!d.simulation)return 'Por associar';
   const relay=['media','office','kitchen'].includes(e.kind),onLabel=relay?'Com energia':'Ligado',offLabel=relay?'Sem energia':'Desligado';
   const state=d.pending?'A confirmar…':d.on===true?onLabel:d.on===false?offLabel:d.lastReading?'Última leitura · '+(d.lastReading.on?onLabel.toLowerCase():offLabel.toLowerCase()):'Por confirmar';
   const watts=d.powerWatts??d.lastReading?.powerWatts;
   const activity=e.id==='tv'&&CasaMediaCore.tvRegenerating(d)?'Regeneração':CasaMediaCore.screenWorking(e.id,d)?'Em utilização':e.kind==='kitchen'&&d.activity===true?'A trabalhar':'';
   return [state,activity,number(watts,'W'),d.simulation?'Simulação':''].filter(Boolean).join(' · ');
  }
  if(e.kind==='cover'){const r=d.reading;if(!d.configured)return room.blind+' % aberto · Simulação';return [Number.isFinite(r?.position)?Math.round(r.position)+' % aberto':'Abertura por confirmar',r?.state==='opening'?'A abrir':r?.state==='closing'?'A fechar':'',!r?.online?'Por confirmar':''].filter(Boolean).join(' · ')}
  if(e.kind==='sensor'){if(!d.configured)return 'Por associar';const r=d.reading,values=[number(r?.temperature,'°C'),number(r?.humidity,'%')].filter(Boolean);if(!values.length)return 'Por consultar';return values.join(' · ')+(!r?.online||r.error||Date.now()-r.fetchedAt>120000?' · Última leitura':'')}
  return !d.configured?'Por associar':d.open===true?'Aberta':d.open===false?'Fechada':'Estado por confirmar';
 }
 function command(e,room,on){const api=CasaShelly;if(e.kind==='light'){if(api.lightBinding(e.id))api.commandLight(e.id,on);else{room.light=on;persist();render()}}else if(e.kind==='media')api.commandMedia(e.id,on);else if(e.kind==='office')api.commandOffice(e.id,on);else if(e.kind==='kitchen')api.commandKitchen(e.id,on);else if(e.kind==='heater')api.commandHeater(on);else if(e.kind==='dehumidifier')api.commandDehumidifier(on);else if(e.kind==='fan')api.commandFan(on);else if(e.kind==='alarm'&&e.id==='arm')api.commandAlarm(on)}
 function open(e){if(e.kind==='light'&&['master','bedroom2','living'].includes(e.id))selectLamp(e.id);else if(e.kind==='cover')selectBlind(e.id);else if(e.kind==='media')CasaMedia.open(e.id);else if(e.kind==='office')CasaOffice.open(e.id);else if(e.kind==='kitchen')CasaKitchen.open(e.id);else if(e.kind==='heater')CasaHeater.open();else if(e.kind==='dehumidifier')CasaDehumidifier.open();else if(e.kind==='fan')CasaFan.open();else if(e.kind==='alarm')CasaAlarm.open()}
 function renderRoom(room){const cellar=room.id==='cellar',host=$(cellar?'basement-dialog-info':'detail-card'),entries=C.entries(room.id,portable()),key=JSON.stringify([room.id,entries]);let rows=inventories.get(host)||[];
  if(host.dataset.roomInventory!==key||!host.querySelector('.room-device-list')){
   host.innerHTML=(cellar?'':'<span class="detail-eyebrow">DISPOSITIVOS DA DIVISÃO</span><h2 id="room-title"></h2>')+'<div class="room-devices-toolbar"><span class="room-device-count"></span><button type="button" class="secondary-action refresh-icon-button room-devices-refresh" aria-label="Atualizar dispositivos da divisão">'+icon('refresh')+'</button></div><div class="room-device-list"></div>';
   host.dataset.roomInventory=key;rows=[];inventories.set(host,rows);const list=host.querySelector('.room-device-list');
   host.querySelector('.room-devices-refresh').addEventListener('click',()=>CasaShelly.refreshEquipment(cellar?'cellar':'room',room.id));
   for(const e of entries){const row=document.createElement('div');row.className='room-device-row';row.dataset.deviceKind=e.kind;row.dataset.deviceId=e.id;
    const details=document.createElement((['cover','media','office','kitchen','heater','dehumidifier','fan','alarm'].includes(e.kind)||e.kind==='light'&&['master','bedroom2','living'].includes(e.id))?'button':'div');details.className='room-device-description';if(details.tagName==='BUTTON'){details.type='button';details.addEventListener('click',()=>open(e))}
    const title=document.createElement('strong'),status=document.createElement('small');title.textContent=e.kind==='alarm'?'Alarme · '+(e.id==='arm'?'Armação':'Disparo'):e.kind==='door'&&e.id==='cellar'?'Porta da cave':labels[e.kind]||CasaMediaCore.NAMES[e.id];details.append(title,status);row.append(details);let update=null;
  if(isPower(e)){const power=document.createElement('button');row.append(power);update=CasaPowerButton.bind(power,()=>snapshot(e,room),'on',on=>command(e,room,on),e.kind==='alarm'?{on:'Armar alarme',off:'Desarmar alarme'}:{on:'Ligar '+title.textContent,off:'Desligar '+title.textContent})}
    else if(e.kind==='cover'){const b=document.createElement('button');b.className='room-device-open secondary-action';b.type='button';b.setAttribute('aria-label','Abrir controlos do estore');b.innerHTML=icon('blind');b.addEventListener('click',()=>open(e));row.append(b)}
    list.append(row);rows.push({e,status,details,update});
   }
  }
  $(cellar?'basement-dialog-title':'room-title').textContent=room.name;host.querySelector('.room-device-count').textContent=entries.length+' dispositivos';
  for(const row of rows){const d=snapshot(row.e,room),text=caption(row.e,d,room);if(row.status.textContent!==text)row.status.textContent=text;row.update?.(d);if(row.details.tagName==='BUTTON')row.details.setAttribute('aria-label',row.details.querySelector('strong').textContent+': '+text+'. Abrir controlos')}
  host.querySelector('.room-devices-refresh').disabled=CasaShelly.isBusy();
 }
 function update(){if($('room-dialog')?.open&&detailView==='room')renderRoom(current());const d=$('basement-dialog');if(d?.open&&d.dataset.roomDeviceOverview==='cellar')renderRoom({id:'cellar',name:'Cave'})}
 function openCellar(){const d=$('basement-dialog');d.dataset.roomDeviceOverview='cellar';d.classList.add('room-overview','equipment-popup');$('basement-dialog-text').hidden=true;renderRoom({id:'cellar',name:'Cave'});showPopup('basement-dialog')}
 let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;update()})}
 for(const event of ['mediachange','sensorchange','heaterchange','dehumidifierchange','doorchange','fanchange','alarmchange'])window.addEventListener(event,schedule);
 setInterval(()=>{if(!document.hidden)update()},2000);window.CasaRoomDevices={render:renderRoom,openCellar};
})();
