/* Reparent existing form controls; never clone fields, change configuration or send commands. */
(function(){
 'use strict';const $=id=>document.getElementById(id),form=$('shelly-form'),sections=new Map(),wrappers=new Map();let moved=[];
 const holder=document.createElement('div');holder.id='shelly-room-groups';form.insertBefore(holder,form.querySelector(':scope > .shelly-equipment-group'));
 const order=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony','cellar','parking','general'];
 const fixedNames={cellar:'Cave',parking:'Estacionamento',general:'Casa · geral'};
 for(const id of order){const section=document.createElement('section');section.className='shelly-room-section';section.dataset.shellyRoom=id;const heading=document.createElement('h3');heading.className='shelly-room-heading';section.append(heading);holder.append(section);sections.set(id,section)}
 function roomOf(kind){return (kind==='heater'?window.CasaHeater:window.CasaDehumidifier)?.roomId()||(kind==='heater'?'master':'bath1')}
 function put(node,section){if(node&&section&&node.parentElement!==section)section.append(node)}
 function mapping(field,sourceId,room,label,key){const input=$(field),source=$(sourceId);if(!input||!source)return;const fieldset=input.closest('fieldset');if(!fieldset)return;
  let wrap=wrappers.get(key);if(!wrap){wrap=document.createElement('details');wrap.className='shelly-equipment-group shelly-room-mapping';wrap.id='shelly-room-mapping-'+key;const summary=document.createElement('summary');summary.textContent=label;const content=document.createElement('div');content.className='shelly-equipment-content';wrap.append(summary,content);wrappers.set(key,wrap)}
  if(!moved.some(item=>item.node===fieldset))moved.push({node:fieldset,source});put(fieldset,wrap.querySelector('.shelly-equipment-content'));put(wrap,sections.get(room));
 }
 function restore(){for(const {node,source}of moved)if(node.isConnected&&source.isConnected)source.append(node);moved=[]}
 function sync(){
  for(const [id,section]of sections)section.querySelector('.shelly-room-heading').textContent=fixedNames[id]||rooms.find(r=>r.id===id)?.name||id;
  for(const id of ShellyCore.LIGHT_ROOM_IDS)mapping('shelly-light-id-'+id,'shelly-light-mappings',id,'Candeeiro','light-'+id);
  for(const id of ShellyCore.SENSOR_ROOM_IDS)mapping('shelly-sensor-id-'+id,'shelly-sensor-mappings',id,'Temperatura e humidade','sensor-'+id);
  for(const id of ShellyCore.ROOM_IDS)mapping('shelly-id-'+id,'shelly-mappings',id,'Estore','cover-'+id);
  for(const id of CasaWindowsCore.IDS){const input=$('window-'+id+'-device'),node=input?.closest('details');if(!node)continue;node.classList.remove('shelly-help');node.classList.add('shelly-equipment-group','shelly-room-window');node.querySelector('summary').textContent='Janela';
   if(!node.querySelector(':scope > .shelly-equipment-content')){const content=document.createElement('div');content.className='shelly-equipment-content';for(const child of [...node.childNodes])if(child!==node.querySelector('summary'))content.append(child);node.append(content)}put(node,sections.get(id));
  }
  const groups={'shelly-door-group':'living','shelly-cellar-door-group':'cellar','shelly-alarm-group':'cellar','shelly-fan-group':'cellar','shelly-media-group':'living','shelly-office-group':'bedroom2','shelly-kitchen-group':'kitchen','shelly-heater-group':roomOf('heater'),'shelly-dehumidifier-group':roomOf('dehumidifier'),'shelly-energy-group':'general','shelly-ev-group':'parking'};
  for(const [id,room]of Object.entries(groups))put($(id),sections.get(room));
  for(const id of ['shelly-lights-title','shelly-sensors-title','shelly-blinds-title']){const group=$(id)?.closest('details');if(group)group.hidden=true}
  if($('shelly-windows-group'))$('shelly-windows-group').hidden=true;
  for(const section of sections.values())section.hidden=section.children.length===1;
 }
 window.CasaShellyRooms={restore,sync};window.addEventListener('roomlayoutchange',sync);for(const event of ['heaterchange','dehumidifierchange'])window.addEventListener(event,()=>{if($('shelly-dialog').open)sync()});sync();
})();
