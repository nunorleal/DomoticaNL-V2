/* Shared offline presentation. Reads existing in-memory snapshots, never requests or actuates. */
(function(){
 'use strict';const C=CasaOfflineCore,NS='http://www.w3.org/2000/svg',$=id=>document.getElementById(id),aria=new WeakMap();
 const wifi='<svg class="offline-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0M12 20h.01M3 3l18 18"/></svg>';
 let serial=0,scheduled=false,painting=false;
 function badgeContent(node,state){node.title=state.title;node.setAttribute('aria-label',state.title);node.setAttribute('role','img');const label=node.querySelector('.offline-text');if(label&&label.textContent!==state.text)label.textContent=state.text}
 function mark(node,rows,options={}){
  if(!node)return;const d=C.state(rows),want=String(d.offline);if(node.dataset.shellyOffline!==want)node.dataset.shellyOffline=want;
  const current=node.getAttribute('aria-label'),previous=aria.get(node),base=previous&&current===previous.full?previous.base:current;
  if(d.offline&&base){const full=base+' · '+d.text;if(current!==full)node.setAttribute('aria-label',full);aria.set(node,{base,full})}
  else if(!d.offline){if(previous&&current===previous.full&&current!==previous.base)node.setAttribute('aria-label',previous.base||'');aria.delete(node)}
  if(options.contourOnly)return;
  let badge=[...node.children].find(e=>e.classList.contains('shelly-offline-mark'));
  if(d.offline){
   if(!badge){badge=document.createElement('span');badge.className='shelly-offline-mark'+(options.plan?' offline-plan-mark':'');badge.id='shelly-offline-'+(++serial);badge.innerHTML=wifi+'<span class="offline-text">Offline</span>';node.append(badge)}
   if(getComputedStyle(node).position==='static'&&options.plan)node.classList.add('offline-anchor');
   badgeContent(badge,d);
  }else{
   if(badge)badge.remove();node.classList.remove('offline-anchor');
  }
  if(options.hiddenUnlessOffline)node.hidden=!d.offline;
 }
 function header(dialog,rows){
  if(!dialog)return;const d=C.state(rows),flag=String(d.offline);if(dialog.dataset.shellyOffline!==flag)dialog.dataset.shellyOffline=flag;
  const header=dialog.querySelector('.eyebrow,.detail-eyebrow');if(header)mark(header,rows);
  const preview=dialog.querySelector('.heater-preview,.dehumidifier-preview');if(preview)mark(preview,rows,{contourOnly:true});
 }
 function position(node,box){const[x,y,w,h]=box;node.style.cssText='left:'+x/10.24+'%;top:'+(y-140)/11.8+'%;width:'+w/10.24+'%;height:'+h/11.8+'%';}
 function ensureContacts(){
  const stage=$('plan-stage');if(stage&&!$('entrance-contact-offline')){
   const contact=document.createElement('span');contact.id='entrance-contact-offline';contact.className='door-contact-offline';contact.hidden=true;contact.setAttribute('aria-label','Sensor da porta de entrada');position(contact,[119,975,76,89]);stage.append(contact);
  }
 }
 function svgMark(node,rows){
  if(!node)return;const d=C.state(rows);node.dataset.shellyOffline=String(d.offline);let badge=[...node.children].find(e=>e.classList.contains('shelly-offline-svg'));
  if(!d.offline){if(badge)badge.remove();return}
  if(!badge){badge=document.createElementNS(NS,'g');badge.classList.add('shelly-offline-svg');badge.setAttribute('role','img');badge.setAttribute('aria-label',d.title);badge.setAttribute('pointer-events','none');badge.innerHTML='<title>Sensor da porta · Offline</title><circle r="9" fill="#8c2337" stroke="#f3a5b2" stroke-width="1" vector-effect="non-scaling-stroke"/><path d="M-5-1q5-4 10 0M-3 2q3-2 6 0M0 5h.01M-6-5 6 6" fill="none" stroke="white" stroke-width="1.3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';node.append(badge)}
  const leaf=node.querySelector(document.body.classList.contains('cellar-door-is-open')?'.cellar-door-open .cellar-door-leaf':'.cellar-door-closed .cellar-door-leaf');
  if(!leaf)return;const bounds=leaf.getBBox(),matrix=node.getScreenCTM(),scale=matrix?Math.hypot(matrix.a,matrix.b):1;
  badge.setAttribute('transform','translate('+(bounds.x+bounds.width)+' '+bounds.y+') scale('+(1/Math.max(.1,scale))+')');
 }
 function uiFor(rows){
  const s=rows.filter(r=>r.configured!==false),pick=(kind,key)=>C.pick(s,kind,key),group=(...sets)=>sets.flat();
  const single=(selector,kind,key)=>{const values=pick(kind,key);for(const node of document.querySelectorAll(selector))mark(node,values,{plan:true})};
  const batch=(selector,values)=>{for(const node of document.querySelectorAll(selector))mark(node,values,{plan:true})};
  single('#heater-object','heater');single('#dehumidifier-object','dehumidifier');single('#fan-pin','fan');
  single('.ev-badge','ev');single('#energy-pin,.energy-open-general','energy');
  const alarm=pick('alarm');batch('#alarm-pin,.alarm-device-open',alarm);
  const media=group(pick('media'),pick('light','living'));
  batch('#open-media-console',media);batch('.media-room-open:not(.office-room-open)',media);
  const office=pick('office');batch('#open-office-desk,.office-room-open',office);
  // These two controls have the same class; route by the text/owner rather than marking all as media.
  for(const b of document.querySelectorAll('#controls-dialog .media-open-global')){
   const text=b.textContent||'';if(/secretária|gui/i.test(text))mark(b,office);else if(/multimédia|televisão/i.test(text))mark(b,media);
  }
  const windowPairs=['master','bedroom2','living','kitchen'];
  for(const id of windowPairs){const values=group(pick('cover',id),pick('window',id));batch('.blind-pin[data-room="'+id+'"],.blind-window-trigger[data-room="'+id+'"]',values)}
  for(const id of ['master','bedroom2','living']){
   const values=pick('light',id);batch('.lamp-trigger[data-room="'+id+'"]',values);
   for(const halo of document.querySelectorAll('.lamp-on-halo[data-lamp-halo-room="'+id+'"]'))mark(halo,values,{contourOnly:true});
  }
  for(const id of ['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony']){
   const values=group(pick('sensor',id),pick('light',id));batch('.room-pin[data-room="'+id+'"]',values);
  }
  for(const id of CasaMediaCore.KITCHEN_IDS)single('#open-kitchen-'+id,'kitchen',id);
  const slotKinds=['media','office'];
  for(const kind of slotKinds){
   const deviceAttr='data-'+kind+'-device',dotAttr='data-'+kind+'-dot',hitAttr='data-'+kind+'-hit',scope='#'+kind+'-dialog';
   for(const button of document.querySelectorAll(scope+' ['+deviceAttr+'], '+scope+' ['+hitAttr+']')){
    const id=button.getAttribute(deviceAttr)||button.getAttribute(hitAttr),values=id==='living-lamp'?pick('light','living'):pick(kind,id);
    mark(button,values,{plan:true,contourOnly:button.hasAttribute(deviceAttr)});
   }
   for(const dot of document.querySelectorAll(scope+' ['+dotAttr+']')){
    const id=dot.getAttribute(dotAttr),values=id==='living-lamp'?pick('light','living'):pick(kind,id);
    mark(dot,values,{contourOnly:true});
   }
   const dialog=$(kind+'-dialog');if(dialog){const selected=dialog.querySelector('['+deviceAttr+'][aria-pressed="true"]'),id=selected?.getAttribute(deviceAttr),values=id==='living-lamp'?pick('light','living'):pick(kind,id||'');header(dialog,values)}
  }
  for(const kind of ['fan','heater','dehumidifier','energy','ev','alarm'])header($(kind+'-dialog'),pick(kind));
  const kitchen=$('kitchen-device-dialog'),kitchenId=kitchen?.dataset.device||'',kitchenValues=pick('kitchen',kitchenId);header(kitchen,kitchenValues);mark(kitchen?.querySelector('.kitchen-device-activity'),kitchenValues);
  const detail=$('room-dialog'),view=typeof detailView==='undefined'?'room':detailView,id=typeof selected==='undefined'?'':selected;
  if(detail){const details=detail.querySelector('#detail-card');const values=view==='light'?pick('light',id):view==='blind'?pick('cover',id):[];header(details,values);header(detail,values);mark(details?.querySelector('.sensor-room-info>h3'),pick('sensor',id));
   if(view==='blind')mark(details?.querySelector('.window-control h3'),pick('cover',id));
  }
  const cellarSensor=pick('sensor','cellar'),cellarDoor=pick('door','cellar');
  mark(document.querySelector('#open-cellar .cellar-temperature'),cellarSensor);mark(document.querySelector('#cellar-temperature-detail h3'),cellarSensor);
  for(const node of document.querySelectorAll('.cellar-door-status'))mark(node,cellarDoor);
  for(const svg of document.querySelectorAll('.cellar-door'))svgMark(svg,cellarDoor);
  const entrance=pick('door','entrance');mark($('entrance-contact-offline'),entrance,{plan:true,hiddenUnlessOffline:true});
  // Keep the original caption and buttons; labels only add current offline information.
  for(const row of document.querySelectorAll('.room-device-row')){
   const kind=row.dataset.deviceKind,key=row.dataset.deviceId,values=pick(kind,key);mark(row,values);
   const desc=row.querySelector('.room-device-description');if(desc)mark(desc,values,{contourOnly:true});
  }
  for(const item of document.querySelectorAll('.device-item[data-room]')){
   const id=item.dataset.room;const values=typeof mode!=='undefined'&&mode==='blinds'?pick('cover',id):pick('light',id);mark(item,values);
  }
  for(const [role,id]of [['arm','alarm-arm-state'],['trigger','alarm-trigger-state']])mark($(id),pick('alarm',role));
  // Explicitly scoped links and settings cards retain their original navigation.
  for(const node of document.querySelectorAll('[data-shelly-result]')){
   const [kind,...parts]=node.dataset.shellyResult.split('-'),id=parts.join('-');
   const values=kind==='ev'||kind==='alarm'?pick(kind):kind==='media'?s.filter(r=>['media','office','kitchen'].includes(r.kind)&&r.key===id):pick(kind,id);
   mark(node.querySelector('summary'),values);
  }
  const point=document.querySelector('.ev-post');if(point)mark(point,pick('ev'),{plan:true});
  const parking=document.querySelector('.parking-space'),post=point?.querySelector('svg');
  if(parking&&post){const d=C.state(pick('ev'));parking.dataset.shellyOffline=String(d.offline);post.dataset.shellyOffline=String(d.offline)}
  // Deliberately no changes to disabled, checked, output values or command permissions.
 }
 function sync(){
  if(painting||document.hidden||document.documentElement.classList.contains('meteo-visible'))return;
  const api=window.CasaShelly;if(!api?.houseSnapshot)return;
  painting=true;try{ensureContacts();const rows=api.houseSnapshot().deviceRows||[];uiFor(rows)}finally{painting=false}
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync()})}
 const observed=['mediachange','sensorchange','heaterchange','dehumidifierchange','fanchange','alarmchange','energychange','evchange','doorchange','shellyactivitychange','floorchange','roomlayoutchange','environmentchange'];
 observed.forEach(event=>window.addEventListener(event,schedule));
 document.addEventListener('visibilitychange',schedule);document.addEventListener('toggle',schedule,true);document.addEventListener('click',schedule,true);document.addEventListener('pointerup',schedule,true);
 window.CasaOffline={sync,schedule};schedule();
})();
