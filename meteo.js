(function(){
 'use strict';
 const host=document.createElement('section');host.id='meteo-view';host.hidden=true;host.setAttribute('aria-label','Meteorologia e relógio');
 const frame=document.createElement('iframe');frame.title='MeteoNL · Meteorologia e relógio';host.append(frame);document.body.append(host);
 const loading=document.createElement('div');loading.className='meteo-loading';
 const loadMessage=document.createElement('p');loadMessage.setAttribute('role','status');loadMessage.textContent='A abrir MeteoNL…';
 const back=document.createElement('button');back.type='button';back.textContent='Voltar à casa';back.addEventListener('click',()=>home());
 loading.append(loadMessage,back);host.append(loading);let loadTimer;
 function ready(){clearTimeout(loadTimer);loading.hidden=true}
 let savedDialogs=[],lastFocus=null,loaded=false;
 const screensaverKey='casa-nl-screensaver-v1';let screensaver={seconds:30};
 try{screensaver=CasaMeteoCore.screensaver(JSON.parse(localStorage.getItem(screensaverKey)))}catch{}
 const idle=CasaMeteoCore.idle({delay:screensaver.seconds*1000,onIdle:open,blocked:()=>document.hidden||!!window.CasaShelly?.isBusy()});
 const screenSelect=document.getElementById('screensaver-delay'),screenStatus=document.getElementById('screensaver-status');
 function screenMessage(){screenStatus.textContent=screensaver.seconds===0?'Desativado. Pode continuar a abrir a MeteoNL pelo símbolo da meteorologia.':`A MeteoNL abre após ${screenSelect.selectedOptions[0].textContent.toLowerCase()} sem interação. Guardado automaticamente.`}
 screenSelect.value=String(screensaver.seconds);screenMessage();
 screenSelect.addEventListener('change',()=>{
  try{const next=CasaMeteoCore.screensaver({seconds:Number(screenSelect.value)});localStorage.setItem(screensaverKey,JSON.stringify(next));screensaver=next;idle.setDelay(next.seconds*1000);screenMessage()}
  catch{screenSelect.value=String(screensaver.seconds);screenStatus.textContent='Não foi possível guardar este tempo. Tente novamente.'}
 });
 function open(){
  if(!host.hidden)return;
  lastFocus=document.activeElement;savedDialogs=[...document.querySelectorAll('dialog[open]')];savedDialogs.forEach(d=>d.close());
  document.getElementById('casa-app')?.setAttribute('inert','');
  host.hidden=false;document.documentElement.classList.add('meteo-visible');idle.setActive(false);
  if(!loaded){
   loading.hidden=false;loadTimer=setTimeout(()=>{loadMessage.textContent='Não foi possível carregar a MeteoNL. Volte à casa e atualize a página.'},15000);
   if(location.protocol==='file:'){
    const base=new URL('meteo/',document.baseURI).href.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    frame.srcdoc=`<!doctype html><html lang="pt"><head><meta charset="utf-8"><base href="${base}"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>MeteoNL · Casa NL</title><link rel="stylesheet" href="assets/app-2.02.css?v=2.02-red"></head><body><div id="root"></div><script src="assets/app-2.02.js?v=2.02-red"><\/script></body></html>`;
   }else frame.src='meteo/index.html?v=2.02';
   loaded=true;
  }
  window.CasaShelly?.ensureFresh('master');window.CasaShelly?.ensureFresh('balcony');frame.focus();
 }
 function home(restore=true){
  host.hidden=true;document.documentElement.classList.remove('meteo-visible');document.getElementById('casa-app')?.removeAttribute('inert');idle.setActive(true);
  if(restore){savedDialogs.filter(d=>d.isConnected).slice(-1).forEach(d=>d.showModal());lastFocus?.focus?.()}
  savedDialogs=[];
 }
 function settings(){home(false);document.getElementById('open-shelly').click()}
 function toggleLamp(){return CasaMeteoCore.lampAction(window.CasaShelly,settings)}
 window.CasaMeteoBridge={visible:()=>!host.hidden,preferences:CasaMeteoCore.preferences,ready,open,home:()=>home(),settings,toggleLamp,
  realTemperature:()=>CasaMeteoCore.realTemperature(window.CasaShelly?.sensorBinding('balcony'),window.CasaShelly?.sensorReading('balcony')),
  lamp:()=>window.CasaShelly?.lampSnapshot('master')||{configured:false,state:null,busy:false,ready:false,error:''},
  city:()=>window.CasaEnvironment?.getState().city,
  setCity:city=>window.CasaEnvironment?.selectCity(city)};
 // The background app is inert while MeteoNL is visible. Restore the popup
 // (and unsubmitted form values) on return; weather actions never wake Casa.
 const app=document.createElement('div');app.id='casa-app';
 for(const child of [...document.body.children])if(child!==host&&child.tagName!=='SCRIPT')app.append(child);
 document.body.insertBefore(app,host);
 for(const event of ['pointerdown','pointermove','keydown','wheel','input'])document.addEventListener(event,()=>{if(host.hidden)idle.activity()},{passive:true});
 setInterval(()=>idle.tick(),500);
 setInterval(()=>{if(!host.hidden&&!document.hidden){window.CasaShelly?.ensureFresh('master');window.CasaShelly?.ensureFresh('balcony')}},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)idle.tick()});
})();
