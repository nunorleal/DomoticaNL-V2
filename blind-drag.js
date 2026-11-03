/* Shared local pointer interaction. Adapters retain the existing guarded command queues. */
(function(){
 'use strict';const A=window.CasaBlindDragAdapter,C=window.CasaBlindDragCore;if(!A||!C)return;
 const bubble=document.createElement('div');bubble.className='blind-drag-preview';bubble.hidden=true;bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');document.body.append(bubble);
 let gesture=null,suppress=null,hideTimer,serial=0;
 const context=()=>A.context?.()??null;
 const find=g=>[...document.querySelectorAll(A.selector)].find(n=>A.id(n)===g.id);
 const current=g=>context()===g.context&&!!find(g);
 const blocked=()=>document.hidden||document.documentElement.classList.contains('meteo-visible')||!!document.querySelector('dialog[open]')||document.getElementById('toggle-room-power')?.getAttribute('aria-checked')==='true';
 function show(g){clearTimeout(hideTimer);bubble.hidden=false;bubble.textContent=g.unavailable?'Estore sem dados válidos · clique curto para consultar':g.core.value+'%';bubble.style.left=Math.max(48,Math.min(innerWidth-48,g.x))+'px';bubble.style.top=Math.max(12,Math.min(innerHeight-80,g.y-76))+'px'}
 function clear(cancel=true){const g=gesture;if(!g)return;gesture=null;clearTimeout(g.timer);if(cancel)g.core.cancel();if(g.core.active||g.moved)suppress={node:g.node,until:performance.now()+900};try{document.documentElement.releasePointerCapture(g.pointer)}catch{}g.node.classList.remove('blind-drag-active');bubble.hidden=true;return g}
 document.addEventListener('pointerdown',e=>{
  if(e.isPrimary)suppress=null;
  if(gesture){const same=e.pointerId===gesture.pointer;clear();if(!same)return}const node=e.target.closest(A.selector);if(!node||!e.isPrimary||e.button!==0||blocked())return;
  const id=A.id(node),snapshot=A.snapshot(id)||{},unavailable=!C.selectable(snapshot);
  serial++;
  // Own this pointer so floor swipes, banner drags and panning cannot start underneath it.
  e.stopImmediatePropagation();const g={node,id,snapshot,unavailable,pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false,context:context(),core:C.create(unavailable?0:snapshot.position,e.clientX,e.clientY,performance.now(),Math.min(240,Math.max(140,innerHeight*.3)))};gesture=g;
  g.timer=setTimeout(()=>{if(gesture!==g||!current(g)||blocked()){clear();return}if(g.core.activate(performance.now())){try{document.documentElement.setPointerCapture(g.pointer)}catch{}node.classList.add('blind-drag-active');show(g)}},C.HOLD+1);
 },true);
 document.addEventListener('pointermove',e=>{const g=gesture;if(!g||e.pointerId!==g.pointer)return;e.stopImmediatePropagation();g.moved=g.moved||Math.hypot(e.clientX-g.x,e.clientY-g.y)>10;g.core.move(e.clientX,e.clientY,performance.now());if(g.core.cancelled){clear();return}if(g.core.active){e.preventDefault();show(g)}},{capture:true,passive:false});
 document.addEventListener('pointerup',async e=>{
  const g=gesture;if(!g||e.pointerId!==g.pointer)return;e.stopImmediatePropagation();if(g.core.active)e.preventDefault();g.core.move(e.clientX,e.clientY,performance.now());const target=g.core.finish(performance.now()),fresh=A.snapshot(g.id),valid=!g.unavailable&&!blocked()&&current(g)&&C.selectable(fresh)&&fresh.token===g.snapshot.token,ticket=serial;clear(false);
  if(target===null||!valid)return;
  try{const result=await C.sendWhenReady({snapshot:()=>A.snapshot(g.id),token:g.snapshot.token,target,alive:()=>ticket===serial&&!blocked()&&current(g),commit:value=>A.commit(g.id,value),waiting:()=>{bubble.textContent='Destino '+target+'% · a aguardar a fila';bubble.hidden=false}});
   if(ticket!==serial||result.reason==='cancelled')return;
   bubble.textContent=!result.sent?(result.reason==='busy'?'Fila ocupada · tente novamente':'Posição não enviada'):fresh.configured?'Destino '+target+'% · a confirmar':target+'%';bubble.hidden=false;clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!gesture)bubble.hidden=true},1800)
  }catch{if(ticket!==serial)return;bubble.textContent='Não foi possível enviar a posição';bubble.hidden=false;hideTimer=setTimeout(()=>{if(!gesture)bubble.hidden=true},2000)}
 },true);
 document.addEventListener('click',e=>{if(suppress&&performance.now()<suppress.until&&(e.detail>0||e.target===document.documentElement||suppress.node===e.target||suppress.node.contains(e.target)||e.target.closest?.(A.selector)&&A.id(e.target.closest(A.selector))===A.id(suppress.node))){e.preventDefault();e.stopImmediatePropagation();suppress=null}},true);
 document.addEventListener('contextmenu',e=>{if(gesture||e.target.closest(A.selector)){e.preventDefault();e.stopImmediatePropagation()}},true);
 document.addEventListener('pointercancel',()=>clear(),true);document.addEventListener('lostpointercapture',e=>{if(gesture?.pointer===e.pointerId&&e.target===document.documentElement&&document.documentElement.hasPointerCapture?.(e.pointerId)!==true)clear()},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(gesture||!bubble.hidden)){e.preventDefault();e.stopImmediatePropagation();serial++;clear();bubble.hidden=true}},true);
 window.addEventListener('blur',()=>{serial++;clear();bubble.hidden=true});document.addEventListener('visibilitychange',()=>{if(document.hidden){serial++;clear();bubble.hidden=true}});window.addEventListener('floorchange',()=>{serial++;clear();bubble.hidden=true});
})();
