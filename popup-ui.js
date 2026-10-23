/* Presentation only: reuse each device's existing buttons and listeners. */
(function(){
 'use strict';
 function symbol(button,kind,label){if(!button)return;button.classList.add('secondary-action');button.setAttribute('aria-label',label);button.title=label;if(button.dataset.compactIcon!==kind){button.innerHTML=icon(kind);button.dataset.compactIcon=kind}}
 function actions(host,power,refresh,settings){if(!host)return;host.classList.add('device-control-actions','portable-device-actions');for(const b of [power,refresh,settings])if(b&&b.parentElement!==host)host.append(b);symbol(refresh,'refresh','Atualizar estado');symbol(settings,'settings','Definições Shelly')}
 function settingsButton(id,field){const b=document.createElement('button');b.type='button';b.className='equipment-settings';b.addEventListener('click',()=>{document.getElementById('open-shelly').click();const input=document.getElementById(field);if(input){for(let p=input.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;input.scrollIntoView({block:'center'});input.focus()}});return b}
 function normalize(dialog){if(!dialog)return;dialog.classList.add('equipment-popup');const $=s=>dialog.querySelector(s),id=dialog.id;
  if(id==='room-dialog'){
   const power=$('#light-toggle'),section=power?.closest('.light-control'),row=section?.querySelector('.detail-row');
   if(row){let host=row.querySelector('.portable-device-actions');if(!host){host=document.createElement('div');row.append(host)}let settings=$('.lamp-settings,.equipment-settings');if(!settings){settings=settingsButton(current().id,'shelly-light-id-'+current().id);dialog.querySelector('#detail-card').append(settings)}const refresh=section.querySelector('button.secondary-action');actions(host,power,refresh,settings);row.querySelector('h3').textContent='Alimentação elétrica';const panel=$('.device-consumption');if(panel&&panel.nextElementSibling!==section)section.before(panel)}
   else if($('#blind-range')){const section=$('.shelly-room-info');if(section){let host=section.querySelector('.portable-device-actions');if(!host){host=document.createElement('div');section.append(host)}let settings=section.querySelector('.equipment-settings');if(!settings){settings=settingsButton(current().id,'shelly-id-'+current().id);section.append(settings)}actions(host,null,section.querySelector('button.secondary-action'),settings)}}
   return;
  }
  const prefix={'heater-dialog':'heater','dehumidifier-dialog':'dehumidifier','fan-dialog':'fan','alarm-dialog':'alarm','ev-dialog':'ev','energy-dialog':'energy','kitchen-device-dialog':'kitchen-device','media-dialog':'media','office-dialog':'office'}[id];if(!prefix)return;
  const power=$('#'+prefix+(prefix==='kitchen-device'?'-power':'-power-toggle')),refresh=$('#'+prefix+'-refresh'),settings=$('#'+prefix+'-settings');
  if(power){let host=power.parentElement;if(prefix==='ev'){const row=$('.ev-supply');row.classList.add('equipment-power-row','detail-row');if(host.parentElement!==row)row.append(host)}else if(['fan','alarm'].includes(prefix)&&!host.closest('.equipment-power-row')){const row=document.createElement('div');row.className='equipment-power-row detail-row';const label=document.createElement('div');label.innerHTML='<h3>'+(prefix==='alarm'?'Armação':'Alimentação elétrica')+'</h3>';host.before(row);row.append(label,host);if(prefix==='fan'){label.append($('#fan-state'),$('#fan-quality'))}}actions(host,power,refresh,settings)}else if(prefix==='energy')actions(refresh?.parentElement,null,refresh,settings);
  if(prefix==='media'||prefix==='office'){const panel=$('.device-consumption'),heading=$('.media-selected-heading');if(panel&&heading&&panel.nextElementSibling!==heading)heading.before(panel)}
 }
 window.CasaPopupUI={normalize};
})();
