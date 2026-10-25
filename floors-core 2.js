/* Floor navigation only: no equipment state or device commands. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaFloorsCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function destination(floor,direction){if(floor===0&&direction>0)return -1;if(floor===-1&&direction<0)return 0;return floor}
 function swipe(floor,dx,dy){return Math.abs(dy)>=70&&Math.abs(dy)>Math.abs(dx)*1.4?destination(floor,-dy):floor}
 return {destination,swipe};
});
