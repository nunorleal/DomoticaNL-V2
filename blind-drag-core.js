/* Hold and drag selects a destination; only a completed release yields an intent. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaBlindDragCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const HOLD=450;
 function create(position,x,y,time,span=200){
  if(!Number.isFinite(position)||position<0||position>100)throw Error('Posição indisponível');
  const initial=Math.round(position);let value=initial,active=false,cancelled=false,ended=false;
  function activate(now){if(!cancelled&&!ended&&now-time>=HOLD)active=true;return active}
  function move(px,py,now){if(ended||cancelled)return;activate(now);if(!active){if(Math.hypot(px-x,py-y)>10)cancelled=true;return}value=Math.round(Math.max(0,Math.min(100,initial+(y-py)*100/Math.max(100,span))));return value}
  function cancel(){cancelled=true}
  function finish(now){activate(now);if(ended)return null;ended=true;return active&&!cancelled&&value!==initial?value:null}
  return {activate,move,cancel,finish,get active(){return active},get cancelled(){return cancelled},get value(){return value}};
 }
 return {HOLD,create};
});
