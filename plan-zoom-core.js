/* View geometry only. Zoom never changes room coordinates or equipment state. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaPlanZoomCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 function limits(scale,base,viewport){return {x:Math.max(0,(base.width*scale-viewport.width)/2),y:Math.max(0,(base.height*scale-viewport.height)/2)}}
 function constrain(state,base,viewport){const scale=clamp(state.scale,1,4),limit=limits(scale,base,viewport);return {scale,x:scale===1?0:clamp(state.x,-limit.x,limit.x),y:scale===1?0:clamp(state.y,-limit.y,limit.y)}}
 function zoom(state,scale,from,to,base,viewport){const ratio=clamp(scale,1,4)/state.scale;return constrain({scale,x:to.x-(from.x-state.x)*ratio,y:to.y-(from.y-state.y)*ratio},base,viewport)}
 return {limits,constrain,zoom};
});
