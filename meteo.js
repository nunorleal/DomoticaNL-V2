(function(){
 'use strict';
 const host=document.createElement('section');host.id='meteo-view';host.hidden=true;host.setAttribute('aria-label','Meteorologia e relógio');
 const frame=document.createElement('iframe');frame.title='MeteoNL · Meteorologia e relógio';host.append(frame);document.body.append(host);
 const loading=document.createElement('div');loading.className='meteo-loading';
 const loadMessage=document.createElement('p');loadMessage.setAttribute('role','status');loadMessage.textContent='A abrir MeteoNL…';
 const back=document.createElement('button');back.type='button';back.textContent='Voltar à casa';back.addEventListener('click',()=>home());
 loading.append(loadMessage,back);host.append(loading);let loadTimer;
 function ready(){
  clearTimeout(loadTimer);loading.hidden=true;
  const status=document.getElementById('meteo-settings-load');if(status)status.hidden=true;
 }
 let savedDialogs=[],lastFocus=null,loaded=false;
 let enteredFromFloor=false,floorEnteredAt=0;
 function openFloor(){
  if(!host.hidden)return;
  enteredFromFloor=true;
  floorEnteredAt=performance.now();
  open();
 }
 function bindFloorReturn(surface){
  let wheel=0,wheelAt=0,touch=null;
  const allowed=event=>{
   if(!enteredFromFloor||host.hidden||performance.now()-floorEnteredAt<650)return false;
   const doc=event.target.ownerDocument||event.target;
   return !doc.querySelector?.('dialog[open]')&&
    !event.target.closest?.('input,textarea,select,[contenteditable],.hourly-scroll,[role="dialog"]');
  };
  surface.addEventListener('wheel',event=>{
   if(!allowed(event)||event.ctrlKey||event.metaKey||event.deltaY<=Math.abs(event.deltaX)){wheel=0;return}
   const now=performance.now();
   if(now-wheelAt>350)wheel=0;
   wheelAt=now;
   const units=event.deltaMode===1?16:event.deltaMode===2?host.clientHeight:1;
   wheel+=event.deltaY*units;
   if(wheel<65)return;
   event.preventDefault();
   wheel=0;
   home();
  },{passive:false});
  surface.addEventListener('touchstart',event=>{
   const first=event.touches[0];
   touch=allowed(event)&&event.touches.length===1?
    {id:first.identifier,x:first.clientX,y:first.clientY}:null;
  },{passive:true});
  surface.addEventListener('touchcancel',()=>{touch=null},{passive:true});
  surface.addEventListener('touchend',event=>{
   const start=touch;
   touch=null;
   if(!start||event.touches.length||!allowed(event))return;
   const end=Array.from(event.changedTouches).find(point=>point.identifier===start.id);
   if(!end)return;
   const up=start.y-end.clientY,dx=Math.abs(start.x-end.clientX);
   if(up>=70&&up>dx*1.4)home();
  },{passive:true});
  surface.addEventListener('keydown',event=>{
   if(event.key!=='PageDown'||event.repeat||!allowed(event))return;
   event.preventDefault();
   home();
  });
 }
 bindFloorReturn(host);
 frame.addEventListener('load',()=>{
  const doc=frame.contentDocument;
  if(doc)bindFloorReturn(doc);
 });
 const screensaverKey='casa-nl-screensaver-v1';let screensaver={seconds:30};
 try{screensaver=CasaMeteoCore.screensaver(JSON.parse(localStorage.getItem(screensaverKey)))}catch{}
 const idle=CasaMeteoCore.idle({delay:screensaver.seconds*1000,onIdle:open,blocked:()=>document.body.classList.contains('room-power-mode')||document.getElementById('settings-dialog').open||document.hidden||!!window.CasaShelly?.isBusy()});
 window.addEventListener('roompowerviewchange',()=>idle.activity());
 const screenSelect=document.getElementById('screensaver-delay'),screenStatus=document.getElementById('screensaver-status');
 function screenMessage(){screenStatus.textContent=screensaver.seconds===0?'Desativado. Pode continuar a abrir a MeteoNL pelo símbolo da meteorologia.':`A MeteoNL abre após ${screenSelect.selectedOptions[0].textContent.toLowerCase()} sem interação. Guardado automaticamente.`}
 screenSelect.value=String(screensaver.seconds);screenMessage();
 screenSelect.addEventListener('change',()=>{
  try{const next=CasaMeteoCore.screensaver({seconds:Number(screenSelect.value)});localStorage.setItem(screensaverKey,JSON.stringify(next));screensaver=next;idle.setDelay(next.seconds*1000);screenMessage();window.dispatchEvent(new CustomEvent('housepreferencechange',{detail:{setting:'screensaver-delay',value:next.seconds}}))}
  catch{screenSelect.value=String(screensaver.seconds);screenStatus.textContent='Não foi possível guardar este tempo. Tente novamente.'}
 });
 function loadFrame(){
  if(loaded)return;
  loading.hidden=false;loadTimer=setTimeout(()=>{const message='Não foi possível carregar a MeteoNL. Atualize a página.';loadMessage.textContent=message;const status=document.getElementById('meteo-settings-load');if(status)status.textContent=message},15000);
  const release=window.CasaMeteoRelease;
  if(location.protocol==='file:'){
   const base=new URL('meteo/',document.baseURI).href.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
   frame.srcdoc=release.html.replace('<head>','<head><base href="'+base+'">');
  }else frame.src='meteo/index.html?v='+release.cacheKey;
  loaded=true;
 }
 function setMeteoVisible(visible){
  host.hidden=!visible;
  document.documentElement.classList.toggle('meteo-visible',visible);
  document.getElementById('casa-app')?.toggleAttribute('inert',visible);
  idle.setActive(!visible);
 }
 function open(){
  if(!host.hidden)return;
  lastFocus=document.activeElement;savedDialogs=[...document.querySelectorAll('dialog[open]')];savedDialogs.forEach(d=>d.close());
  window.CasaPlanMove?.lock();
  setMeteoVisible(true);
  loadFrame();
  window.CasaShelly?.ensureFresh('master');window.CasaShelly?.ensureFresh('balcony');refreshIndoorSensor();frame.focus();
 }
 function home(restore=true){
  const fromFloor=enteredFromFloor;enteredFromFloor=false;
  setMeteoVisible(false);
  if(restore){savedDialogs.filter(d=>d.isConnected).slice(-1).forEach(d=>d.showModal());lastFocus?.focus?.()}
  savedDialogs=[];
  if(fromFloor)window.dispatchEvent(new Event('meteofloorreturn'));
 }
 const activityTargets={
  tv:()=>[0,()=>window.CasaMedia.open('tv')],
  playstation:()=>[0,()=>window.CasaMedia.open('playstation')],
  soundbar:()=>[0,()=>window.CasaMedia.open('soundbar')],
  vodafone:()=>[0,()=>window.CasaMedia.open('vodafone')],
  unifi:()=>[0,()=>window.CasaMedia.open('unifi')],
  monitor:()=>[0,()=>window.CasaOffice.open('monitor')],
  apollo:()=>[0,()=>window.CasaOffice.open('apollo')],
  terramaster:()=>[0,()=>window.CasaOffice.open('terramaster')],
  blackdrive:()=>[0,()=>window.CasaOffice.open('blackdrive')],
  washer:()=>[0,()=>window.CasaKitchen.open('washer')],
  dishwasher:()=>[0,()=>window.CasaKitchen.open('dishwasher')],
  boiler:()=>[0,()=>window.CasaKitchen.open('boiler')],
  hob:()=>[0,()=>window.CasaKitchen.open('hob')],
  oven:()=>[0,()=>window.CasaKitchen.open('oven')],
  heater:()=>[0,window.CasaHeater?.open],
  dehumidifier:()=>[0,window.CasaDehumidifier?.open],
  ev:()=>[-1,window.CasaEV?.open],
 };
 function openActivityDevice(id){
  if(host.hidden||!Object.hasOwn(activityTargets,id))return false;
  const [floor,openDevice]=activityTargets[id]();
  if(typeof openDevice!=='function')return false;
  home(false);
  if(window.CasaFloors.current()!==floor)window.CasaFloors.show(floor);
  openDevice();
  return true;
 }
 const settingsDialog=document.getElementById('settings-dialog');
 let returnToMeteo=false;
 function openMeteoSettings(){
  if(host.hidden||!window.CasaSettingsMenu)return;
  returnToMeteo=true;
  setMeteoVisible(false);
  window.CasaSettingsMenu.openMeteo();
 }
 settingsDialog.addEventListener('close',()=>{
  if(!returnToMeteo||settingsDialog.open)return;
  returnToMeteo=false;
  if(document.querySelector('dialog[open]')){home(false);return}
  setMeteoVisible(true);
  frame.focus();
 });
 window.addEventListener('meteosettingsopen',loadFrame);
 function settings(){if(!host.hidden)home(false);document.getElementById('open-shelly').click()}
 function toggleLamp(){return CasaMeteoCore.lampAction(window.CasaShelly,settings)}
 async function openMorningBlind({sunrise,sunset}={}){
  const context=()=>({red:!host.hidden&&!document.hidden&&frame.contentDocument?.querySelector('main')?.dataset.nightPalette==='red',now:Date.now(),sunrise,sunset});
  return CasaMeteoCore.morningBlindAction(window.CasaShelly,()=>window.CasaMeteoBridge.bedroomBlind(),context);
 }
 function indoorSensors(){return window.CasaShelly?.sensorEntries?.()||[]}
 let chosenIndoorSensor=null;
 function selectedIndoorSensor(){try{return CasaMeteoCore.preferences(JSON.parse(localStorage.getItem('casa-nl-meteo-v1')||'{}')).indoorSensor||chosenIndoorSensor||'master'}catch{return chosenIndoorSensor||'master'}}
 function selectIndoorSensor(id){
  if(!indoorSensors().some(sensor=>sensor.id===id&&sensor.configured))return false;
  let previous={};try{previous=CasaMeteoCore.preferences(JSON.parse(localStorage.getItem('casa-nl-meteo-v1')||'{}'))}catch{}
  const next=CasaMeteoCore.preferences({...previous,indoorSensor:id});chosenIndoorSensor=id;try{localStorage.setItem('casa-nl-meteo-v1',JSON.stringify(next))}catch{}
  refreshIndoorSensor(id);return true;
 }
 function refreshIndoorSensor(id=selectedIndoorSensor()){if(!indoorSensors().some(sensor=>sensor.id===id&&sensor.configured))return;window.CasaShelly?.ensureFresh(id)}
 window.CasaMeteoBridge={
  appVersion:()=>document.querySelector('meta[name="application-version"]')?.content,
  visible:()=>!host.hidden,preferences:CasaMeteoCore.preferences,ready,open,openFloor,home:()=>home(),settings,openMeteoSettings,settingsTarget:()=>document.getElementById('meteo-settings-content'),toggleLamp,openMorningBlind,
  activityDevices:()=>window.CasaMeteoActivity?.devices()||[],
  openActivityDevice,
  activitySnapshot:()=>window.CasaMeteoActivity?.snapshot()||[],
  presenceSnapshot:()=>window.CasaPresence?.snapshot?.()||[],
  indoorSensors,selectIndoorSensor,
  bedroomClimate:()=>CasaMeteoCore.indoorClimate(selectedIndoorSensor(),indoorSensors(),id=>window.CasaShelly?.sensorReading(id)),
  realTemperature:()=>CasaMeteoCore.realTemperature(window.CasaShelly?.sensorBinding('balcony'),window.CasaShelly?.sensorReading('balcony')),
  bedroomBlind:()=>{const api=window.CasaShelly,row=api?.houseSnapshot().deviceRows.find(r=>r.kind==='cover'&&r.key==='master');return CasaMeteoCore.bedroomBlind(api?.binding('master'),api?.reading('master'),row?.status)},
  blindBusy:()=>!!window.CasaShelly?.isBusy(),
  lamp:()=>window.CasaShelly?.lampSnapshot('master')||{configured:false,state:null,busy:false,ready:false,error:''},
  city:()=>window.CasaEnvironment?.getState().city,
  saveSharedPreferences(prefs){window.dispatchEvent(new CustomEvent('housepreferencechange',{detail:{setting:'meteo-settings',value:prefs}}))},
  setCity:city=>window.CasaEnvironment?.selectCity(city)};
 // The background app is inert while MeteoNL is visible. Restore the popup
 // (and unsubmitted form values) on return; weather actions never wake Casa.
 const app=document.createElement('div');app.id='casa-app';
 for(const child of [...document.body.children])if(child!==host&&child.tagName!=='SCRIPT')app.append(child);
 document.body.insertBefore(app,host);
 for(const event of ['pointerdown','pointermove','keydown','wheel','input'])document.addEventListener(event,()=>{if(host.hidden)idle.activity()},{passive:true});
 setInterval(()=>idle.tick(),500);
 setInterval(()=>{if(!host.hidden&&!document.hidden){window.CasaShelly?.ensureFresh('master');window.CasaShelly?.ensureFresh('balcony');refreshIndoorSensor()}},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)idle.tick()});
})();
