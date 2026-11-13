/* Appliance hit areas on the kitchen counter use the existing plan coordinates. */
(function(){
 'use strict';
 const C=CasaMediaCore,$=id=>document.getElementById(id);
 let selected='dishwasher';
 const symbols={
  washer:'<rect x="3" y="2" width="18" height="20" rx="3"/><path d="M3 7h18M6 4.5h2m8 0h2"/><circle cx="12" cy="14" r="5"/><g class="kitchen-drum"><path d="M8 14q2-3 4 0t4 0"/></g>',
  boiler:'<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 18h8"/><path class="kitchen-flame" d="M12 5c1 3 4 4 4 7a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 2 1 2z"/>',
  hob:'<rect x="2" y="3" width="20" height="18" rx="2"/><circle cx="7.5" cy="8" r="2"/><circle cx="16.5" cy="8" r="2"/><circle cx="7.5" cy="15.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  oven:'<rect x="2" y="4" width="20" height="16" rx="2"/><rect x="5" y="7" width="10" height="10" rx="1"/><path d="M18 8h1m-1 4h1m-1 4h1"/>'
 };
 const glyph=id=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+(symbols[id]||symbols.washer)+'</svg>';
 const previews={hob:'assets/placa-aeg.png',oven:'assets/forno-aeg.png'};
 const dialog=document.createElement('dialog');
 dialog.id='kitchen-device-dialog';
 dialog.className='popup kitchen-device-popup';
 dialog.setAttribute('aria-labelledby','kitchen-device-title');
 dialog.innerHTML=`
  <button class="popup-close" type="button" aria-label="Fechar equipamento da cozinha">${icon('x')}</button>
  <span class="eyebrow">COZINHA · EQUIPAMENTO</span>
  <h2 id="kitchen-device-title"></h2>
  <p id="kitchen-device-state" class="popup-subtitle" role="status"></p>
  <img id="kitchen-device-preview" class="kitchen-device-preview" alt="" hidden>
  <p id="kitchen-device-activity" class="kitchen-device-activity" role="status"><span aria-hidden="true"></span><strong></strong></p>
  <div class="kitchen-device-meters"></div>
  <div class="kitchen-device-power-row">
   <div><h3 id="kitchen-device-reading-title"></h3><p id="kitchen-device-quality"></p></div>
   <div class="kitchen-device-actions">
    <button id="kitchen-device-power" type="button"></button>
    <button id="kitchen-device-refresh" class="secondary-action" type="button" aria-label="Atualizar equipamento da cozinha">${icon('refresh')}</button>
   </div>
  </div>
  <p id="kitchen-device-message" role="status" aria-live="polite"></p>
  <button id="kitchen-device-settings" class="secondary-action" type="button">Definições Shelly</button>`;
 document.body.append(dialog);
 const powerButton=$('kitchen-device-power');
 const power=CasaPowerButton.bind(powerButton,()=>CasaShelly.mediaSnapshot(selected),'on',on=>CasaShelly.commandKitchen(selected,on),{on:'Ligar alimentação',off:'Desligar alimentação'});
 const activityText=state=>state===true?'A trabalhar':state===false?'Sem atividade':'Atividade por confirmar';
 const watts=value=>Number.isFinite(value)?value.toLocaleString('pt-PT',{maximumFractionDigits:1})+' W':'';
 function draw(){
  for(const id of C.KITCHEN_IDS){
   const state=window.CasaShelly?.mediaSnapshot(id),button=$('open-kitchen-'+id);
   if(!button)continue;
   const active=state?.activity===true;
   button.dataset.working=String(active);
   const badgePower=button.querySelector('.kitchen-working-power');
   if(badgePower)badgePower.textContent=active?watts(state.powerWatts):'';
   const label=[C.NAMES[id],activityText(state?.activity),C.isKitchenMeter(id)?watts(state?.powerWatts):''].filter(Boolean).join(' · ');
   button.title=label;
   button.setAttribute('aria-label',label+'. Abrir equipamento');
  }
  const d=window.CasaShelly?.mediaSnapshot(selected);
  if(!d)return;
  const readOnly=C.isKitchenMeter(selected),r=d.reading;
  $('kitchen-device-title').textContent=C.NAMES[selected];
  const status=$('kitchen-device-activity'),symbol=status.querySelector('span');
  if(symbol.dataset.device!==selected){symbol.innerHTML=glyph(selected);symbol.dataset.device=selected}
  status.dataset.working=String(d.activity===true);
  status.querySelector('strong').textContent=activityText(d.activity);
  status.title='A trabalhar quando o consumo é superior a '+C.activityThreshold(selected)+' W.';
  $('kitchen-device-state').textContent=readOnly
   ?(d.configured?'Shelly EM · Medição de consumo':'Por associar')
   :d.pending?'A aguardar confirmação…':d.label;
  $('kitchen-device-reading-title').textContent=readOnly?'Leitura do Shelly EM':'Alimentação elétrica';
  $('kitchen-device-quality').textContent=!d.configured?'Associe o Shelly nas definições.'
   :!r?'A aguardar consulta.':r.error?'Consulta indisponível.':r.missing?'Dispositivo não encontrado nesta conta.'
   :!r.online?'Shelly offline.':r.errors?.length?'Erro reportado pelo Shelly.'
   :readOnly?(!r.meter?.hasMeter?'Medidor não encontrado. Confirme o canal.':!d.ready?'Dados por confirmar ou desatualizados.':'')
   :!r.hasOutput?'Relé não encontrado. Confirme o canal.':d.on===null?'Dados por confirmar ou desatualizados.':'';
  $('kitchen-device-message').textContent=d.message||(d.stale&&d.lastReading?'Última consulta às '+new Date(d.lastReading.fetchedAt).toLocaleTimeString('pt-PT')+' · atualização pendente.':'');
  powerButton.hidden=readOnly;
  power(d);
  $('kitchen-device-refresh').disabled=d.busy||!d.configured;
 }
 function open(id){
  if(!C.KITCHEN_IDS.includes(id))return;
  selected=id;
  dialog.dataset.device=id;
  const preview=$('kitchen-device-preview');
  preview.hidden=!previews[id];
  if(previews[id]){preview.src=previews[id];preview.alt=C.NAMES[id]}
  draw();
  showPopup('kitchen-device-dialog');
  CasaShelly.kitchenEnsureFresh(id);
 }
 const positions={
  washer:[30.6,86.1,6.1,5.2],boiler:[36.8,86.1,6.1,5.2],dishwasher:[67.2,86.1,6.2,5.2],
  // Two halves of the same cabinet, within the edges of the rendered worktop.
  hob:[50,86.1,6.2,2.7],oven:[50,88.8,6.2,2.7]
 };
 for(const id of C.KITCHEN_IDS){
  const button=document.createElement('button');
  button.type='button';
  button.id='open-kitchen-'+id;
  button.className='kitchen-appliance-trigger';
  const meter=C.isKitchenMeter(id);
  if(meter)button.classList.add('kitchen-meter-trigger');
  const badge=document.createElement('span');
  badge.className='kitchen-working-symbol';
  badge.setAttribute('aria-hidden','true');
  badge.innerHTML=glyph(id)+(meter?'<span class="kitchen-working-power"></span>':'');
  button.append(badge);
  const [x,y,w,h]=positions[id];
  button.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%`;
  button.addEventListener('click',e=>{e.stopPropagation();open(id)});
  $('plan-stage').append(button);
 }
 dialog.querySelector('.popup-close').addEventListener('click',()=>dialog.close());
 $('kitchen-device-refresh').addEventListener('click',()=>CasaShelly.refreshEquipment('media',selected));
 $('kitchen-device-settings').addEventListener('click',()=>{
  $('open-shelly').click();
  $('shelly-kitchen-group').open=true;
  const input=$('kitchen-id-'+selected);
  input.closest('details').open=true;
  input.scrollIntoView({block:'center'});
  input.focus();
 });
 window.addEventListener('mediachange',draw);
 setInterval(()=>{if(!document.hidden)draw()},2000);
 window.CasaKitchen={open};
 draw();
})();
