/* Portable position in the floor plan's original source coordinates. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaDehumidifierCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const ROOMS=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
 const DEFAULT={room:'bath1',x:165,y:254};
 function layout(v){if(!v||typeof v!=='object'||Array.isArray(v)||!ROOMS.includes(v.room)||!Number.isFinite(v.x)||!Number.isFinite(v.y)||v.x<0||v.x>1024||v.y<140||v.y>1320)throw Error('Posição do desumidificador inválida.');return {room:v.room,x:v.x,y:v.y}}
 return {ROOMS,DEFAULT,layout};
});
