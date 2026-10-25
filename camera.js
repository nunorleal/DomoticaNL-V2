/* Entrance camera: local plan element and explicit access to the user's Protect console. */
(function(){
 'use strict';
 const host=document.getElementById('plan-stage');if(!host)return;
 const camera=document.createElement('button');camera.type='button';camera.id='hall-camera';camera.className='hall-camera';camera.title='Câmara do hall · UniFi G3 Instant';camera.setAttribute('aria-label','Abrir câmara do hall, apontada à porta de entrada');
 camera.innerHTML='<span class="camera-view-cone" aria-hidden="true"></span><img src="assets/camera-g3-overhead.svg" alt="" draggable="false">';host.append(camera);
 const dialog=document.createElement('dialog');dialog.id='hall-camera-dialog';dialog.className='popup hall-camera-popup';dialog.setAttribute('aria-labelledby','hall-camera-title');
 const KEY='casa-nl-camera-hall-v1';let settings={url:''};try{settings=CasaCameraCore.config(JSON.parse(localStorage.getItem(KEY)))}catch{}
 dialog.innerHTML='<button type="button" class="popup-close" aria-label="Fechar câmara do hall">'+icon('x')+'</button><span class="eyebrow">HALL · CÂMARA</span><h2 id="hall-camera-title">Câmara do hall</h2><div class="camera-live" hidden></div><p class="camera-empty" role="status">Associe o link de transmissão nas definições da câmara.</p><div class="camera-actions"><button class="secondary-action camera-reload" type="button" aria-label="Atualizar vídeo" title="Atualizar vídeo">'+icon('refresh')+'</button><button class="secondary-action camera-settings" type="button" aria-label="Definições da câmara" title="Definições da câmara">'+icon('settings')+'</button></div><form class="camera-link-form" hidden><label for="camera-stream-url">Link de transmissão UniFi</label><input id="camera-stream-url" type="url" autocomplete="off" spellcheck="false" placeholder="https://monitor.ui.com/…"><p class="settings-explanation">O link fica guardado neste navegador e incluído na cópia JSON. A partilha pode expirar no Protect.</p><button type="submit" class="primary-action">Guardar</button><p class="camera-message" role="status"></p></form>';
 document.body.append(dialog);
 const screen=dialog.querySelector('.camera-live'),empty=dialog.querySelector('.camera-empty'),form=dialog.querySelector('form'),input=form.querySelector('input'),message=form.querySelector('.camera-message');
 function stop(){screen.replaceChildren();screen.hidden=true}
 function play(){stop();empty.hidden=!!settings.url;if(!settings.url)return;const frame=document.createElement('iframe');frame.title='Vídeo em direto da câmara';frame.allow='autoplay; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');frame.src=settings.url;screen.append(frame);screen.hidden=false}
 camera.addEventListener('click',()=>{showPopup('hall-camera-dialog');form.hidden=!!settings.url;input.value=settings.url;message.textContent='';play()});
 dialog.querySelector('.popup-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',stop);
 dialog.querySelector('.camera-reload').addEventListener('click',play);window.addEventListener('pagehide',stop);
 dialog.querySelector('.camera-settings').addEventListener('click',()=>{form.hidden=!form.hidden;if(!form.hidden){input.value=settings.url;input.focus()}});
 form.addEventListener('submit',e=>{e.preventDefault();try{const next=CasaCameraCore.config({url:input.value});localStorage.setItem(KEY,JSON.stringify(next));settings=next;form.hidden=true;message.textContent='';play()}catch(err){message.textContent=err.message}});
 function drawLighting(){const room=rooms.find(r=>r.id==='living');if(!room)return;const night=CasaEnvironment.darkness(room,rooms)*(1-CasaEnvironment.electricOpacity(room,rooms));camera.style.setProperty('--camera-night',String(night))}
 window.CasaHallCamera={drawLighting};window.addEventListener('environmentchange',drawLighting);drawLighting();
})();
