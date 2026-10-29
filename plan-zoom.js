(function(){
 'use strict';
 const C=CasaPlanZoomCore,scenes=[...document.querySelectorAll('.floor-scene')].map(view=>({view,content:view.querySelector('.plan-stage,.basement-plan'),state:{scale:1,x:0,y:0}}));
 const active=()=>scenes.find(s=>!s.view.hidden),blocked=()=>!!document.querySelector('dialog[open]')||document.documentElement.classList.contains('meteo-visible');
 let suppressUntil=0,cancelling=false;
 function geometry(s){const r=s.view.getBoundingClientRect();return {base:{width:s.content.offsetWidth,height:s.content.offsetHeight},viewport:{width:r.width,height:r.height},center:{x:r.left+(Number.isFinite(s.content.offsetLeft)?s.content.offsetLeft:(r.width-s.content.offsetWidth)/2)+s.content.offsetWidth/2,y:r.top+(Number.isFinite(s.content.offsetTop)?s.content.offsetTop:(r.height-s.content.offsetHeight)/2)+s.content.offsetHeight/2}}}
 function paint(s){s.content.style.transform=`translate(${s.state.x}px,${s.state.y}px) scale(${s.state.scale})`;s.view.dataset.planScale=String(s.state.scale)}
 function reset(){for(const s of scenes){s.clear?.();s.state={scale:1,x:0,y:0};paint(s)}}

 for(const s of scenes){
  const points=new Map();let gesture=null;
  const stop=e=>{e.preventDefault();e.stopImmediatePropagation()};
  const midpoint=()=>{const [a,b]=[...points.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y))}};
  function cancelTargets(){cancelling=true;for(const [id,p]of points){p.target.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:id,pointerType:'touch'}));if(p.target.hasPointerCapture?.(id))p.target.releasePointerCapture(id)}cancelling=false}
  s.clear=()=>{for(const id of points.keys())if(s.view.hasPointerCapture(id))s.view.releasePointerCapture(id);points.clear();gesture=null};
  s.view.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch'||blocked())return;
   points.set(e.pointerId,{x:e.clientX,y:e.clientY,target:e.target});
   if(points.size>=2){if(points.size===2){cancelTargets();gesture={mode:'pinch',start:midpoint(),state:{...s.state}}}stop(e);for(const id of points.keys())s.view.setPointerCapture(id);return}
   if(s.state.scale>1&&!e.target.closest('.room-pin,.basement-movable,.heater-object,.dehumidifier-object')){gesture={mode:'pan',start:{x:e.clientX,y:e.clientY},state:{...s.state},moved:false};stop(e);s.view.setPointerCapture(e.pointerId)}
  },true);
  s.view.addEventListener('pointermove',e=>{
   const p=points.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;if(!gesture)return;stop(e);
   const g=geometry(s);
   if(gesture.mode==='pinch'&&points.size>=2){const now=midpoint(),start=gesture.start;s.state=C.zoom(gesture.state,gesture.state.scale*now.distance/start.distance,{x:start.x-g.center.x,y:start.y-g.center.y},{x:now.x-g.center.x,y:now.y-g.center.y},g.base,g.viewport)}
   if(gesture.mode==='pan'){const dx=e.clientX-gesture.start.x,dy=e.clientY-gesture.start.y;gesture.moved ||= Math.hypot(dx,dy)>6;s.state=C.constrain({...gesture.state,x:gesture.state.x+dx,y:gesture.state.y+dy},g.base,g.viewport)}
   paint(s);
  },true);
  function end(e){
   if(cancelling)return;const p=points.get(e.pointerId);if(!p)return;points.delete(e.pointerId);if(!gesture)return;
   const old=gesture;
   if(old.mode==='pinch'||old.moved){stop(e);suppressUntil=performance.now()+700}
   if(old.mode==='pan'&&e.type==='pointerup'&&old.moved){const dy=e.clientY-old.start.y,g=geometry(s),limit=C.limits(old.state.scale,g.base,g.viewport).y,atEdge=dy<0?old.state.y<=-limit+1:old.state.y>=limit-1;
    if(atEdge&&!blocked()){const next=CasaFloorsCore.swipe(CasaFloors.current(),e.clientX-old.start.x,dy);CasaFloors.show(next)}
   }
   if(points.size===0)gesture=null;else if(old.mode==='pinch')gesture={mode:'pinch',start:old.start,state:old.state};
  }
  s.view.addEventListener('pointerup',end,true);s.view.addEventListener('pointercancel',end,true);
  s.view.addEventListener('wheel',e=>{if(blocked())return;const g=geometry(s);if(e.ctrlKey){stop(e);const anchor={x:e.clientX-g.center.x,y:e.clientY-g.center.y};s.state=C.zoom(s.state,s.state.scale*Math.exp(-e.deltaY*.01),anchor,anchor,g.base,g.viewport);paint(s)}else if(s.state.scale>1){stop(e);s.state=C.constrain({...s.state,x:s.state.x-e.deltaX,y:s.state.y-e.deltaY},g.base,g.viewport);paint(s)}},{capture:true,passive:false});
  s.view.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
 }
 document.addEventListener('click',e=>{if(performance.now()<suppressUntil&&e.target.closest('.floor-scene')){e.preventDefault();e.stopImmediatePropagation()}},true);
 window.addEventListener('floorchange',reset);window.addEventListener('resize',reset);
 window.CasaPlanZoom={reset,state:()=>({...active()?.state})};reset();
})();
