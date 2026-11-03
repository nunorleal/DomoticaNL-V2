/* Shared local pointer interaction. Adapters retain the existing guarded command queues. */
(function(){
 'use strict';const A=window.CasaBlindDragAdapter,C=window.CasaBlindDragCore;if(!A||!C)return;
 const bubble=document.createElement('div');bubble.className='blind-drag-preview';bubble.hidden=true;bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');document.body.append(bubble);
 let gesture=null,suppress=null,hideTimer;
 const blocked=()=>document.hidden||document.documentElement.classList.contains('meteo-visible')||!!document.querySelector('dialog[open]')||document.getElementById('toggle-room-power')?.getAttribute('aria-checked')==='true';
 function show(g){clearTimeout(hideTimer);bubble.hidden=false;bubble.textContent=g.core.value+'%';bubble.style.left=Math.max(48,Math.min(innerWidth-48,g.x))+'px';bubble.style.top=Math.max(12,Math.min(innerHeight-80,g.y-76))+'px'}
 function clear(cancel=true){const g=gesture;if(!g)return;gesture=null;clearTimeout(g.timer);if(cancel)g.core.cancel();if(g.core.active||g.moved)suppress={node:g.node,until:performance.now()+900};try{g.node.releasePointerCapture(g.pointer)}catch{}g.node.classList.remove('blind-drag-active');bubble.hidden=true;return g}
 document.addEventListener('pointerdown',e=>{
  if(gesture){clear();return}const node=e.target.closest(A.selector);if(!node||!e.isPrimary||e.button!==0||blocked())return;
  const id=A.id(node),snapshot=A.snapshot(id);if(!snapshot?.allowed||!Number.isFinite(snapshot.position))return;
  // Own this pointer so floor swipes, banner drags and panning cannot start underneath it.
  e.stopImmediatePropagation();const g={node,id,snapshot,pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false,core:C.create(snapshot.position,e.clientX,e.clientY,performance.now(),Math.min(240,Math.max(140,innerHeight*.3)))};gesture=g;
  try{node.setPointerCapture(e.pointerId)}catch{}
  g.timer=setTimeout(()=>{if(gesture!==g||!node.isConnected||blocked()){clear();return}if(g.core.activate(performance.now())){node.classList.add('blind-drag-active');show(g)}},C.HOLD+1);
 },true);
 document.addEventListener('pointermove',e=>{const g=gesture;if(!g||e.pointerId!==g.pointer)return;e.stopImmediatePropagation();g.moved=g.moved||Math.hypot(e.clientX-g.x,e.clientY-g.y)>10;g.core.move(e.clientX,e.clientY,performance.now());if(g.core.cancelled){clear();return}if(g.core.active){e.preventDefault();show(g)}},{capture:true,passive:false});
 document.addEventListener('pointerup',async e=>{
  const g=gesture;if(!g||e.pointerId!==g.pointer)return;e.stopImmediatePropagation();g.core.move(e.clientX,e.clientY,performance.now());const target=g.core.finish(performance.now()),fresh=A.snapshot(g.id),valid=!blocked()&&g.node.isConnected&&fresh?.allowed&&fresh.token===g.snapshot.token;clear(false);
  if(target===null||!valid)return;
  try{const sent=await A.commit(g.id,target);bubble.textContent=(sent===false||fresh.configured&&sent!==true)?'Posição não enviada':fresh.configured?'Destino '+target+'% · a confirmar':target+'%';bubble.hidden=false;clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!gesture)bubble.hidden=true},1400)}catch{bubble.textContent='Não foi possível enviar a posição';bubble.hidden=false;hideTimer=setTimeout(()=>{if(!gesture)bubble.hidden=true},2000)}
 },true);
 document.addEventListener('click',e=>{if(suppress&&performance.now()<suppress.until&&(suppress.node===e.target||suppress.node.contains(e.target))){e.preventDefault();e.stopImmediatePropagation();suppress=null}},true);
 document.addEventListener('contextmenu',e=>{if(e.target.closest(A.selector))e.preventDefault()},true);
 document.addEventListener('pointercancel',()=>clear(),true);document.addEventListener('lostpointercapture',e=>{if(gesture?.pointer===e.pointerId)clear()},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&gesture){e.preventDefault();e.stopImmediatePropagation();clear()}},true);
 window.addEventListener('blur',()=>clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});window.addEventListener('floorchange',()=>clear());
})();
