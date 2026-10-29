(function(){
 'use strict';
 const house=document.getElementById('house-view');house.classList.add('floor-scene');
 const cave=document.createElement('main');cave.id='basement-view';cave.className='floor-scene basement-view';cave.hidden=true;cave.setAttribute('aria-label','Piso menos um · cave e estacionamento');cave.tabIndex=-1;
 cave.innerHTML=`<div class="basement-plan">
  <div class="basement-layout">
   <div class="cellar-shell"><div class="cellar-outline">
    <div class="cellar-room" aria-hidden="true"></div>
    <div class="cellar-wall cellar-wall-top"></div><div class="cellar-wall cellar-wall-left"></div><div class="cellar-wall cellar-wall-right"></div><div class="cellar-wall cellar-wall-bottom-left"></div><div class="cellar-wall cellar-wall-bottom-right"></div>
    <svg class="cellar-door" viewBox="0 0 110 110" aria-hidden="true"><defs><linearGradient id="cellar-door-wood"><stop stop-color="#ac7b48"/><stop offset=".5" stop-color="#d4b27f"/><stop offset="1" stop-color="#996d40"/></linearGradient></defs><g class="cellar-door-open"><path class="cellar-door-arc" d="M8 102 A94 94 0 0 1 102 8"/><path class="cellar-door-leaf" d="M102 102 L60 18 L65 15 L107 99Z"/><circle cx="67" cy="30" r="2" fill="#cbd0cc"/></g><g class="cellar-door-closed"><path class="cellar-door-leaf" d="M8 99H107V105H8Z"/><rect x="19" y="98" width="9" height="2" rx="1" fill="#cbd0cc"/></g></svg>
    <button class="cellar-pin" id="open-cellar"><strong>Cave</strong><span class="cellar-temperature" aria-live="polite"></span><span class="cellar-door-status">Porta · sensor por associar</span></button>
   </div></div>
   <div class="parking-space"><div class="parking-outline" aria-hidden="true"></div><button id="open-car" class="parked-car" aria-label="Ver veículo elétrico estacionado"><img src="assets/carro-eletrico-recortado-v1.png" alt="Carro elétrico branco estacionado, visto de cima" draggable="false"></button><span class="parking-caption">Veículo elétrico</span></div>
  </div>
 </div>`;
 house.after(cave);
 const dialog=document.createElement('dialog');dialog.id='basement-dialog';dialog.className='popup';dialog.setAttribute('aria-labelledby','basement-dialog-title');dialog.innerHTML='<button class="popup-close" aria-label="Fechar piso menos um" data-close="basement-dialog">'+icon('x')+'</button><span class="eyebrow">PISO −1</span><h2 id="basement-dialog-title"></h2><p id="basement-dialog-text" class="popup-subtitle"></p><div class="basement-info" id="basement-dialog-info"></div>';document.body.append(dialog);dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
 document.getElementById('open-cellar').addEventListener('click',()=>{
  if(window.CasaRoomDevices){CasaRoomDevices.openCellar();return}
  document.getElementById('basement-dialog-title').textContent='Cave';document.getElementById('basement-dialog-text').textContent='Divisão no piso −1 · entrada em baixo';
  const info=document.getElementById('basement-dialog-info');info.innerHTML='<div id="cellar-temperature-detail"></div><p class="cellar-door-status" role="status"></p><div class="backup-actions"><button class="secondary-action cellar-data-refresh" type="button">Atualizar dados</button><button class="secondary-action cellar-door-settings" type="button">Sensor da porta</button><button class="secondary-action cellar-temperature-settings" type="button">Sensor de temperatura</button></div>';
  window.CasaPopupUI?.refresh(info.querySelector('.cellar-data-refresh'),'Atualizar dados da cave');
  info.querySelector('.cellar-temperature-settings').addEventListener('click',()=>window.CasaCellarTemperature.openSettings());window.CasaCellarTemperature?.draw();window.CasaShelly?.ensureFresh('cellar');
  info.querySelector('.cellar-data-refresh').addEventListener('click',()=>window.CasaShelly?.refreshEquipment('cellar'));info.querySelector('.cellar-door-settings').addEventListener('click',()=>window.CasaDoor.openSettings('cellar'));showPopup('basement-dialog');window.CasaDoor.sync();window.CasaShelly?.doorEnsureFresh('cellar');
 });
 document.getElementById('open-car').addEventListener('click',()=>{
  if(window.CasaEV){window.CasaEV.open();return}
  delete dialog.dataset.roomDeviceOverview;dialog.classList.remove('room-overview');document.getElementById('basement-dialog-text').hidden=false;
  document.getElementById('basement-dialog-title').textContent='Veículo elétrico';document.getElementById('basement-dialog-text').textContent='Estacionamento junto à cave';
  document.getElementById('basement-dialog-info').innerHTML='<p>Dados do veículo e do carregamento ainda não associados.</p>';showPopup('basement-dialog');
 });
 document.querySelector('.tap-hint')?.remove();
 const floorDots=document.createElement('nav');floorDots.className='floor-dots floor-layers';floorDots.setAttribute('aria-label','Escolher piso');floorDots.innerHTML='<button type="button" data-floor="0" aria-label="Casa, piso um" title="Casa · Piso 1"><svg viewBox="0 0 44 34" aria-hidden="true"><path d="M22 4 42 17 22 30 2 17Z"/></svg></button><button type="button" data-floor="-1" aria-label="Cave, piso menos um" title="Cave · Piso −1"><svg viewBox="0 0 44 34" aria-hidden="true"><path d="M22 4 42 17 22 30 2 17Z"/></svg></button>';document.body.append(floorDots);
 floorDots.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>setFloor(Number(button.dataset.floor))));
 const floorIndicator=document.createElement('span');floorIndicator.className='floor-indicator';floorIndicator.setAttribute('role','status');floorIndicator.setAttribute('aria-live','polite');document.body.append(floorIndicator);
 let floor=0,lockedUntil=0,suppressClickUntil=0,touch=null,wheel=0,wheelAt=0;
 function hint(){floorIndicator.textContent=floor===-1?'Piso −1':'Piso 1';floorDots.querySelectorAll('button').forEach(button=>{if(Number(button.dataset.floor)===floor)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')})}
 function setFloor(next){
  if(next===floor||![-1,0].includes(next))return;
  floor=next;house.hidden=next===-1;cave.hidden=next===0;document.body.dataset.floor=String(next);hint();window.dispatchEvent(new Event('floorchange'));
  const view=next===-1?cave:house;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)view.animate([{opacity:0,transform:`translateY(${next===-1?'8%':'-8%'})`},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.22,.7,.2,1)'});
  lockedUntil=performance.now()+800;wheel=0;
 }
 function blocked(){return !!document.querySelector('dialog[open]')||!!document.documentElement.classList.contains('meteo-visible')}
 document.getElementById('home-button').addEventListener('click',()=>{setFloor(0);window.CasaPlanZoom?.reset()});
 for(const view of [house,cave]){
  view.addEventListener('wheel',e=>{
   if(blocked()||performance.now()<lockedUntil||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
   const now=performance.now();if(now-wheelAt>350||Math.sign(wheel)!==Math.sign(e.deltaY))wheel=0;wheelAt=now;wheel+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?view.clientHeight:1);
   if(Math.abs(wheel)<65)return;const next=CasaFloorsCore.destination(floor,wheel);if(next!==floor){e.preventDefault();setFloor(next)}
  },{passive:false});
  view.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!e.isPrimary||blocked()||e.target.closest('.room-pin,.blind-pin,.basement-movable,.heater-object,.dehumidifier-object'))return;touch={id:e.pointerId,x:e.clientX,y:e.clientY}});
  view.addEventListener('pointerup',e=>{if(!touch||touch.id!==e.pointerId)return;const start=touch;touch=null;if(blocked()||performance.now()<lockedUntil)return;const next=CasaFloorsCore.swipe(floor,e.clientX-start.x,e.clientY-start.y);if(next!==floor){suppressClickUntil=performance.now()+700;setFloor(next)}});
  view.addEventListener('pointercancel',()=>{touch=null});
 }
 document.addEventListener('click',e=>{if(performance.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
 window.CasaDoor.sync();hint();document.body.dataset.floor='0';window.CasaFloors={show:setFloor,current:()=>floor};
})();
