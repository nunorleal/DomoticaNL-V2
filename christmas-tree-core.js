(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.CasaChristmasTreeCore=factory();
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const DEVICE={deviceId:'434db3',channel:0};
 const SIZE=76;
 function preferences(value){
  if(!value||typeof value!=='object'||typeof value.shown!=='boolean')throw Error('Visibilidade da árvore de Natal inválida.');
  const position=value.position;
  if(!position||typeof position.room!=='string'||!Number.isFinite(position.x)||!Number.isFinite(position.y)||
   position.x<0||position.y<0||position.x>1600||position.y>1600||
   (position.floor!==undefined&&!['3','4','-1'].includes(position.floor)))throw Error('Posição da árvore de Natal inválida.');
  const {room,x,y,floor}=position;
  return {shown:value.shown,position:{room,x,y,...(floor===undefined?{}:{floor})}};
 }
 return {DEVICE,SIZE,preferences};
});
