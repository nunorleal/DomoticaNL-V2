/* Long press only reveals options. Timed ON uses the native Shelly timer. */
(function(){
 'use strict';
 window.CasaApplianceTimer={indicator(object){
  const badge=document.createElement('span');badge.className='appliance-plan-timer';badge.hidden=true;badge.setAttribute('aria-hidden','true');badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M9 2h6M12 2v3M12 8v5l3 2"/></svg><span></span>';object.append(badge);
  return state=>{const seconds=state.timerRemainingSeconds,visible=state.on===true&&(state.timerActive===true||state.timerEstimated===true)&&Number.isInteger(seconds)&&seconds>0;badge.hidden=!visible;if(!visible)return;const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=String(seconds%60).padStart(2,'0'),text=(state.timerEstimated?'≈':'')+(h?h+':'+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+':'+s;badge.querySelector('span').textContent=text;badge.dataset.estimated=String(state.timerEstimated===true);badge.title=(state.timerEstimated?'Tempo restante previsto: ':'Temporizador: ')+text;object.setAttribute('aria-label',(object.getAttribute('aria-label')||'')+' · '+badge.title)};
 },mount(dialog,{snapshot,command,dirty=()=>false}){
  const button=dialog.querySelector('[id$="-power-toggle"],[id$="-toggle"]');if(!button)return ()=>{};
  const panel=document.createElement('section');panel.className='appliance-timer';panel.id=dialog.id+'-timer';panel.hidden=true;
  const label=panel.id+'-minutes';
  panel.innerHTML='<div class="appliance-timer-heading"><h3>Ligar por tempo</h3><button type="button" class="appliance-timer-close" aria-label="Fechar temporizador">×</button></div><div class="appliance-timer-actions"><button type="button" data-minutes="5">5 min</button><button type="button" data-minutes="10">10 min</button><button type="button" data-minutes="15">15 min</button><button type="button" class="appliance-timer-custom">Personalizado</button></div><form class="appliance-timer-form" hidden><label for="'+label+'">Minutos</label><input id="'+label+'" type="number" min="1" max="1440" step="1" inputmode="numeric" value="20" required><button type="submit">Ligar por tempo</button></form><p class="appliance-timer-message" role="status" aria-live="polite"></p>';
  let presetStorage=null;try{presetStorage=localStorage}catch{}
  const presets=window.CasaApplianceTimerStore.presets({storage:presetStorage,role:dialog.id});
  function renderPresets(){const values=presets.get();[...panel.querySelectorAll('[data-minutes]')].forEach((button,index)=>{button.dataset.minutes=String(values[index]);button.textContent=values[index]+' min'})}
  renderPresets();
  const anchor=dialog.querySelector('.heater-power-row,.dehumidifier-power-row,.detail-row');anchor?anchor.after(panel):dialog.append(panel);
  const hint=document.createElement('span');hint.id=panel.id+'-hint';hint.className='appliance-timer-hint';hint.textContent='Clique para ligar ou desligar. Mantenha premido para escolher o tempo. Com teclado, use a seta para baixo para abrir o temporizador.';panel.after(hint);
  button.dataset.applianceTimer='true';button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');button.setAttribute('aria-describedby',[button.getAttribute('aria-describedby'),hint.id].filter(Boolean).join(' '));
  const stateLine=dialog.querySelector('#'+dialog.id.replace('-dialog','')+'-state'),countdown=document.createElement('span');countdown.className='appliance-timer-countdown';countdown.hidden=true;countdown.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M9 2h6M12 2v3M12 8v5l3 2"/></svg><span></span>';stateLine?.classList.add('appliance-timer-state');
  const controls=[...panel.querySelectorAll('button:not(.appliance-timer-close),input')],message=panel.querySelector('[role="status"]'),form=panel.querySelector('form'),input=panel.querySelector('input');let sending=false,press=null,consumeClick=false,suppressUntil=0;
  const allowed=()=>snapshot().canControl&&!dirty()&&!sending;
  function cancelPress(){if(press)clearTimeout(press.timer);press=null}
  function close(){cancelPress();panel.hidden=true;form.hidden=true;button.setAttribute('aria-expanded','false')}
  function open(){if(!allowed())return;panel.hidden=false;button.setAttribute('aria-expanded','true');message.textContent='';renderPresets();update()}
  function update(){const state=snapshot(),remaining=state.timerRemainingSeconds;const counting=state.on===true&&(state.timerActive===true||state.timerEstimated===true)&&Number.isInteger(remaining)&&remaining>0;countdown.hidden=!counting;if(stateLine&&counting){const h=Math.floor(remaining/3600),m=Math.floor(remaining%3600/60),seconds=String(remaining%60).padStart(2,'0'),text=(h?h+':'+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+':'+seconds;countdown.querySelector('span').textContent=(state.timerEstimated?'≈ ':'')+text;countdown.setAttribute('aria-label',(state.timerEstimated?'Tempo restante previsto: ':'Tempo restante: ')+text);countdown.title=state.timerEstimated?'Tempo previsto pela duração escolhida; a leitura atual não inclui o temporizador.':'';stateLine.hidden=false;if(!stateLine.contains(countdown))stateLine.append(countdown)}button.dataset.timerActive=String(state.on===true&&state.timerActive===true);hint.textContent=(state.on===true&&state.timerActive===true?'Temporizador ativo. ':'')+'Clique para ligar ou desligar. Mantenha premido para escolher o tempo. Com teclado, use a seta para baixo para abrir o temporizador.';const enabled=allowed();for(const control of controls)control.disabled=!enabled;if(!enabled&&!sending)cancelPress()}
  button.addEventListener('pointerdown',event=>{
   if(event.isPrimary===false||event.button!==0||button.disabled||!allowed())return;
   cancelPress();consumeClick=false;
   const p={id:event.pointerId,x:event.clientX,y:event.clientY,fired:false,timer:null};press=p;
   p.timer=setTimeout(()=>{if(press!==p||!allowed())return;p.fired=true;consumeClick=true;suppressUntil=performance.now()+1500;open()},550);
   try{button.setPointerCapture(event.pointerId)}catch{}
  });
  button.addEventListener('pointermove',event=>{if(!press||event.pointerId!==press.id)return;if(Math.hypot(event.clientX-press.x,event.clientY-press.y)>10){consumeClick=true;suppressUntil=performance.now()+1500;cancelPress()}});
  button.addEventListener('pointerup',event=>{if(press&&event.pointerId===press.id){if(press.fired){consumeClick=true;suppressUntil=performance.now()+1500;event.preventDefault()}cancelPress()}});
  button.addEventListener('pointercancel',()=>{consumeClick=true;suppressUntil=performance.now()+1500;cancelPress()});button.addEventListener('lostpointercapture',cancelPress);
  button.addEventListener('click',event=>{if(consumeClick&&event.detail!==0&&performance.now()<=suppressUntil){event.preventDefault();event.stopImmediatePropagation();consumeClick=false;return}close()},true);
  button.addEventListener('contextmenu',event=>{event.preventDefault();consumeClick=true;suppressUntil=performance.now()+1500;open()});
  button.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='F10'&&event.shiftKey){event.preventDefault();open();panel.querySelector('[data-minutes]').focus()}else if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopPropagation();close()}});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();button.focus()}});
  panel.querySelector('.appliance-timer-close').addEventListener('click',()=>{close();button.focus()});
  panel.querySelector('.appliance-timer-custom').addEventListener('click',()=>{form.hidden=false;input.focus();input.select()});
  async function send(minutes,remember=false){
   if(!allowed())return;
   if(!Number.isInteger(minutes)||minutes<1||minutes>1440){message.textContent='Escolha entre 1 e 1440 minutos.';return}
   sending=true;message.textContent='A enviar pedido…';update();
   try{await command(true,minutes*60);if(remember){presets.remember(minutes);renderPresets()}message.textContent='';close()}
   catch(error){message.textContent=error.message}
   finally{sending=false;update()}
  }
  for(const preset of panel.querySelectorAll('[data-minutes]'))preset.addEventListener('click',()=>send(Number(preset.dataset.minutes)));
  form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())send(input.value.trim()===''?NaN:Number(input.value),true)});
  dialog.addEventListener('pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!button.contains(event.target))close()});dialog.addEventListener('close',close);window.addEventListener('blur',()=>{if(press){consumeClick=true;suppressUntil=performance.now()+1500}cancelPress()});document.addEventListener('visibilitychange',()=>{if(document.hidden)close()});
  update();return update;
 }};
})();
