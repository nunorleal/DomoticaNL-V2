/* Unlock one movable item on the plan at a time. Positioning stays with each item. */
(function(){
 'use strict';
 const HOLD_MS=550, SLOP=8;
 const instructions='Mantenha pressionado para desbloquear e mover. Toque fora para bloquear.';
 let unlocked=null, gesture=null, ignoredClick=null;

 function endGesture(){
  if(!gesture)return;
  clearTimeout(gesture.timer);
  const redraw=gesture.redraw;
  gesture=null;
  if(redraw)setTimeout(redraw,0);
 }

 function unlock(node){
  unlocked?.classList.remove('plan-move-unlocked');
  unlocked=node;
  unlocked?.classList.add('plan-move-unlocked');
 }

 function lock(){
  endGesture();
  unlock(null);
 }

 function blocked(){return !!document.querySelector('dialog[open]')||window.CasaMeteoBridge?.visible()}

 document.addEventListener('pointerdown',event=>{
  ignoredClick=null;
  if(!event.isPrimary||unlocked&&!unlocked.contains(event.target))lock();
  else if(gesture)endGesture();
 },true);
 document.addEventListener('pointermove',event=>{
  if(gesture?.id===event.pointerId&&gesture.waiting&&
    Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>SLOP){
   clearTimeout(gesture.timer);
   gesture.waiting=false;
   gesture.cancelled=true;
  }
 },true);
 document.addEventListener('pointerup',event=>{
  if(gesture?.id!==event.pointerId)return;
  if(gesture.cancelled)ignoredClick={node:gesture.node,until:performance.now()+500};
  endGesture();
 },true);
 document.addEventListener('pointercancel',event=>{
  if(gesture?.id===event.pointerId)lock();
 },true);
 document.addEventListener('contextmenu',event=>{
  if(event.target.closest?.('.plan-movable'))event.preventDefault();
 },true);
 for(const type of ['click','dblclick'])document.addEventListener(type,event=>{
  if(!event.detail)return;
  if(unlocked?.contains(event.target)||(ignoredClick&&performance.now()<ignoredClick.until&&ignoredClick.node.contains(event.target))){
   event.preventDefault();
   event.stopImmediatePropagation();
  }else if(unlocked)lock();
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape')lock();
  if(!event.altKey||event.key!=='Enter'||event.repeat||blocked())return;
  const node=event.target.closest?.('.plan-movable');
  if(!node)return;
  event.preventDefault();
  if(node===unlocked)lock();else unlock(node);
 },true);
 window.addEventListener('floorchange',lock);
 window.addEventListener('blur',lock);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)lock()});

 function bind(host,start,find=()=>host){
  host.addEventListener('pointerdown',event=>{
   const node=find(event);
   if(!node||!event.isPrimary||event.button!==0||blocked())return;
   const pending={node,id:event.pointerId,x:event.clientX,y:event.clientY,waiting:node!==unlocked};
   gesture=pending;
   if(!pending.waiting){start(event,node);return}
   pending.timer=setTimeout(()=>{
    if(gesture!==pending||pending.cancelled)return;
    if(!node.isConnected||!node.getClientRects().length||blocked()){endGesture();return}
    pending.waiting=false;
    unlock(node);
    start(event,node);
   },HOLD_MS);
  });
 }

 function bindItem(node,start){
  node.classList.add('plan-movable');
  node.setAttribute('aria-description',instructions);
  bind(node,start);
 }

 function deferDraw(host,redraw){
  if(!gesture||!host.contains(gesture.node))return false;
  gesture.redraw=redraw;
  return true;
 }

 window.CasaPlanMove={bind,bindItem,lock,deferDraw,isUnlocked:node=>unlocked===node,
  unlockedInside:host=>host.contains(unlocked)?unlocked:null,
  replaceUnlocked:(previous,next)=>{if(unlocked===previous)unlock(next||null)}};
})();
